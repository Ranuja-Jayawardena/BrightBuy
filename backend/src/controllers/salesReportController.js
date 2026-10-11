const service = require('../models/salesReportModel');
const { dateRange, integer, invalid } = require('../utils/reportValidation');
function dates(query) {
  if (query.period !== undefined && !['daily', 'weekly', 'monthly', 'quarterly'].includes(query.period)) throw invalid('period must be one of: daily, weekly, monthly, quarterly');
  return { period: query.period, ...dateRange(query) };
}
async function revenue(req, res, next) { try { res.json({ data: await service.revenue(dates(req.query)) }); } catch (error) { next(error); } }
async function topProducts(req, res, next) { try { const limit = integer(req.query.limit, 'limit', 10, 1, 100); if (req.query.sort_by && !['revenue', 'quantity'].includes(req.query.sort_by)) throw invalid('sort_by must be revenue or quantity'); res.json({ data: await service.topProducts({ ...dates(req.query), limit, sortBy: req.query.sort_by || 'revenue' }) }); } catch (error) { next(error); } }
async function orders(req, res, next) { try { res.json({ data: await service.orders(dates(req.query)) }); } catch (error) { next(error); } }
module.exports = { revenue, topProducts, orders };
