const express = require('express');
const request = require('supertest');
const multipartImageUpload = require('../src/middleware/multipartImageUpload');

const boundary = 'BrightBuyBoundary123';
const specimens = [
  ['PNG', 'image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0x0d, 0x0a])],
  ['JPEG', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x0d, 0x0a])],
  ['WebP', 'image/webp', Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0xff, 0x0d, 0x0a])],
];

function multipart(file, mime) {
  return Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="sample.bin"\r\nContent-Type: ${mime}\r\n\r\n`),
    file,
    Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="is_primary"\r\n\r\ntrue\r\n--${boundary}--\r\n`),
  ]);
}

const app = express();
app.post('/upload', multipartImageUpload, (req, res) => {
  res.json({ bytes: req.file.buffer.toString('hex'), field: req.file.fieldname, primary: req.body.is_primary });
});
app.use((error, req, res, next) => { void req; void next; res.status(error.status || 500).json({ error: error.message }); });

test.each(specimens)('preserves %s bytes including trailing CRLF with a quoted boundary', async (_format, mime, bytes) => {
  const result = await request(app).post('/upload')
    .set('Content-Type', `multipart/form-data; boundary="${boundary}"`)
    .send(multipart(bytes, mime));
  expect(result.status).toBe(200);
  expect(result.body).toEqual({ bytes: bytes.toString('hex'), field: 'image', primary: 'true' });
});

test('rejects a malformed multipart body', async () => {
  const result = await request(app).post('/upload')
    .set('Content-Type', `multipart/form-data; boundary=${boundary}`)
    .send(Buffer.from('not multipart'));
  expect(result.status).toBe(400);
});
