
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS kv_store (
      key       TEXT PRIMARY KEY,
      value     TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL não configurada' });
  }

  try {
    await ensureTable();

    // GET — retorna todos os pares chave/valor
    if (req.method === 'GET') {
      const rows = await sql`SELECT key, value FROM kv_store`;
      const result = {};
      rows.forEach(r => { result[r.key] = r.value; });
      return res.status(200).json(result);
    }

    // POST — salva ou atualiza um par chave/valor
    if (req.method === 'POST') {
      const { key, value } = req.body || {};
      if (!key || value === undefined) {
        return res.status(400).json({ error: 'key e value obrigatórios' });
      }
      await sql`
        INSERT INTO kv_store (key, value, updated_at)
        VALUES (${key}, ${value}, NOW())
        ON CONFLICT (key) DO UPDATE
          SET value = EXCLUDED.value, updated_at = NOW()
      `;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
