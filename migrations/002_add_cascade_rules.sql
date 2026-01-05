-- Migration 002: Add CASCADE rules to foreign key constraints
-- This ensures referential integrity when deleting parent records
-- Run this in Supabase SQL Editor

-- Note: Profile deletion is handled carefully:
-- - manager_id SET NULL (property continues to exist)
-- - tenant_id RESTRICT (cannot delete profile with active lease)
-- - sender_id/receiver_id CASCADE (messages deleted with user)

-- Properties: manager_id -> profiles (SET NULL on delete)
ALTER TABLE properties 
  DROP CONSTRAINT IF EXISTS properties_manager_id_fkey;
ALTER TABLE properties 
  ADD CONSTRAINT properties_manager_id_fkey 
    FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Units: property_id -> properties (CASCADE on delete)
ALTER TABLE units 
  DROP CONSTRAINT IF EXISTS units_property_id_fkey;
ALTER TABLE units 
  ADD CONSTRAINT units_property_id_fkey 
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;

-- Leases: unit_id -> units (CASCADE on delete)
ALTER TABLE leases 
  DROP CONSTRAINT IF EXISTS leases_unit_id_fkey;
ALTER TABLE leases 
  ADD CONSTRAINT leases_unit_id_fkey 
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;

-- Leases: tenant_id -> profiles (RESTRICT - can't delete profile with lease)
ALTER TABLE leases 
  DROP CONSTRAINT IF EXISTS leases_tenant_id_fkey;
ALTER TABLE leases 
  ADD CONSTRAINT leases_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES profiles(id) ON DELETE RESTRICT;

-- Payments: lease_id -> leases (CASCADE on delete)
ALTER TABLE payments 
  DROP CONSTRAINT IF EXISTS payments_lease_id_fkey;
ALTER TABLE payments 
  ADD CONSTRAINT payments_lease_id_fkey 
    FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE;

-- Maintenance Requests: unit_id -> units (CASCADE on delete)
ALTER TABLE maintenance_requests 
  DROP CONSTRAINT IF EXISTS maintenance_requests_unit_id_fkey;
ALTER TABLE maintenance_requests 
  ADD CONSTRAINT maintenance_requests_unit_id_fkey 
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;

-- Maintenance Requests: tenant_id -> profiles (SET NULL on delete)
ALTER TABLE maintenance_requests 
  DROP CONSTRAINT IF EXISTS maintenance_requests_tenant_id_fkey;
ALTER TABLE maintenance_requests 
  ADD CONSTRAINT maintenance_requests_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Messages: sender_id -> profiles (CASCADE on delete)
ALTER TABLE messages 
  DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages 
  ADD CONSTRAINT messages_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Messages: receiver_id -> profiles (CASCADE on delete)
ALTER TABLE messages 
  DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;
ALTER TABLE messages 
  ADD CONSTRAINT messages_receiver_id_fkey 
    FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Expenses: property_id -> properties (CASCADE on delete)
ALTER TABLE expenses 
  DROP CONSTRAINT IF EXISTS expenses_property_id_fkey;
ALTER TABLE expenses 
  ADD CONSTRAINT expenses_property_id_fkey 
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;

-- Verification: Check constraints were created
-- SELECT conname, conrelid::regclass, confrelid::regclass, confdeltype
-- FROM pg_constraint 
-- WHERE contype = 'f' AND conrelid::regclass::text IN 
--   ('properties', 'units', 'leases', 'payments', 'maintenance_requests', 'messages', 'expenses');
