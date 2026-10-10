-- Review candidate, QA only. Existing databases require a separate data-mapping migration.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.rs_accounts) OR EXISTS(SELECT 1 FROM public.rs_visits)
 THEN RAISE EXCEPTION 'Tenant candidate requires an empty QA baseline'; END IF;
END $$;
CREATE SCHEMA rs_private;
REVOKE ALL ON SCHEMA rs_private FROM PUBLIC;
GRANT USAGE ON SCHEMA rs_private TO authenticated;
CREATE TABLE public.rs_companies(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,active boolean NOT NULL DEFAULT true);
CREATE TABLE public.rs_licenses(
 company_id uuid PRIMARY KEY REFERENCES public.rs_companies(id),
 seller_limit integer NOT NULL CHECK(seller_limit BETWEEN 1 AND 1000),
 starts_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,
 status text NOT NULL CHECK(status IN ('ACTIVE','SUSPENDED')),
 CHECK(expires_at>starts_at));
CREATE TABLE rs_private.superadmins(user_id uuid PRIMARY KEY REFERENCES auth.users(id),active boolean NOT NULL DEFAULT true);
CREATE TABLE rs_private.audit(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid REFERENCES public.rs_companies(id),actor_id uuid,action text NOT NULL,details jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE rs_private.superadmins ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs_private.audit ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION rs_private.is_superadmin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM rs_private.superadmins s WHERE s.user_id=auth.uid() AND s.active)
$$;
ALTER TABLE public.rs_accounts ADD COLUMN company_id uuid NOT NULL REFERENCES public.rs_companies(id);
ALTER TABLE public.rs_accounts ADD UNIQUE(company_id,user_id);
ALTER TABLE public.rs_sellers ADD COLUMN company_id uuid NOT NULL REFERENCES public.rs_companies(id);
ALTER TABLE public.rs_sellers ADD UNIQUE(company_id,id);
ALTER TABLE public.rs_routes ADD COLUMN company_id uuid NOT NULL REFERENCES public.rs_companies(id);
ALTER TABLE public.rs_routes ADD UNIQUE(company_id,id);
ALTER TABLE public.rs_customers ADD COLUMN company_id uuid NOT NULL REFERENCES public.rs_companies(id);
ALTER TABLE public.rs_customers ADD UNIQUE(company_id,id);
ALTER TABLE public.rs_visits ADD COLUMN company_id uuid NOT NULL REFERENCES public.rs_companies(id);
ALTER TABLE public.rs_visits ADD UNIQUE(company_id,id);
ALTER TABLE public.rs_incidents ADD COLUMN company_id uuid NOT NULL REFERENCES public.rs_companies(id);
ALTER TABLE public.rs_incidents ADD UNIQUE(company_id,id);
ALTER TABLE public.rs_reassignments ADD COLUMN company_id uuid NOT NULL REFERENCES public.rs_companies(id);
ALTER TABLE public.rs_reassignments ADD UNIQUE(company_id,id);
CREATE FUNCTION rs_private.company() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT a.company_id FROM public.rs_accounts a JOIN public.rs_companies c ON c.id=a.company_id WHERE a.user_id=auth.uid() AND a.active AND c.active
$$;

CREATE FUNCTION rs_private.role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT a.role FROM public.rs_accounts a WHERE a.user_id=auth.uid() AND a.active AND a.company_id=rs_private.company()
$$;
CREATE FUNCTION rs_private.seller() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT a.seller_id FROM public.rs_accounts a JOIN public.rs_sellers s ON s.company_id=a.company_id AND s.id=a.seller_id WHERE a.user_id=auth.uid() AND a.active AND s.active AND a.role='VENDEDOR' AND a.company_id=rs_private.company()
$$;
CREATE FUNCTION rs_private.owns_seller(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.rs_sellers s WHERE s.id=p_id AND s.company_id=rs_private.company() AND (rs_private.role()='CENTRAL' OR (rs_private.role()='SUPERVISOR' AND s.supervisor_user_id=auth.uid()) OR (rs_private.role()='VENDEDOR' AND s.id=rs_private.seller())))
$$;
CREATE FUNCTION rs_private.owns_route(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.rs_routes r WHERE r.id=p_id AND r.company_id=rs_private.company() AND (rs_private.role()='CENTRAL' OR (rs_private.role()='SUPERVISOR' AND r.supervisor_user_id=auth.uid()) OR (rs_private.role()='VENDEDOR' AND r.supervisor_user_id=(SELECT a.supervisor_user_id FROM public.rs_accounts a WHERE a.user_id=auth.uid()))))
$$;
CREATE FUNCTION rs_private.licensed(p_company uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.rs_licenses l JOIN public.rs_companies c ON c.id=l.company_id WHERE l.company_id=p_company AND c.active AND l.status='ACTIVE' AND l.starts_at<=now() AND l.expires_at>now())
$$;
ALTER TABLE public.rs_accounts ADD CONSTRAINT account_role CHECK(role IN ('CENTRAL','SUPERVISOR','VENDEDOR'));
ALTER TABLE public.rs_accounts ADD CONSTRAINT account_user FOREIGN KEY(user_id) REFERENCES auth.users(id);
ALTER TABLE public.rs_accounts ADD FOREIGN KEY(company_id,seller_id) REFERENCES public.rs_sellers(company_id,id);
ALTER TABLE public.rs_accounts ADD FOREIGN KEY(company_id,supervisor_user_id) REFERENCES public.rs_accounts(company_id,user_id);
ALTER TABLE public.rs_sellers ADD FOREIGN KEY(company_id,auth_user_id) REFERENCES public.rs_accounts(company_id,user_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.rs_sellers ADD FOREIGN KEY(company_id,supervisor_user_id) REFERENCES public.rs_accounts(company_id,user_id);
ALTER TABLE public.rs_routes ADD FOREIGN KEY(company_id,supervisor_user_id) REFERENCES public.rs_accounts(company_id,user_id);
ALTER TABLE public.rs_visits ADD FOREIGN KEY(company_id,route_id) REFERENCES public.rs_routes(company_id,id);
ALTER TABLE public.rs_visits ADD FOREIGN KEY(company_id,seller_id) REFERENCES public.rs_sellers(company_id,id);
ALTER TABLE public.rs_visits ADD FOREIGN KEY(company_id,original_seller_id) REFERENCES public.rs_sellers(company_id,id);
ALTER TABLE public.rs_visits ADD FOREIGN KEY(company_id,customer_id) REFERENCES public.rs_customers(company_id,id);
ALTER TABLE public.rs_visits ADD FOREIGN KEY(company_id,parent_visit_id) REFERENCES public.rs_visits(company_id,id);
ALTER TABLE public.rs_visits ADD CONSTRAINT visit_status CHECK(status IN ('PENDIENTE','COMPLETADA','REPROGRAMADA'));
ALTER TABLE public.rs_visits ADD CHECK(attempt_no>0);
ALTER TABLE public.rs_incidents ADD FOREIGN KEY(company_id,seller_id) REFERENCES public.rs_sellers(company_id,id);
ALTER TABLE public.rs_incidents ADD FOREIGN KEY(company_id,route_id) REFERENCES public.rs_routes(company_id,id);
ALTER TABLE public.rs_incidents ADD FOREIGN KEY(company_id,reassigned_to) REFERENCES public.rs_sellers(company_id,id);
ALTER TABLE public.rs_incidents ADD FOREIGN KEY(company_id,approved_customer_id) REFERENCES public.rs_customers(company_id,id);
ALTER TABLE public.rs_reassignments ADD FOREIGN KEY(company_id,from_seller_id) REFERENCES public.rs_sellers(company_id,id);
ALTER TABLE public.rs_reassignments ADD FOREIGN KEY(company_id,to_seller_id) REFERENCES public.rs_sellers(company_id,id);
ALTER TABLE public.rs_reassignments ADD FOREIGN KEY(company_id,route_id) REFERENCES public.rs_routes(company_id,id);
ALTER TABLE public.rs_reassignments ADD FOREIGN KEY(company_id,incident_id) REFERENCES public.rs_incidents(company_id,id);
CREATE UNIQUE INDEX one_central_per_company ON public.rs_accounts(company_id) WHERE role='CENTRAL' AND active;
CREATE UNIQUE INDEX seller_auth ON public.rs_sellers(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE UNIQUE INDEX seller_name_tenant ON public.rs_sellers(company_id,name);
CREATE UNIQUE INDEX route_name_tenant ON public.rs_routes(company_id,name);
CREATE UNIQUE INDEX visit_attempt_tenant ON public.rs_visits(company_id,customer_id,route_id,visit_date,attempt_no) WHERE customer_id IS NOT NULL;
CREATE INDEX seller_supervisor_tenant ON public.rs_sellers(company_id,supervisor_user_id);
CREATE INDEX route_supervisor_tenant ON public.rs_routes(company_id,supervisor_user_id);
CREATE INDEX visit_pending_tenant ON public.rs_visits(company_id,seller_id,route_id,status);
CREATE INDEX visit_history_tenant ON public.rs_visits(company_id,visit_date,id);
CREATE INDEX incident_seller_tenant ON public.rs_incidents(company_id,seller_id);
CREATE INDEX reassign_history_tenant ON public.rs_reassignments(company_id,created_at);

-- No anon grant, legacy header policy or public default function execution.
ALTER TABLE public.rs_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rs_licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_read ON public.rs_companies FOR SELECT TO authenticated USING(id=(SELECT rs_private.company()) OR (SELECT rs_private.is_superadmin()));
CREATE POLICY license_read ON public.rs_licenses FOR SELECT TO authenticated USING(company_id=(SELECT rs_private.company()) OR (SELECT rs_private.is_superadmin()));
REVOKE ALL ON public.rs_companies,public.rs_licenses FROM anon,authenticated;
GRANT SELECT ON public.rs_companies,public.rs_licenses TO authenticated;
ALTER TABLE public.rs_accounts ALTER COLUMN company_id SET DEFAULT rs_private.company();
ALTER TABLE public.rs_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rs_accounts FROM anon,authenticated;
GRANT SELECT ON public.rs_accounts TO authenticated;
CREATE POLICY tenant_read ON public.rs_accounts FOR SELECT TO authenticated USING(company_id=(SELECT rs_private.company()) AND (user_id=(SELECT auth.uid()) OR (SELECT rs_private.role())='CENTRAL'));
ALTER TABLE public.rs_sellers ALTER COLUMN company_id SET DEFAULT rs_private.company();
ALTER TABLE public.rs_sellers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rs_sellers FROM anon,authenticated;
GRANT SELECT ON public.rs_sellers TO authenticated;
CREATE POLICY tenant_read ON public.rs_sellers FOR SELECT TO authenticated USING(company_id=(SELECT rs_private.company()) AND rs_private.owns_seller(id));
ALTER TABLE public.rs_routes ALTER COLUMN company_id SET DEFAULT rs_private.company();
ALTER TABLE public.rs_routes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rs_routes FROM anon,authenticated;
GRANT SELECT ON public.rs_routes TO authenticated;
CREATE POLICY tenant_read ON public.rs_routes FOR SELECT TO authenticated USING(company_id=(SELECT rs_private.company()) AND rs_private.owns_route(id));
ALTER TABLE public.rs_customers ALTER COLUMN company_id SET DEFAULT rs_private.company();
ALTER TABLE public.rs_customers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rs_customers FROM anon,authenticated;
GRANT SELECT ON public.rs_customers TO authenticated;
CREATE POLICY tenant_read ON public.rs_customers FOR SELECT TO authenticated USING(company_id=(SELECT rs_private.company()) AND true);
ALTER TABLE public.rs_visits ALTER COLUMN company_id SET DEFAULT rs_private.company();
ALTER TABLE public.rs_visits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rs_visits FROM anon,authenticated;
GRANT SELECT ON public.rs_visits TO authenticated;
CREATE POLICY tenant_read ON public.rs_visits FOR SELECT TO authenticated USING(company_id=(SELECT rs_private.company()) AND rs_private.owns_seller(seller_id) AND rs_private.owns_route(route_id));
ALTER TABLE public.rs_incidents ALTER COLUMN company_id SET DEFAULT rs_private.company();
ALTER TABLE public.rs_incidents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rs_incidents FROM anon,authenticated;
GRANT SELECT ON public.rs_incidents TO authenticated;
CREATE POLICY tenant_read ON public.rs_incidents FOR SELECT TO authenticated USING(company_id=(SELECT rs_private.company()) AND rs_private.owns_seller(seller_id) AND (route_id IS NULL OR rs_private.owns_route(route_id)));
ALTER TABLE public.rs_reassignments ALTER COLUMN company_id SET DEFAULT rs_private.company();
ALTER TABLE public.rs_reassignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rs_reassignments FROM anon,authenticated;
GRANT SELECT ON public.rs_reassignments TO authenticated;
CREATE POLICY tenant_read ON public.rs_reassignments FOR SELECT TO authenticated USING(company_id=(SELECT rs_private.company()) AND ((SELECT rs_private.role())='CENTRAL' OR ((SELECT rs_private.role())='SUPERVISOR' AND rs_private.owns_seller(from_seller_id) AND rs_private.owns_seller(to_seller_id))));
GRANT INSERT(company_id,route_id,seller_id,customer_id,customer_name,address,visit_date,status,target_lat,target_lng,allowed_radius_m) ON public.rs_visits TO authenticated;
GRANT INSERT(company_id,name,address,lat,lng,allowed_radius_m,active) ON public.rs_customers TO authenticated;
CREATE POLICY visit_insert ON public.rs_visits FOR INSERT TO authenticated WITH CHECK(company_id=(SELECT rs_private.company()) AND rs_private.licensed(company_id) AND (SELECT rs_private.role()) IN ('CENTRAL','SUPERVISOR') AND rs_private.owns_seller(seller_id) AND rs_private.owns_route(route_id) AND status='PENDIENTE' AND photo_data IS NULL AND completed_at IS NULL AND original_seller_id IS NULL AND parent_visit_id IS NULL AND attempt_no=1);
CREATE POLICY customer_insert ON public.rs_customers FOR INSERT TO authenticated WITH CHECK(company_id=(SELECT rs_private.company()) AND rs_private.licensed(company_id) AND (SELECT rs_private.role()) IN ('CENTRAL','SUPERVISOR'));
-- Every quota writer locks the same company row. No network calls in transactions.
CREATE FUNCTION rs_private.enforce_quota() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE lim integer;n integer;
BEGIN
 IF TG_OP='UPDATE' AND NEW.company_id<>OLD.company_id THEN RAISE EXCEPTION 'company immutable';END IF;
 PERFORM 1 FROM public.rs_companies WHERE id=NEW.company_id FOR UPDATE;
 IF NEW.active AND (TG_OP='INSERT' OR NOT OLD.active) THEN
  IF NOT rs_private.licensed(NEW.company_id) THEN RAISE EXCEPTION 'license inactive';END IF;
  SELECT seller_limit INTO lim FROM public.rs_licenses WHERE company_id=NEW.company_id;
  SELECT count(*) INTO n FROM public.rs_sellers WHERE company_id=NEW.company_id AND active AND id<>NEW.id;
  IF n>=lim THEN RAISE EXCEPTION 'seller quota exceeded';END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER quota BEFORE INSERT OR UPDATE ON public.rs_sellers FOR EACH ROW EXECUTE FUNCTION rs_private.enforce_quota();
CREATE FUNCTION rs_private.lock_actor(p_require_license boolean DEFAULT true) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid;
BEGIN
 c:=rs_private.company();IF c IS NULL THEN RAISE EXCEPTION 'unauthorized';END IF;
 PERFORM 1 FROM public.rs_companies WHERE id=c FOR UPDATE;
 -- Recheck account/company after obtaining the lock.
 IF rs_private.company() IS DISTINCT FROM c THEN RAISE EXCEPTION 'unauthorized';END IF;
 IF p_require_license AND NOT rs_private.licensed(c) THEN RAISE EXCEPTION 'license inactive';END IF;
 RETURN c;
END $$;
CREATE FUNCTION rs_private.validate_evidence(p_lat double precision,p_lng double precision,p_accuracy double precision,p_photo text,p_time timestamptz) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF p_lat IS NULL OR NOT p_lat BETWEEN -90 AND 90 OR p_lng IS NULL OR NOT p_lng BETWEEN -180 AND 180 OR p_accuracy IS NULL OR NOT p_accuracy BETWEEN 0 AND 150 OR p_time IS NULL OR p_time>clock_timestamp()+interval '10 seconds' OR p_time<clock_timestamp()-interval '2 minutes' THEN RAISE EXCEPTION 'invalid or stale GPS';END IF;
 IF p_photo IS NULL OR length(p_photo)>2000000 OR p_photo !~ '^data:image/(jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$' THEN RAISE EXCEPTION 'invalid photo format';END IF;
 -- Decode and require a PNG/JPEG signature. Does not prove physical camera origin.
 IF NOT (substring(decode(split_part(p_photo,',',2),'base64') from 1 for 3)=decode('ffd8ff','hex') OR substring(decode(split_part(p_photo,',',2),'base64') from 1 for 8)=decode('89504e470d0a1a0a','hex')) THEN RAISE EXCEPTION 'invalid image signature';END IF;
END $$;
CREATE FUNCTION rs_private.complete_visit(p_id uuid,p_lat double precision,p_lng double precision,p_accuracy double precision,p_photo text,p_time timestamptz,p_result text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid;v public.rs_visits;d double precision;
BEGIN
 c:=rs_private.lock_actor();
 IF rs_private.role()<>'VENDEDOR' THEN RAISE EXCEPTION 'seller required';END IF;
 SELECT * INTO v FROM public.rs_visits WHERE id=p_id AND company_id=c AND seller_id=rs_private.seller() AND status='PENDIENTE' FOR UPDATE;
 IF NOT FOUND OR NOT rs_private.owns_route(v.route_id) THEN RAISE EXCEPTION 'visit not pending or unauthorized';END IF;
 PERFORM rs_private.validate_evidence(p_lat,p_lng,p_accuracy,p_photo,p_time);
 IF v.target_lat IS NOT NULL AND v.target_lng IS NOT NULL THEN
 d:=6371000*2*asin(sqrt(least(1.0,power(sin(radians(p_lat-v.target_lat)/2),2)+cos(radians(v.target_lat))*cos(radians(p_lat))*power(sin(radians(p_lng-v.target_lng)/2),2))));END IF;
 UPDATE public.rs_visits SET status='COMPLETADA',lat=p_lat,lng=p_lng,accuracy=p_accuracy,photo_data=p_photo,device_captured_at=p_time,evidence_source='LIVE_CAMERA',completed_at=clock_timestamp(),distance_m=d,within_zone=CASE WHEN d IS NULL THEN NULL ELSE d<=allowed_radius_m END,result=p_result WHERE id=p_id;
 INSERT INTO rs_private.audit(company_id,actor_id,action,details) VALUES(c,auth.uid(),'COMPLETE_VISIT',jsonb_build_object('visit_id',p_id));RETURN p_id;
END $$;
CREATE FUNCTION public.rs_complete_visit(p_id uuid,p_lat double precision,p_lng double precision,p_accuracy double precision,p_photo text,p_time timestamptz,p_result text) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT rs_private.complete_visit(p_id,p_lat,p_lng,p_accuracy,p_photo,p_time,p_result) $$;

CREATE FUNCTION rs_private.reassign(p_incident uuid,p_to uuid,p_reason text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid;i public.rs_incidents;n integer;
BEGIN
 c:=rs_private.lock_actor();IF rs_private.role() NOT IN ('CENTRAL','SUPERVISOR') THEN RAISE EXCEPTION 'manager required';END IF;
 SELECT * INTO i FROM public.rs_incidents WHERE id=p_incident AND company_id=c AND NOT resolved FOR UPDATE;
 IF NOT FOUND OR NOT rs_private.owns_seller(i.seller_id) OR NOT rs_private.owns_seller(p_to) OR NOT rs_private.owns_route(i.route_id) OR p_to=i.seller_id OR NOT EXISTS(SELECT 1 FROM public.rs_sellers WHERE id=p_to AND company_id=c AND active) THEN RAISE EXCEPTION 'invalid reassignment';END IF;
 UPDATE public.rs_visits SET seller_id=p_to,original_seller_id=coalesce(original_seller_id,i.seller_id) WHERE company_id=c AND seller_id=i.seller_id AND route_id=i.route_id AND status='PENDIENTE';GET DIAGNOSTICS n=ROW_COUNT;
 INSERT INTO public.rs_reassignments(company_id,incident_id,route_id,from_seller_id,to_seller_id,pending_count,reason) VALUES(c,p_incident,i.route_id,i.seller_id,p_to,n,p_reason);
 UPDATE public.rs_incidents SET resolved=true,resolved_at=clock_timestamp(),reassigned_to=p_to,resolution_note=p_reason WHERE id=p_incident;
 INSERT INTO rs_private.audit(company_id,actor_id,action,details) VALUES(c,auth.uid(),'REASSIGN',jsonb_build_object('incident_id',p_incident,'count',n));RETURN n;
END $$;
CREATE FUNCTION public.rs_reassign_incident(p_incident uuid,p_to uuid,p_reason text) RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT rs_private.reassign(p_incident,p_to,p_reason) $$;

CREATE FUNCTION rs_private.deactivate(p_seller uuid,p_to uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid;n integer;s public.rs_sellers;
BEGIN
 c:=rs_private.lock_actor(false);IF rs_private.role()<>'CENTRAL' THEN RAISE EXCEPTION 'central required';END IF;
 SELECT * INTO s FROM public.rs_sellers WHERE id=p_seller AND company_id=c AND active FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'seller inactive or unauthorized';END IF;
 IF p_to IS NOT NULL AND (p_to=p_seller OR NOT EXISTS(SELECT 1 FROM public.rs_sellers WHERE id=p_to AND company_id=c AND active)) THEN RAISE EXCEPTION 'invalid replacement';END IF;
 SELECT count(*) INTO n FROM public.rs_visits WHERE company_id=c AND seller_id=p_seller AND status='PENDIENTE';
 IF n>0 AND p_to IS NULL THEN RAISE EXCEPTION 'pending visits require replacement';END IF;
 UPDATE public.rs_visits SET seller_id=p_to,original_seller_id=coalesce(original_seller_id,p_seller) WHERE company_id=c AND seller_id=p_seller AND status='PENDIENTE';
 IF n>0 THEN INSERT INTO public.rs_reassignments(company_id,from_seller_id,to_seller_id,pending_count,reason) VALUES(c,p_seller,p_to,n,'Baja desde Central');END IF;
 UPDATE public.rs_sellers SET active=false WHERE id=p_seller;
 UPDATE public.rs_accounts SET active=false WHERE user_id=s.auth_user_id AND company_id=c;
 INSERT INTO rs_private.audit(company_id,actor_id,action,details) VALUES(c,auth.uid(),'DEACTIVATE',jsonb_build_object('seller_id',p_seller,'count',n));RETURN n;
END $$;
CREATE FUNCTION public.rs_deactivate_seller(p_seller uuid,p_to uuid DEFAULT NULL) RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT rs_private.deactivate(p_seller,p_to) $$;

CREATE FUNCTION rs_private.set_license(p_company uuid,p_limit integer,p_start timestamptz,p_end timestamptz,p_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer;
BEGIN
 IF NOT rs_private.is_superadmin() THEN RAISE EXCEPTION 'superadmin required';END IF;
 PERFORM 1 FROM public.rs_companies WHERE id=p_company FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'company missing';END IF;
 SELECT count(*) INTO n FROM public.rs_sellers WHERE company_id=p_company AND active;IF p_limit<n THEN RAISE EXCEPTION 'limit below active sellers';END IF;
 INSERT INTO public.rs_licenses VALUES(p_company,p_limit,p_start,p_end,p_status) ON CONFLICT(company_id) DO UPDATE SET seller_limit=excluded.seller_limit,starts_at=excluded.starts_at,expires_at=excluded.expires_at,status=excluded.status;
 INSERT INTO rs_private.audit(company_id,actor_id,action,details) VALUES(p_company,auth.uid(),'SET_LICENSE',jsonb_build_object('limit',p_limit,'expires_at',p_end,'status',p_status));
END $$;
CREATE FUNCTION public.rs_set_license(p_company uuid,p_limit integer,p_start timestamptz,p_end timestamptz,p_status text) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT rs_private.set_license(p_company,p_limit,p_start,p_end,p_status) $$;

REVOKE ALL ON ALL TABLES IN SCHEMA rs_private FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA rs_private FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION rs_private.company(),rs_private.role(),rs_private.seller(),rs_private.owns_seller(uuid),rs_private.owns_route(uuid),rs_private.licensed(uuid),rs_private.is_superadmin() TO authenticated;
-- Invoker wrappers can only delegate to explicitly authorized private operations.
GRANT EXECUTE ON FUNCTION rs_private.complete_visit(uuid,double precision,double precision,double precision,text,timestamptz,text),rs_private.reassign(uuid,uuid,text),rs_private.deactivate(uuid,uuid),rs_private.set_license(uuid,integer,timestamptz,timestamptz,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rs_complete_visit(uuid,double precision,double precision,double precision,text,timestamptz,text),public.rs_reassign_incident(uuid,uuid,text),public.rs_deactivate_seller(uuid,uuid),public.rs_set_license(uuid,integer,timestamptz,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rs_complete_visit(uuid,double precision,double precision,double precision,text,timestamptz,text),public.rs_reassign_incident(uuid,uuid,text),public.rs_deactivate_seller(uuid,uuid),public.rs_set_license(uuid,integer,timestamptz,timestamptz,text) TO authenticated;
