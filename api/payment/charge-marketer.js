const stripe = require('../lib/stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { stripeToken, amount, gigPath, description } = req.body;

    if (!stripeToken || !amount) {
      return res.status(400).json({
        error: 'missing_parameters',
        message: 'stripeToken and amount are required'
      });
    }

    const charge = await stripe.charges.create({
      amount: amount,
      currency: 'usd',
      source: stripeToken,
      description: description || 'Runwae partnership payment',
      metadata: { gigPath: gigPath || '' }
    });

    return res.status(200).json({
      success: true,
      chargeId: charge.id
    });
  } catch (error) {
    console.error('Charge error:', error);
    return res.status(400).json({
      error: error.type || 'charge_failed',
      message: error.message
    });
  }
};
