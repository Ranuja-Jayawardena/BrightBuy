const cityModel = require('../models/cityModel');

const getCities = async (req, res) => {
    try {
        const cities = await cityModel.getCities();
        res.json({ cities });
    } catch (error) {
        console.error('Error fetching cities:', error);
        res.status(500).json({ error: 'internal_error', message: 'Internal Server Error', statusCode: 500 });
    }
};

module.exports = { getCities };
