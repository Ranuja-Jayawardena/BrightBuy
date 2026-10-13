const model = require('../models/adminInventoryModel');
const { hashPassword } = require('../utils/password');
function httpError(status, message) { const e = new Error(message); e.status = status; return e; }
function positiveId(value, name) { const n = Number(value); if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(n)) throw httpError(400, `${name} must be a positive integer`); return n; }
function requiredString(value, name, max = 255) { if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw httpError(400, `${name} is required and must be ${max} characters or fewer`); return value.trim(); }
async function list(query) { const threshold = query.threshold === undefined ? 10 : Number(query.threshold); if (query.threshold !== undefined && !/^\d+$/.test(String(query.threshold)) || !Number.isSafeInteger(threshold) || threshold < 0) throw httpError(400, 'threshold must be a non-negative integer'); if (query.search !== undefined && typeof query.search !== 'string') throw httpError(400, 'search must be a string'); return { data: await model.listInventory({ lowStock: query.low_stock === 'true' || query.low_stock === '1', threshold, search: query.search?.trim() }) }; }
async function adjust(variantId, body, employeeId) { if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError(400, 'JSON object body is required'); const stock = Number(body.stock_quantity); if (!/^\d+$/.test(String(body.stock_quantity)) || !Number.isSafeInteger(stock)) throw httpError(400, 'stock_quantity must be a non-negative integer'); const reason = requiredString(body.reason, 'reason'); const variant = await model.adjustStock(positiveId(variantId, 'variantId'), positiveId(employeeId, 'employeeId'), stock, reason); return variant; }
async function createEmployee(body) { if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError(400, 'JSON object body is required'); const email = requiredString(body.email, 'email', 100).toLowerCase(); const password = requiredString(body.password, 'password', 200); if (password.length < 8) throw httpError(400, 'password must be at least 8 characters'); const firstName = requiredString(body.first_name, 'first_name', 50); const lastName = requiredString(body.last_name, 'last_name', 50); const phone = body.phone ? requiredString(body.phone, 'phone', 20) : null; const role = body.role ? requiredString(body.role, 'role', 30) : 'super_admin'; return model.createEmployee({ email, passwordHash: await hashPassword(password), firstName, lastName, phone, role }); }
const allowedRoles = ['super_admin', 'inventory_manager', 'order_dispatcher', 'catalog_manager', 'analyst'];

async function updateEmployee(id, body, currentEmployeeId) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'JSON object body is required');
  }
  const employeeId = positiveId(id, 'employeeId');
  const target = await model.getEmployeeById(employeeId);
  if (!target) {
    throw httpError(404, 'Employee not found');
  }

  let firstName = target.first_name;
  let lastName = target.last_name;
  let phone = target.phone;
  let role = target.role;

  if (body.first_name !== undefined) {
    firstName = requiredString(body.first_name, 'first_name', 50);
  }
  if (body.last_name !== undefined) {
    lastName = requiredString(body.last_name, 'last_name', 50);
  }
  if (body.phone !== undefined) {
    phone = (body.phone && typeof body.phone === 'string' && body.phone.trim())
      ? requiredString(body.phone, 'phone', 20)
      : null;
  }
  if (body.role !== undefined) {
    if (!allowedRoles.includes(body.role)) {
      throw httpError(400, `role must be one of: ${allowedRoles.join(', ')}`);
    }
    if (target.employee_id === Number(currentEmployeeId) && body.role !== 'super_admin') {
      throw httpError(400, 'Super admins cannot demote their own account');
    }
    if (target.role === 'super_admin' && body.role !== 'super_admin') {
      const activeSuperAdmins = await model.countActiveSuperAdmins();
      if (activeSuperAdmins <= 1) {
        throw httpError(400, 'Cannot demote the last active super admin');
      }
    }
    role = body.role;
  }

  try {
    const updated = await model.updateEmployee(employeeId, { firstName, lastName, phone, role });
    return { employee: updated };
  } catch (err) {
    if (err.code === 'P0001' || (err.message && err.message.includes('Cannot remove the last active super admin'))) {
      throw httpError(400, 'Cannot demote the last active super admin');
    }
    throw err;
  }
}

async function setEmployeeStatus(id, body, currentEmployeeId) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'JSON object body is required');
  }
  if (typeof body.is_active !== 'boolean') {
    throw httpError(400, 'is_active must be a boolean');
  }

  const employeeId = positiveId(id, 'employeeId');
  const target = await model.getEmployeeById(employeeId);
  if (!target) {
    throw httpError(404, 'Employee not found');
  }

  if (body.is_active === false && target.employee_id === Number(currentEmployeeId)) {
    throw httpError(400, 'Super admins cannot deactivate their own account');
  }

  if (body.is_active === false && target.role === 'super_admin') {
    const activeSuperAdmins = await model.countActiveSuperAdmins();
    if (activeSuperAdmins <= 1) {
      throw httpError(400, 'Cannot deactivate the last active super admin');
    }
  }

  try {
    const updated = await model.setEmployeeStatus(employeeId, body.is_active);
    return {
      message: body.is_active ? 'Employee activated successfully' : 'Employee deactivated successfully',
      employee_id: updated.employee_id,
      is_active: updated.is_active,
    };
  } catch (err) {
    if (err.code === 'P0001' || (err.message && err.message.includes('Cannot remove the last active super admin'))) {
      throw httpError(400, 'Cannot deactivate the last active super admin');
    }
    throw err;
  }
}

module.exports = { list, adjust, createEmployee, listEmployees: model.listEmployees, updateEmployee, setEmployeeStatus };
