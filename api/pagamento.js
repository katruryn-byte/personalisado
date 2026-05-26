const { MercadoPagoConfig, Payment } = require('mercadopago');
const { createClient } = require('redis');
const { registrarCompra, buscarCliente } = require('./cliente');

const PRECOS_URL = 'https://raw.githubusercontent.com/katruryn-byte/astralia-precos/main/precos.json';
const PRODUTO_ID = 'mapaastralpersonalizado';
const PRECO_FALLBACK = 197.00;

async function obterPrecoAtual() {
  try {
    const r = await fetch(PRECOS_URL + '?t=' + Date.now());
    const data = await r.json();
    const p = data[PRODUTO_ID];
    if (p && p.ativo && typeof p.preco === 'number') return p.preco;
  } catch (e) {
    console.error('Erro ao buscar precos:', e.message);
  }
  return PRECO_FALLBACK;
}

// Deriva a notification_url do proprio dominio da requisicao.
// Evita o bug "URL invalido indefinido": nunca depende de env var que pode faltar.
function montarNotificationUrl(req) {
  const envUrl = process.env.WEBHOOK_URL; // opcional, tem prioridade se definida
  if (envUrl && /^https:\/\//.test(envUrl)) return envUrl;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (host && !/localhost|127\.0\.0\.1/.test(host)) return `https://${host}/api/webhook`;
  return null; // local/dev: MP nao aceita; segue sem notification_url
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { paymentData, dadosCliente, descontoExtra } = req.body;
    if (!paymentData || !dadosCliente) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    // SEGURANCA: preco sempre do servidor, nunca do cliente
    let precoServidor = await obterPrecoAtual();

    // Desconto de 10% se o codigo de cliente existir de verdade
    if (descontoExtra && descontoExtra > 0 && dadosCliente.codigoCliente) {
      try {
        const c = await buscarCliente(dadosCliente.codigoCliente);
        if (c) precoServidor = Math.round(precoServidor * 0.90 * 100) / 100;
      } catch (e) { console.log('Erro validar codigo:', e.message); }
    }

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const redisUrl = process.env.REDIS_URL || process.env.STORAGE_URL;

    const rc = createClient({ url: redisUrl });
    rc.on('error', err => console.error('Redis:', err));
    await rc.connect();
    await rc.setEx(`session:${sessionId}`, 7200, JSON.stringify({
      tipo: PRODUTO_ID,
      nome: dadosCliente.nome,
      email: dadosCliente.email,
      dados: dadosCliente,
      preco: precoServidor,
      status: 'pending',
      criadoEm: new Date().toISOString()
    }));
    await rc.quit();

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const paymentClient = new Payment(client);

    const paymentBody = {
      transaction_amount: precoServidor,
      description: 'Mapa Astral Personalizado - Astralia',
      external_reference: sessionId,
      payer: {
        email: dadosCliente.email || 'cliente@astralia.online',
        first_name: dadosCliente.nome?.split(' ')[0] || '',
        last_name: dadosCliente.nome?.split(' ').slice(1).join(' ') || ''
      },
      metadata: { session_id: sessionId, tipo: PRODUTO_ID }
    };

    // notification_url so e incluida se valida (nunca undefined -> evita erro 500 do MP)
    const notificationUrl = montarNotificationUrl(req);
    if (notificationUrl) paymentBody.notification_url = notificationUrl;

    if (paymentData.payment_method_id === 'pix') {
      paymentBody.payment_method_id = 'pix';
      // PIX no Mercado Pago EXIGE CPF do pagador. Sem isto -> erro 500.
      const cpf = (dadosCliente.cpf || '').replace(/\D/g, '');
      if (cpf.length === 11) {
        paymentBody.payer.identification = { type: 'CPF', number: cpf };
      } else {
        return res.status(400).json({ error: 'CPF obrigatorio para PIX', code: 'CPF_REQUIRED' });
      }
    } else {
      paymentBody.token = paymentData.token;
      paymentBody.installments = paymentData.installments || 1;
      paymentBody.payment_method_id = paymentData.payment_method_id;
      paymentBody.issuer_id = paymentData.issuer_id;
      if (paymentData.payer?.identification) {
        paymentBody.payer.identification = paymentData.payer.identification;
      }
    }

    const result = await paymentClient.create({ body: paymentBody });

    // Aprovacao imediata (cartao) tambem cai aqui; PIX aprova via webhook
    if (result.status === 'approved') {
      await marcarPago(sessionId, result.id, redisUrl, dadosCliente, precoServidor);
    }

    return res.status(200).json({
      sessionId,
      paymentId: result.id,
      status: result.status,
      status_detail: result.status_detail,
      qr_code: result.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      ticket_url: result.point_of_interaction?.transaction_data?.ticket_url
    });

  } catch (error) {
    console.error('Pagamento erro:', error.message, error.cause);
    return res.status(500).json({
      error: error.message,
      details: error.cause?.[0]?.description || null
    });
  }
}

// Marca pago + registra cliente + ENFILEIRA para geracao manual (sem gerar na hora)
async function marcarPago(sessionId, paymentId, redisUrl, dadosCliente, preco) {
  const rc = createClient({ url: redisUrl });
  rc.on('error', err => console.error('Redis:', err));
  await rc.connect();
  const existing = await rc.get(`session:${sessionId}`);
  const sessionObj = existing ? JSON.parse(existing) : {};

  if (!sessionObj.codigoCliente) {
    try {
      const reg = await registrarCompra({ ...dadosCliente, preco }, PRODUTO_ID);
      sessionObj.codigoCliente = reg.codigo;
      sessionObj.novoCliente = reg.novoCliente;
    } catch (e) { console.error('Erro registro cliente:', e.message); }
  }

  sessionObj.status = 'pago_aguardando_geracao';
  sessionObj.paymentId = String(paymentId);
  sessionObj.paidAt = new Date().toISOString();
  await rc.setEx(`session:${sessionId}`, 60 * 60 * 24 * 30, JSON.stringify(sessionObj)); // 30 dias

  // Fila de pedidos pendentes de geracao (lista simples para painel/manual/n8n)
  await rc.lPush('fila:mapaastralpersonalizado', JSON.stringify({
    sessionId, codigoCliente: sessionObj.codigoCliente, dados: sessionObj.dados,
    preco, paidAt: sessionObj.paidAt
  }));
  await rc.quit();
}

module.exports.marcarPago = marcarPago;

