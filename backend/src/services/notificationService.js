// Extension point for Phase 8.2 email notifications.
async function onDeliveryStatusChanged(delivery) {
  return delivery;
}

module.exports = { onDeliveryStatusChanged };
