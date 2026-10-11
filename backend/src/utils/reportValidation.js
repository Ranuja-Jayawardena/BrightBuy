function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function date(value, field) {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) {
    throw invalid(`${field} must be a valid YYYY-MM-DD date`);
  }
  return value;
}

function dateRange(query) {
  const startDate = date(query.start_date, 'start_date');
  const endDate = date(query.end_date, 'end_date');
  if (startDate && endDate && startDate > endDate) throw invalid('start_date must be before or equal to end_date');
  return { startDate, endDate };
}

function integer(value, field, fallback, minimum, maximum) {
  if (value === undefined || value === '') return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw invalid(`${field} must be an integer between ${minimum} and ${maximum}`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) throw invalid(`${field} must be an integer between ${minimum} and ${maximum}`);
  return number;
}

module.exports = { dateRange, integer, invalid };
