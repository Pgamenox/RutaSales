-- RutaGPS BETA 1.0 — ESQUEMA PREPARADO, NO APLICAR A RUTASALES-DEMO
-- Ejecutar solo en proyecto Supabase independiente RutaGPS tras revisar seguridad.
begin;
create extension if not exists pgcrypto;
create table if not exists public.rgps_organizations (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 2 and 160),
 created_at timestamptz not null default now()
);
create table if not exists public.rgps_memberships (
 organization_id uuid not null references public.rgps_organizations(id),
 user_id uuid not null references auth.users(id),
 role text not null check (role in ('CENTRAL','SUPERVISOR','WORKER')),
 active boolean not null default true,
 primary key(organization_id,user_id)
);
create table if not exists public.rgps_shifts (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.rgps_organizations(id),
 worker_id uuid not null references auth.users(id),
 started_at timestamptz not null default now(),
 ended_at timestamptz,
 check (ended_at is null or ended_at >= started_at)
);
create table if not exists public.rgps_positions (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.rgps_organizations(id),
 worker_id uuid not null references auth.users(id),
 shift_id uuid not null references public.rgps_shifts(id),
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 accuracy_m double precision check(accuracy_m >= 0),
 recorded_at timestamptz not null,
 received_at timestamptz not null default now(),
 idempotency_key uuid not null,
 unique(organization_id,worker_id,idempotency_key)
);
create index if not exists rgps_positions_history_idx on public.rgps_positions(organization_id,worker_id,recorded_at desc);
create index if not exists rgps_shifts_active_idx on public.rgps_shifts(organization_id,worker_id) where ended_at is null;
alter table public.rgps_organizations enable row level security;
alter table public.rgps_memberships enable row level security;
alter table public.rgps_shifts enable row level security;
alter table public.rgps_positions enable row level security;
-- Read-only policies (fase inicial): alta de organizaciones/miembros y escritura de posiciones
-- exclusivamente desde backend autenticado que valide identidad, pertenencia y jornada.
create policy rgps_memberships_self_select on public.rgps_memberships for select to authenticated
 using (user_id = (select auth.uid()));
create policy rgps_organizations_member_read on public.rgps_organizations for select to authenticated
 using (exists (select 1 from public.rgps_memberships m where m.organization_id=id and m.user_id=(select auth.uid()) and m.active));
create policy rgps_shifts_member_read on public.rgps_shifts for select to authenticated
 using (exists (select 1 from public.rgps_memberships m where m.organization_id=rgps_shifts.organization_id and m.user_id=(select auth.uid()) and m.active
 and (m.role in ('CENTRAL','SUPERVISOR') or rgps_shifts.worker_id=(select auth.uid()))));
create policy rgps_positions_privileged_read on public.rgps_positions for select to authenticated
 using (exists (select 1 from public.rgps_memberships m where m.organization_id=rgps_positions.organization_id and m.user_id=(select auth.uid()) and m.active and m.role in ('CENTRAL','SUPERVISOR')));
-- Intencionalmente sin permisos INSERT/UPDATE/DELETE desde cliente sobre posiciones.
-- Backend debe comprobar: trabajador del tenant, shift abierto, consentimiento/documentación,
-- frescura temporal, precisión, límite de frecuencia y que shift.worker_id coincida.
commit;
