-- V24__add_employee_active_status.sql
-- Add is_active status column to employees table with index

ALTER TABLE employees
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX idx_employees_active ON employees(is_active);
