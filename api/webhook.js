const { MercadoPagoConfig, Payment } = require('mercadopago');
const { createClient } = require('redis');
const { registrarCompra } = require('./cliente');

const PRODUTO_ID = 'mapaastralpersonalizado';

// Marca pago + registra cliente + enfileira para geracao (manual no inicio; n8n depois).
// NAO gera a leitura aqui: produto premium e assincrono (Opus, 48h, PDF por email).
async function processarAprovacao(sessionId, paymentId, redisUrl) {
  const rc = createClient({ url: redisUrl });
  rc.on('error', err => console.error('Redis:', err));
  await rc.connect();
  const existing = await rc.get(`session:${sessionId}`);
  const sessionObj = existing ? JSON.parse(existing) : {};

  // Idempotencia: se ja foi processado, nao enfileira de novo
  if (sessionObj.status === 'pago_aguardando_geracao' || sessionObj.status === 'gerado') {
    await rc.quit();
    return;
  }

  if (sessionObj.dados) {
    try {
      const reg = await registrarCompra(sessionObj.dados, PRODUTO_ID);
      sessionObj.codigoCliente = reg.codigo;
      sessionObj.novoCliente = reg.novoCliente;
    } catch (e) { console.error('Erro ao registrar cliente:', e.message); }
  }

  sessionObj.status = 'pago_aguardando_geracao';
  sessionObj.paymentId = String(paymentId);
  sessionObj.paidAt = new Date().toISOString();
  await rc.setEx(`session:${sessionId}`, 60 * 60 * 24 * 30, JSON.stringify(sessionObj));

  await rc.lPush('fila:mapaastralpersonalizado', JSON.stringify({
    sessionId, codigoCliente: sessionObj.codigoCliente, dados: sessionObj.dados,
    preco: sessionObj.preco, paidAt: sessionObj.paidAt
  }));
  await rc.quit();
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({ status: 'ok' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body;
    const query = req.query;
    const redisUrl = process.env.REDIS_URL || process.env.STORAGE_URL;
    let paymentId = null;

    if (body?.type === 'payment' && body?.data?.id) {
      paymentId = body.data.id;
    } else if (query?.topic === 'payment' && query?.id) {
      paymentId = query.id;
    } else if (body?.type === 'merchant_order' || query?.topic === 'merchant_order') {
      const orderId = body?.data?.id || query?.id;
      if (!orderId) return res.status(200).json({ status: 'no_order_id' });
      const mpResponse = await fetch(`https://api.mercadopago.com/merchant_orders/${orderId}`, {
        headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
      });
      const orderData = await mpResponse.json();
      const aprovados = (orderData.payments || []).filter(p => p.status === 'approved');
      if (aprovados.length === 0) return res.status(200).json({ status: 'pending_payment' });
      paymentId = aprovados[0].id;
      if (orderData.external_reference) {
        await processarAprovacao(orderData.external_reference, paymentId, redisUrl);
        return res.status(200).json({ status: 'success' });
      }
      return res.status(200).json({ status: 'no_external_reference' });
    } else {
      return res.status(200).json({ status: 'ignored' });
    }

    if (!paymentId) return res.status(200).json({ status: 'no_payment_id' });

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const paymentClient = new Payment(client);
    const payment = await paymentClient.get({ id: paymentId });
    if (payment.status !== 'approved') return res.status(200).json({ status: 'not_approved' });

    const sessionId = payment.external_reference;
    if (!sessionId) return res.status(200).json({ status: 'no_session' });

    await processarAprovacao(sessionId, paymentId, redisUrl);
    return res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error('Webhook erro:', error.message);
    return res.status(200).json({ status: 'error', message: error.message });
  }
}

module.exports.processarAprovacao = processarAprovacao;

