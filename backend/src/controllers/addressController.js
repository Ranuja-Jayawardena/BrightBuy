const addressModel = require('../models/addressModel');
const db = require('../config/db');

const getAddresses = async (req, res) => {
    try {
        const { customer_id } = req.user;
        if (!customer_id) return res.status(403).json({ error: 'Only customers can have addresses' });

        const addresses = await addressModel.getAddresses(customer_id);
        res.json({ addresses });
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const addAddress = async (req, res) => {
    try {
        const { customer_id } = req.user;
        if (!customer_id) return res.status(403).json({ error: 'Only customers can add addresses' });

        const { address_line1, address_line2, city_id, zip_code } = req.body;
        if (!address_line1 || !city_id || !zip_code) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const cityCheck = await db.query('SELECT city_id FROM cities WHERE city_id = $1', [city_id]);
        if (cityCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid city_id' });
        }

        const address = await addressModel.addAddress(customer_id, { address_line1, address_line2, city_id, zip_code });
        res.status(201).json({ message: 'Address added', address });
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const updateAddress = async (req, res) => {
    try {
        const { customer_id } = req.user;
        if (!customer_id) return res.status(403).json({ error: 'Only customers can update addresses' });

        const address_id = req.params.id;
        const { address_line1, address_line2, city_id, zip_code } = req.body;

        const existing = await addressModel.getAddressByIdAndCustomer(address_id, customer_id);
        if (!existing) {
            return res.status(404).json({ error: 'Address not found or unauthorized' });
        }

        if (city_id) {
            const cityCheck = await db.query('SELECT city_id FROM cities WHERE city_id = $1', [city_id]);
            if (cityCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Invalid city_id' });
            }
        }

        const updated = await addressModel.updateAddress(address_id, { address_line1, address_line2, city_id, zip_code });
        res.json({ message: 'Address updated', address: updated });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const removeAddress = async (req, res) => {
    try {
        const { customer_id } = req.user;
        if (!customer_id) return res.status(403).json({ error: 'Only customers can remove addresses' });

        const address_id = req.params.id;
        
        const removed = await addressModel.removeAddress(address_id, customer_id);
        if (!removed) {
             return res.status(404).json({ error: 'Address not found or unauthorized' });
        }

        res.json({ message: 'Address removed' });
    } catch (error) {
        console.error('Error removing address:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

const setDefault = async (req, res) => {
    try {
        const { customer_id } = req.user;
        if (!customer_id) return res.status(403).json({ error: 'Only customers can manage addresses' });

        const address_id = req.params.id;

        const existing = await addressModel.getAddressByIdAndCustomer(address_id, customer_id);
        if (!existing) {
            return res.status(404).json({ error: 'Address not found or unauthorized' });
        }

        await addressModel.setDefaultAddress(address_id, customer_id);
        res.json({ message: 'Default address updated' });
    } catch (error) {
        console.error('Error setting default address:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getAddresses,
    addAddress,
    updateAddress,
    removeAddress,
    setDefault
};
