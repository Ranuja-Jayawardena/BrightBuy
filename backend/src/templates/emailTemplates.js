/**
 * HTML and text email templates for BrightBuy transactional emails.
 */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `$${num.toFixed(2)}`;
}

function baseLayout({ title, previewText, contentHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      line-height: 1.5;
    }
    .wrapper {
      width: 100%;
      background-color: #f3f4f6;
      padding: 32px 16px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 6px 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 32px 24px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-success {
      background-color: #d1fae5;
      color: #065f46;
    }
    .badge-info {
      background-color: #dbeafe;
      color: #1e40af;
    }
    .btn {
      display: inline-block;
      background: #4f46e5;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      margin-top: 20px;
    }
    .card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 20px 0;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    table.data-table th {
      text-align: left;
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    table.data-table td {
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 14px;
    }
    .text-right {
      text-align: right;
    }
  </style>
</head>
<body>
  <div style="display: none; font-size: 1px; color: #fff; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${escapeHtml(previewText || title)}
  </div>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>BrightBuy</h1>
        <p>Premium Shopping Experience</p>
      </div>
      <div class="content">
        ${contentHtml}
      </div>
      <div class="footer">
        <p style="margin: 0 0 6px;">Need help? Contact support or reply to this email.</p>
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} BrightBuy Inc. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Welcome Email Template
 */
function welcomeEmail({ name, email }) {
  const displayName = name ? escapeHtml(name) : 'Valued Customer';
  const title = `Welcome to BrightBuy, ${displayName}!`;
  const previewText = `Welcome to BrightBuy! We're thrilled to have you with us.`;

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 20px; color: #111827;">Hello ${displayName},</h2>
    <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
      Thank you for creating an account with <strong>BrightBuy</strong>! Your account has been successfully set up with <strong>${escapeHtml(email)}</strong>.
    </p>
    <div class="card">
      <h3 style="margin-top: 0; font-size: 16px; color: #1f2937;">What you can do now:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
        <li>Explore thousands of top-tier products across popular categories</li>
        <li>Enjoy fast, reliable nationwide delivery right to your doorstep</li>
        <li>Track your orders and view real-time delivery status updates</li>
        <li>Experience seamless, secure payment options</li>
      </ul>
    </div>
    <div style="text-align: center; margin: 28px 0 12px;">
      <a href="${escapeHtml(process.env.FRONTEND_URL || 'http://localhost:3000')}" class="btn">Start Shopping Now</a>
    </div>
    <p style="font-size: 13px; color: #9ca3af; margin-top: 24px; text-align: center;">
      If you did not register for this account, please disregard this email.
    </p>
  `;

  return {
    subject: title,
    html: baseLayout({ title, previewText, contentHtml }),
    text: `Hello ${displayName},\n\nThank you for registering at BrightBuy! Your account (${email}) is now active.\n\nVisit our store to start shopping: ${process.env.FRONTEND_URL || 'http://localhost:3000'}\n\n- The BrightBuy Team`,
  };
}

/**
 * Order Confirmation Email Template
 */
function orderConfirmationEmail({
  name,
  orderId,
  orderDate,
  items = [],
  totalAmount,
  deliveryAddress,
  estimatedDeliveryDays,
}) {
  const displayName = name ? escapeHtml(name) : 'Valued Customer';
  const title = `Order Received #${orderId}`;
  const previewText = `Thank you for your order #${orderId}. We have received your order and are preparing it.`;
  const formattedDate = orderDate ? new Date(orderDate).toLocaleDateString() : new Date().toLocaleDateString();

  let itemsRowsHtml = '';
  let itemsRowsText = '';

  items.forEach((item) => {
    const itemName = item.product_name || item.name || 'Product';
    const variantStr = item.variant_name ? ` (${item.variant_name})` : '';
    const fullItemName = `${itemName}${variantStr}`;
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unit_price) || 0;
    const lineTotal = unitPrice * qty;

    itemsRowsHtml += `
      <tr>
        <td><strong>${escapeHtml(fullItemName)}</strong></td>
        <td style="text-align: center;">${qty}</td>
        <td class="text-right">${formatCurrency(unitPrice)}</td>
        <td class="text-right"><strong>${formatCurrency(lineTotal)}</strong></td>
      </tr>
    `;

    itemsRowsText += `- ${fullItemName} x${qty} @ ${formatCurrency(unitPrice)} = ${formatCurrency(lineTotal)}\n`;
  });

  const addressHtml = deliveryAddress
    ? `
      <div class="card">
        <h4 style="margin: 0 0 8px; font-size: 14px; text-transform: uppercase; color: #6b7280;">Delivery Address</h4>
        <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.5;">
          ${escapeHtml(deliveryAddress.address_line1 || '')}<br>
          ${deliveryAddress.address_line2 ? `${escapeHtml(deliveryAddress.address_line2)}<br>` : ''}
          ${escapeHtml(deliveryAddress.city_name || deliveryAddress.city || '')} ${escapeHtml(deliveryAddress.zip_code || '')}
        </p>
        <p style="margin: 10px 0 0; font-size: 13px; color: #4f46e5; font-weight: 600;">
          Estimated delivery: ${estimatedDeliveryDays || 5-7} business days
        </p>
      </div>
    `
    : '';

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 20px; color: #111827;">Thank You for Your Order!</h2>
    <p style="font-size: 15px; color: #4b5563;">
      Hi ${displayName}, your order <strong>#${orderId}</strong> has been received and is currently being processed.
    </p>

    <div style="background: #eef2ff; border-radius: 8px; padding: 14px 18px; margin: 18px 0; display: flex; justify-content: space-between;">
      <div>
        <span style="font-size: 12px; color: #4338ca; text-transform: uppercase; font-weight: 600;">Order ID</span><br>
        <strong style="font-size: 16px; color: #1e1b4b;">#${orderId}</strong>
      </div>
      <div>
        <span style="font-size: 12px; color: #4338ca; text-transform: uppercase; font-weight: 600;">Date Placed</span><br>
        <span style="font-size: 14px; color: #1e1b4b;">${formattedDate}</span>
      </div>
    </div>

    <h3 style="font-size: 16px; margin: 24px 0 8px; color: #111827;">Order Summary</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          <th class="text-right">Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRowsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" class="text-right" style="padding-top: 14px; font-weight: 700; font-size: 15px;">Total Amount:</td>
          <td class="text-right" style="padding-top: 14px; font-weight: 800; font-size: 18px; color: #4f46e5;">${formatCurrency(totalAmount)}</td>
        </tr>
      </tfoot>
    </table>

    ${addressHtml}

    <div style="text-align: center; margin: 28px 0 12px;">
      <a href="${escapeHtml(process.env.FRONTEND_URL || 'http://localhost:3000')}/orders/${orderId}" class="btn">View Order Details</a>
    </div>
  `;

  return {
    subject: `Order Received #${orderId} - BrightBuy`,
    html: baseLayout({ title, previewText, contentHtml }),
    text: `Thank you for your order #${orderId}!\n\nOrder Date: ${formattedDate}\n\nItems:\n${itemsRowsText}\nTotal: ${formatCurrency(totalAmount)}\n\nTrack your order at: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${orderId}\n\n- The BrightBuy Team`,
  };
}

/**
 * Payment Confirmation Email Template
 */
function paymentConfirmationEmail({
  name,
  orderId,
  amount,
  paymentMethod = 'Online Payment',
  transactionId = 'N/A',
  paymentDate,
}) {
  const displayName = name ? escapeHtml(name) : 'Valued Customer';
  const title = `Payment Confirmation for Order #${orderId}`;
  const previewText = `Payment confirmed for Order #${orderId}. Total paid: ${formatCurrency(amount)}.`;
  const formattedDate = paymentDate ? new Date(paymentDate).toLocaleDateString() : new Date().toLocaleDateString();

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 20px; color: #111827;">Payment Confirmed!</h2>
    <p style="font-size: 15px; color: #4b5563;">
      Hi ${displayName}, we've received your payment for order <strong>#${orderId}</strong>. Here is your receipt.
    </p>

    <div class="card">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Amount Paid:</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 700; font-size: 16px; color: #059669;">${formatCurrency(amount)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Payment Method:</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600; text-transform: capitalize;">${escapeHtml(paymentMethod)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Transaction Reference:</td>
          <td style="padding: 6px 0; text-align: right; font-family: monospace; font-size: 13px;">${escapeHtml(transactionId)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Payment Date:</td>
          <td style="padding: 6px 0; text-align: right;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Status:</td>
          <td style="padding: 6px 0; text-align: right;"><span class="badge badge-success">Completed</span></td>
        </tr>
      </table>
    </div>

    <p style="font-size: 14px; color: #4b5563;">
      Your order is now being prepped for dispatch. We will send you another update once your package has shipped!
    </p>

    <div style="text-align: center; margin: 24px 0 12px;">
      <a href="${escapeHtml(process.env.FRONTEND_URL || 'http://localhost:3000')}/orders/${orderId}" class="btn">View Order Status</a>
    </div>
  `;

  return {
    subject: `Payment Received for Order #${orderId} - BrightBuy`,
    html: baseLayout({ title, previewText, contentHtml }),
    text: `Payment Confirmed for Order #${orderId}!\n\nAmount: ${formatCurrency(amount)}\nMethod: ${paymentMethod}\nTransaction ID: ${transactionId}\nDate: ${formattedDate}\n\n- The BrightBuy Team`,
  };
}

/**
 * Delivery Status Update Email Template
 */
function deliveryStatusUpdateEmail({
  name,
  orderId,
  deliveryId,
  deliveryStatus,
  trackingNumber,
  estimatedDeliveryDays,
}) {
  const displayName = name ? escapeHtml(name) : 'Valued Customer';
  const title = `Delivery Update for Order #${orderId}`;
  const cleanStatus = (deliveryStatus || 'updated').replace(/_/g, ' ').toUpperCase();
  const previewText = `Delivery status for Order #${orderId} is now ${cleanStatus}.`;

  const trackingHtml = trackingNumber
    ? `
      <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #e5e7eb;">
        <span style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Tracking Number</span><br>
        <strong style="font-family: monospace; font-size: 15px; color: #1f2937;">${escapeHtml(trackingNumber)}</strong>
      </div>
    `
    : '';

  const contentHtml = `
    <h2 style="margin-top: 0; font-size: 20px; color: #111827;">Your Delivery Status Has Been Updated</h2>
    <p style="font-size: 15px; color: #4b5563;">
      Hi ${displayName}, there is an update on your shipment for order <strong>#${orderId}</strong>.
    </p>

    <div class="card" style="text-align: center; padding: 24px;">
      <div style="margin-bottom: 12px;">
        <span class="badge badge-info" style="font-size: 14px; padding: 8px 16px;">${cleanStatus}</span>
      </div>
      <p style="margin: 0; font-size: 14px; color: #4b5563;">
        Delivery Reference ID: #${deliveryId}
      </p>
      ${trackingHtml}
      ${estimatedDeliveryDays ? `<p style="margin: 12px 0 0; font-size: 13px; color: #6b7280;">Estimated Delivery Window: ${estimatedDeliveryDays} business days</p>` : ''}
    </div>

    <div style="text-align: center; margin: 28px 0 12px;">
      <a href="${escapeHtml(process.env.FRONTEND_URL || 'http://localhost:3000')}/orders/${orderId}" class="btn">Track Order</a>
    </div>
  `;

  return {
    subject: `Delivery Update: Order #${orderId} is ${cleanStatus} - BrightBuy`,
    html: baseLayout({ title, previewText, contentHtml }),
    text: `Delivery Update for Order #${orderId}\n\nStatus: ${cleanStatus}\nDelivery ID: #${deliveryId}${trackingNumber ? `\nTracking Number: ${trackingNumber}` : ''}\n\nTrack order: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${orderId}\n\n- The BrightBuy Team`,
  };
}

module.exports = {
  welcomeEmail,
  orderConfirmationEmail,
  paymentConfirmationEmail,
  deliveryStatusUpdateEmail,
};
