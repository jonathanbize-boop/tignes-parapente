import { ensureSchema, sql } from './_lib/db.js';
import { verifySig } from './_lib/codes.js';

// Vérification publique d'un bon (lecture seule).
// GET /api/voucher?c=TP-XXXX-XXXX&s=signature
export default async function handler(req, res) {
  const code = String(req.query.c || '');
  const sig = String(req.query.s || '');

  if (!verifySig(code, sig)) {
    res.status(200).json({ status: 'invalid', reason: 'Signature invalide (bon non authentique).' });
    return;
  }
  try {
    await ensureSchema();
    const rows = await sql`
      SELECT code, flight_name, recipient_name, status, created_at, redeemed_at
      FROM vouchers WHERE code = ${code}
    `;
    if (rows.length === 0) {
      res.status(200).json({ status: 'invalid', reason: 'Bon inconnu.' });
      return;
    }
    const v = rows[0];
    res.status(200).json({
      status: v.status, // 'valid' | 'used'
      flightName: v.flight_name,
      recipientName: v.recipient_name,
      createdAt: v.created_at,
      redeemedAt: v.redeemed_at,
    });
  } catch (e) {
    console.error('voucher', e);
    res.status(500).json({ status: 'error' });
  }
}
