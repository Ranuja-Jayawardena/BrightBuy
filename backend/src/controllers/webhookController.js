const crypto = require('crypto');
const { handlePaymentSuccess, handlePaymentFailure, handlePaymentRefund } = require('../services/paymentService');

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

    // 1. Verify cryptographic signature securely
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(req.body).digest('hex'), 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid signature', statusCode: 401 });
    }

    // 2. Safe parse
    const payload = JSON.parse(req.body.toString());
    const eventName = payload.meta?.event_name || 'unknown_event';
    
    // Durable event identifier from provider
    const rawWebhookId = payload.meta?.webhook_id;
    const eventId = rawWebhookId && String(rawWebhookId).trim() !== ''
      ? String(rawWebhookId).trim()
      : (payload.data?.id ? `ls_obj_${payload.data.id}_${eventName}` : crypto.createHash('sha256').update(req.body).digest('hex'));

    const data = payload.data;
    const rawOrderId = payload.meta?.custom_data?.order_id
      || payload.meta?.custom?.order_id
      || data?.attributes?.custom_data?.order_id
      || data?.attributes?.first_order_item?.order_id
      || null;

    const orderId = rawOrderId !== null && rawOrderId !== undefined && !isNaN(Number(rawOrderId))
      ? parseInt(rawOrderId, 10)
      : null;

    const transactionId = data?.id ? String(data.id) : null;

    if (!orderId) {
      console.warn(`[LemonSqueezy Webhook] ${eventName} received without a valid numeric order_id:`, payload.meta);
      return res.status(200).json({ received: true, warning: 'missing_order_id' });
    }

    if (eventName === 'order_created') {
      const status = data?.attributes?.status;
      if (status === 'paid') {
        const amount = data?.attributes?.total;
        await handlePaymentSuccess({
          event_id: eventId,
          event_name: eventName,
          order_id: orderId,
          transaction_id: transactionId,
          amount,
          raw_event: payload
        });
      } else {
        await handlePaymentFailure({
          event_id: eventId,
          event_name: eventName,
          order_id: orderId,
          transaction_id: transactionId,
          reason: `Status is ${status}`,
          raw_event: payload
        });
      }
    } else if (eventName === 'order_refunded') {
      console.log(`[LemonSqueezy Webhook] Order ${orderId} refunded, transaction ${transactionId}`);
      await handlePaymentRefund({
        event_id: eventId,
        event_name: eventName,
        order_id: orderId,
        transaction_id: transactionId,
        raw_event: payload
      });
    } else {
      console.log(`[LemonSqueezy Webhook] Unhandled event type: ${eventName}`);
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
