-- Read-only diagnosis for the independent QA candidate. Does not unlock uncertain operations.
CREATE FUNCTION rs_private.account_request_status(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid;q rs_private.provision_requests;
BEGIN
 c:=rs_private.company();
 IF c IS NULL OR rs_private.role()<>'CENTRAL' THEN RAISE EXCEPTION 'central required';END IF;
 SELECT * INTO q FROM rs_private.provision_requests WHERE id=p_id AND company_id=c AND actor_id=auth.uid();
 IF NOT FOUND THEN RETURN jsonb_build_object('state','NOT_FOUND');END IF;
 RETURN jsonb_build_object('request_id',q.id,'state',q.state,'user_id',CASE WHEN q.state='COMPLETE' THEN q.auth_id ELSE NULL END,
  'needs_reconciliation',q.state='RECONCILE' OR (q.state='PENDING' AND q.expires_at<=now()),
  'retry_allowed',q.state='COMPLETE','created_at',q.created_at);
END $$;
CREATE FUNCTION public.rs_account_request_status(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT rs_private.account_request_status(p_id) $$;
CREATE FUNCTION rs_private.reset_status(p_target uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid;e rs_private.account_security;
BEGIN
 c:=rs_private.company();
 IF c IS NULL OR rs_private.role()<>'CENTRAL' THEN RAISE EXCEPTION 'central required';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.rs_accounts WHERE user_id=p_target AND company_id=c AND active AND role IN ('SUPERVISOR','VENDEDOR')) THEN RAISE EXCEPTION 'target unauthorized';END IF;
 SELECT * INTO e FROM rs_private.account_security WHERE user_id=p_target;
 RETURN jsonb_build_object('target_user_id',p_target,'state',CASE WHEN NOT FOUND THEN 'NORMAL' WHEN e.blocked THEN 'BLOCKED' ELSE 'REQUIRE_NEW_LOGIN' END,
  'needs_reconciliation',coalesce(e.blocked,false));
END $$;
CREATE FUNCTION public.rs_reset_status(p_target uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT rs_private.reset_status(p_target) $$;
REVOKE EXECUTE ON FUNCTION rs_private.account_request_status(uuid),rs_private.reset_status(uuid),public.rs_account_request_status(uuid),public.rs_reset_status(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION rs_private.account_request_status(uuid),rs_private.reset_status(uuid),public.rs_account_request_status(uuid),public.rs_reset_status(uuid) TO authenticated;
