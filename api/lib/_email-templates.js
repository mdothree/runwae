/**
 * Runwae email templates. Not a route (leading "_").
 *
 * Each template takes plain data (names, amounts, dates as values, never HTML)
 * and returns { subject, html, text } via the shared rw layout. All user text
 * is escaped by the layout blocks.
 *
 * `category` decides whether a user's email preference can mute it:
 *   agreements | messages | activity  -> mutable (users/{uid}/email_prefs/{category} === false)
 *   transactional                      -> always sent (receipts, payouts, disputes, account, billing)
 */
const L = require('./_email-layout');

const { block: B, line, para, money, date } = L;

const STEPS = ['Proposal', 'Payment', 'Post', 'Verification', 'Payout'];
const step = (n) => `Agreement · ${STEPS[n - 1]} · step ${n} of 5`;
const first = (name) => line(String(name || '').split(' ')[0] || 'there', 40);
const nm = (name, fallback) => line(name || fallback || 'Someone', 60);
const PLATFORMS = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', twitter: 'X (Twitter)', x: 'X', facebook: 'Facebook', linkedin: 'LinkedIn', pinterest: 'Pinterest', snapchat: 'Snapchat', twitch: 'Twitch', spotify: 'Spotify' };
const plat = (p) => {
  const s = line(p || '', 30);
  return PLATFORMS[s.toLowerCase()] || (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
};
/** Agreement summary rows shared by the gig mails. */
function gigRows(d, extra) {
  const g = d.gig || {};
  const rows = [
    ['Brand', nm(d.brandName, 'Brand')],
    ['Creator', nm(d.creatorName, 'Creator')],
    ['Platform', plat(g.platform)],
  ];
  if (g.compensation === 'money' && g.priceCents) rows.push(['Price', money(g.priceCents)]);
  else if (g.compensation === 'gift') rows.push(['Compensation', 'Gifted product']);
  return B.details(rows.concat(extra || []));
}

const T = {};

/* ---------------------- Agreement (gig) ---------------------- */

T.gig_proposal_requested = {
  category: 'agreements',
  sample: { recipientName: 'Ivy Chen', brandName: 'Lumen Skin', creatorName: 'Ivy Chen', gig: { platform: 'instagram', compensation: 'money', priceCents: 25000 } },
  render: (d) => L.layout({
    subject: `${nm(d.brandName)} wants a proposal from you`,
    preheader: `Send your idea for their ${plat(d.gig && d.gig.platform) || 'campaign'} post.`,
    eyebrow: step(1),
    heading: `${nm(d.brandName)} asked for your proposal`,
    blocks: [
      B.p([`Hi ${first(d.recipientName)}, `, { b: nm(d.brandName) }, ' picked you for their campaign and wants to see your idea before the agreement starts.']),
      gigRows(d),
      B.button('Write your proposal', '/notifications'),
    ],
    reason: 'You are getting this because a brand requested a proposal from you on Runwae.',
  }),
};

T.gig_proposal_received = {
  category: 'agreements',
  sample: { recipientName: 'Maya Ortiz', brandName: 'Lumen Skin', creatorName: 'Ivy Chen', gig: { platform: 'tiktok', compensation: 'money', priceCents: 25000 } },
  render: (d) => L.layout({
    subject: `${nm(d.creatorName)} sent you a proposal`,
    preheader: 'Accept it to start the agreement, or decline so they can send another.',
    eyebrow: step(1),
    heading: `New proposal from ${nm(d.creatorName)}`,
    blocks: [
      B.p([`Hi ${first(d.recipientName)}, `, { b: nm(d.creatorName) }, ' sent a proposal for your campaign. Accept it to pay and start the agreement, or decline so they can send a new one.']),
      gigRows(d),
      B.button('Review the proposal', '/notifications'),
    ],
    reason: 'You are getting this because a creator sent a proposal for your campaign on Runwae.',
  }),
};

T.gig_proposal_declined = {
  category: 'agreements',
  sample: { recipientName: 'Ivy Chen', brandName: 'Lumen Skin', creatorName: 'Ivy Chen', gig: { platform: 'instagram', compensation: 'money', priceCents: 25000 } },
  render: (d) => L.layout({
    subject: `${nm(d.brandName)} passed on your proposal`,
    preheader: 'You can send a new proposal from the agreement.',
    eyebrow: step(1),
    heading: 'Your proposal was declined',
    blocks: [
      B.p([`Hi ${first(d.recipientName)}, `, { b: nm(d.brandName) }, ' passed on this version of your proposal. The agreement is still open, so you can send a new one.']),
      gigRows(d),
      B.button('Send a new proposal', '/notifications'),
    ],
    reason: 'You are getting this because a brand responded to your proposal on Runwae.',
  }),
};

T.gig_proposal_accepted = {
  category: 'agreements',
  sample: { recipientName: 'Ivy Chen', brandName: 'Lumen Skin', creatorName: 'Ivy Chen', gig: { platform: 'instagram', compensation: 'money', priceCents: 25000 } },
  render: (d) => {
    const g = d.gig || {};
    const gift = g.compensation === 'gift';
    return L.layout({
      subject: gift ? `${nm(d.brandName)} accepted your proposal and shipped your item` : `${nm(d.brandName)} accepted your proposal and paid ${money(g.priceCents)}`,
      preheader: 'Make the post, then mark it done in Runwae.',
      eyebrow: step(2),
      heading: 'Your proposal was accepted',
      blocks: [
        B.p(gift
          ? [`Hi ${first(d.recipientName)}, `, { b: nm(d.brandName) }, ' accepted your proposal and shipped your item. Make the post, then mark it done in Runwae.']
          : [`Hi ${first(d.recipientName)}, `, { b: nm(d.brandName) }, ` accepted your proposal and paid ${money(g.priceCents)}. Make the post, then mark it done in Runwae. You accept the payment once they verify the post.`]),
        gigRows(d, gift && g.trackingNumber ? [['Tracking number', line(g.trackingNumber, 60)]] : []),
        B.button('Mark your post done', '/notifications'),
      ],
      reason: 'You are getting this because a brand accepted your proposal on Runwae.',
    });
  },
};

T.gig_payment_receipt = {
  category: 'transactional',
  sample: { recipientName: 'Maya Ortiz', brandName: 'Lumen Skin', creatorName: 'Ivy Chen', reference: '-Nx81kQ2aZ', paidAt: 1792000000000, chargedCents: 26055, processingCents: 1055, gig: { platform: 'tiktok', compensation: 'money', priceCents: 25000 } },
  render: (d) => {
    const g = d.gig || {};
    const gift = g.compensation === 'gift';
    return L.layout({
      subject: gift ? `Gift shipment recorded for ${nm(d.creatorName)}` : `Receipt: ${money(d.chargedCents || g.priceCents)} for your agreement with ${nm(d.creatorName)}`,
      preheader: gift ? 'Your shipment details for this agreement.' : 'Your payment for this agreement went through.',
      eyebrow: 'Receipt',
      heading: gift ? 'Shipment recorded' : 'Payment received',
      blocks: [
        B.p(gift
          ? [`Hi ${first(d.recipientName)}, we recorded your shipment to `, { b: nm(d.creatorName) }, '. They will make the post next.']
          : [`Hi ${first(d.recipientName)}, your payment to `, { b: nm(d.creatorName) }, ' went through. They will make the post next, and you verify it before they are paid out.']),
        B.details([
          gift ? null : ['Gig price', money(g.priceCents)],
          gift || !d.processingCents ? null : ['Card processing (at cost)', money(d.processingCents)],
          gift ? null : ['Amount charged', money(d.chargedCents || g.priceCents)],
          gift ? ['Tracking number', line(g.trackingNumber, 60)] : null,
          ['Paid to', nm(d.creatorName, 'Creator')],
          ['Platform', plat(g.platform)],
          ['Date', date(d.paidAt)],
          ['Reference', line(d.reference, 40)],
        ]),
        B.button('View the agreement', '/notifications'),
      ],
      reason: 'You are getting this receipt because you paid for an agreement on Runwae.',
      manage: false,
    });
  },
};

T.gig_post_submitted = {
  category: 'agreements',
  sample: { recipientName: 'Maya Ortiz', brandName: 'Lumen Skin', creatorName: 'Ivy Chen', gig: { platform: 'instagram', compensation: 'money', priceCents: 25000 } },
  render: (d) => L.layout({
    subject: `${nm(d.creatorName)} posted for your campaign`,
    preheader: 'Check the post and verify it.',
    eyebrow: step(3),
    heading: `${nm(d.creatorName)} made the post`,
    blocks: [
      B.p([`Hi ${first(d.recipientName)}, `, { b: nm(d.creatorName) }, ' marked the post as done. Check it on their account and verify it so they can be paid.']),
      gigRows(d),
      B.button('Verify the post', '/notifications'),
    ],
    reason: 'You are getting this because a creator completed a post for your campaign on Runwae.',
  }),
};

T.gig_post_verified = {
  category: 'agreements',
  sample: { recipientName: 'Ivy Chen', brandName: 'Lumen Skin', creatorName: 'Ivy Chen', gig: { platform: 'instagram', compensation: 'money', priceCents: 25000 } },
  render: (d) => {
    const g = d.gig || {};
    const gift = g.compensation === 'gift';
    return L.layout({
      subject: `${nm(d.brandName)} verified your post`,
      preheader: gift ? 'Confirm you received the item to close the agreement.' : `Accept your ${money(g.priceCents)} payment in Runwae.`,
      eyebrow: step(4),
      heading: 'Your post was verified',
      blocks: [
        B.p(gift
          ? [`Hi ${first(d.recipientName)}, `, { b: nm(d.brandName) }, ' verified your post. Confirm you received the item to close the agreement.']
          : [`Hi ${first(d.recipientName)}, `, { b: nm(d.brandName) }, ` verified your post. Accept the ${money(g.priceCents)} payment in Runwae to have it sent to your connected Stripe account.`]),
        gigRows(d),
        B.button(gift ? 'Close the agreement' : 'Accept payment', '/notifications'),
      ],
      reason: 'You are getting this because a brand verified your post on Runwae.',
    });
  },
};

T.gig_payout_sent = {
  category: 'transactional',
  sample: { recipientName: 'Ivy Chen', brandName: 'Lumen Skin', creatorName: 'Ivy Chen', reference: '-Nx81kQ2aZ', paidAt: 1792000000000, gig: { platform: 'instagram', compensation: 'money', priceCents: 25000 } },
  render: (d) => {
    const g = d.gig || {};
    const gift = g.compensation === 'gift';
    return L.layout({
      subject: gift ? `Agreement with ${nm(d.brandName)} complete` : `Your ${money(g.priceCents)} payout is on its way`,
      preheader: gift ? 'Thanks for closing the agreement.' : 'Sent to your connected Stripe account.',
      eyebrow: step(5),
      heading: gift ? 'Agreement complete' : 'Your payout is on its way',
      blocks: [
        B.p(gift
          ? [`Hi ${first(d.recipientName)}, you closed your agreement with `, { b: nm(d.brandName) }, '. Nice work.']
          : [`Hi ${first(d.recipientName)}, we sent your payment from `, { b: nm(d.brandName) }, ' to your connected Stripe account. Stripe pays it out on your account’s payout schedule.']),
        B.details([
          gift ? null : ['Amount', money(g.priceCents)],
          ['From', nm(d.brandName, 'Brand')],
          ['Platform', plat(g.platform)],
          gift ? null : ['Sent to', 'Your connected Stripe account'],
          ['Date', date(d.paidAt)],
          ['Reference', line(d.reference, 40)],
        ]),
        B.button('View the agreement', '/notifications'),
      ],
      reason: 'You are getting this because you accepted a payment on Runwae.',
      manage: false,
    });
  },
};

T.gig_complete = {
  category: 'agreements',
  sample: { recipientName: 'Maya Ortiz', brandName: 'Lumen Skin', creatorName: 'Ivy Chen', gig: { platform: 'instagram', compensation: 'money', priceCents: 25000 } },
  render: (d) => L.layout({
    subject: `Your agreement with ${nm(d.creatorName)} is complete`,
    preheader: 'Leave a review to help other brands.',
    eyebrow: step(5),
    heading: 'Agreement complete',
    blocks: [
      B.p([`Hi ${first(d.recipientName)}, `, { b: nm(d.creatorName) }, ' accepted the payment, so this agreement is closed. A short review helps other brands find good partners.']),
      gigRows(d),
      B.button('Leave a review', '/notifications'),
    ],
    reason: 'You are getting this because an agreement you started on Runwae was completed.',
  }),
};

T.gig_dispute = {
  category: 'transactional',
  sample: { recipientName: 'Ivy Chen', otherName: 'Lumen Skin', brandName: 'Lumen Skin', creatorName: 'Ivy Chen', gig: { platform: 'instagram', compensation: 'money', priceCents: 25000 } },
  render: (d) => L.layout({
    subject: `A dispute was opened on your agreement with ${nm(d.otherName)}`,
    preheader: 'The Runwae team will reply by email.',
    eyebrow: 'Agreement · Dispute',
    heading: 'A dispute was opened',
    blocks: [
      B.p([`Hi ${first(d.recipientName)}, `, { b: nm(d.otherName) }, ' opened a dispute on your agreement. The Runwae team reviews every dispute and will reply to both of you by email.']),
      gigRows(d),
      B.note('You can reply to this email to add your side.'),
      B.button('View the agreement', '/notifications'),
    ],
    reason: 'You are getting this because a dispute was opened on one of your Runwae agreements.',
    manage: false,
  }),
};

T.gig_dispute_ops = {
  category: 'transactional',
  sample: { recipientName: 'Runwae', filerName: 'Lumen Skin', filerRole: 'brand', brandName: 'Lumen Skin', creatorName: 'Ivy Chen', gigPath: 'items/-Nx1/influencers/-Nx2', description: 'The post was deleted after 2 hours <script>x</script>', gig: { platform: 'instagram', compensation: 'money', priceCents: 25000, status: 6 } },
  render: (d) => L.layout({
    subject: `Dispute filed by ${nm(d.filerName)} (${line(d.filerRole, 12)})`,
    preheader: 'New dispute on an agreement.',
    eyebrow: 'Internal · Dispute',
    heading: 'New dispute',
    blocks: [
      B.p([{ b: nm(d.filerName) }, ` (${line(d.filerRole, 12)}) filed a dispute.`]),
      B.quote(para(d.description, 2000)),
      gigRows(d, [['Status', String((d.gig && d.gig.status) || '')], ['Gig path', line(d.gigPath, 120)]]),
    ],
    reason: 'Internal notice to the Runwae support inbox.',
    manage: false,
  }),
};

/* ---------------------- Messages & activity ---------------------- */

T.message_new = {
  category: 'messages',
  sample: { recipientName: 'Maya Ortiz', senderName: 'Ivy Chen', snippet: 'Hi Maya! Loved the brief. Could we move the post to Friday so it lands with the launch? <b>not bold</b>' },
  render: (d) => L.layout({
    subject: `New message from ${nm(d.senderName)}`,
    preheader: line(d.snippet, 90),
    heading: `${nm(d.senderName)} sent you a message`,
    blocks: [
      B.p(`Hi ${first(d.recipientName)},`),
      d.snippet ? B.quote(para(d.snippet, 280), nm(d.senderName)) : B.p('Open Runwae to read it.'),
      B.button('Reply', '/messages'),
    ],
    reason: 'You are getting this because someone messaged you on Runwae.',
  }),
};

T.follower_new = {
  category: 'activity',
  sample: { recipientName: 'Ivy Chen', actorName: 'Lumen Skin' },
  render: (d) => L.layout({
    subject: `${nm(d.actorName)} followed you`,
    preheader: 'See who is following you on Runwae.',
    heading: `${nm(d.actorName)} followed you`,
    blocks: [
      B.p([`Hi ${first(d.recipientName)}, `, { b: nm(d.actorName) }, ' started following you on Runwae.']),
      B.button('See your notifications', '/notifications'),
    ],
    reason: 'You are getting this because someone followed you on Runwae.',
  }),
};

T.review_new = {
  category: 'activity',
  sample: { recipientName: 'Ivy Chen', actorName: 'Lumen Skin', rating: 5, body: 'Fast, clear, and the post outperformed our last three.' },
  render: (d) => {
    const r = Math.max(0, Math.min(5, Math.round(Number(d.rating) || 0)));
    return L.layout({
      subject: `${nm(d.actorName)} left you a review`,
      preheader: r ? `${r} out of 5` : 'See your new review.',
      heading: 'You have a new review',
      blocks: [
        B.p([`Hi ${first(d.recipientName)}, `, { b: nm(d.actorName) }, ' left a review on your profile.']),
        r ? B.details([['Rating', `${r} out of 5`]]) : null,
        d.body ? B.quote(para(d.body, 400), nm(d.actorName)) : null,
        B.button('See your profile', '/profile'),
      ].filter(Boolean),
      reason: 'You are getting this because someone reviewed you on Runwae.',
    });
  },
};

const ACTIVITY = {
  comment: { verb: 'commented on your post', head: 'New comment' },
  share: { verb: 'shared your post', head: 'Your post was shared' },
  interest: { verb: 'is interested in your post', head: 'Someone is interested' },
};
T.activity = {
  category: 'activity',
  sample: { recipientName: 'Maya Ortiz', actorName: 'Ivy Chen', kind: 'interest' },
  render: (d) => {
    const a = ACTIVITY[d.kind] || ACTIVITY.comment;
    return L.layout({
      subject: `${nm(d.actorName)} ${a.verb}`,
      preheader: `${nm(d.actorName)} ${a.verb}.`,
      heading: a.head,
      blocks: [
        B.p([`Hi ${first(d.recipientName)}, `, { b: nm(d.actorName) }, ` ${a.verb}.`]),
        B.button('See your notifications', '/notifications'),
      ],
      reason: 'You are getting this because someone interacted with your post on Runwae.',
    });
  },
};

/* ---------------------- Account ---------------------- */

T.account_welcome = {
  category: 'transactional',
  sample: { recipientName: 'Ivy Chen', role: 'influencer' },
  render: (d) => L.layout({
    subject: 'Welcome to Runwae',
    preheader: 'Finish your profile so the right partners can find you.',
    heading: `Welcome, ${first(d.recipientName)}`,
    blocks: [
      B.p(d.role === 'marketer'
        ? 'Runwae connects brands with creators. Post a campaign, review proposals, and pay, verify and close each agreement in one place.'
        : 'Runwae connects creators with brands. Find campaigns, send proposals, and get paid when the brand verifies your post.'),
      B.p('Start with your profile: a photo, your location and a short bio help partners trust you.'),
      B.button('Complete your profile', '/account'),
      B.note('We also sent a separate email to confirm your address.'),
    ],
    reason: 'You are getting this because you created a Runwae account.',
    manage: false,
  }),
};

T.account_profile_nudge = {
  category: 'activity',
  sample: { recipientName: 'Ivy Chen' },
  render: (d) => L.layout({
    subject: 'You’re almost there',
    preheader: 'A complete profile gets more replies.',
    heading: 'Finish your profile',
    blocks: [
      B.p(`Hi ${first(d.recipientName)}, a complete profile (photo, location, industry and a short bio) helps partners trust you and reply faster.`),
      B.button('Complete your profile', '/account'),
    ],
    reason: 'You are getting this because your Runwae profile is not complete yet.',
  }),
};

/* ---------------------- Subscription (billing agent) ---------------------- */
// data: { recipientName, planName, amountCents, currency, interval ('month'|'year'),
//         periodStart, periodEnd, nextBillingAt, invoiceNumber, invoiceUrl (Stripe hosted),
//         portalUrl (Stripe billing portal), retryAt, endsAt }
const per = (i) => (i === 'year' ? 'year' : 'month');
const billLink = (d) => d.portalUrl || '/account#billing';

T.subscription_welcome = {
  category: 'transactional',
  sample: { recipientName: 'Maya Ortiz', planName: 'Brand', amountCents: 4900, currency: 'usd', interval: 'month', nextBillingAt: 1794600000 },
  render: (d) => L.layout({
    subject: `You're on the Runwae ${line(d.planName, 40)} plan`,
    preheader: `${money(d.amountCents, d.currency)} per ${per(d.interval)}. Manage it anytime.`,
    eyebrow: 'Subscription',
    heading: `Welcome to ${line(d.planName, 40)}`,
    blocks: [
      B.p(`Hi ${first(d.recipientName)}, your subscription is active.`),
      B.details([
        ['Plan', line(d.planName, 40)],
        ['Price', `${money(d.amountCents, d.currency)} per ${per(d.interval)}`],
        ['Next billing date', date(d.nextBillingAt)],
      ]),
      B.button('Manage your plan', billLink(d)),
    ],
    reason: 'You are getting this because you subscribed to a Runwae plan.',
    manage: false,
  }),
};

T.subscription_receipt = {
  category: 'transactional',
  sample: { recipientName: 'Maya Ortiz', planName: 'Brand', amountCents: 4900, currency: 'usd', interval: 'month', periodStart: 1792000000, periodEnd: 1794600000, invoiceNumber: 'RW-0042', invoiceUrl: 'https://invoice.stripe.com/i/acct_test/test_abc' },
  render: (d) => L.layout({
    subject: `Receipt: ${money(d.amountCents, d.currency)} for Runwae ${line(d.planName, 40)}`,
    preheader: `Invoice ${line(d.invoiceNumber, 40)} paid.`,
    eyebrow: 'Receipt',
    heading: 'Payment received',
    blocks: [
      B.p(`Hi ${first(d.recipientName)}, thanks. Your payment for Runwae ${line(d.planName, 40)} went through.`),
      B.details([
        ['Amount', money(d.amountCents, d.currency)],
        ['Plan', line(d.planName, 40)],
        ['Period', d.periodStart && d.periodEnd ? `${date(d.periodStart)} – ${date(d.periodEnd)}` : ''],
        ['Invoice', line(d.invoiceNumber, 40)],
      ]),
      B.button('View invoice', d.invoiceUrl || billLink(d)),
    ],
    reason: 'You are getting this receipt because you have a Runwae subscription.',
    manage: false,
  }),
};

T.subscription_payment_failed = {
  category: 'transactional',
  sample: { recipientName: 'Maya Ortiz', planName: 'Brand', amountCents: 4900, currency: 'usd', retryAt: 1792250000, portalUrl: 'https://billing.stripe.com/p/session/test_abc' },
  render: (d) => L.layout({
    subject: 'Your Runwae payment didn’t go through',
    preheader: 'Update your card to keep your plan active.',
    eyebrow: 'Billing',
    heading: 'Your payment didn’t go through',
    blocks: [
      B.p(`Hi ${first(d.recipientName)}, we couldn’t charge ${money(d.amountCents, d.currency)} for your Runwae ${line(d.planName, 40)} plan. Update your payment method to keep it active.`),
      B.details([
        ['Plan', line(d.planName, 40)],
        ['Amount due', money(d.amountCents, d.currency)],
        ['Next attempt', date(d.retryAt)],
      ]),
      B.button('Update payment method', billLink(d)),
      B.note('If nothing changes, the plan ends after the final retry.', { danger: true }),
    ],
    reason: 'You are getting this because a payment for your Runwae subscription failed.',
    manage: false,
  }),
};

T.subscription_cancelled = {
  category: 'transactional',
  sample: { recipientName: 'Maya Ortiz', planName: 'Brand', endsAt: 1794600000 },
  render: (d) => L.layout({
    subject: `Your Runwae ${line(d.planName, 40)} plan is cancelled`,
    preheader: d.endsAt ? `Access continues until ${date(d.endsAt)}.` : 'Your plan has ended.',
    eyebrow: 'Subscription',
    heading: 'Your plan is cancelled',
    blocks: [
      B.p(d.endsAt
        ? `Hi ${first(d.recipientName)}, your ${line(d.planName, 40)} plan is cancelled. You keep access until ${date(d.endsAt)}, and you won’t be charged again.`
        : `Hi ${first(d.recipientName)}, your ${line(d.planName, 40)} plan has ended and you won’t be charged again.`),
      B.button('Resubscribe', billLink(d)),
    ],
    reason: 'You are getting this because your Runwae subscription was cancelled.',
    manage: false,
  }),
};

module.exports = T;
