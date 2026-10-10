-- Additional consistency checks for QA. No UI changes.
ALTER TABLE public.rs_customers ADD CHECK(lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180 AND allowed_radius_m BETWEEN 1 AND 10000);
CREATE FUNCTION rs_private.validate_supervisor() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.supervisor_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.rs_accounts WHERE user_id=NEW.supervisor_user_id AND company_id=NEW.company_id AND role='SUPERVISOR' AND active) THEN RAISE EXCEPTION 'active supervisor required';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER seller_supervisor BEFORE INSERT OR UPDATE OF supervisor_user_id,company_id ON public.rs_sellers FOR EACH ROW EXECUTE FUNCTION rs_private.validate_supervisor();
CREATE TRIGGER route_supervisor BEFORE INSERT OR UPDATE OF supervisor_user_id,company_id ON public.rs_routes FOR EACH ROW EXECUTE FUNCTION rs_private.validate_supervisor();
CREATE FUNCTION rs_private.validate_assignment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.rs_sellers;r public.rs_routes;c public.rs_customers;
BEGIN
 SELECT * INTO s FROM public.rs_sellers WHERE id=NEW.seller_id AND company_id=NEW.company_id;
 IF NOT FOUND OR NOT s.active THEN RAISE EXCEPTION 'active seller required';END IF;
 IF NEW.route_id IS NOT NULL THEN
  SELECT * INTO r FROM public.rs_routes WHERE id=NEW.route_id AND company_id=NEW.company_id;
  IF NOT FOUND OR NOT r.active OR r.supervisor_user_id IS NULL OR r.supervisor_user_id IS DISTINCT FROM s.supervisor_user_id THEN RAISE EXCEPTION 'route and seller supervisor mismatch';END IF;
 END IF;
 IF TG_TABLE_NAME='rs_visits' AND TG_OP='INSERT' THEN
 IF NEW.customer_id IS NOT NULL THEN
  SELECT * INTO c FROM public.rs_customers WHERE id=NEW.customer_id AND company_id=NEW.company_id AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'active customer required';END IF;
  NEW.customer_name:=c.name;NEW.address:=c.address;NEW.target_lat:=c.lat;NEW.target_lng:=c.lng;NEW.allowed_radius_m:=c.allowed_radius_m;
 END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER visit_assignment BEFORE INSERT OR UPDATE OF seller_id,route_id,company_id ON public.rs_visits FOR EACH ROW EXECUTE FUNCTION rs_private.validate_assignment();
CREATE TRIGGER incident_assignment BEFORE INSERT OR UPDATE OF seller_id,route_id,company_id ON public.rs_incidents FOR EACH ROW EXECUTE FUNCTION rs_private.validate_assignment();
REVOKE EXECUTE ON FUNCTION rs_private.validate_supervisor(),rs_private.validate_assignment() FROM PUBLIC,anon,authenticated;
