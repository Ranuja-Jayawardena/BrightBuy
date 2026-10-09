const db = require('../config/db');

const getAddresses = async (customer_id) => {
    const query = `
        SELECT 
            a.address_id, a.address_line1, a.address_line2, 
            a.city_id, c.city_name, c.state, a.zip_code, a.is_default
        FROM addresses a
        JOIN cities c ON a.city_id = c.city_id
        WHERE a.customer_id = $1
        ORDER BY a.is_default DESC, a.address_id DESC
    `;
    const result = await db.query(query, [customer_id]);
    return result.rows;
};

const getAddressByIdAndCustomer = async (address_id, customer_id) => {
    const query = `SELECT address_id, is_default FROM addresses WHERE address_id = $1 AND customer_id = $2`;
    const result = await db.query(query, [address_id, customer_id]);
    return result.rows[0];
};

const addAddress = async (customer_id, addressData) => {
    const existingResult = await db.query('SELECT COUNT(*) FROM addresses WHERE customer_id = $1', [customer_id]);
    const isFirst = parseInt(existingResult.rows[0].count) === 0;

    const { address_line1, address_line2, city_id, zip_code } = addressData;
    
    const query = `
        INSERT INTO addresses (customer_id, address_line1, address_line2, city_id, zip_code, is_default)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING address_id, address_line1, address_line2, city_id, zip_code, is_default
    `;
    const result = await db.query(query, [customer_id, address_line1, address_line2 || null, city_id, zip_code, isFirst]);
    return result.rows[0];
};

const updateAddress = async (address_id, addressData) => {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(addressData)) {
        if (value !== undefined) {
            fields.push(`${key} = $${idx}`);
            values.push(value);
            idx++;
        }
    }
    if (fields.length === 0) return null;

    values.push(address_id);
    const query = `
        UPDATE addresses 
        SET ${fields.join(', ')} 
        WHERE address_id = $${idx} 
        RETURNING address_id, address_line1, address_line2, city_id, zip_code, is_default
    `;
    const result = await db.query(query, values);
    return result.rows[0];
};

const removeAddress = async (address_id, customer_id) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        const checkResult = await client.query('SELECT is_default FROM addresses WHERE address_id = $1 AND customer_id = $2', [address_id, customer_id]);
        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return false;
        }

        const is_default = checkResult.rows[0].is_default;
        
        await client.query('DELETE FROM addresses WHERE address_id = $1 AND customer_id = $2', [address_id, customer_id]);

        if (is_default) {
            const nextAddress = await client.query('SELECT address_id FROM addresses WHERE customer_id = $1 ORDER BY address_id DESC LIMIT 1', [customer_id]);
            if (nextAddress.rows.length > 0) {
                await client.query('UPDATE addresses SET is_default = true WHERE address_id = $1', [nextAddress.rows[0].address_id]);
            }
        }
        
        await client.query('COMMIT');
        return true;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

const setDefaultAddress = async (address_id, customer_id) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        
        await client.query('UPDATE addresses SET is_default = false WHERE customer_id = $1', [customer_id]);
        const result = await client.query('UPDATE addresses SET is_default = true WHERE address_id = $1 AND customer_id = $2 RETURNING address_id', [address_id, customer_id]);
        
        await client.query('COMMIT');
        return result.rows.length > 0;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

module.exports = {
    getAddresses,
    getAddressByIdAndCustomer,
    addAddress,
    updateAddress,
    removeAddress,
    setDefaultAddress
};
