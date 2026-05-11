const stripe = require('../lib/stripe');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        error: 'missing_code',
        message: 'OAuth authorization code is required'
      });
    }

    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code
    });

    return res.status(200).json({
      success: true,
      stripe_user_id: response.stripe_user_id,
      refresh_token: response.refresh_token,
      access_token: response.access_token
    });
  } catch (error) {
    console.error('OAuth error:', error);
    return res.status(400).json({
      error: 'oauth_failed',
      error_description: error.message
    });
  }
};
