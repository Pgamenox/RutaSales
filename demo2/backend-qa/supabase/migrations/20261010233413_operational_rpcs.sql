-- Independent QA candidate only. Operations authorize from account rows, never JWT metadata.
CREATE FUNCTION rs_private.submit_incident(p_route uuid,p_type text,p_details text,p_name text,p_address text,p_lat double precision,p_lng double precision,p_accuracy double precision,p_photo text,p_time timestamptz) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid;s uuid;id uuid;
BEGIN
 c:=rs_private.lock_actor();s:=rs_private.seller();
 IF rs_private.role()<>'VENDEDOR' OR s IS NULL OR NOT rs_private.owns_route(p_route) THEN RAISE EXCEPTION 'seller or route unauthorized';END IF;
 IF p_type IS NULL OR length(btrim(p_type)) NOT BETWEEN 1 AND 100 OR length(coalesce(p_details,''))>4000 THEN RAISE EXCEPTION 'invalid incident text';END IF;
 IF p_type='NUEVO CLIENTE' AND (p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 200 OR p_address IS NULL OR length(btrim(p_address)) NOT BETWEEN 1 AND 1000) THEN RAISE EXCEPTION 'invalid proposal';END IF;
 IF p_type<>'NUEVO CLIENTE' AND (p_name IS NOT NULL OR p_address IS NOT NULL) THEN RAISE EXCEPTION 'proposal fields require proposal type';END IF;
 PERFORM rs_private.validate_evidence(p_lat,p_lng,p_accuracy,p_photo,p_time);
 INSERT INTO public.rs_incidents(company_id,seller_id,route_id,incident_type,details,proposal_name,proposal_address,lat,lng,accuracy,photo_data,captured_at)
 VALUES(c,s,p_route,btrim(p_type),p_details,p_name,p_address,p_lat,p_lng,p_accuracy,p_photo,clock_timestamp()) RETURNING rs_incidents.id INTO id;
 INSERT INTO rs_private.audit(company_id,actor_id,action,details) VALUES(c,auth.uid(),'SUBMIT_INCIDENT',jsonb_build_object('incident_id',id));RETURN id;
END $$;
CREATE FUNCTION public.rs_submit_incident(p_route uuid,p_type text,p_details text,p_name text,p_address text,p_lat double precision,p_lng double precision,p_accuracy double precision,p_photo text,p_time timestamptz) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT rs_private.submit_incident(p_route,p_type,p_details,p_name,p_address,p_lat,p_lng,p_accuracy,p_photo,p_time) $$;

CREATE FUNCTION rs_private.resolve_incident(p_id uuid,p_decision text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid;i public.rs_incidents;customer uuid;
BEGIN
 c:=rs_private.lock_actor();
 IF rs_private.role() NOT IN ('CENTRAL','SUPERVISOR') THEN RAISE EXCEPTION 'manager required';END IF;
 SELECT * INTO i FROM public.rs_incidents WHERE id=p_id AND company_id=c AND NOT resolved FOR UPDATE;
 IF NOT FOUND OR NOT rs_private.owns_seller(i.seller_id) OR NOT rs_private.owns_route(i.route_id) THEN RAISE EXCEPTION 'incident unauthorized or resolved';END IF;
 IF (i.incident_type='NUEVO CLIENTE' AND p_decision NOT IN ('APROBADO','RECHAZADO')) OR (i.incident_type<>'NUEVO CLIENTE' AND p_decision<>'ATENDIDO') OR p_decision IS NULL THEN RAISE EXCEPTION 'invalid decision';END IF;
 IF p_decision='APROBADO' THEN
  IF i.proposal_name IS NULL OR length(btrim(i.proposal_name))=0 OR i.proposal_address IS NULL OR length(btrim(i.proposal_address))=0 THEN RAISE EXCEPTION 'invalid proposal';END IF;
  INSERT INTO public.rs_customers(company_id,name,address,lat,lng,allowed_radius_m) VALUES(c,i.proposal_name,i.proposal_address,i.lat,i.lng,100) RETURNING id INTO customer;
 END IF;
 UPDATE public.rs_incidents SET resolved=true,resolved_at=clock_timestamp(),resolution_note=p_decision,approved_customer_id=customer WHERE id=p_id;
 INSERT INTO rs_private.audit(company_id,actor_id,action,details) VALUES(c,auth.uid(),'RESOLVE_INCIDENT',jsonb_build_object('incident_id',p_id,'decision',p_decision,'customer_id',customer));RETURN customer;
END $$;
CREATE FUNCTION public.rs_resolve_incident(p_id uuid,p_decision text) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT rs_private.resolve_incident(p_id,p_decision) $$;

CREATE FUNCTION rs_private.reprogram_visit(p_visit_id uuid,p_reprogram_for timestamptz,p_reason text,p_lat double precision,p_lng double precision,p_accuracy double precision,p_photo_data text,p_device_captured_at timestamptz) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid;v public.rs_visits;id uuid;d double precision;
BEGIN
 c:=rs_private.lock_actor();
 IF rs_private.role()<>'VENDEDOR' THEN RAISE EXCEPTION 'seller required';END IF;
 SELECT * INTO v FROM public.rs_visits WHERE rs_visits.id=p_visit_id AND company_id=c AND seller_id=rs_private.seller() AND status='PENDIENTE' FOR UPDATE;
 IF NOT FOUND OR NOT rs_private.owns_route(v.route_id) THEN RAISE EXCEPTION 'visit unauthorized or not pending';END IF;
 IF p_reprogram_for IS NULL OR p_reprogram_for<=clock_timestamp() OR p_reprogram_for>clock_timestamp()+interval '1 year' OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'invalid reprogram date or reason';END IF;
 PERFORM rs_private.validate_evidence(p_lat,p_lng,p_accuracy,p_photo_data,p_device_captured_at);
 IF v.target_lat IS NOT NULL AND v.target_lng IS NOT NULL THEN d:=6371000*2*asin(sqrt(least(1.0,power(sin(radians(p_lat-v.target_lat)/2),2)+cos(radians(v.target_lat))*cos(radians(p_lat))*power(sin(radians(p_lng-v.target_lng)/2),2))));END IF;
 UPDATE public.rs_visits SET status='REPROGRAMADA',lat=p_lat,lng=p_lng,accuracy=p_accuracy,photo_data=p_photo_data,evidence_source='LIVE_CAMERA',device_captured_at=p_device_captured_at,completed_at=clock_timestamp(),reprogrammed_for=p_reprogram_for,reprogram_reason=btrim(p_reason),distance_m=d,within_zone=CASE WHEN d IS NULL THEN NULL ELSE d<=allowed_radius_m END WHERE rs_visits.id=p_visit_id;
 INSERT INTO public.rs_visits(company_id,route_id,seller_id,customer_id,customer_name,address,visit_date,target_lat,target_lng,allowed_radius_m,parent_visit_id,attempt_no,original_seller_id)
 VALUES(c,v.route_id,v.seller_id,v.customer_id,v.customer_name,v.address,(p_reprogram_for AT TIME ZONE 'America/Monterrey')::date,v.target_lat,v.target_lng,v.allowed_radius_m,v.id,v.attempt_no+1,v.original_seller_id) RETURNING rs_visits.id INTO id;
 INSERT INTO rs_private.audit(company_id,actor_id,action,details) VALUES(c,auth.uid(),'REPROGRAM_VISIT',jsonb_build_object('visit_id',p_visit_id,'new_visit_id',id));RETURN id;
END $$;
CREATE FUNCTION public.rs_reprogram_visit(p_visit_id uuid,p_reprogram_for timestamptz,p_reason text,p_lat double precision,p_lng double precision,p_accuracy double precision,p_photo_data text,p_device_captured_at timestamptz) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT rs_private.reprogram_visit(p_visit_id,p_reprogram_for,p_reason,p_lat,p_lng,p_accuracy,p_photo_data,p_device_captured_at) $$;
CREATE UNIQUE INDEX one_child_attempt ON public.rs_visits(company_id,parent_visit_id) WHERE parent_visit_id IS NOT NULL;

CREATE FUNCTION rs_private.assign_route(p_route uuid,p_supervisor uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c uuid;r public.rs_routes;
BEGIN
 c:=rs_private.lock_actor();IF rs_private.role()<>'CENTRAL' THEN RAISE EXCEPTION 'central required';END IF;
 SELECT * INTO r FROM public.rs_routes WHERE id=p_route AND company_id=c AND active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'route unauthorized';END IF;
 IF p_supervisor IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.rs_accounts WHERE user_id=p_supervisor AND company_id=c AND role='SUPERVISOR' AND active) THEN RAISE EXCEPTION 'active supervisor required';END IF;
 -- Do not move historical evidence or strand assignments under a different supervisor.
 IF r.supervisor_user_id IS DISTINCT FROM p_supervisor AND (EXISTS(SELECT 1 FROM public.rs_visits WHERE company_id=c AND route_id=p_route) OR EXISTS(SELECT 1 FROM public.rs_incidents WHERE company_id=c AND route_id=p_route)) THEN RAISE EXCEPTION 'route has history or assignments';END IF;
 UPDATE public.rs_routes SET supervisor_user_id=p_supervisor WHERE id=p_route;
 INSERT INTO rs_private.audit(company_id,actor_id,action,details) VALUES(c,auth.uid(),'ASSIGN_ROUTE',jsonb_build_object('route_id',p_route,'supervisor_id',p_supervisor));RETURN p_route;
END $$;
CREATE FUNCTION public.rs_assign_route(p_route uuid,p_supervisor uuid) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT rs_private.assign_route(p_route,p_supervisor) $$;

-- Explicit grants for invoker delegation; helper internals stay unavailable.
REVOKE EXECUTE ON FUNCTION rs_private.submit_incident(uuid,text,text,text,text,double precision,double precision,double precision,text,timestamptz),rs_private.resolve_incident(uuid,text),rs_private.reprogram_visit(uuid,timestamptz,text,double precision,double precision,double precision,text,timestamptz),rs_private.assign_route(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION rs_private.submit_incident(uuid,text,text,text,text,double precision,double precision,double precision,text,timestamptz),rs_private.resolve_incident(uuid,text),rs_private.reprogram_visit(uuid,timestamptz,text,double precision,double precision,double precision,text,timestamptz),rs_private.assign_route(uuid,uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rs_submit_incident(uuid,text,text,text,text,double precision,double precision,double precision,text,timestamptz),public.rs_resolve_incident(uuid,text),public.rs_reprogram_visit(uuid,timestamptz,text,double precision,double precision,double precision,text,timestamptz),public.rs_assign_route(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rs_submit_incident(uuid,text,text,text,text,double precision,double precision,double precision,text,timestamptz),public.rs_resolve_incident(uuid,text),public.rs_reprogram_visit(uuid,timestamptz,text,double precision,double precision,double precision,text,timestamptz),public.rs_assign_route(uuid,uuid) TO authenticated;
