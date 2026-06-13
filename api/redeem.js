import { ensureSchema, sql } from './_lib/db.js';
import { verifySig } from './_lib/codes.js';

// Marque un bon comme "utilisé" (réservé au personnel : protégé par ADMIN_TOKEN).
// POST /api/redeem  { code, s, token }
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
    const upd = await sql`
      UPDATE vouchers SET status = 'used', redeemed_at = now()
      WHERE code = ${code} AND status = 'valid'
      RETURNING code, redeemed_at
    `;
    if (upd.length === 0) {
      const cur = await sql`SELECT status, redeemed_at FROM vouchers WHERE code = ${code}`;
      if (cur.length === 0) { res.status(404).json({ error: 'Bon inconnu.' }); return; }
      res.status(409).json({ error: 'Ce bon a déjà été utilisé.', status: cur[0].status, redeemedAt: cur[0].redeemed_at });
      return;
    }
    res.status(200).json({ ok: true, status: 'used', redeemedAt: upd[0].redeemed_at });
  } catch (e) {
    console.error('redeem', e);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
}
