jest.mock('../src/config/db', () => ({ query: jest.fn() }));
jest.mock('../src/utils/mailer', () => ({ sendEmail: jest.fn() }));

const db = require('../src/config/db');
const { sendEmail } = require('../src/utils/mailer');
const { enqueueEmail, processOne } = require('../src/services/emailQueue');

beforeEach(() => jest.clearAllMocks());

test('queues an email with its event key', async () => {
  db.query.mockResolvedValue({ rows: [{ job_id: 1 }] });
  await expect(enqueueEmail('a@example.com', 'Subject', '<p>Hello</p>', 'Hello', 'order:1'))
    .resolves.toEqual({ success: true, queued: true });
  expect(db.query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT (event_key) DO NOTHING'),
    ['order:1', 'a@example.com', 'Subject', '<p>Hello</p>', 'Hello']);
});

test('marks a successful send as sent', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ job_id: 1, recipient: 'a@example.com', subject: 'Hi', html: '<p>Hi</p>', plain_text: 'Hi' }] })
    .mockResolvedValueOnce({ rows: [] });
  sendEmail.mockResolvedValue({ success: true });
  await expect(processOne()).resolves.toBe(true);
  expect(sendEmail).toHaveBeenCalledWith('a@example.com', 'Hi', '<p>Hi</p>', 'Hi');
  expect(db.query.mock.calls[1][0]).toContain("status='sent'");
});

test('schedules a retry when SMTP fails', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ job_id: 2, recipient: 'a@example.com', subject: 'Hi', html: '', plain_text: '' }] })
    .mockResolvedValueOnce({ rows: [] });
  sendEmail.mockResolvedValue({ success: false, error: 'SMTP unavailable' });
  await expect(processOne()).resolves.toBe(true);
  expect(db.query.mock.calls[1][0]).toContain('next_attempt_at');
  expect(db.query.mock.calls[1][1]).toEqual([2, 'SMTP unavailable']);
});
