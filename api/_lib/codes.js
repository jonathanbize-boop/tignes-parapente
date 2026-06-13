import crypto from 'node:crypto';

// Alphabet sans caractères ambigus (pas de I, O, 0, 1).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Code lisible et unique, ex. : TP-7K9D-X4M2
export function generateCode() {
  const grp = (n) =>
    Array.from(crypto.randomBytes(n))
      .map((b) => ALPHABET[b % ALPHABET.length])
      .join('');
  return `TP-${grp(4)}-${grp(4)}`;
}

// Signature HMAC-SHA256 tronquée : rend le QR infalsifiable
// (impossible de fabriquer un code valide sans connaître VOUCHER_SECRET).
export function sign(code) {
  const secret = process.env.VOUCHER_SECRET || '';
  return crypto.createHmac('sha256', secret).update(String(code)).digest('base64url').slice(0, 16);
}

// Vérification de la signature en temps constant.
export function verifySig(code, sig) {
  if (!code || !sig) return false;
  const expected = sign(code);
  const a = Buffer.from(String(sig));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
