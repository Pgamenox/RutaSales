-- RutaSales 2.0 — permisos operativos pendientes
-- NO ejecutado aún: el conector de Supabase perdió autorización el 2026-10-06.
-- Aplicar en RutaSales-DEMO una vez restablecida la conexión.

create or replace function private.rs_supervisor_for_user(p_user uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.supervisor_user_id
  from public.rs_accounts a
  where a.user_id = p_user and a.active = true
  limit 1
$$;

revoke all on function private.rs_supervisor_for_user(uuid) from public;
grant execute on function private.rs_supervisor_for_user(uuid) to authenticated;

drop policy if exists "rs_auth_seller_routes_select" on public.rs_routes;
create policy "rs_auth_seller_routes_select"
on public.rs_routes for select to authenticated
using (
  supervisor_user_id = private.rs_supervisor_for_user(auth.uid())
  and private.rs_role_for_user(auth.uid()) = 'VENDEDOR'
);

drop policy if exists "rs_auth_supervisor_customers_insert" on public.rs_customers;
create policy "rs_auth_supervisor_customers_insert"
on public.rs_customers for insert to authenticated
with check (private.rs_role_for_user(auth.uid()) = 'SUPERVISOR');

drop policy if exists "rs_auth_supervisor_customers_update" on public.rs_customers;
create policy "rs_auth_supervisor_customers_update"
on public.rs_customers for update to authenticated
using (private.rs_role_for_user(auth.uid()) = 'SUPERVISOR')
with check (private.rs_role_for_user(auth.uid()) = 'SUPERVISOR');

grant select, insert, update on public.rs_reassignments to authenticated;

drop policy if exists "rs_auth_central_reassignments" on public.rs_reassignments;
create policy "rs_auth_central_reassignments"
on public.rs_reassignments for all to authenticated
using (private.rs_role_for_user(auth.uid()) = 'CENTRAL')
with check (private.rs_role_for_user(auth.uid()) = 'CENTRAL');

drop policy if exists "rs_auth_supervisor_reassignments_select" on public.rs_reassignments;
create policy "rs_auth_supervisor_reassignments_select"
on public.rs_reassignments for select to authenticated
using (
  exists (
    select 1 from public.rs_sellers s
    where s.id = rs_reassignments.from_seller_id
      and s.supervisor_user_id = auth.uid()
  )
  or exists (
    select 1 from public.rs_sellers s
    where s.id = rs_reassignments.to_seller_id
      and s.supervisor_user_id = auth.uid()
  )
);

drop policy if exists "rs_auth_supervisor_reassignments_insert" on public.rs_reassignments;
create policy "rs_auth_supervisor_reassignments_insert"
on public.rs_reassignments for insert to authenticated
with check (
  private.rs_role_for_user(auth.uid()) = 'SUPERVISOR'
  and exists (
    select 1 from public.rs_sellers s
    where s.id = rs_reassignments.from_seller_id
      and s.supervisor_user_id = auth.uid()
  )
  and exists (
    select 1 from public.rs_sellers s
    where s.id = rs_reassignments.to_seller_id
      and s.supervisor_user_id = auth.uid()
  )
);
