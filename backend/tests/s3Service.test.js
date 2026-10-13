const s3Service = require('../src/services/s3Service');

beforeAll(() => {
  process.env.AWS_S3_BUCKET_NAME = 'brightbuy-media-storage-695945476492';
});

test('accepts only canonical object URLs under the requested product', () => {
  const base = 'https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/12/';
  expect(s3Service.keyFromPublicUrl(`${base}550e8400-e29b-41d4-a716-446655440000.webp`, 12))
    .toBe('products/12/550e8400-e29b-41d4-a716-446655440000.webp');
  expect(s3Service.keyFromPublicUrl(`${base}primary.webp`, 12)).toBe('products/12/primary.webp');
  expect(s3Service.keyFromPublicUrl(`${base}primary.webp?extra=1`, 12)).toBeNull();
  expect(s3Service.keyFromPublicUrl(`${base}primary.webp`, 13)).toBeNull();
  expect(s3Service.keyFromPublicUrl('https://evil.example/products/12/primary.webp', 12)).toBeNull();
});
