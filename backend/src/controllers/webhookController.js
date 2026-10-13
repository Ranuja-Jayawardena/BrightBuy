const crypto = require('crypto');
const { handlePaymentSuccess, handlePaymentFailure } = require('../services/paymentService');

// In-memory set to store processed webhook IDs for idempotency
const processedWebhooks = new Set();

const handleLemonSqueezyWebhook = async (req, res) => {
  try {
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('LEMON_SQUEEZY_WEBHOOK_SECRET is not configured');
      return res.status(500).json({ error: 'server_error', message: 'Webhook secret not configured', statusCode: 500 });
    }

    const signature = req.get('X-Signature');
    if (!signature) {
      return res.status(401).json({ error: 'unauthorized', message: 'Missing signature', statusCode: 401 });
    }

    // Verify signature
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(req.body).digest('hex'), 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid signature', statusCode: 401 });
    }

    // Now it's safe to parse the JSON
    const payload = JSON.parse(req.body.toString());
    const eventName = payload.meta.event_name;
    const webhookId = payload.meta.webhook_id;

    // Check for idempotency
    if (processedWebhooks.has(webhookId)) {
      console.log(`Webhook ${webhookId} already processed, skipping.`);
      return res.status(200).json({ received: true });
    }

    const data = payload.data;
    const orderId = payload.meta?.custom_data?.order_id
      || payload.meta?.custom?.order_id
      || data?.attributes?.custom_data?.order_id
      || data?.attributes?.first_order_item?.order_id
      || 'unknown';
    const transactionId = data.id;

    if (eventName === 'order_created') {
      const status = data.attributes.status;
      if (status === 'paid') {
        const amount = data.attributes.total;
        await handlePaymentSuccess({
          order_id: orderId,
          transaction_id: transactionId,
          amount,
          raw_event: payload
        });
      } else {
         // handle failure or other status
         await handlePaymentFailure({
          order_id: orderId,
          transaction_id: transactionId,
          reason: `Status is ${status}`,
          raw_event: payload
        });
      }
    }

    // Mark as processed
    processedWebhooks.add(webhookId);
    
    // Simple cleanup to avoid memory leak in this basic implementation
    if (processedWebhooks.size > 1000) {
      processedWebhooks.clear();
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'internal_error', message: 'Internal Server Error', statusCode: 500 });
  }
};

module.exports = {
  handleLemonSqueezyWebhook
};
