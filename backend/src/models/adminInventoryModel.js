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

async function createEmployee({ email, passwordHash, firstName, lastName, phone }) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query('INSERT INTO users (email,password_hash,role) VALUES ($1,$2,\'admin\') RETURNING user_id,email', [email, passwordHash]);
    const employee = await client.query('INSERT INTO employees (user_id,first_name,last_name,phone) VALUES ($1,$2,$3,$4) RETURNING employee_id,user_id,first_name,last_name,phone', [user.rows[0].user_id, firstName, lastName, phone || null]);
    await client.query('COMMIT');
    return { ...employee.rows[0], email: user.rows[0].email };
  } catch (error) { await client.query('ROLLBACK'); if (error.code === '23505') { const e = new Error('Email already exists'); e.status = 409; throw e; } throw error; } finally { client.release(); }
}

async function listEmployees() {
  const result = await db.query(`SELECT e.employee_id,e.user_id,u.email,e.first_name,e.last_name,e.phone FROM employees e JOIN users u ON u.user_id=e.user_id ORDER BY e.employee_id`);
  return result.rows;
}

module.exports = { listInventory, adjustStock, createEmployee, listEmployees };
