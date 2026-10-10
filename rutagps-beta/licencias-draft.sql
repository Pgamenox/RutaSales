-- RutaGPS: borrador de licencias comerciales. NO EJECUTADO.
-- Requiere previamente schema-draft.sql en un proyecto Supabase independiente.
create table if not exists public.rgps_licenses (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.rgps_organizations(id),
 capacity integer not null check (capacity in (5,12,15,30)),
 starts_at timestamptz not null,
 expires_at timestamptz not null,
 status text not null check (status in ('PENDING','ACTIVE','SUSPENDED','EXPIRED')),
 created_at timestamptz not null default now(),
 check (expires_at > starts_at)
);
create table if not exists public.rgps_license_assignments (
 license_id uuid not null references public.rgps_licenses(id),
 worker_id uuid not null references auth.users(id),
 assigned_at timestamptz not null default now(),
 released_at timestamptz,
 primary key(license_id,worker_id,assigned_at)
);
create unique index if not exists rgps_one_active_assignment
 on public.rgps_license_assignments(license_id,worker_id) where released_at is null;
alter table public.rgps_licenses enable row level security;
alter table public.rgps_license_assignments enable row level security;
-- No policies on license write: operations must be performed by a trusted backend,
-- after payment verification and capacity checks in a transaction.
-- Never store activation keys as plaintext; store a salted verifier/hash,
-- use expiring one-time redemption and audit every activation/reassignment.
-- Ensure aggregate capacity is enforced in backend transaction, including concurrent assignments.
-- Multiple concurrent licenses and license upgrades need an explicit business rule before launch.
