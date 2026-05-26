// ═══════════════════════════════════════════════════════════════════════════════
// MOTOR DE GERAÇÃO — Mapa Astral Personalizado
// ═══════════════════════════════════════════════════════════════════════════════
// O coração do pipeline. Dado os dados de nascimento (com lat/lon/timezone), ele:
//   1) chama a FreeAstrology API (planetas, casas, aspectos)
//   2) ADAPTA o retorno (formato EN, strings) para o objeto que os prompts novos
//      esperam ({ Sol:{signo,casa,grau}, ... }, aspectos:[{planeta1,aspecto,planeta2,orbe}])
//   3) monta o prompt premium (buildPromptMapaAstralPersonalizado)
//   4) chama o Claude Opus
//   5) extrai o JSON {secoes:[...]} de forma robusta
// Reutilizável: o n8n, um script manual ou um cron chamam gerarMapa(dados).
// SEM timeout do Vercel — roda onde houver tempo (n8n, worker, batch).
// ═══════════════════════════════════════════════════════════════════════════════

const { buildPromptMapaAstralPersonalizado } = require('./prompt-mapa-astral-personalizado');
const { getTimezone } = require('./timezone-config');

const FA_BASE = 'https://json.freeastrologyapi.com/western';
const MODELO = 'claude-opus-4-7';

// EN -> chave usada pelos prompts novos
const PLANETA = {
  'Sun': 'Sol', 'Moon': 'Lua', 'Mercury': 'Mercúrio', 'Venus': 'Vênus', 'Mars': 'Marte',
  'Jupiter': 'Júpiter', 'Saturn': 'Saturno', 'Uranus': 'Urano', 'Neptune': 'Netuno',
  'Pluto': 'Plutão', 'Chiron': 'Quíron', 'Lilith': 'Lilith',
  'True Node': 'Nodo Norte', 'Mean Node': 'Nodo Norte',
  'Part of Fortune': 'Parte da Fortuna', 'Pars Fortuna': 'Parte da Fortuna'
};
const SIGNO = {
  'Aries': 'Áries', 'Taurus': 'Touro', 'Gemini': 'Gêmeos', 'Cancer': 'Câncer',
  'Leo': 'Leão', 'Virgo': 'Virgem', 'Libra': 'Libra', 'Scorpio': 'Escorpião',
  'Sagittarius': 'Sagitário', 'Capricorn': 'Capricórnio', 'Aquarius': 'Aquário', 'Pisces': 'Peixes'
};
const ASPECTO = {
  'Conjunction': 'conjunção', 'Opposition': 'oposição', 'Trine': 'trígono',
  'Square': 'quadratura', 'Sextile': 'sextil', 'Quincunx': 'quincúncio'
};

// Calcula em qual casa um grau absoluto cai (mesma lógica do astro-config do Lilith)
function calcularCasa(fullDegree, houses) {
  if (!houses || !houses.length) return null;
  for (let i = 0; i < houses.length; i++) {
    const prox = (i + 1) % houses.length;
    const inicio = houses[i].degree, fim = houses[prox].degree;
    if (fim > inicio) { if (fullDegree >= inicio && fullDegree < fim) return houses[i].House; }
    else { if (fullDegree >= inicio || fullDegree < fim) return houses[i].House; }
  }
  return null;
}

// ADAPTADOR: saída da FreeAstrology -> objeto que os prompts novos consomem
function parseFreeAstrology(planetas = [], casasOut = null, aspectos = []) {
  const houses = casasOut?.Houses || [];
  const mapaNatal = {};

  for (const item of planetas) {
    const en = item.planet?.en;
    if (!en) continue;
    const signoEn = item.zodiac_sign?.name?.en;
    const signo = SIGNO[signoEn] || signoEn;
    const grau = typeof item.normDegree === 'number' ? Math.round(item.normDegree * 10) / 10 : null;
    const retro = item.isRetro === 'True' || item.isRetro === true;
    const casa = item.casaNum || (typeof item.fullDegree === 'number' ? calcularCasa(item.fullDegree, houses) : null);

    if (en === 'Ascendant') { mapaNatal.ASC = `${signo} ${grau ?? ''}°`.trim(); continue; }
    if (en === 'MC') { mapaNatal.MC = { signo, grau }; continue; }
    const chave = PLANETA[en];
    if (!chave) continue; // ignora pontos que os prompts não usam
    // Não sobrescreve Nodo Norte se já veio (True Node tem prioridade sobre Mean Node)
    if (chave === 'Nodo Norte' && mapaNatal['Nodo Norte'] && en === 'Mean Node') continue;
    mapaNatal[chave] = { signo, casa, grau, retrogrado: retro };
  }

  // Cúspides úteis aos prompts (Casa 4 origem, Casa 6 trabalho, etc.)
  for (const c of houses) {
    const s = SIGNO[c.zodiac_sign?.name?.en] || c.zodiac_sign?.name?.en;
    mapaNatal[`cuspideCasa${c.House}`] = s;
  }

  const aspectosNorm = (aspectos || []).map(a => ({
    planeta1: PLANETA[a.planet_1?.en] || a.planet_1?.en,
    planeta2: PLANETA[a.planet_2?.en] || a.planet_2?.en,
    aspecto: ASPECTO[a.aspect?.en] || a.aspect?.en,
    orbe: typeof a.orb === 'number' ? Math.round(a.orb * 10) / 10 : (a.orb ?? null)
  })).filter(a => a.planeta1 && a.planeta2 && a.aspecto);

  return { mapaNatal, aspectos: aspectosNorm };
}

// Extrai JSON de forma robusta (reaproveitado do leitura.js do Lilith)
function extrairJSON(texto) {
  if (!texto) return null;
  let limpo = texto.replace(/```json/gi, '').replace(/```/g, '').trim();
  const primeiro = limpo.indexOf('{');
  if (primeiro === -1) return null;
  const ultimo = limpo.lastIndexOf('}');
  if (ultimo > primeiro) {
    try { return JSON.parse(limpo.substring(primeiro, ultimo + 1)); } catch (e) {}
  }
  // Recupera JSON truncado fechando no último objeto válido do array secoes
  const str = limpo.substring(primeiro);
  const secoesIdx = str.indexOf('"secoes"');
  if (secoesIdx > -1) {
    const ini = str.indexOf('[', secoesIdx);
    if (ini > -1) {
      let prof = 0, inStr = false, esc = false, lastValid = -1;
      for (let i = ini + 1; i < str.length; i++) {
        const c = str[i];
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (c === '{') prof++;
        if (c === '}') { prof--; if (prof === 0) lastValid = i; }
      }
      if (lastValid > -1) {
        try { return JSON.parse('{"secoes":' + str.substring(ini, lastValid + 1) + ']}'); } catch (e) {}
      }
    }
  }
  return null;
}

async function chamarFreeAstrology(endpoint, body) {
  const res = await fetch(`${FA_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.FREEASTROLOGY_API_KEY },
    body: JSON.stringify(body)
  });
  return res.json();
}

// MOTOR PRINCIPAL — recebe os dados de nascimento e devolve o mapa pronto
// dados: { nome, email, data:'YYYY-MM-DD', hora:'HH:MM', cidade, lat, lon, timezone, genero, contexto? }
async function gerarMapa(dados, opts = {}) {
  const config = {
    observation_point: 'topocentric', ayanamsha: 'tropical', language: 'en', house_system: 'Placidus'
  };
  const dt = new Date(`${dados.data}T${(dados.hora || '12:00')}:00`);
  const bodyBase = {
    year: dt.getFullYear(), month: dt.getMonth() + 1, date: dt.getDate(),
    hours: dt.getHours(), minutes: dt.getMinutes(), seconds: 0,
    latitude: parseFloat(dados.lat), longitude: parseFloat(dados.lon),
    timezone: typeof dados.timezone === 'number' ? dados.timezone : getTimezone(dados.data, dados.hora, dados.cidade)
  };

  // 1) Dados astrológicos reais
  let planetas = [], casas = null, aspectos = [];
  const dp = await chamarFreeAstrology('planets', { ...bodyBase, config });
  if (Array.isArray(dp?.output)) planetas = dp.output;
  const dh = await chamarFreeAstrology('houses', { ...bodyBase, config });
  if (dh?.output?.Houses) casas = dh.output;
  if (casas?.Houses && planetas.length) {
    planetas.forEach(p => { if (typeof p.fullDegree === 'number') p.casaNum = calcularCasa(p.fullDegree, casas.Houses); });
  }
  const da = await chamarFreeAstrology('aspects', { ...bodyBase, config });
  if (Array.isArray(da?.output)) aspectos = da.output;

  // 2) Adapta para o formato dos prompts novos
  const { mapaNatal, aspectos: aspectosNorm } = parseFreeAstrology(planetas, casas, aspectos);

  // 3) Monta o prompt premium
  const { prompt, diagnostico, metadados } = buildPromptMapaAstralPersonalizado(dados, mapaNatal, aspectosNorm);

  // 4) Chama o Opus (sem timeout do Vercel — este motor roda fora do request)
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: opts.modelo || MODELO,
      max_tokens: opts.maxTokens || 32000,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await resp.json();

  // 5) Extrai o JSON de seções
  let secoes = null;
  if (Array.isArray(data?.content)) {
    const texto = data.content.map(b => b.text || '').join('');
    const j = extrairJSON(texto);
    if (j?.secoes) secoes = j.secoes;
  }

  return {
    ok: !!secoes,
    secoes,
    diagnostico,
    metadados,
    mapaNatal,
    aspectos: aspectosNorm,
    usage: data?.usage || null,
    erro: secoes ? null : (data?.error?.message || 'Falha ao extrair JSON do mapa')
  };
}

module.exports = { gerarMapa, parseFreeAstrology, calcularCasa, extrairJSON, PLANETA, SIGNO, ASPECTO };

