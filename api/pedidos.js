const { createClient } = require('redis');

// Painel administrativo simples para a fase de geracao MANUAL.
// Lista os pedidos pagos aguardando geracao. Protegido por ADMIN_SECRET.
// Uso: GET /api/pedidos?secret=SEU_SEGREDO
//      GET /api/pedidos?secret=SEU_SEGREDO&marcar=sess_xxx  (marca como 'gerado')
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const secret = req.query.secret || req.headers['x-admin-secret'];
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Nao autorizado' });
  }

  const redisUrl = process.env.REDIS_URL || process.env.STORAGE_URL;
  const rc = createClient({ url: redisUrl });
  rc.on('error', err => console.error('Redis:', err));

  try {
    await rc.connect();

    // Marcar um pedido como gerado (remove o estado pendente da sessao)
    if (req.query.marcar) {
      const sid = req.query.marcar;
      const raw = await rc.get(`session:${sid}`);
      if (raw) {
        const s = JSON.parse(raw);
        s.status = 'gerado';
        s.geradoEm = new Date().toISOString();
        await rc.setEx(`session:${sid}`, 60 * 60 * 24 * 30, JSON.stringify(s));
      }
      await rc.quit();
      return res.status(200).json({ ok: true, marcado: sid });
    }

    // Lista a fila de pedidos pagos aguardando geracao
    const itens = await rc.lRange('fila:mapaastralpersonalizado', 0, -1);
    const pendentes = [];
    for (const it of itens) {
      const ped = JSON.parse(it);
      const raw = await rc.get(`session:${ped.sessionId}`);
      const st = raw ? JSON.parse(raw).status : 'desconhecido';
      if (st !== 'gerado') pendentes.push({ ...ped, status: st });
    }
    await rc.quit();

    return res.status(200).json({ total: pendentes.length, pedidos: pendentes });
  } catch (e) {
    try { await rc.quit(); } catch (_) {}
    console.error('Erro /api/pedidos:', e.message);
    return res.status(500).json({ error: e.message });
  }
}

