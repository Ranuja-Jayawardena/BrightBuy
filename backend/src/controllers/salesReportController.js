const service = require('../models/salesReportModel');
const dates = query => ({ period: query.period, startDate: query.start_date, endDate: query.end_date });
async function revenue(req, res, next) { try { res.json({ data: await service.revenue(dates(req.query)) }); } catch (error) { next(error); } }
async function topProducts(req, res, next) { try { const limit = Number(req.query.limit || 10); if (!Number.isInteger(limit) || limit < 1 || limit > 100) return res.status(400).json({ error: 'limit must be an integer between 1 and 100' }); if (req.query.sort_by && !['revenue', 'quantity'].includes(req.query.sort_by)) return res.status(400).json({ error: 'sort_by must be revenue or quantity' }); res.json({ data: await service.topProducts({ ...dates(req.query), limit, sortBy: req.query.sort_by || 'revenue' }) }); } catch (error) { next(error); } }
async function orders(req, res, next) { try { res.json({ data: await service.orders(dates(req.query)) }); } catch (error) { next(error); } }
module.exports = { revenue, topProducts, orders };
