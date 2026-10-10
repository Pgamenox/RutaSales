-- RutaGPS / backend license enforcement v0.2 (draft only; do NOT apply to shared RutaSales DB)
-- Requires schema-draft.sql and licencias-draft.sql; run in a dedicated staging project.
-- No direct client write grants or RPC activation are exposed.
begin;
create or replace function public.rgps_enforce_assignment()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare
  lic public.rgps_licenses%rowtype;
  active_count integer;
begin
  -- Serialize assignments for the same license, even across concurrent sessions.
  select * into lic from public.rgps_licenses where id = new.license_id for update;
  if not found then raise exception 'LICENSE_NOT_FOUND' using errcode = '23503'; end if;
  if lic.status <> 'ACTIVE' or now() < lic.starts_at or now() >= lic.expires_at then
    raise exception 'LICENSE_NOT_ACTIVE' using errcode = '23514';
  end if;
  if new.released_at is not null then
    raise exception 'NEW_ASSIGNMENT_MUST_BE_ACTIVE' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.rgps_memberships m
    where m.organization_id=lic.organization_id and m.user_id=new.worker_id
      and m.role='WORKER' and m.active
  ) then raise exception 'WORKER_NOT_IN_LICENSE_ORGANIZATION' using errcode='23514'; end if;
  select count(*) into active_count from public.rgps_license_assignments a
   where a.license_id=new.license_id and a.released_at is null;
  if active_count >= lic.capacity then
    raise exception 'LICENSE_CAPACITY_REACHED' using errcode='23514';
  end if;
  return new;
end;
$$;
drop trigger if exists rgps_assignment_capacity_guard on public.rgps_license_assignments;
create trigger rgps_assignment_capacity_guard before insert on public.rgps_license_assignments
 for each row execute function public.rgps_enforce_assignment();

-- Lock license row when reducing capacity, to make downgrade atomic with assignments.
create or replace function public.rgps_enforce_license_capacity()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare active_count integer;
begin
  if new.capacity < old.capacity then
    select count(*) into active_count from public.rgps_license_assignments a
    where a.license_id=new.id and a.released_at is null;
    if active_count > new.capacity then
      raise exception 'DOWNGRADE_BELOW_ACTIVE_ASSIGNMENTS' using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists rgps_license_capacity_guard on public.rgps_licenses;
create trigger rgps_license_capacity_guard before update of capacity on public.rgps_licenses
 for each row execute function public.rgps_enforce_license_capacity();

-- Supporting index avoids one license being used for two active rows per worker.
-- Additional policy: a worker cannot have multiple active licenses in same organization.
-- Must first settle rules for migrations/upgrades, then implement transactionally.
commit;

-- IMPORTANT security/deployment notes:
-- Functions are triggers, not direct public RPC endpoints. Revoke default EXECUTE
-- on these named functions from PUBLIC/anon/authenticated where deployment permits.
-- No service_role key in browser. Trusted backend enforces superadmin claims,
-- payment/activation authorization, audit log and a single transaction for changes.
-- Any change to organization_id, worker_id, license_id of existing assignments
-- must be disallowed by backend policies and restricted database grants.
-- RLS must be tested with distinct users and separate tenants before launch.
