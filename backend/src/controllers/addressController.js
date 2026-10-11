const addressModel = require('../models/addressModel');
const db = require('../config/db');

function isPositiveInt(value) {
    if (value === undefined || value === null) return false;
    const str = String(value).trim();
    if (!/^\d+$/.test(str)) return false;
    const num = Number(str);
    return Number.isSafeInteger(num) && num > 0;
}

const getAddresses = async (req, res) => {
    try {
        const customer_id = req.user ? req.user.customer_id : null;
        if (!customer_id) {
            return res.status(403).json({ error: 'forbidden', message: 'Only customers can have addresses', statusCode: 403 });
        }

        const addresses = await addressModel.getAddresses(customer_id);
        res.json({ addresses });
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({ error: 'internal_error', message: 'Internal Server Error', statusCode: 500 });
    }
};

const addAddress = async (req, res) => {
    try {
        const customer_id = req.user ? req.user.customer_id : null;
        if (!customer_id) {
            return res.status(403).json({ error: 'forbidden', message: 'Only customers can add addresses', statusCode: 403 });
        }

        const { address_line1, address_line2, city_id, zip_code } = req.body || {};
        if (typeof address_line1 !== 'string' || !address_line1.trim() || address_line1.trim().length > 255) {
            return res.status(400).json({ error: 'invalid_request', message: 'address_line1 is required and must be 255 characters or fewer', statusCode: 400 });
        }

        if (address_line2 !== undefined && address_line2 !== null && (typeof address_line2 !== 'string' || address_line2.length > 255)) {
            return res.status(400).json({ error: 'invalid_request', message: 'address_line2 must be a string of 255 characters or fewer', statusCode: 400 });
        }

        if (!isPositiveInt(city_id)) {
            return res.status(400).json({ error: 'invalid_request', message: 'city_id must be a positive integer', statusCode: 400 });
        }
        const cid = Number(city_id);

        if (typeof zip_code !== 'string' || !zip_code.trim() || zip_code.trim().length > 20) {
            return res.status(400).json({ error: 'invalid_request', message: 'zip_code is required and must be 20 characters or fewer', statusCode: 400 });
        }

        const cityCheck = await db.query('SELECT city_id FROM cities WHERE city_id = $1', [cid]);
        if (cityCheck.rows.length === 0) {
            return res.status(400).json({ error: 'invalid_request', message: 'Invalid city_id', statusCode: 400 });
        }

        const address = await addressModel.addAddress(customer_id, {
            address_line1: address_line1.trim(),
            address_line2: address_line2 ? address_line2.trim() : null,
            city_id: cid,
            zip_code: zip_code.trim()
        });
        res.status(201).json({ message: 'Address added', address });
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({ error: 'internal_error', message: 'Internal Server Error', statusCode: 500 });
    }
};

const updateAddress = async (req, res) => {
    try {
        const customer_id = req.user ? req.user.customer_id : null;
        if (!customer_id) {
            return res.status(403).json({ error: 'forbidden', message: 'Only customers can update addresses', statusCode: 403 });
        }

        if (!isPositiveInt(req.params.id)) {
            return res.status(400).json({ error: 'invalid_request', message: 'id must be a positive integer', statusCode: 400 });
        }
        const address_id = Number(req.params.id);

        const existing = await addressModel.getAddressByIdAndCustomer(address_id, customer_id);
        if (!existing) {
            return res.status(404).json({ error: 'not_found', message: 'Address not found or unauthorized', statusCode: 404 });
        }

        const { address_line1, address_line2, city_id, zip_code } = req.body || {};
        const updateData = {};

        if (address_line1 !== undefined) {
            if (typeof address_line1 !== 'string' || !address_line1.trim() || address_line1.trim().length > 255) {
                return res.status(400).json({ error: 'invalid_request', message: 'address_line1 must be a non-empty string up to 255 characters', statusCode: 400 });
            }
            updateData.address_line1 = address_line1.trim();
        }

        if (address_line2 !== undefined) {
            if (address_line2 !== null && (typeof address_line2 !== 'string' || address_line2.length > 255)) {
                return res.status(400).json({ error: 'invalid_request', message: 'address_line2 must be a string up to 255 characters', statusCode: 400 });
            }
            updateData.address_line2 = address_line2 ? address_line2.trim() : null;
        }

        if (city_id !== undefined) {
            if (!isPositiveInt(city_id)) {
                return res.status(400).json({ error: 'invalid_request', message: 'city_id must be a positive integer', statusCode: 400 });
            }
            const cid = Number(city_id);
            const cityCheck = await db.query('SELECT city_id FROM cities WHERE city_id = $1', [cid]);
            if (cityCheck.rows.length === 0) {
                return res.status(400).json({ error: 'invalid_request', message: 'Invalid city_id', statusCode: 400 });
            }
            updateData.city_id = cid;
        }

        if (zip_code !== undefined) {
            if (typeof zip_code !== 'string' || !zip_code.trim() || zip_code.trim().length > 20) {
                return res.status(400).json({ error: 'invalid_request', message: 'zip_code must be a non-empty string up to 20 characters', statusCode: 400 });
            }
            updateData.zip_code = zip_code.trim();
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'invalid_request', message: 'At least one field to update is required', statusCode: 400 });
        }

        const updated = await addressModel.updateAddress(address_id, updateData);
        res.json({ message: 'Address updated', address: updated });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({ error: 'internal_error', message: 'Internal Server Error', statusCode: 500 });
    }
};

const removeAddress = async (req, res) => {
    try {
        const customer_id = req.user ? req.user.customer_id : null;
        if (!customer_id) {
            return res.status(403).json({ error: 'forbidden', message: 'Only customers can remove addresses', statusCode: 403 });
        }

        if (!isPositiveInt(req.params.id)) {
            return res.status(400).json({ error: 'invalid_request', message: 'id must be a positive integer', statusCode: 400 });
        }
        const address_id = Number(req.params.id);
        
        const removed = await addressModel.removeAddress(address_id, customer_id);
        if (!removed) {
            return res.status(404).json({ error: 'not_found', message: 'Address not found or unauthorized', statusCode: 404 });
        }

        res.json({ message: 'Address removed' });
    } catch (error) {
        console.error('Error removing address:', error);
        res.status(500).json({ error: 'internal_error', message: 'Internal Server Error', statusCode: 500 });
    }
};

const setDefault = async (req, res) => {
    try {
        const customer_id = req.user ? req.user.customer_id : null;
        if (!customer_id) {
            return res.status(403).json({ error: 'forbidden', message: 'Only customers can manage addresses', statusCode: 403 });
        }

        if (!isPositiveInt(req.params.id)) {
            return res.status(400).json({ error: 'invalid_request', message: 'id must be a positive integer', statusCode: 400 });
        }
        const address_id = Number(req.params.id);

        const existing = await addressModel.getAddressByIdAndCustomer(address_id, customer_id);
        if (!existing) {
            return res.status(404).json({ error: 'not_found', message: 'Address not found or unauthorized', statusCode: 404 });
        }

        await addressModel.setDefaultAddress(address_id, customer_id);
        res.json({ message: 'Default address updated' });
    } catch (error) {
        console.error('Error setting default address:', error);
        res.status(500).json({ error: 'internal_error', message: 'Internal Server Error', statusCode: 500 });
    }
};

module.exports = {
    getAddresses,
    addAddress,
    updateAddress,
    removeAddress,
    setDefault
};
