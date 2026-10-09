const db = require('../config/db');

const getCities = async () => {
    const result = await db.query('SELECT city_id, city_name, state, is_main_city FROM cities ORDER BY city_name');
    return result.rows;
};

module.exports = { getCities };
