const analytics = require('../models/analyticsReportModel');
const sales = require('../models/salesReportModel');
const { dateRange, integer, invalid } = require('../utils/reportValidation');

const dates = query => dateRange(query);

function limit(value, fallback = 10) {
  return integer(value, 'limit', fallback, 1, 100);
}

function csv(rows, headers) {
  const fields = headers || Object.keys(rows[0] || {});
  const escape = value => {
    const cell = String(value ?? '');
    const safe = /^[\s]*[=+@-]/.test(cell) ? `'${cell}` : cell;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return `\uFEFF${[fields.map(escape).join(','), ...rows.map(row => fields.map(header => escape(row[header])).join(','))].join('\r\n')}`;
}

function filename(type) {
  return `${type}_report_${new Date().toISOString().slice(0, 7)}.csv`;
}

async function lowStock(req, res, next) {
  try {
    const threshold = integer(req.query.threshold, 'threshold', 10, 0, 1000000000);
    res.json({ data: await analytics.lowStock(threshold) });
  } catch (error) { next(error); }
}

async function inventorySummary(req, res, next) {
  try { res.json({ data: await analytics.inventorySummary() }); } catch (error) { next(error); }
}

async function topCustomers(req, res, next) {
  try {
    if (req.query.sort_by && !['orders', 'spend'].includes(req.query.sort_by)) throw invalid('sort_by must be orders or spend');
    res.json({ data: await analytics.topCustomers({ ...dates(req.query), limit: limit(req.query.limit), sortBy: req.query.sort_by || 'spend' }) });
  } catch (error) { next(error); }
}

async function customerGeography(req, res, next) {
  try { res.json({ data: await analytics.customerGeography(dates(req.query)) }); } catch (error) { next(error); }
}

async function exportReport(req, res, next) {
  try {
    const type = req.params.type;
    let rows;
    let headers;
    if (type === 'sales') {
      rows = await sales.revenue({ period: 'monthly', ...dates(req.query) });
      headers = ['period', 'revenue', 'order_count'];
    } else if (type === 'inventory') {
      rows = await analytics.inventorySummary();
      headers = ['category_id', 'category_name', 'total_units', 'total_value'];
    } else if (type === 'customers') {
      rows = await analytics.topCustomers({ ...dates(req.query), limit: 100, sortBy: 'spend' });
      headers = ['customer_id', 'first_name', 'last_name', 'email', 'order_count', 'total_spend'];
    } else throw invalid('type must be sales, inventory, or customers');
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename(type)}"` });
    res.send(csv(rows, headers));
  } catch (error) { next(error); }
}

module.exports = { lowStock, inventorySummary, topCustomers, customerGeography, exportReport };
