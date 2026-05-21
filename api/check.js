const { createClient } = require('redis');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ error: 'sessionId obrigatorio' });

  try {
    const redisUrl = process.env.REDIS_URL || process.env.STORAGE_URL;
    const redisClient = createClient({ url: redisUrl });
    redisClient.on('error', err => console.error('Redis:', err));
    await redisClient.connect();
    const raw = await redisClient.get(`session:${sessionId}`);
    await redisClient.quit();

    if (!raw) return res.status(200).json({ status: 'not_found' });
    const session = JSON.parse(raw);
    return res.status(200).json({
      status: session.status,
      codigoCliente: session.codigoCliente || null,
      novoCliente: session.novoCliente || false
    });

  } catch (error) {
    console.error('Check erro:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
