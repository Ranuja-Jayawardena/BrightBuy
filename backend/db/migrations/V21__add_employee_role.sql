-- V21__add_employee_role.sql
-- Add granular operational role column to employees table with check constraint

ALTER TABLE employees
ADD COLUMN role VARCHAR(30) NOT NULL DEFAULT 'super_admin'
CHECK (role IN ('super_admin', 'inventory_manager', 'order_dispatcher', 'catalog_manager', 'analyst'));
