const stripe = require('../lib/stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { stripeAccountId, amount, gigPath } = req.body;

    if (!stripeAccountId || !amount) {
      return res.status(400).json({
        error: 'missing_parameters',
        message: 'stripeAccountId and amount are required'
      });
    }

    const transfer = await stripe.transfers.create({
      amount: amount,
      currency: 'usd',
      destination: stripeAccountId,
      metadata: { gigPath: gigPath || '' }
    });

    return res.status(200).json({
      success: true,
      transferId: transfer.id
    });
  } catch (error) {
    console.error('Transfer error:', error);
    return res.status(400).json({
      error: 'transfer_failed',
      message: error.message
    });
  }
};
