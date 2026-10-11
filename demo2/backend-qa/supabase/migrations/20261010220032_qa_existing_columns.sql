-- QA-only metadata baseline; preserves existing column names. NOT a production migration.
-- Refuses to operate on any database already containing RutaSales tables.
DO $$ BEGIN IF to_regclass('public.rs_accounts') IS NOT NULL THEN RAISE EXCEPTION 'QA baseline requires an empty database'; END IF; END $$;
CREATE TABLE public.rs_accounts (
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL,
  seller_id uuid,
  supervisor_user_id uuid,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id)
);
CREATE TABLE public.rs_customers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  allowed_radius_m integer DEFAULT 100 NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);
CREATE TABLE public.rs_incidents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  route_id uuid,
  seller_id uuid NOT NULL,
  incident_type text NOT NULL,
  details text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision,
  photo_data text NOT NULL,
  captured_at timestamp with time zone DEFAULT now() NOT NULL,
  resolved boolean DEFAULT false NOT NULL,
  reassigned_to uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  resolved_at timestamp with time zone,
  resolution_note text,
  proposal_name text,
  proposal_address text,
  approved_customer_id uuid,
  PRIMARY KEY (id)
);
CREATE TABLE public.rs_reassignments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  incident_id uuid,
  route_id uuid,
  from_seller_id uuid,
  to_seller_id uuid,
  pending_count integer DEFAULT 0 NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);
CREATE TABLE public.rs_routes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  supervisor_user_id uuid,
  PRIMARY KEY (id)
);
CREATE TABLE public.rs_sellers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  auth_user_id uuid,
  supervisor_user_id uuid,
  PRIMARY KEY (id)
);
CREATE TABLE public.rs_visits (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  route_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  customer_name text NOT NULL,
  address text NOT NULL,
  visit_date date DEFAULT CURRENT_DATE NOT NULL,
  status text DEFAULT 'PENDIENTE'::text NOT NULL,
  result text,
  lat double precision,
  lng double precision,
  accuracy double precision,
  photo_data text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  original_seller_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  evidence_source text,
  device_captured_at timestamp with time zone,
  target_lat double precision,
  target_lng double precision,
  allowed_radius_m integer DEFAULT 100 NOT NULL,
  distance_m double precision,
  within_zone boolean,
  customer_id uuid,
  parent_visit_id uuid,
  attempt_no integer DEFAULT 1 NOT NULL,
  reprogrammed_for timestamp with time zone,
  reprogram_reason text,
  PRIMARY KEY (id)
);
