// Sistema de cliente unificado entre todos os produtos Astralia
// Gera codigo unico, rastreia produtos adquiridos, aplica descontos especiais

const { createClient } = require('redis');

const PRODUTOS = ['lilith', 'mapanatal', 'mapakarmico', 'mapadasorte', 'sinastria', 'mapaprofissional', 'mapaprevisoes', 'revolucaosolar'];

// Prefixos para abreviar produtos nos codigos
const PREFIXOS = {
  lilith: 'LIL',
  mapanatal: 'NAT',
  mapakarmico: 'KAR',
  mapadasorte: 'SOR',
  sinastria: 'SIN',
  mapaprofissional: 'PRO',
  mapaprevisoes: 'PRE',
  revolucaosolar: 'REV',
  mapaastralpersonalizado: 'MAP'
};

// Gera codigo unico tipo ASTRO-LIL-X7F2Q9
function gerarCodigo(produtoBase) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem caracteres confusos (O/0, I/1)
  let random = '';
  for (let i = 0; i < 6; i++) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  const prefixo = PREFIXOS[produtoBase] || 'AST';
  return `ASTRO-${prefixo}-${random}`;
}

// Conecta no Redis
async function conectarRedis() {
  const redisUrl = process.env.REDIS_URL || process.env.STORAGE_URL;
  const rc = createClient({ url: redisUrl });
  rc.on('error', e => console.error('Redis cliente:', e));
  await rc.connect();
  return rc;
}

// Cria/atualiza cliente apos compra aprovada
async function registrarCompra(dadosCliente, produto) {
  const rc = await conectarRedis();
  try {
    let codigo;

    // Se cliente ja tem codigo (vinha como recurrente), usa
    if (dadosCliente.codigoCliente) {
      codigo = dadosCliente.codigoCliente.toUpperCase();
      const existente = await rc.get(`cliente:${codigo}`);
      if (existente) {
        const c = JSON.parse(existente);
        if (!c.produtos.includes(produto)) c.produtos.push(produto);
        c.ultimaCompra = new Date().toISOString();
        c.totalGasto = (c.totalGasto || 0) + (dadosCliente.preco || 0);
        c.totalCompras = (c.totalCompras || 0) + 1;
        await rc.setEx(`cliente:${codigo}`, 60 * 60 * 24 * 365 * 2, JSON.stringify(c));
        await rc.quit();
        return { codigo, novoCliente: false, cliente: c };
      }
    }

    // Tenta achar cliente existente por email/whatsapp
    if (dadosCliente.email) {
      const codigoAchado = await rc.get(`cliente:email:${dadosCliente.email.toLowerCase()}`);
      if (codigoAchado) {
        codigo = codigoAchado;
        const existente = await rc.get(`cliente:${codigo}`);
        if (existente) {
          const c = JSON.parse(existente);
          if (!c.produtos.includes(produto)) c.produtos.push(produto);
          c.ultimaCompra = new Date().toISOString();
          c.totalGasto = (c.totalGasto || 0) + (dadosCliente.preco || 0);
          c.totalCompras = (c.totalCompras || 0) + 1;
          await rc.setEx(`cliente:${codigo}`, 60 * 60 * 24 * 365 * 2, JSON.stringify(c));
          await rc.quit();
          return { codigo, novoCliente: false, cliente: c };
        }
      }
    }

    // Cliente novo: gera codigo
    codigo = gerarCodigo(produto);
    // Garante unicidade
    let tentativas = 0;
    while (await rc.get(`cliente:${codigo}`) && tentativas < 5) {
      codigo = gerarCodigo(produto);
      tentativas++;
    }

    const cliente = {
      codigo,
      nome: dadosCliente.nome,
      email: dadosCliente.email,
      whatsapp: dadosCliente.whatsapp,
      genero: dadosCliente.genero,
      dataNascimento: dadosCliente.data,
      horaNascimento: dadosCliente.hora,
      cidadeNascimento: dadosCliente.cidade,
      lat: dadosCliente.lat,
      lon: dadosCliente.lon,
      produtos: [produto],
      primeiraCompra: new Date().toISOString(),
      ultimaCompra: new Date().toISOString(),
      totalGasto: dadosCliente.preco || 0,
      totalCompras: 1
    };

    // Salva por codigo
    await rc.setEx(`cliente:${codigo}`, 60 * 60 * 24 * 365 * 2, JSON.stringify(cliente));
    // Index por email para reconhecimento futuro
    if (dadosCliente.email) {
      await rc.setEx(`cliente:email:${dadosCliente.email.toLowerCase()}`, 60 * 60 * 24 * 365 * 2, codigo);
    }
    await rc.quit();
    return { codigo, novoCliente: true, cliente };

  } catch (e) {
    await rc.quit();
    console.error('Erro registrar compra:', e.message);
    throw e;
  }
}

// Busca cliente por codigo
async function buscarCliente(codigo) {
  if (!codigo) return null;
  const rc = await conectarRedis();
  try {
    const data = await rc.get(`cliente:${codigo.toUpperCase()}`);
    await rc.quit();
    return data ? JSON.parse(data) : null;
  } catch (e) {
    await rc.quit();
    return null;
  }
}

// Sugere proximo produto baseado no que o cliente NAO tem
// Sugere proximo produto seguindo estrategia de upsell/downsell
// REGRA CRITICA: Mapa Astral Personalizado contem Mapa Astral simples.
// - Quem comprou Personalizado NUNCA recebe upsell de Mapa Astral simples
// - Quem comprou Mapa Astral simples PODE receber Personalizado como upgrade
// - Combos NUNCA misturam os dois
function sugerirProximoProduto(produtosAdquiridos = [], produtoAtual = null) {
  const ja = new Set([...produtosAdquiridos, produtoAtual].filter(p => p));

  // REGRA: se tem Personalizado, considera Mapa Astral simples como "ja adquirido"
  if (ja.has('mapaastralpersonalizado') || ja.has('personalizado')) {
    ja.add('mapanatal');
    ja.add('mapaastral');
  }

  // UPSELL: mapas principais com maior valor
  const upsellPrincipais = ['mapaastralpersonalizado', 'mapakarmico', 'mapaprevisoes'];
  const upsellDisponiveis = upsellPrincipais.filter(p => !ja.has(p));

  // DOWNSELL: mapas complementares com menor preco
  const downsellOpcoes = ['mapadasorte', 'sinastria', 'mapaprofissional', 'revolucaosolar'];
  const downsellDisponiveis = downsellOpcoes.filter(p => !ja.has(p));

  // COMBO: so se ambos do upsell estao disponiveis (Personalizado + Karmico)
  const podeCombo = upsellDisponiveis.includes('mapaastralpersonalizado') &&
                    upsellDisponiveis.includes('mapakarmico');
  const combo = podeCombo ? 'combo-personalizado-karmico' : null;

  // TODOS produtos disponiveis para Upsell N1 (escolha multipla)
  const todosDisponiveis = [
    'mapaastralpersonalizado', 'mapakarmico', 'mapaprevisoes',
    'sinastria', 'mapadasorte', 'mapaprofissional', 'revolucaosolar'
  ].filter(p => !ja.has(p));

  // Se cliente NAO tem Personalizado E NAO tem Mapa Astral simples, oferece simples no N1
  if (!ja.has('mapaastralpersonalizado') && !ja.has('mapanatal') && !ja.has('mapaastral')) {
    todosDisponiveis.push('mapanatal');
  }

  return {
    combo,
    upsell: upsellDisponiveis,
    downsell: downsellDisponiveis.slice(0, 1),
    todosDisponiveis,
    jaComprou: Array.from(ja)
  };
}

// Funcao legacy mantida para compatibilidade
function proximoProdutoSimples(produtosAdquiridos = [], produtoAtual = null) {
  const ordem = ['mapakarmico', 'mapaprevisoes', 'sinastria', 'lilith', 'mapadasorte', 'mapaprofissional', 'revolucaosolar', 'mapanatal'];
  const ja = new Set([...produtosAdquiridos, produtoAtual]);
  for (const p of ordem) {
    if (!ja.has(p)) return p;
  }
  return null;
}

// Endpoint handler
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET /api/cliente?codigo=XXX -> busca cliente
    if (req.method === 'GET') {
      const codigo = req.query.codigo;
      if (!codigo) return res.status(400).json({ error: 'Codigo obrigatorio' });
      const cliente = await buscarCliente(codigo);
      if (!cliente) return res.status(404).json({ error: 'Cliente nao encontrado' });

      // Sugere upsell/downsell baseado em historico
      const sugestoes = sugerirProximoProduto(cliente.produtos, req.query.produto);

      return res.status(200).json({
        codigo: cliente.codigo,
        nome: cliente.nome,
        email: cliente.email,
        whatsapp: cliente.whatsapp,
        dataNascimento: cliente.dataNascimento,
        horaNascimento: cliente.horaNascimento,
        cidadeNascimento: cliente.cidadeNascimento,
        lat: cliente.lat,
        lon: cliente.lon,
        genero: cliente.genero,
        produtos: cliente.produtos,
        totalCompras: cliente.totalCompras,
        sugestoes
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('Erro /api/cliente:', e.message);
    return res.status(500).json({ error: e.message });
  }
};

module.exports.gerarCodigo = gerarCodigo;
module.exports.registrarCompra = registrarCompra;
module.exports.buscarCliente = buscarCliente;
module.exports.sugerirProximoProduto = sugerirProximoProduto;
module.exports.PRODUTOS = PRODUTOS;
