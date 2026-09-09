export const manualTransport = Object.freeze({
  name: 'manual',
  capability: 'manual',
  healthy: true,
  async deliver({ invitation }) {
    return Object.freeze({
      schema: 'ai-peer-review.delivery/v1',
      status: 'delivery-pending',
      transport: 'manual',
      manual: Object.freeze({
        available: true,
        command: `peer-review join ${JSON.stringify(invitation)}`,
      }),
    });
  },
});
