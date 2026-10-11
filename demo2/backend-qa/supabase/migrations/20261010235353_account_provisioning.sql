-- Empty independent QA candidate. No Auth/network calls inside PostgreSQL transactions.
CREATE TABLE rs_private.provision_requests(
 id uuid PRIMARY KEY, company_id uuid NOT NULL REFERENCES public.rs_companies(id),actor_id uuid NOT NULL,
 email text NOT NULL,full_name text NOT NULL,role text NOT NULL CHECK(role IN ('SUPERVISOR','VENDEDOR')),supervisor_id uuid,
 worker_id uuid NOT NULL,state text NOT NULL CHECK(state IN ('PENDING','COMPLETE','FAILED','RECONCILE')) DEFAULT 'PENDING',
 auth_id uuid,expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes',created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE rs_private.provision_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX provision_slots ON rs_private.provision_requests(company_id,role,state,expires_at);
CREATE TABLE rs_private.account_security(user_id uuid PRIMARY KEY REFERENCES public.rs_accounts(user_id),nonce uuid NOT NULL,actor_id uuid NOT NULL,blocked boolean NOT NULL DEFAULT true,not_before timestamptz NOT NULL DEFAULT now());
ALTER TABLE rs_private.account_security ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rs_private.provision_requests,rs_private.account_security FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION rs_private.company() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT a.company_id FROM public.rs_accounts a JOIN public.rs_companies c ON c.id=a.company_id
 WHERE a.user_id=auth.uid() AND a.active AND c.active
 AND NOT EXISTS(SELECT 1 FROM rs_private.account_security e WHERE e.user_id=a.user_id AND
 (e.blocked OR NOT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.user_id=a.user_id AND s.id=(coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)->>'session_id')::uuid AND s.created_at>=e.not_before)))
$$;
CREATE FUNCTION rs_private.reserved_slots(p_company uuid) RETURNS integer LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT count(*)::integer FROM rs_private.provision_requests WHERE company_id=p_company AND role='VENDEDOR' AND (state='RECONCILE' OR (state='PENDING' AND expires_at>now()))
$$;
CREATE OR REPLACE FUNCTION rs_private.enforce_quota() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE lim integer;n integer;
BEGIN
 IF TG_OP='UPDATE' AND NEW.company_id<>OLD.company_id THEN RAISE EXCEPTION 'company immutable';END IF;
 PERFORM 1 FROM public.rs_companies WHERE id=NEW.company_id FOR UPDATE;
 IF NEW.active AND (TG_OP='INSERT' OR NOT OLD.active) THEN
  IF NOT rs_private.licensed(NEW.company_id) THEN RAISE EXCEPTION 'license inactive';END IF;
  SELECT seller_limit INTO lim FROM public.rs_licenses WHERE company_id=NEW.company_id;
  SELECT count(*) INTO n FROM public.rs_sellers WHERE company_id=NEW.company_id AND active AND id<>NEW.id;
  IF n+rs_private.reserved_slots(NEW.company_id)>=lim THEN RAISE EXCEPTION 'seller quota exceeded';END IF;
 END IF;RETURN NEW;
END $$;
CREATE FUNCTION rs_private.reserve_account(p_id uuid,p_worker uuid,p_email text,p_name text,p_role text,p_supervisor uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid;q rs_private.provision_requests;n integer;lim integer;
BEGIN
 c:=rs_private.lock_actor();IF rs_private.role()<>'CENTRAL' THEN RAISE EXCEPTION 'central required';END IF;
 IF p_id IS NULL OR p_worker IS NULL OR p_email IS NULL OR length(p_email)>254 OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 200 OR p_role IS NULL OR p_role NOT IN ('SUPERVISOR','VENDEDOR') THEN RAISE EXCEPTION 'invalid account request';END IF;
 IF (p_role='VENDEDOR' AND NOT EXISTS(SELECT 1 FROM public.rs_accounts WHERE user_id=p_supervisor AND company_id=c AND active AND role='SUPERVISOR')) OR (p_role='SUPERVISOR' AND p_supervisor IS NOT NULL) THEN RAISE EXCEPTION 'active supervisor required';END IF;
 SELECT * INTO q FROM rs_private.provision_requests WHERE id=p_id FOR UPDATE;
 IF FOUND THEN
  IF q.company_id<>c OR q.actor_id<>auth.uid() OR q.email<>lower(btrim(p_email)) OR q.full_name<>btrim(p_name) OR q.role<>p_role OR q.supervisor_id IS DISTINCT FROM p_supervisor THEN RAISE EXCEPTION 'idempotency conflict';END IF;
  IF q.state='COMPLETE' THEN RETURN jsonb_build_object('state','COMPLETE','user_id',q.auth_id);END IF;
  IF q.state<>'PENDING' THEN RAISE EXCEPTION 'request needs reconciliation';END IF;
  IF q.expires_at>now() THEN RAISE EXCEPTION 'request in progress';END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM rs_private.provision_requests WHERE company_id=c AND email=lower(btrim(p_email)) AND (state='RECONCILE' OR (state='PENDING' AND expires_at>now()))) THEN RAISE EXCEPTION 'email in progress';END IF;
 END IF;
 IF p_role='VENDEDOR' THEN
  SELECT seller_limit INTO lim FROM public.rs_licenses WHERE company_id=c;
  SELECT count(*) INTO n FROM public.rs_sellers WHERE company_id=c AND active;
  IF n+rs_private.reserved_slots(c)>=lim THEN RAISE EXCEPTION 'seller quota exceeded';END IF;
 END IF;
 INSERT INTO rs_private.provision_requests(id,company_id,actor_id,email,full_name,role,supervisor_id,worker_id) VALUES(p_id,c,auth.uid(),lower(btrim(p_email)),btrim(p_name),p_role,p_supervisor,p_worker)
 ON CONFLICT(id) DO UPDATE SET worker_id=excluded.worker_id,expires_at=now()+interval '5 minutes';
 INSERT INTO rs_private.audit(company_id,actor_id,action,details) VALUES(c,auth.uid(),'RESERVE_ACCOUNT',jsonb_build_object('request_id',p_id));
 RETURN jsonb_build_object('state','PENDING','request_id',p_id);
END $$;
CREATE FUNCTION public.rs_reserve_account(p_id uuid,p_worker uuid,p_email text,p_name text,p_role text,p_supervisor uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT rs_private.reserve_account(p_id,p_worker,p_email,p_name,p_role,p_supervisor) $$;

-- Only server service_role can reach these operations. Actor is verified by the HTTP handler
-- using GoTrue, then re-authorized against account rows on every service operation.
CREATE FUNCTION rs_private.provision_context(p_id uuid,p_worker uuid,p_actor uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q rs_private.provision_requests;u uuid;
BEGIN
 SELECT * INTO q FROM rs_private.provision_requests WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'request missing';END IF;
 PERFORM 1 FROM public.rs_companies WHERE id=q.company_id FOR UPDATE;
 SELECT * INTO q FROM rs_private.provision_requests WHERE id=p_id FOR UPDATE;
 IF q.actor_id<>p_actor OR q.worker_id<>p_worker OR q.state<>'PENDING' OR q.expires_at<=now() OR NOT EXISTS(SELECT 1 FROM public.rs_accounts a JOIN public.rs_companies c ON c.id=a.company_id WHERE a.user_id=p_actor AND a.company_id=q.company_id AND a.role='CENTRAL' AND a.active AND c.active) THEN RAISE EXCEPTION 'request unauthorized or expired';END IF;
 SELECT id INTO u FROM auth.users WHERE lower(email)=q.email AND raw_app_meta_data->>'rutasales_request_id'=q.id::text;
 RETURN to_jsonb(q)||jsonb_build_object('auth_id',u);
END $$;
CREATE FUNCTION public.rs_provision_context(p_id uuid,p_worker uuid,p_actor uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT rs_private.provision_context(p_id,p_worker,p_actor) $$;
CREATE FUNCTION rs_private.finish_account(p_id uuid,p_worker uuid,p_actor uuid,p_user uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q rs_private.provision_requests;s uuid;
BEGIN
 PERFORM rs_private.provision_context(p_id,p_worker,p_actor);
 SELECT * INTO q FROM rs_private.provision_requests WHERE id=p_id;
 IF NOT rs_private.licensed(q.company_id) OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user AND lower(email)=q.email AND raw_app_meta_data->>'rutasales_request_id'=q.id::text) THEN RAISE EXCEPTION 'license or Auth identity invalid';END IF;
 -- Release this reservation inside the same transaction before the quota trigger.
 UPDATE rs_private.provision_requests SET state='COMPLETE',auth_id=p_user WHERE id=p_id;
 INSERT INTO public.rs_accounts(user_id,company_id,full_name,role,supervisor_user_id) VALUES(p_user,q.company_id,q.full_name,q.role,q.supervisor_id);
 IF q.role='VENDEDOR' THEN
  INSERT INTO public.rs_sellers(company_id,name,auth_user_id,supervisor_user_id) VALUES(q.company_id,q.full_name,p_user,q.supervisor_id) RETURNING id INTO s;
  UPDATE public.rs_accounts SET seller_id=s WHERE user_id=p_user;
 END IF;
 INSERT INTO rs_private.audit(company_id,actor_id,action,details) VALUES(q.company_id,p_actor,'CREATE_ACCOUNT',jsonb_build_object('request_id',p_id,'user_id',p_user));RETURN p_user;
END $$;
CREATE FUNCTION public.rs_finish_account(p_id uuid,p_worker uuid,p_actor uuid,p_user uuid) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT rs_private.finish_account(p_id,p_worker,p_actor,p_user) $$;
CREATE FUNCTION rs_private.close_account_request(p_id uuid,p_worker uuid,p_actor uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q rs_private.provision_requests;u uuid;
BEGIN
 PERFORM rs_private.provision_context(p_id,p_worker,p_actor);
 SELECT * INTO q FROM rs_private.provision_requests WHERE id=p_id;
 SELECT id INTO u FROM auth.users WHERE lower(email)=q.email AND raw_app_meta_data->>'rutasales_request_id'=q.id::text;
 IF EXISTS(SELECT 1 FROM public.rs_accounts WHERE user_id=u) THEN RAISE EXCEPTION 'account already linked';END IF;
 UPDATE rs_private.provision_requests SET state=CASE WHEN u IS NULL THEN 'FAILED' ELSE 'RECONCILE' END,auth_id=u WHERE id=p_id;
 INSERT INTO rs_private.audit(company_id,actor_id,action,details) VALUES(q.company_id,p_actor,'CLOSE_ACCOUNT_REQUEST',jsonb_build_object('request_id',p_id,'reconcile',u IS NOT NULL));
END $$;
CREATE FUNCTION public.rs_close_account_request(p_id uuid,p_worker uuid,p_actor uuid) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT rs_private.close_account_request(p_id,p_worker,p_actor) $$;

CREATE FUNCTION rs_private.begin_reset(p_target uuid,p_nonce uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid;
BEGIN
 c:=rs_private.lock_actor();IF rs_private.role()<>'CENTRAL' OR p_nonce IS NULL THEN RAISE EXCEPTION 'central required';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.rs_accounts WHERE user_id=p_target AND company_id=c AND role IN ('SUPERVISOR','VENDEDOR') AND active) THEN RAISE EXCEPTION 'target unauthorized';END IF;
 IF EXISTS(SELECT 1 FROM rs_private.account_security WHERE user_id=p_target AND blocked) THEN RAISE EXCEPTION 'reset in progress; reconciliation required';END IF;
 INSERT INTO rs_private.account_security(user_id,nonce,actor_id,blocked,not_before) VALUES(p_target,p_nonce,auth.uid(),true,clock_timestamp()) ON CONFLICT(user_id) DO UPDATE SET nonce=excluded.nonce,actor_id=excluded.actor_id,blocked=true,not_before=excluded.not_before;
 INSERT INTO rs_private.audit(company_id,actor_id,action,details) VALUES(c,auth.uid(),'BEGIN_RESET',jsonb_build_object('target',p_target));RETURN p_target;
END $$;
CREATE FUNCTION public.rs_begin_reset(p_target uuid,p_nonce uuid) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT rs_private.begin_reset(p_target,p_nonce) $$;
CREATE FUNCTION rs_private.finish_reset(p_target uuid,p_nonce uuid,p_actor uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid;
BEGIN
 SELECT t.company_id INTO c FROM public.rs_accounts t JOIN public.rs_accounts a ON a.company_id=t.company_id JOIN public.rs_companies co ON co.id=t.company_id WHERE t.user_id=p_target AND t.active AND t.role IN ('SUPERVISOR','VENDEDOR') AND a.user_id=p_actor AND a.active AND a.role='CENTRAL' AND co.active;
 IF c IS NULL THEN RAISE EXCEPTION 'target unauthorized';END IF;
 PERFORM 1 FROM public.rs_companies WHERE id=c FOR UPDATE;
 UPDATE rs_private.account_security SET blocked=false,not_before=clock_timestamp() WHERE user_id=p_target AND nonce=p_nonce AND actor_id=p_actor AND blocked;
 IF NOT FOUND THEN RAISE EXCEPTION 'reset superseded';END IF;
 INSERT INTO rs_private.audit(company_id,actor_id,action,details) VALUES(c,p_actor,'FINISH_RESET',jsonb_build_object('target',p_target));
END $$;
CREATE FUNCTION public.rs_finish_reset(p_target uuid,p_nonce uuid,p_actor uuid) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT rs_private.finish_reset(p_target,p_nonce,p_actor) $$;

GRANT USAGE ON SCHEMA rs_private TO service_role;
REVOKE EXECUTE ON FUNCTION rs_private.reserved_slots(uuid),rs_private.reserve_account(uuid,uuid,text,text,text,uuid),rs_private.provision_context(uuid,uuid,uuid),rs_private.finish_account(uuid,uuid,uuid,uuid),rs_private.close_account_request(uuid,uuid,uuid),rs_private.begin_reset(uuid,uuid),rs_private.finish_reset(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.rs_reserve_account(uuid,uuid,text,text,text,uuid),public.rs_provision_context(uuid,uuid,uuid),public.rs_finish_account(uuid,uuid,uuid,uuid),public.rs_close_account_request(uuid,uuid,uuid),public.rs_begin_reset(uuid,uuid),public.rs_finish_reset(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION rs_private.reserve_account(uuid,uuid,text,text,text,uuid),public.rs_reserve_account(uuid,uuid,text,text,text,uuid),rs_private.begin_reset(uuid,uuid),public.rs_begin_reset(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rs_private.provision_context(uuid,uuid,uuid),public.rs_provision_context(uuid,uuid,uuid),rs_private.finish_account(uuid,uuid,uuid,uuid),public.rs_finish_account(uuid,uuid,uuid,uuid),rs_private.close_account_request(uuid,uuid,uuid),public.rs_close_account_request(uuid,uuid,uuid),rs_private.finish_reset(uuid,uuid,uuid),public.rs_finish_reset(uuid,uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION rs_private.set_license(p_company uuid,p_limit integer,p_start timestamptz,p_end timestamptz,p_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer;
BEGIN
 IF NOT rs_private.is_superadmin() THEN RAISE EXCEPTION 'superadmin required';END IF;
 PERFORM 1 FROM public.rs_companies WHERE id=p_company FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'company missing';END IF;
 SELECT count(*) INTO n FROM public.rs_sellers WHERE company_id=p_company AND active;IF p_limit<n+rs_private.reserved_slots(p_company) THEN RAISE EXCEPTION 'limit below active sellers or reservations';END IF;
 INSERT INTO public.rs_licenses VALUES(p_company,p_limit,p_start,p_end,p_status) ON CONFLICT(company_id) DO UPDATE SET seller_limit=excluded.seller_limit,starts_at=excluded.starts_at,expires_at=excluded.expires_at,status=excluded.status;
 INSERT INTO rs_private.audit(company_id,actor_id,action,details) VALUES(p_company,auth.uid(),'SET_LICENSE',jsonb_build_object('limit',p_limit,'expires_at',p_end,'status',p_status));
END $$;
