import { ensureSchema, sql } from './_lib/db.js';
import { verifySig, sign } from './_lib/codes.js';
import { buildVoucherPdf } from './_lib/voucherPdf.js';
import { sendVoucherEmail } from './_lib/email.js';

// Renvoie le bon par email à l'acheteur (réservé admin).
// POST /api/resend  { code, s, token }
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Méthode non autorisée' }); return; }

  const { code, s, token } = req.body || {};

  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    res.status(401).json({ error: 'Code administrateur invalide.' });
    return;
  }
  if (!verifySig(code, s)) {
    res.status(400).json({ error: 'Bon non authentique.' });
    return;
  }

  try {
    await ensureSchema();
    const rows = await sql`
      SELECT code, flight_name, recipient_name, message, amount, buyer_email
      FROM vouchers WHERE code = ${code}
    `;
    if (rows.length === 0) { res.status(404).json({ error: 'Bon inconnu.' }); return; }
    const v = rows[0];
    if (!v.buyer_email) { res.status(400).json({ error: "Aucune adresse e-mail enregistrée pour ce bon." }); return; }

    const base = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
    const verifyUrl = `${base}/verifier.html?c=${encodeURIComponent(code)}&s=${sign(code)}`;

    const pdf = await buildVoucherPdf({
      code,
      flightName: v.flight_name,
      recipientName: v.recipient_name,
      message: v.message,
      amount: v.amount,
      verifyUrl,
    });
    await sendVoucherEmail({
      to: v.buyer_email,
      recipientName: v.recipient_name,
      flightName: v.flight_name,
      code,
      amount: v.amount,
      pdf,
    });

    await sql`UPDATE vouchers SET emailed = true, email_error = NULL WHERE code = ${code}`;
    res.status(200).json({ ok: true, to: v.buyer_email });
  } catch (e) {
    console.error('resend', e);
    res.status(500).json({ error: "Échec de l'envoi : " + String(e?.message || e).slice(0, 200) });
  }
}
