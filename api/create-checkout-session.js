import Stripe from 'stripe';
import { FLIGHTS } from './_lib/flights.js';

const isEmail = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v || '');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }
  try {
    const { flight, recipientName, buyerName, buyerEmail, message } = req.body || {};
    const f = FLIGHTS[flight];
    if (!f) { res.status(400).json({ error: 'Vol invalide.' }); return; }
    if (!recipientName || !String(recipientName).trim()) {
      res.status(400).json({ error: 'Le nom du bénéficiaire est requis.' });
      return;
    }
    if (!isEmail(buyerEmail)) { res.status(400).json({ error: 'Adresse e-mail invalide.' }); return; }

    if (!process.env.STRIPE_SECRET_KEY) {
      res.status(503).json({ error: 'Paiement non encore configuré. Réessayez bientôt ou appelez-nous.' });
      return;
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const base = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: buyerEmail,
      locale: 'fr',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: f.amount,
            product_data: {
              name: `Bon cadeau — ${f.name}`,
              description: `Pour ${String(recipientName).slice(0, 120)}`,
            },
          },
        },
      ],
      metadata: {
        flight: f.slug,
        recipientName: String(recipientName).slice(0, 120),
        buyerName: String(buyerName || '').slice(0, 120),
        message: String(message || '').slice(0, 480),
      },
      success_url: `${base}/merci.html?sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/bon-cadeau.html#commander`,
    });

    res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('create-checkout-session', e);
    res.status(500).json({ error: 'Erreur serveur. Merci de réessayer.' });
  }
}
