import Stripe from 'stripe';

// Infos minimales pour personnaliser la page de remerciement.
// GET /api/session?sid=cs_xxx
export default async function handler(req, res) {
  const sid = String(req.query.sid || '');
  if (!sid || !process.env.STRIPE_SECRET_KEY) {
    res.status(200).json({ paid: false });
    return;
  }
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const s = await stripe.checkout.sessions.retrieve(sid);
    res.status(200).json({
      paid: s.payment_status === 'paid',
      email: s.customer_email || s.customer_details?.email || '',
      recipientName: s.metadata?.recipientName || '',
      flight: s.metadata?.flight || '',
    });
  } catch (e) {
    res.status(200).json({ paid: false });
  }
}
