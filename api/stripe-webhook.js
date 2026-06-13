import Stripe from 'stripe';
import { FLIGHTS } from './_lib/flights.js';
import { ensureSchema, sql } from './_lib/db.js';
import { generateCode, sign } from './_lib/codes.js';
import { buildVoucherPdf } from './_lib/voucherPdf.js';
import { sendVoucherEmail } from './_lib/email.js';

// Stripe exige le corps brut (non parsé) pour vérifier la signature.
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event;
  try {
    const raw = await readRawBody(req);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('Webhook: signature invalide', e.message);
    res.status(400).send(`Webhook Error: ${e.message}`);
    return;
  }

  if (event.type !== 'checkout.session.completed') {
    res.status(200).json({ received: true, ignored: event.type });
    return;
  }

  const s = event.data.object;
  try {
    await ensureSchema();

    const flightSlug = s.metadata?.flight;
    const f = FLIGHTS[flightSlug] || { name: s.metadata?.flight || 'Vol parapente', amount: s.amount_total };

    // Génère un code unique (réessaie si collision improbable).
    let code = generateCode();
    for (let i = 0; i < 5; i++) {
      const exists = await sql`SELECT 1 FROM vouchers WHERE code = ${code}`;
      if (exists.length === 0) break;
      code = generateCode();
    }

    const buyerEmail = s.customer_email || s.customer_details?.email || '';

    // Insertion idempotente : si Stripe renvoie le même évènement, on ne recrée pas le bon.
    const inserted = await sql`
      INSERT INTO vouchers (code, flight, flight_name, amount, currency, recipient_name, buyer_name, buyer_email, message, status, stripe_session_id)
      VALUES (${code}, ${flightSlug || '?'}, ${f.name}, ${s.amount_total}, ${s.currency || 'eur'},
              ${s.metadata?.recipientName || ''}, ${s.metadata?.buyerName || ''}, ${buyerEmail},
              ${s.metadata?.message || ''}, 'valid', ${s.id})
      ON CONFLICT (stripe_session_id) DO NOTHING
      RETURNING code
    `;
    if (inserted.length === 0) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    const base = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
    const verifyUrl = `${base}/verifier.html?c=${encodeURIComponent(code)}&s=${sign(code)}`;

    const pdf = await buildVoucherPdf({
      code,
      flightName: f.name,
      recipientName: s.metadata?.recipientName,
      message: s.metadata?.message,
      amount: s.amount_total,
      verifyUrl,
    });

    await sendVoucherEmail({
      to: buyerEmail,
      recipientName: s.metadata?.recipientName,
      flightName: f.name,
      code,
      amount: s.amount_total,
      pdf,
    });

    res.status(200).json({ received: true, code });
  } catch (e) {
    // 500 → Stripe réessaiera l'évènement (utile en cas d'erreur transitoire DB/email).
    console.error('Webhook: traitement échoué', e);
    res.status(500).json({ error: 'processing_failed' });
  }
}
