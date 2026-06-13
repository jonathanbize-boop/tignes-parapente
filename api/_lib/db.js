import { neon } from '@neondatabase/serverless';

// Initialisation paresseuse : on ne crée le client qu'au premier appel,
// pour éviter une erreur au chargement si la BDD n'est pas encore configurée.
let _sql = null;
function client() {
  if (!_sql) {
    const conn = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!conn) throw new Error('Base de données non configurée (DATABASE_URL manquante).');
    _sql = neon(conn);
  }
  return _sql;
}

// Tag de requête : `await sql\`SELECT ...\`` renvoie un tableau de lignes.
export function sql(strings, ...values) {
  return client()(strings, ...values);
}

let ready = null;
// Crée la table au premier appel (idempotent), et ajoute les colonnes de suivi d'email.
export async function ensureSchema() {
  if (ready) return ready;
  ready = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS vouchers (
        code              TEXT PRIMARY KEY,
        flight            TEXT NOT NULL,
        flight_name       TEXT NOT NULL,
        amount            INTEGER NOT NULL,
        currency          TEXT NOT NULL DEFAULT 'eur',
        recipient_name    TEXT,
        buyer_name        TEXT,
        buyer_email       TEXT,
        message           TEXT,
        status            TEXT NOT NULL DEFAULT 'valid',
        stripe_session_id TEXT UNIQUE,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        redeemed_at       TIMESTAMPTZ
      )
    `;
    // Colonnes de suivi de l'email (ajout sûr si la table existe déjà).
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS emailed BOOLEAN NOT NULL DEFAULT false`;
    await sql`ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS email_error TEXT`;
  })();
  return ready;
}
