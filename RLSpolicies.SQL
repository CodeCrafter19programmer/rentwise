alter table profiles enable row level security;
alter table profiles force row level security;
alter table properties enable row level security;
alter table properties force row level security;
alter table units enable row level security;
alter table units force row level security;
alter table leases enable row level security;
alter table leases force row level security;
alter table payments enable row level security;
alter table payments force row level security;
alter table maintenance_requests enable row level security;
alter table maintenance_requests force row level security;
alter table messages enable row level security;
alter table messages force row level security;
alter table expenses enable row level security;
alter table expenses force row level security;

-- PROFILES
create policy "self read profile" on profiles
for select to authenticated
using (id = auth.uid());

-- PROPERTIES
create policy "manager read properties" on properties
for select to authenticated
using (manager_id = auth.uid()
   or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "tenant read leased property" on properties
for select to authenticated
using (
  exists (
    select 1 from leases l
    join units u on u.id = l.unit_id
    where l.tenant_id = auth.uid()
      and l.is_active = true
      and u.property_id = properties.id
  )
);

-- UNITS
create policy "manager read units" on units
for select to authenticated
using (exists (select 1 from properties pr where pr.id = units.property_id and (pr.manager_id = auth.uid()
   or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))));

create policy "tenant read leased unit" on units
for select to authenticated
using (
  exists (
    select 1 from leases l
    where l.tenant_id = auth.uid()
      and l.is_active = true
      and l.unit_id = units.id
  )
);

-- LEASES
create policy "tenant read own lease" on leases
for select to authenticated
using (tenant_id = auth.uid());

create policy "manager read leases" on leases
for select to authenticated
using (exists (
  select 1 from units u join properties pr on pr.id = u.property_id
  where u.id = leases.unit_id and (pr.manager_id = auth.uid()
     or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
));

-- PAYMENTS
create policy "tenant read payments" on payments
for select to authenticated
using (exists (select 1 from leases l where l.id = payments.lease_id and l.tenant_id = auth.uid()));

create policy "manager read payments" on payments
for select to authenticated
using (exists (
  select 1 from leases l join units u on u.id = l.unit_id
  join properties pr on pr.id = u.property_id
  where l.id = payments.lease_id and (pr.manager_id = auth.uid()
     or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
));

create policy "tenant update own payments" on payments
for update to authenticated
using (exists (select 1 from leases l where l.id = payments.lease_id and l.tenant_id = auth.uid()))
with check (exists (select 1 from leases l where l.id = payments.lease_id and l.tenant_id = auth.uid()));

create policy "manager update payments" on payments
for update to authenticated
using (exists (
  select 1 from leases l join units u on u.id = l.unit_id
  join properties pr on pr.id = u.property_id
  where l.id = payments.lease_id and pr.manager_id = auth.uid()))
with check (exists (
  select 1 from leases l join units u on u.id = l.unit_id
  join properties pr on pr.id = u.property_id
  where l.id = payments.lease_id and pr.manager_id = auth.uid()));

-- tighten updates to only columns used by the client write flow
revoke update on payments from authenticated;
grant update (status, paid_at, payment_method) on payments to authenticated;

-- MAINTENANCE REQUESTS
create policy "tenant read maint" on maintenance_requests
for select to authenticated
using (tenant_id = auth.uid());

create policy "tenant create maint" on maintenance_requests
for insert to authenticated
with check (tenant_id = auth.uid());

create policy "manager read maint" on maintenance_requests
for select to authenticated
using (exists (
  select 1 from units u join properties pr on pr.id = u.property_id
  where u.id = maintenance_requests.unit_id and pr.manager_id = auth.uid()
));

create policy "manager update maint" on maintenance_requests
for update to authenticated
using (exists (
  select 1 from units u join properties pr on pr.id = u.property_id
  where u.id = maintenance_requests.unit_id and pr.manager_id = auth.uid()))
with check (exists (
  select 1 from units u join properties pr on pr.id = u.property_id
  where u.id = maintenance_requests.unit_id and pr.manager_id = auth.uid()
));

-- MESSAGES
create policy "user read messages" on messages
for select to authenticated
using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "user send messages" on messages
for insert to authenticated
with check (sender_id = auth.uid());

create policy "receiver update read" on messages
for update to authenticated
using (receiver_id = auth.uid())
with check (receiver_id = auth.uid());

-- tighten updates to only is_read (used by the client write flow)
revoke update on messages from authenticated;
grant update (is_read) on messages to authenticated;

-- EXPENSES
create policy "manager read expenses" on expenses
for select to authenticated
using (exists (select 1 from properties pr where pr.id = expenses.property_id and (pr.manager_id = auth.uid()
   or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))));

create policy "manager write expenses" on expenses
for insert to authenticated
with check (exists (select 1 from properties pr where pr.id = expenses.property_id and pr.manager_id = auth.uid()));

create policy "manager update expenses" on expenses
for update to authenticated
using (exists (select 1 from properties pr where pr.id = expenses.property_id and pr.manager_id = auth.uid()))
with check (exists (select 1 from properties pr where pr.id = expenses.property_id and pr.manager_id = auth.uid()));

-- DELETE POLICIES

-- Admin can delete any profile (except themselves for safety)
create policy "admin delete profiles" on profiles
for delete to authenticated
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin') and id != auth.uid());

-- Admin can delete properties
create policy "admin delete properties" on properties
for delete to authenticated
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Manager can delete units in their properties
create policy "manager delete units" on units
for delete to authenticated
using (exists (
  select 1 from properties pr 
  where pr.id = units.property_id 
  and pr.manager_id = auth.uid()
));

-- Admin can delete any lease
create policy "admin delete leases" on leases
for delete to authenticated
using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Manager can delete payments for their properties
create policy "manager delete payments" on payments
for delete to authenticated
using (exists (
  select 1 from leases l 
  join units u on u.id = l.unit_id
  join properties pr on pr.id = u.property_id
  where l.id = payments.lease_id 
  and pr.manager_id = auth.uid()
));

-- Tenant can delete their own maintenance requests (only if open)
create policy "tenant delete own maint" on maintenance_requests
for delete to authenticated
using (tenant_id = auth.uid() and status = 'open');

-- Manager can delete maintenance requests for their properties
create policy "manager delete maint" on maintenance_requests
for delete to authenticated
using (exists (
  select 1 from units u 
  join properties pr on pr.id = u.property_id
  where u.id = maintenance_requests.unit_id 
  and pr.manager_id = auth.uid()
));

-- Users can delete their own sent messages
create policy "user delete own messages" on messages
for delete to authenticated
using (sender_id = auth.uid());

-- Manager can delete expenses for their properties
create policy "manager delete expenses" on expenses
for delete to authenticated
using (exists (
  select 1 from properties pr 
  where pr.id = expenses.property_id 
  and pr.manager_id = auth.uid()
));

-- INDEXES FOR RLS PERFORMANCE
create index if not exists idx_leases_tenant_id on leases (tenant_id);
create index if not exists idx_leases_unit_id on leases (unit_id);
create index if not exists idx_units_property_id on units (property_id);
create index if not exists idx_properties_manager_id on properties (manager_id);
create index if not exists idx_payments_lease_id on payments (lease_id);
create index if not exists idx_maintenance_requests_unit_id on maintenance_requests (unit_id);
create index if not exists idx_expenses_property_id on expenses (property_id);
create index if not exists idx_messages_sender_id on messages (sender_id);
create index if not exists idx_messages_receiver_id on messages (receiver_id);
