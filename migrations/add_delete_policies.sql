-- Migration: Add DELETE RLS Policies
-- Run this in your Supabase SQL Editor to add the missing DELETE policies
-- These policies were missing from the original RLSpolicies.SQL

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
