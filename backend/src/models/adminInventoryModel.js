const db = require('../config/db');

async function listInventory({ lowStock, threshold, search }) {
  const values = [];
  const where = [];
  if (lowStock) { values.push(threshold); where.push('v.stock_quantity <= $1'); }
  if (search) { values.push(`%${search}%`); where.push(`(v.variant_sku ILIKE $${values.length} OR v.variant_name ILIKE $${values.length} OR p.product_name ILIKE $${values.length})`); }
  const result = await db.query(`SELECT v.variant_id,v.variant_sku,p.product_name,v.variant_name,v.stock_quantity,v.price
    FROM product_variants v JOIN products p ON p.product_id=v.product_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY v.stock_quantity ASC,p.product_name ASC,v.variant_id ASC`, values);
  return result.rows.map(row => ({ ...row, price: Number(row.price), stock_quantity: Number(row.stock_quantity) }));
}

async function adjustStock(variantId, employeeId, stockQuantity, reason) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT variant_id,stock_quantity FROM product_variants WHERE variant_id=$1 FOR UPDATE', [variantId]);
    if (!current.rowCount) { await client.query('ROLLBACK'); return null; }
    const updated = await client.query('UPDATE product_variants SET stock_quantity=$2,updated_at=CURRENT_TIMESTAMP WHERE variant_id=$1 RETURNING variant_id,stock_quantity,updated_at', [variantId, stockQuantity]);
    await client.query('INSERT INTO inventory_adjustments (variant_id,employee_id,previous_quantity,new_quantity,reason) VALUES ($1,$2,$3,$4,$5)', [variantId, employeeId, current.rows[0].stock_quantity, stockQuantity, reason]);
    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

async function createEmployee({ email, passwordHash, firstName, lastName, phone, role }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query('INSERT INTO users (email,password_hash,role) VALUES ($1,$2,\'admin\') RETURNING user_id,email', [email, passwordHash]);
    const allowedRoles = ['super_admin', 'inventory_manager', 'order_dispatcher', 'catalog_manager', 'analyst'];
    const staffRole = allowedRoles.includes(role) ? role : 'super_admin';
    const employee = await client.query('INSERT INTO employees (user_id,first_name,last_name,phone,role) VALUES ($1,$2,$3,$4,$5) RETURNING employee_id,user_id,first_name,last_name,phone,role,is_active', [user.rows[0].user_id, firstName, lastName, phone || null, staffRole]);
    await client.query('COMMIT');
    return { ...employee.rows[0], email: user.rows[0].email };
  } catch (error) { await client.query('ROLLBACK'); if (error.code === '23505') { const e = new Error('Email already exists'); e.status = 409; throw e; } throw error; } finally { client.release(); }
}

async function listEmployees() {
  const result = await db.query(`SELECT e.employee_id,e.user_id,u.email,e.first_name,e.last_name,e.phone,e.role,e.is_active FROM employees e JOIN users u ON u.user_id=e.user_id ORDER BY e.employee_id`);
  return result.rows;
}

async function getEmployeeById(employeeId) {
  const result = await db.query(
    `SELECT e.employee_id, e.user_id, u.email, e.first_name, e.last_name, e.phone, e.role, e.is_active
     FROM employees e
     JOIN users u ON u.user_id = e.user_id
     WHERE e.employee_id = $1`,
    [employeeId]
  );
  return result.rows[0] || null;
}

async function updateEmployee(employeeId, { firstName, lastName, phone, role }) {
  const result = await db.query(
    `UPDATE employees
     SET first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         phone = $3,
         role = COALESCE($4, role)
     WHERE employee_id = $5
     RETURNING employee_id, user_id, first_name, last_name, phone, role, is_active`,
    [firstName, lastName, phone, role, employeeId]
  );
  return result.rows[0] || null;
}

async function setEmployeeStatus(employeeId, isActive) {
  const result = await db.query(
    `UPDATE employees
     SET is_active = $1
     WHERE employee_id = $2
     RETURNING employee_id, is_active`,
    [isActive, employeeId]
  );
  return result.rows[0] || null;
}

async function countActiveSuperAdmins() {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count FROM employees WHERE role = 'super_admin' AND is_active = true`
  );
  return result.rows[0].count;
}

module.exports = {
  listInventory,
  adjustStock,
  createEmployee,
  listEmployees,
  getEmployeeById,
  updateEmployee,
  setEmployeeStatus,
  countActiveSuperAdmins,
};
