// timezone-coord.js
// Resolução de fuso horário por COORDENADA (lat/lon) + data + hora.
// Substitui a detecção por nome de cidade do timezone-config.js, que assumia -3 como
// padrão e errava Manaus (-4), Acre (-5), Fernando de Noronha (-2) e clientes
// nascidos durante o horário de verão brasileiro histórico.
//
// Estratégia:
//   1) tz-lookup (~176KB, leve e serverless-friendly) traduz lat/lon → nome IANA do fuso.
//   2) Intl.DateTimeFormat calcula o offset numérico naquela data específica, já
//      considerando todo o histórico de DST oficial (incluindo o brasileiro até 2019).
//
// Uso primário: getTimezoneCoord(lat, lon, dataStr, horaStr) → número (ex: -3, -2, -4).
// Fallback: se lat/lon não vierem, cai para o getTimezone antigo (por nome de cidade).

const tzLookup = require('tz-lookup');
const { getTimezone: getTimezoneLegacy } = require('./timezone-config');

/**
 * Calcula o offset (em horas) de um fuso IANA numa data/hora específicas.
 * Trata a string "YYYY-MM-DD" + "HH:MM" como referência e descobre quanto
 * o IANA difere do UTC naquele instante.
 * @param {string} iana ex: "America/Sao_Paulo"
 * @param {string} dateStr "YYYY-MM-DD"
 * @param {string} timeStr "HH:MM" (default "12:00")
 * @returns {number} offset em horas (ex: -3, -2, -4)
 */
function offsetHoras(iana, dateStr, timeStr) {
  const refUTC = new Date(`${dateStr}T${timeStr || '12:00'}:00Z`);
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: iana, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const p = Object.fromEntries(dtf.formatToParts(refUTC).map(x => [x.type, x.value]));
  let h = +p.hour; if (h === 24) h = 0; // Intl às vezes devolve 24 para meia-noite
  const asLocalUTC = Date.UTC(+p.year, +p.month - 1, +p.day, h, +p.minute, +p.second);
  return Math.round((asLocalUTC - refUTC.getTime()) / 3600000);
}

/**
 * Resolve o fuso horário a partir de coordenadas + data + hora.
 * Funciona para qualquer ponto do mundo, com precisão histórica de DST.
 * @param {number|string} lat latitude
 * @param {number|string} lon longitude
 * @param {string} dataStr "YYYY-MM-DD"
 * @param {string} horaStr "HH:MM"
 * @returns {number|null} offset em horas, ou null se as coordenadas forem inválidas
 */
function getTimezoneCoord(lat, lon, dataStr, horaStr) {
  const la = parseFloat(lat), lo = parseFloat(lon);
  if (Number.isNaN(la) || Number.isNaN(lo) || !dataStr) return null;
  try {
    const iana = tzLookup(la, lo);
    return offsetHoras(iana, dataStr, horaStr);
  } catch (e) {
    console.warn('[timezone-coord] Falha em lat/lon=', la, lo, '—', e.message);
    return null;
  }
}

/**
 * Resolução unificada: prefere coordenadas; se ausentes, cai para o método antigo
 * por nome de cidade (que tem o histórico DST brasileiro mas erra os fusos -2/-4/-5).
 * Use esta no pipeline de geração.
 */
function resolverTimezone(dados) {
  // Se já veio numérico explícito, respeita
  if (typeof dados.timezone === 'number') return dados.timezone;
  // Tentativa 1: por coordenada (caminho correto)
  if (dados.lat && dados.lon) {
    const tz = getTimezoneCoord(dados.lat, dados.lon, dados.data, dados.hora);
    if (tz !== null) return tz;
  }
  // Tentativa 2: fallback por nome (módulo antigo, limitações conhecidas)
  return getTimezoneLegacy(dados.data, dados.hora, dados.cidade);
}

module.exports = { getTimezoneCoord, resolverTimezone, offsetHoras };
