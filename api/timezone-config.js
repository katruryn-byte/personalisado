// ============================================================
// TIMEZONE CONFIG — Horário de Verão Histórico do Brasil
// Usado para calcular o timezone correto no momento do nascimento
// Estados com horário de verão: RS, SC, PR, SP, RJ, ES, MG, GO, MT, MS, DF
// ============================================================

// Estados que adotavam horário de verão
const ESTADOS_HORARIO_VERAO = [
  'RS', 'SC', 'PR', 'SP', 'RJ', 'ES', 'MG', 'GO', 'MT', 'MS', 'DF'
];

// Estados que NÃO adotavam horário de verão (Norte e Nordeste)
const ESTADOS_SEM_HORARIO_VERAO = [
  'AC', 'AM', 'PA', 'RO', 'RR', 'AP', 'TO',
  'MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA'
];

// Histórico completo de horário de verão no Brasil
// Formato: { inicio: 'DD/MM/AAAA', fim: 'DD/MM/AAAA', abrangencia: 'nacional' | 'parcial' }
const HISTORICO_HORARIO_VERAO = [
  // Fase 1 — Primeiras Experiências (Década de 30) — Nacional
  { inicio: '03/10/1931', fim: '31/03/1932', abrangencia: 'nacional' },
  { inicio: '03/10/1932', fim: '31/03/1933', abrangencia: 'nacional' },

  // Fase 2 — Segunda Fase (Década de 50) — Nacional
  { inicio: '01/12/1949', fim: '16/04/1950', abrangencia: 'nacional' },
  { inicio: '01/12/1950', fim: '31/03/1951', abrangencia: 'nacional' },
  { inicio: '01/12/1951', fim: '31/03/1952', abrangencia: 'nacional' },
  { inicio: '01/12/1952', fim: '28/02/1953', abrangencia: 'nacional' },

  // Fase 3 — Terceira Fase (Década de 60) — Parcial/Nacional
  { inicio: '23/10/1963', fim: '31/03/1964', abrangencia: 'parcial' }, // SP, RJ, MG, ES depois todos
  { inicio: '31/01/1965', fim: '31/03/1965', abrangencia: 'nacional' },
  { inicio: '01/12/1965', fim: '01/03/1966', abrangencia: 'nacional' },
  { inicio: '01/11/1966', fim: '01/03/1967', abrangencia: 'nacional' },
  { inicio: '01/11/1967', fim: '01/03/1968', abrangencia: 'nacional' },

  // Fase 4 — Continuidade (1985 a 2019) — Estados do Sul/Sudeste/CO
  { inicio: '02/11/1985', fim: '01/03/1986', abrangencia: 'parcial' },
  { inicio: '25/10/1986', fim: '14/02/1987', abrangencia: 'parcial' },
  { inicio: '25/10/1987', fim: '07/02/1988', abrangencia: 'parcial' },
  { inicio: '16/10/1988', fim: '29/01/1989', abrangencia: 'parcial' },
  { inicio: '15/10/1989', fim: '11/02/1990', abrangencia: 'parcial' },
  { inicio: '21/10/1990', fim: '17/02/1991', abrangencia: 'parcial' },
  { inicio: '20/10/1991', fim: '09/02/1992', abrangencia: 'parcial' },
  { inicio: '25/10/1992', fim: '31/01/1993', abrangencia: 'parcial' },
  { inicio: '17/10/1993', fim: '20/02/1994', abrangencia: 'parcial' },
  { inicio: '16/10/1994', fim: '19/02/1995', abrangencia: 'parcial' },
  { inicio: '15/10/1995', fim: '11/02/1996', abrangencia: 'parcial' },
  { inicio: '06/10/1996', fim: '16/02/1997', abrangencia: 'parcial' },
  { inicio: '06/10/1997', fim: '01/03/1998', abrangencia: 'parcial' },
  { inicio: '11/10/1998', fim: '21/02/1999', abrangencia: 'parcial' },
  { inicio: '03/10/1999', fim: '27/02/2000', abrangencia: 'parcial' },
  { inicio: '08/10/2000', fim: '18/02/2001', abrangencia: 'parcial' },
  { inicio: '14/10/2001', fim: '17/02/2002', abrangencia: 'parcial' },
  { inicio: '03/11/2002', fim: '16/02/2003', abrangencia: 'parcial' },
  { inicio: '19/10/2003', fim: '15/02/2004', abrangencia: 'parcial' },
  { inicio: '17/10/2004', fim: '20/02/2005', abrangencia: 'parcial' },
  { inicio: '16/10/2005', fim: '19/02/2006', abrangencia: 'parcial' },
  { inicio: '05/11/2006', fim: '25/02/2007', abrangencia: 'parcial' },
  { inicio: '14/10/2007', fim: '17/02/2008', abrangencia: 'parcial' },
  { inicio: '19/10/2008', fim: '15/02/2009', abrangencia: 'parcial' },
  { inicio: '18/10/2009', fim: '21/02/2010', abrangencia: 'parcial' },
  { inicio: '17/10/2010', fim: '20/02/2011', abrangencia: 'parcial' },
  { inicio: '16/10/2011', fim: '26/02/2012', abrangencia: 'parcial' },
  { inicio: '21/10/2012', fim: '17/02/2013', abrangencia: 'parcial' },
  { inicio: '20/10/2013', fim: '16/02/2014', abrangencia: 'parcial' },
  { inicio: '19/10/2014', fim: '22/02/2015', abrangencia: 'parcial' },
  { inicio: '18/10/2015', fim: '21/02/2016', abrangencia: 'parcial' },
  { inicio: '16/10/2016', fim: '19/02/2017', abrangencia: 'parcial' },
  { inicio: '15/10/2017', fim: '18/02/2018', abrangencia: 'parcial' },
  { inicio: '04/11/2018', fim: '17/02/2019', abrangencia: 'parcial' }
  // A partir de 2019 o Brasil aboliu o horário de verão permanentemente
];

// Mapeamento de cidades/estados brasileiros
// Usado para detectar o estado a partir do nome da cidade
const CIDADES_ESTADOS = {
  // São Paulo
  'são paulo': 'SP', 'campinas': 'SP', 'santos': 'SP', 'sorocaba': 'SP',
  'ribeirão preto': 'SP', 'osasco': 'SP', 'guarulhos': 'SP', 'mauá': 'SP',
  'são bernardo do campo': 'SP', 'santo andré': 'SP', 'bauru': 'SP',
  // Rio de Janeiro
  'rio de janeiro': 'RJ', 'niterói': 'RJ', 'duque de caxias': 'RJ',
  'nova iguaçu': 'RJ', 'belford roxo': 'RJ', 'petrópolis': 'RJ',
  // Minas Gerais
  'belo horizonte': 'MG', 'uberlândia': 'MG', 'contagem': 'MG',
  'juiz de fora': 'MG', 'betim': 'MG', 'montes claros': 'MG',
  // Rio Grande do Sul
  'porto alegre': 'RS', 'caxias do sul': 'RS', 'pelotas': 'RS',
  'canoas': 'RS', 'santa maria': 'RS', 'gravataí': 'RS',
  // Paraná
  'curitiba': 'PR', 'londrina': 'PR', 'maringá': 'PR',
  'ponta grossa': 'PR', 'cascavel': 'PR', 'são josé dos pinhais': 'PR',
  // Santa Catarina
  'florianópolis': 'SC', 'joinville': 'SC', 'blumenau': 'SC',
  'são josé': 'SC', 'criciúma': 'SC', 'chapecó': 'SC',
  // Espírito Santo
  'vitória': 'ES', 'vila velha': 'ES', 'serra': 'ES', 'cariacica': 'ES',
  // Goiás
  'goiânia': 'GO', 'aparecida de goiânia': 'GO', 'anápolis': 'GO',
  // Mato Grosso
  'cuiabá': 'MT', 'várzea grande': 'MT', 'rondonópolis': 'MT',
  // Mato Grosso do Sul
  'campo grande': 'MS', 'dourados': 'MS', 'três lagoas': 'MS',
  // Distrito Federal
  'brasília': 'DF', 'distrito federal': 'DF',
  // Nordeste (sem horário de verão)
  'fortaleza': 'CE', 'salvador': 'BA', 'recife': 'PE', 'natal': 'RN',
  'maceió': 'AL', 'teresina': 'PI', 'joão pessoa': 'PB', 'aracaju': 'SE',
  'são luís': 'MA',
  // Norte (sem horário de verão)
  'manaus': 'AM', 'belém': 'PA', 'porto velho': 'RO', 'macapá': 'AP',
  'boa vista': 'RR', 'palmas': 'TO', 'rio branco': 'AC'
};

// ============================================================
// FUNÇÃO PRINCIPAL
// Retorna o timezone correto (-2 ou -3) para uma data e cidade
// ============================================================
function getTimezone(dataStr, horaStr, cidadeStr) {
  // Padrão: -3 (Brasília)
  const tzPadrao = -3;

  if (!dataStr || !cidadeStr) return tzPadrao;

  // Detecta o estado pela cidade
  const cidadeLower = cidadeStr.toLowerCase();
  let estado = null;

  for (const [cidade, uf] of Object.entries(CIDADES_ESTADOS)) {
    if (cidadeLower.includes(cidade)) {
      estado = uf;
      break;
    }
  }

  // Se não encontrou a cidade ou estado sem horário de verão, retorna -3
  if (!estado || ESTADOS_SEM_HORARIO_VERAO.includes(estado)) return tzPadrao;

  // Verifica se é estado com horário de verão
  if (!ESTADOS_HORARIO_VERAO.includes(estado)) return tzPadrao;

  // Converte a data para objeto Date
  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const hora = horaStr ? parseInt(horaStr.split(':')[0]) : 12;
  const dataNasc = new Date(ano, mes - 1, dia, hora, 0, 0);

  // Verifica se a data está dentro de algum período de horário de verão
  for (const periodo of HISTORICO_HORARIO_VERAO) {
    const [dI, mI, aI] = periodo.inicio.split('/').map(Number);
    const [dF, mF, aF] = periodo.fim.split('/').map(Number);
    const dataInicio = new Date(aI, mI - 1, dI);
    const dataFim = new Date(aF, mF - 1, dF);

    if (dataNasc >= dataInicio && dataNasc <= dataFim) {
      // Para períodos parciais, só aplica aos estados corretos
      if (periodo.abrangencia === 'parcial' && !ESTADOS_HORARIO_VERAO.includes(estado)) {
        return tzPadrao;
      }
      console.log(`Horário de verão detectado: ${periodo.inicio} a ${periodo.fim} — timezone: -2`);
      return -2; // Horário de verão = UTC-2
    }
  }

  return tzPadrao; // Fora do horário de verão = UTC-3
}

module.exports = {
  getTimezone,
  ESTADOS_HORARIO_VERAO,
  ESTADOS_SEM_HORARIO_VERAO,
  HISTORICO_HORARIO_VERAO,
  CIDADES_ESTADOS
};
