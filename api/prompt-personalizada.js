// ═══════════════════════════════════════════════════════════════════════════════
// 🌟 PROMPT — MAPA ASTRAL PERSONALIZADO (PREMIUM) — Astralia
// ═══════════════════════════════════════════════════════════════════════════════
// Produto Premium — O retrato completo de quem você é (mapa natal total)
// Modelo recomendado: claude-opus-4-7 (Opus — MAIOR síntese do ecossistema:
//   10 planetas + 12 casas + aspectos + dignidades + stelliums em narrativa coerente)
// Comprimento alvo: 10.000-14.000 palavras
// Tom: Revelador, acolhedor, preciso, inspirador — NUNCA determinista
// Palavra-chave: AUTOCONHECIMENTO COMO LIBERDADE
// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM ≠ ISCA. A isca (Mapa Astral grátis/síncrono) é amostra na tela.
// Este é o mapa natal completo: 20 seções, todos os indicadores integrados.
// Compila INTEGRALMENTE o "Guia — Mapa Astral Personalizado (Diretrizes Completas)".
// Saída em JSON estruturado por seções (renderização de PDF é camada separada).
// ═══════════════════════════════════════════════════════════════════════════════

const SIGNOS_ORDEM = ["Áries","Touro","Gêmeos","Câncer","Leão","Virgem","Libra","Escorpião","Sagitário","Capricórnio","Aquário","Peixes"];
const REGENTE_SIGNO = {
  "Áries":"Marte","Touro":"Vênus","Gêmeos":"Mercúrio","Câncer":"Lua","Leão":"Sol",
  "Virgem":"Mercúrio","Libra":"Vênus","Escorpião":"Marte","Sagitário":"Júpiter",
  "Capricórnio":"Saturno","Aquário":"Saturno","Peixes":"Júpiter"
};
const REGENTE_MODERNO = { "Escorpião":"Plutão","Aquário":"Urano","Peixes":"Netuno" };
const ELEMENTO_SIGNO = {
  "Áries":"Fogo","Leão":"Fogo","Sagitário":"Fogo","Touro":"Terra","Virgem":"Terra",
  "Capricórnio":"Terra","Gêmeos":"Ar","Libra":"Ar","Aquário":"Ar",
  "Câncer":"Água","Escorpião":"Água","Peixes":"Água"
};
const MODALIDADE_SIGNO = {
  "Áries":"Cardinal","Câncer":"Cardinal","Libra":"Cardinal","Capricórnio":"Cardinal",
  "Touro":"Fixo","Leão":"Fixo","Escorpião":"Fixo","Aquário":"Fixo",
  "Gêmeos":"Mutável","Virgem":"Mutável","Sagitário":"Mutável","Peixes":"Mutável"
};
const DIGNIDADES = {
  Sol:{rege:["Leão"],exalta:["Áries"],cai:["Libra"],detrimento:["Aquário"]},
  Lua:{rege:["Câncer"],exalta:["Touro"],cai:["Escorpião"],detrimento:["Capricórnio"]},
  Mercúrio:{rege:["Gêmeos","Virgem"],exalta:["Virgem"],cai:["Peixes"],detrimento:["Sagitário","Peixes"]},
  Vênus:{rege:["Touro","Libra"],exalta:["Peixes"],cai:["Virgem"],detrimento:["Áries","Escorpião"]},
  Marte:{rege:["Áries","Escorpião"],exalta:["Capricórnio"],cai:["Câncer"],detrimento:["Libra","Touro"]},
  Júpiter:{rege:["Sagitário","Peixes"],exalta:["Câncer"],cai:["Capricórnio"],detrimento:["Gêmeos","Virgem"]},
  Saturno:{rege:["Capricórnio","Aquário"],exalta:["Libra"],cai:["Áries"],detrimento:["Câncer","Leão"]}
};
const PLANETAS_DISTRIB = ["Sol","Lua","Mercúrio","Vênus","Marte","Júpiter","Saturno","Urano","Netuno","Plutão"];

// -------------------------------------------------------------------------------
// FUNÇÕES DE CÁLCULO
// -------------------------------------------------------------------------------

function avaliarDignidade(planeta, signo){
  const d = DIGNIDADES[planeta]; if(!d) return "neutro";
  if(d.exalta.includes(signo)) return "exaltação"; if(d.rege.includes(signo)) return "domicílio";
  if(d.cai.includes(signo)) return "queda"; if(d.detrimento.includes(signo)) return "exílio"; return "neutro";
}
function ocupantesCasa(mapaNatal, casa){
  return Object.entries(mapaNatal)
    .filter(([k,v]) => v && typeof v==='object' && v.casa===casa && SIGNOS_ORDEM.includes(v.signo))
    .map(([k])=>k);
}
// Distribuição de elementos e modalidades sobre os 10 planetas
function distribuir(mapaNatal){
  const el={Fogo:0,Terra:0,Ar:0,Água:0}, mod={Cardinal:0,Fixo:0,Mutável:0};
  let total=0;
  PLANETAS_DISTRIB.forEach(p=>{ const v=mapaNatal[p]; if(v&&ELEMENTO_SIGNO[v.signo]){el[ELEMENTO_SIGNO[v.signo]]++; mod[MODALIDADE_SIGNO[v.signo]]++; total++;} });
  const pct=(o)=>Object.fromEntries(Object.entries(o).map(([k,n])=>[k, total?Math.round(n/total*100):0]));
  return { elemento:el, modalidade:mod, elementoPct:pct(el), modalidadePct:pct(mod),
    elementoDominante:Object.entries(el).sort((a,b)=>b[1]-a[1])[0][0],
    modalidadeDominante:Object.entries(mod).sort((a,b)=>b[1]-a[1])[0][0] };
}
// Stellium: 3+ planetas no mesmo signo OU na mesma casa
function detectarStellium(mapaNatal){
  const porSigno={}, porCasa={};
  PLANETAS_DISTRIB.forEach(p=>{ const v=mapaNatal[p]; if(!v)return;
    (porSigno[v.signo]=porSigno[v.signo]||[]).push(p);
    if(v.casa)(porCasa[v.casa]=porCasa[v.casa]||[]).push(p); });
  const s=[];
  Object.entries(porSigno).forEach(([k,arr])=>{ if(arr.length>=3) s.push(`Stellium em ${k}: ${arr.join(", ")}`); });
  Object.entries(porCasa).forEach(([k,arr])=>{ if(arr.length>=3) s.push(`Stellium na Casa ${k}: ${arr.join(", ")}`); });
  return s;
}
// Planetas angulares (aproximação por casa angular 1/4/7/10)
function detectarAngulares(mapaNatal){
  return Object.entries(mapaNatal)
    .filter(([k,v])=>v&&typeof v==='object'&&[1,4,7,10].includes(v.casa)&&PLANETAS_DISTRIB.includes(k))
    .map(([k,v])=>`${k} (Casa ${v.casa})`);
}
function analisarMapaNatal(mapaNatal){
  const asc = mapaNatal.ASC ? (typeof mapaNatal.ASC==='string'? mapaNatal.ASC.split(' ')[0] : mapaNatal.ASC.signo) : null;
  const regenteMapa = asc ? REGENTE_SIGNO[asc] : null;
  const regenteMapaMod = asc ? (REGENTE_MODERNO[asc]||null) : null;
  const dist = distribuir(mapaNatal);
  const dignidadesNotaveis = PLANETAS_DISTRIB
    .map(p=>{ const v=mapaNatal[p]; if(!v)return null; const d=avaliarDignidade(p,v.signo); return d!=="neutro"?`${p} em ${v.signo} (${d})`:null; })
    .filter(Boolean);
  return {
    sol: mapaNatal.Sol?`${mapaNatal.Sol.signo} Casa ${mapaNatal.Sol.casa}`:"?",
    lua: mapaNatal.Lua?`${mapaNatal.Lua.signo} Casa ${mapaNatal.Lua.casa}`:"?",
    asc: asc||"?",
    regenteMapa: `${regenteMapa||'?'}${regenteMapaMod?` (moderno ${regenteMapaMod})`:''}${regenteMapa&&mapaNatal[regenteMapa]?` em ${mapaNatal[regenteMapa].signo} Casa ${mapaNatal[regenteMapa].casa}`:''}`,
    elementoDominante: dist.elementoDominante, modalidadeDominante: dist.modalidadeDominante,
    elementoPct: dist.elementoPct, modalidadePct: dist.modalidadePct,
    stelliums: detectarStellium(mapaNatal),
    angulares: detectarAngulares(mapaNatal),
    dignidadesNotaveis
  };
}

// -------------------------------------------------------------------------------
// CONSTANTE 1 — FUNDAMENTOS (o que é, trindade, 4 ângulos)
// -------------------------------------------------------------------------------

const FUNDAMENTOS_NATAL = `
═══════════════════════════════════════════════════════════════════════════════
MAPA ASTRAL — FUNDAMENTOS
═══════════════════════════════════════════════════════════════════════════════
O mapa natal é uma fotografia do céu no momento exato do nascimento. NÃO é sentença
nem destino gravado: é um retrato de POTENCIAIS — energias que se manifestam de formas
diferentes conforme as escolhas conscientes. Revela personalidade em camadas, talentos
naturais, padrões relacionais, desafios de crescimento, relação com dinheiro/trabalho/
família/saúde/espiritualidade, e propósito. NÃO determina eventos (isso é trânsito/RS),
não elimina livre-arbítrio, não condena a padrões, não substitui trabalho psicológico/médico.

A TRINDADE FUNDAMENTAL — SOL + LUA + ASCENDENTE:
- SOL: quem você É — essência, propósito central, o que veio expressar (o eu profundo).
- LUA: como você SENTE — necessidades emocionais, conforto, família/passado (o eu emocional, formado na infância).
- ASCENDENTE: como você APARECE — persona pública, filtro de acesso ao mundo (o eu apresentado).
A tensão e a harmonia entre os três revelam conflitos internos e forças.

OS QUATRO ÂNGULOS: ASC (Casa 1, como aparece/entrada na vida); MC (Casa 10, vocação/reputação/
legado); DSC (Casa 7, o que busca no outro); IC (Casa 4, raízes/família/lar). Planetas a até 8°
de um ângulo têm força especial — expressam-se com intensidade e visibilidade.

TOM: revelador mas NUNCA determinista; profundo mas acessível. Cada traço tem luz E sombra;
cada desafio tem caminho de trabalho. O Sol é para onde se CRESCE (destino), a Lua é de onde se VEM.
`;

// -------------------------------------------------------------------------------
// CONSTANTE 2 — SOL POR SIGNO (essência / luz / sombra / frase) e POR CASA
// -------------------------------------------------------------------------------

const SOL_POR_SIGNO = {
  "Áries":"Essência: iniciar, ser pioneira, agir com coragem; abrir novos caminhos. Mais viva ao agir/liderar/enfrentar o desconhecido. Luz: coragem, iniciativa, liderança, energia vital. Sombra: impulsividade, impaciência, não concluir, ego excessivo. Frase: 'Eu sou a centelha que acende o fogo.'",
  "Touro":"Essência: construir, criar valor, enraizar-se no material; criar algo duradouro que persista. Mais viva com estabilidade, beleza e prazer sensorial. Luz: perseverança, estética, confiabilidade, presença física. Sombra: teimosia, apego material, resistência à mudança. Frase: 'Eu sou a solidez que sustenta.'",
  "Gêmeos":"Essência: comunicar, conectar, transmitir ideias; ser ponte entre pessoas/ideias/mundos. Mais viva ao aprender/conversar/explorar. Luz: versatilidade, curiosidade, comunicação, agilidade mental. Sombra: superficialidade, inconsistência, ansiedade, dispersão. Frase: 'Eu sou a mente que conecta tudo.'",
  "Câncer":"Essência: cuidar, nutrir, criar segurança emocional; ser o lar que os outros precisam. Mais viva ao cuidar e ser cuidada, no pertencimento. Luz: empatia profunda, intuição, cuidado genuíno, memória emocional. Sombra: hipersensibilidade, apego ao passado, limites difíceis. Frase: 'Eu sou o lar que acolhe.'",
  "Leão":"Essência: brilhar, criar, liderar pelo exemplo; ser a luz que inspira outros a achar a própria. Mais viva ao criar/ser reconhecida/liderar. Luz: criatividade, liderança, generosidade, presença magnética. Sombra: necessidade excessiva de reconhecimento, arrogância, drama. Frase: 'Eu sou a luz que ilumina.'",
  "Virgem":"Essência: aperfeiçoar, servir, discriminar o essencial; criar excelência no trabalho e no detalhe. Mais viva quando o trabalho faz diferença real. Luz: análise, precisão, serviço, humildade. Sombra: perfeccionismo paralisante, autocrítica, hipocondria. Frase: 'Eu sou a excelência que serve.'",
  "Libra":"Essência: harmonizar, equilibrar, criar beleza e justiça; mediar entre opostos. Mais viva com harmonia, parceria e criação estética. Luz: diplomacia, estética, justiça, ver todos os lados. Sombra: indecisão, dependência do outro, evitar conflito. Frase: 'Eu sou o equilíbrio que harmoniza.'",
  "Escorpião":"Essência: transformar, investigar, acessar o oculto; ir fundo e trazer o ouro. Mais viva nas transformações, crises que purificam, verdades difíceis. Luz: profundidade, transformação, lealdade, percepção. Sombra: obsessão, ciúme, manipulação, dificuldade de confiar. Frase: 'Eu sou a profundidade que transforma.'",
  "Sagitário":"Essência: expandir, ensinar, buscar o sentido maior; aventureira do espírito. Mais viva ao aprender/ensinar/expandir. Luz: otimismo, generosidade, visão filosófica, amor à verdade. Sombra: otimismo excessivo, irresponsabilidade, dogmatismo, fuga do cotidiano. Frase: 'Eu sou a visão que expande.'",
  "Capricórnio":"Essência: construir estruturas duradouras, assumir responsabilidade; criar legado. Mais viva ao conquistar e liderar com responsabilidade. Luz: ambição, disciplina, responsabilidade, paciência. Sombra: rigidez, frieza, workaholism, pessimismo. Frase: 'Eu sou a estrutura que persiste.'",
  "Aquário":"Essência: inovar, libertar, servir ao coletivo; criar o futuro. Mais viva ao inovar/quebrar paradigmas/servir ao coletivo. Luz: originalidade, humanitarismo, inovação, liberdade. Sombra: distanciamento emocional, rebeldia sem causa, frieza. Frase: 'Eu sou a liberdade que inova.'",
  "Peixes":"Essência: dissolver fronteiras, curar, criar arte que transcende; ponte entre visível e invisível. Mais viva ao criar artisticamente e servir com compaixão. Luz: compaixão, criatividade espiritual, intuição, transcendência. Sombra: fuga da realidade, falta de limites, vitimização. Frase: 'Eu sou a compaixão que transcende.'"
};

const SOL_POR_CASA = {
  1:"expressa o propósito pela presença e identidade pessoal.",
  2:"expressa o propósito pela criação de valor e recursos.",
  3:"expressa o propósito pela comunicação e conexão de ideias.",
  4:"expressa o propósito pela família, lar e ancestralidade.",
  5:"expressa o propósito pela criatividade, amor e prazer.",
  6:"expressa o propósito pelo serviço e trabalho diário.",
  7:"expressa o propósito através das parcerias e do outro.",
  8:"expressa o propósito pela transformação profunda.",
  9:"expressa o propósito pela expansão, ensino e filosofia.",
  10:"expressa o propósito pela carreira e reputação pública.",
  11:"expressa o propósito pela comunidade e projetos coletivos.",
  12:"expressa o propósito pela espiritualidade e serviço oculto."
};

// -------------------------------------------------------------------------------
// CONSTANTE 3 — LUA POR SIGNO (necessidade / resposta / padrão)
// -------------------------------------------------------------------------------

const LUA_POR_SIGNO = {
  "Áries":"Necessidade: ação, autonomia, ser a primeira. Segura ao agir; ansiosa ao esperar. Resposta rápida e intensa (inflama e logo passa). Padrão: reatividade, impulsividade nas decisões, dificuldade de vulnerabilidade.",
  "Touro":"Necessidade: estabilidade, conforto físico, previsibilidade. Segura com rotina, comida boa, ambiente belo e calmo. Resposta lenta (demora a se perturbar e a se acalmar). Padrão: apego emocional, resistência à mudança, conforto como cura.",
  "Gêmeos":"Necessidade: comunicação, variedade, estímulo mental. Segura ao falar/compartilhar/aprender. Resposta vem pela mente (racionaliza antes de sentir). Padrão: ansiedade base, dificuldade de aprofundar sentimentos.",
  "Câncer":"DOMICÍLIO — intensidade emocional máxima. Necessidade: pertencimento, família, segurança. Segura com pessoas amadas por perto. Resposta profundamente intuitiva (sente antes de pensar). Padrão: hipersensibilidade, apego, memória emocional forte, oscilações.",
  "Leão":"Necessidade: reconhecimento, amor, expressão criativa. Segura ao ser vista, admirada e amada. Resposta dramática e expressiva (sente em grande escala). Padrão: necessidade de aprovação, generosidade emocional excessiva, orgulho ferido.",
  "Virgem":"Necessidade: ordem, utilidade, fazer a coisa certa. Segura quando tudo está organizado e sendo útil. Resposta analítica (processa sentimento como problema). Padrão: autocrítica emocional, ansiedade base, serviço como escudo.",
  "Libra":"Necessidade: harmonia, parceria, beleza. Segura com equilíbrio e boa relação com os outros. Resposta diplomática (ajusta-se para manter a paz). Padrão: codependência emocional, sentir só com o referencial do outro.",
  "Escorpião":"QUEDA — intensidade emocional extrema. Necessidade: profundidade, verdade, fusão total. Segura só com intimidade total e confiança absoluta. Resposta intensa e duradoura. Padrão: ciúme, possessividade, dificuldade de confiar, emoções reprimidas que explodem.",
  "Sagitário":"Necessidade: liberdade, expansão, sentido. Segura com espaço para explorar e crenças que sustentam. Resposta otimista. Padrão: fuga emocional pela filosofia, dificuldade de ficar com sentimentos difíceis.",
  "Capricórnio":"EXÍLIO — expressão emocional contida. Necessidade: estrutura, controle, competência. Segura no controle e sendo responsável. Resposta controlada (raramente demonstra). Padrão: repressão emocional, autocrítica severa, dificuldade de receber cuidado.",
  "Aquário":"Necessidade: liberdade, igualdade, pertencer a algo maior. Segura com independência e grupo com propósito. Resposta intelectualizada (analisa em vez de sentir). Padrão: distanciamento, dificuldade de intimidade, emoção pela causa.",
  "Peixes":"Necessidade: fusão, transcendência, conexão espiritual. Segura com paz, ao dissolver-se no presente. Resposta absorvente (sente os outros como a si). Padrão: falta de limites emocionais, absorção do sofrimento alheio, escapismo."
};

// -------------------------------------------------------------------------------
// CONSTANTE 4 — ASCENDENTE POR SIGNO (regente / aparência / estilo / impressão / atualização)
// -------------------------------------------------------------------------------

const ASC_POR_SIGNO = {
  "Áries":"Regente Marte. Aparência: direta, energética, pioneira; entra com presença forte. Estilo: ativa, rápida, às vezes impaciente (age antes de pensar). Impressão: corajosa e determinada. Atualização: ouvir antes de agir.",
  "Touro":"Regente Vênus. Aparência: calma, sensual, confiável; transmite estabilidade. Estilo: lenta, deliberada, focada no prazer e na qualidade. Impressão: confiável e estável. Atualização: mover-se com mais fluidez diante da mudança.",
  "Gêmeos":"Regente Mercúrio. Aparência: ágil, curiosa, comunicativa; sempre em movimento. Estilo: versátil, múltipla, orientada pela curiosidade. Impressão: inteligente e animada. Atualização: ir fundo, não só largo.",
  "Câncer":"Regente Lua. Aparência: acolhedora, sensível, protetora; parece um lar. Estilo: instintiva, emocional, orientada pela segurança. Impressão: carinhosa e intuitiva. Atualização: proteger sem fechar.",
  "Leão":"Regente Sol. Aparência: radiante, confiante, magnética; atrai atenção. Estilo: expressiva, generosa, orientada pelo coração. Impressão: carismática e especial. Atualização: não precisar de plateia para ter valor.",
  "Virgem":"Regente Mercúrio. Aparência: discreta, refinada, analítica; parece observando. Estilo: meticulosa, orientada pelo serviço e análise. Impressão: competente e confiável. Atualização: imperfeição é humana, não falha.",
  "Libra":"Regente Vênus. Aparência: elegante, harmoniosa, diplomática; transmite equilíbrio. Estilo: orientada por beleza, justiça e relacionamento. Impressão: charmosa e equilibrada. Atualização: ter posição sem precisar agradar primeiro.",
  "Escorpião":"Regente Plutão/Marte. Aparência: intensa, magnética, penetrante; parece ver além. Estilo: profunda, investigativa, orientada pela transformação. Impressão: poderosa e misteriosa. Atualização: vulnerabilidade não é fraqueza.",
  "Sagitário":"Regente Júpiter. Aparência: expansiva, otimista, aventureira; sempre buscando algo maior. Estilo: filosófica, livre, orientada pelo sentido. Impressão: entusiasmada e inspiradora. Atualização: completar o que começa.",
  "Capricórnio":"Regente Saturno. Aparência: séria, madura, confiável; parece mais velha. Estilo: disciplinada, orientada por objetivos e responsabilidade. Impressão: competente e séria. Atualização: descansar sem culpa.",
  "Aquário":"Regente Urano/Saturno. Aparência: original, independente, singular; parece diferente. Estilo: inovadora, orientada pelo coletivo e liberdade. Impressão: única e progressista. Atualização: conectar-se emocionalmente, não só intelectualmente.",
  "Peixes":"Regente Netuno/Júpiter. Aparência: etérea, suave, adaptável; reflete o que os outros precisam ver. Estilo: fluida, intuitiva, orientada pela espiritualidade. Impressão: mística e compassiva. Atualização: ter forma própria."
};

// -------------------------------------------------------------------------------
// CONSTANTE 5 — MERCÚRIO POR SIGNO (mental/comunicação/aprendizado) + RETRÓGRADO
// -------------------------------------------------------------------------------

const MERCURIO_POR_SIGNO = {
  "Áries":"mental rápido/direto/pioneiro; comunicação assertiva (às vezes brusca); aprende por experimentação.",
  "Touro":"mental lento/deliberado/prático; comunicação clara e sensorial; aprende por repetição e prática.",
  "Gêmeos":"mental ágil/múltiplo/curioso; comunicação versátil e verbal; aprende pela variedade.",
  "Câncer":"mental intuitivo/emocional/memorialístico; comunicação sensível e cuidadosa; aprende por associação emocional.",
  "Leão":"mental dramático/criativo/confiante; comunicação expressiva e persuasiva; aprende pela narrativa.",
  "Virgem":"mental analítico/preciso/crítico; comunicação clara e detalhada; aprende pela análise.",
  "Libra":"mental equilibrado/diplomático/estético; comunicação harmoniosa; aprende pela comparação.",
  "Escorpião":"mental profundo/investigativo/estratégico; comunicação penetrante e direta; aprende pela investigação.",
  "Sagitário":"mental expansivo/filosófico/entusiasta; comunicação generosa (às vezes exagerada); aprende pela visão grande.",
  "Capricórnio":"mental estruturado/estratégico/cauteloso; comunicação concisa e objetiva; aprende pela prática.",
  "Aquário":"mental inovador/original/não-linear; comunicação original (às vezes excêntrica); aprende por insights.",
  "Peixes":"mental intuitivo/metafórico/difuso; comunicação poética e indireta; aprende pela imersão."
};
const MERCURIO_RETROGRADO = "Mercúrio retrógrado natal: comunicação mais interna (pensa antes de falar, às vezes demais); possíveis dificuldades precoces de aprendizado; inteligência profunda mas não convencional; processamento não-linear; frequentemente 'descobre' o que pensa ao falar; tende a revisar opiniões com mais informação. Poderosa, mas precisa de tempo e espaço.";

// -------------------------------------------------------------------------------
// CONSTANTE 6 — VÊNUS POR SIGNO (ama / atrai / risco)
// -------------------------------------------------------------------------------

const VENUS_POR_SIGNO = {
  "Áries":"Ama com paixão e urgência (apaixona-se rápido, quer ação imediata). Atrai pessoas corajosas, independentes, que desafiam. Risco: relações que começam intensas e perdem o fôlego.",
  "Touro":"DOMICÍLIO — amor e prazer máximos. Ama com consistência, sensualidade e lealdade (abre-se devagar, é fiel). Atrai pessoas estáveis, que oferecem segurança e prazer. Risco: possessividade, apego material no amor.",
  "Gêmeos":"Ama com curiosidade e leveza (atrai-se por mentes estimulantes). Atrai pessoas inteligentes, versáteis, surpreendentes. Risco: superficialidade, dificuldade de comprometimento.",
  "Câncer":"Ama com profundidade emocional e necessidade de cuidado mútuo. Atrai pessoas protetoras e que precisam de cuidado. Risco: apego excessivo, relação parental no amor.",
  "Leão":"Ama com grandiosidade, generosidade e paixão dramática. Atrai pessoas que a admiram e a veem como especial. Risco: necessidade de ser o centro, ciúme de atenção.",
  "Virgem":"QUEDA — amor via serviço. Ama através de atos práticos e cuidado concreto. Atrai pessoas que precisam de ajuda ou muito competentes. Risco: amor condicional (por utilidade), excesso de crítica.",
  "Libra":"DOMICÍLIO — amor, harmonia e beleza máximos. Ama com elegância, reciprocidade, busca de equilíbrio. Atrai pessoas charmosas e estéticas. Risco: dependência de parceria, dificuldade de estar só.",
  "Escorpião":"QUEDA — amor intenso, profundo, obsessivo. Ama com completude total (não ama pela metade). Atrai relacionamentos intensos e transformadores. Risco: ciúme, possessividade, amor como poder.",
  "Sagitário":"Ama com liberdade, aventura e crescimento mútuo. Atrai pessoas filosoficamente ricas, que expandem o horizonte. Risco: dificuldade de comprometimento, idealização do amor.",
  "Capricórnio":"Ama com responsabilidade, lealdade e visão de longo prazo. Atrai pessoas maduras, estáveis, com objetivos claros. Risco: frieza emocional, amor como transação.",
  "Aquário":"Ama com liberdade e amizade como base (precisa que o parceiro seja amigo). Atrai pessoas originais, independentes, que respeitam o espaço. Risco: distanciamento, amor intelectualizado.",
  "Peixes":"EXALTAÇÃO — amor transcendente, compassivo, espiritual. Ama com compaixão, devoção e fusão. Atrai relações com componente espiritual/kármico. Risco: amor idealizado, dificuldade de ver o parceiro real."
};

// -------------------------------------------------------------------------------
// CONSTANTE 7 — MARTE POR SIGNO (ação / desejo / raiva / risco)
// -------------------------------------------------------------------------------

const MARTE_POR_SIGNO = {
  "Áries":"DOMICÍLIO. Ação imediata, corajosa, direta. Desejo: ser primeiro, vencer. Raiva explosiva e rápida. Risco: impulsividade, conflitos desnecessários.",
  "Touro":"Ação lenta, persistente, por resultado tangível. Desejo: segurança, prazer, posse. Raiva contida — mas intensa ao explodir. Risco: teimosia, passivo-agressividade.",
  "Gêmeos":"Ação múltipla, verbal, ágil (age por palavras e ideias). Desejo: variedade, estímulo mental. Raiva em palavras (debate acalorado). Risco: dispersão, conflito verbal.",
  "Câncer":"QUEDA — ação mediada pela emoção. Ação instintiva, protetora, cíclica. Desejo: segurança emocional/familiar. Raiva reprimida que explode em momentos inesperados. Risco: passivo-agressividade, manipulação emocional.",
  "Leão":"Ação dramática, generosa, pelo coração. Desejo: reconhecimento, amor, expressão criativa. Raiva orgulhosa (raramente perde discussão). Risco: ego inflado, ser o centro.",
  "Virgem":"Ação meticulosa, analítica, pelo serviço. Desejo: eficiência, perfeição, ser útil. Raiva crítica e analítica (desmonta o argumento). Risco: perfeccionismo paralisante, crítica destrutiva.",
  "Libra":"EXÍLIO — ação mediada pela diplomacia. Ação equilibrada, pela parceria. Desejo: justiça, harmonia, parcerias sólidas. Raiva indireta (evita conflito mas acumula). Risco: indecisão, codependência na ação.",
  "Escorpião":"DOMICÍLIO tradicional — ação intensa e estratégica. Ação profunda, determinada (nunca desiste). Desejo: transformação, poder, intimidade. Raiva contida e cirúrgica. Risco: obsessão, vingança, manipulação.",
  "Sagitário":"Ação entusiástica, expansiva, por princípios. Desejo: liberdade, aventura, sentido maior. Raiva filosófica e exagerada. Risco: energia sem foco, prometer mais do que entrega.",
  "Capricórnio":"EXALTAÇÃO — ação mais poderosa e estruturada. Ação disciplinada, estratégica, de longo prazo. Desejo: sucesso, autoridade, legado. Raiva controlada e precisa. Risco: frieza, usar pessoas como instrumentos.",
  "Aquário":"Ação inovadora, coletiva, por princípios humanitários. Desejo: liberdade, mudança, impacto coletivo. Raiva rebelde e idealista (luta por causas). Risco: rebeldia sem causa, ação desconectada da realidade.",
  "Peixes":"Ação fluida, intuitiva, pela compaixão. Desejo: fusão, transcendência, servir. Raiva reprimida e somatizada. Risco: passividade, fuga da ação necessária."
};

// -------------------------------------------------------------------------------
// CONSTANTE 8 — JÚPITER e SATURNO por signo (resumo)
// -------------------------------------------------------------------------------

const JUPITER_POR_SIGNO = {
  "Áries":"sorte pela iniciativa e coragem.","Touro":"sorte pela construção paciente e qualidade.",
  "Gêmeos":"sorte pela comunicação e conexões.","Câncer":"sorte pela família e intuição (EXALTAÇÃO).",
  "Leão":"sorte pela criatividade e liderança generosa.","Virgem":"sorte pelo serviço e excelência.",
  "Libra":"sorte pelas parcerias e diplomacia.","Escorpião":"sorte pela transformação e recursos compartilhados.",
  "Sagitário":"sorte pela expansão e generosidade (DOMICÍLIO).","Capricórnio":"sorte pela disciplina e responsabilidade (QUEDA).",
  "Aquário":"sorte pela inovação e comunidade.","Peixes":"sorte pela espiritualidade e compaixão (DOMICÍLIO)."
};
const SATURNO_POR_SIGNO = {
  "Áries":"lição de agir com responsabilidade.","Touro":"lição de construir segurança real.",
  "Gêmeos":"lição de comunicar com profundidade.","Câncer":"lição de vulnerabilidade e cuidado (EXÍLIO).",
  "Leão":"lição de liderança com humildade.","Virgem":"lição de servir com alegria.",
  "Libra":"lição de parcerias equilibradas (EXALTAÇÃO).","Escorpião":"lição de transformar com confiança.",
  "Sagitário":"lição de expandir com responsabilidade.","Capricórnio":"lição de legado com integridade (DOMICÍLIO).",
  "Aquário":"lição de inovar com comprometimento (DOMICÍLIO).","Peixes":"lição de fé com discernimento (EXÍLIO)."
};

// -------------------------------------------------------------------------------
// CONSTANTE 9 — AS 12 CASAS (tema)
// -------------------------------------------------------------------------------

const CASAS_12 = {
  1:"EU E MEU CORPO — identidade, aparência, presença. Planetas aqui se expressam de forma muito visível e pessoal.",
  2:"RECURSOS E VALORES — dinheiro, posses, talentos, autoestima. Júpiter aqui: tendência à prosperidade; Saturno: dinheiro com esforço.",
  3:"COMUNICAÇÃO E MENTE — comunicação, irmãos, vizinhança, cursos, deslocamentos curtos. Mercúrio aqui: comunicação fluente.",
  4:"LAR E FAMÍLIA — família de origem, lar, ancestralidade, vida privada. Lua aqui: vida familiar intensa e emocional.",
  5:"CRIATIVIDADE E PRAZER — criatividade, romance, filhos, lazer, expressão. Vênus aqui: grande talento para arte e amor.",
  6:"TRABALHO E SAÚDE — trabalho diário, saúde, serviço. Saturno: trabalho disciplinado; Marte: muita energia ou esgotamento.",
  7:"PARCERIAS — casamento, parcerias, contratos, inimigos declarados. Vênus: parcerias harmoniosas; Saturno: relações testadas/maturação.",
  8:"TRANSFORMAÇÃO E MISTÉRIO — morte, herança, sexualidade, recursos compartilhados. Plutão aqui (domicílio): transformação máxima.",
  9:"EXPANSÃO E FILOSOFIA — viagens longas, filosofia, religião, ensino superior, publicação. Júpiter aqui (domicílio): expansão máxima.",
  10:"CARREIRA E REPUTAÇÃO — carreira, reputação, autoridade, legado. Sol aqui: vocação pública forte e visível.",
  11:"COMUNIDADE E FUTURO — amizades, grupos, causas, esperanças, sonhos. Júpiter aqui: grupos trazem sorte.",
  12:"INTERIORIDADE E ESPIRITUALIDADE — inconsciente, espiritualidade, retiro, karma oculto, autossabotagem. Netuno aqui (domicílio): espiritualidade profunda."
};

// -------------------------------------------------------------------------------
// CONSTANTE 10 — ASPECTOS (como ler + os mais importantes)
// -------------------------------------------------------------------------------

const ASPECTOS_NATAL = `
## ASPECTOS — AS CONVERSAS DO MAPA
HARMÔNICOS: Trígono (120°) talentos que fluem sem esforço; Sextil (60°) oportunidades que pedem ação.
DESAFIADORES: Quadratura (90°) conflito interno que força crescimento; Oposição (180°) polaridade que pede integração.
INTENSIFICADORES: Conjunção (0°) fusão de energias (harmônica ou explosiva); Quincúncio (150°) ajuste constante entre duas energias.

OS MAIS IMPORTANTES:
SOL-LUA: conjunção (emoção e propósito fundidos, pouca diferenciação); quadratura (tensão entre o que é e o que sente — motor de crescimento); oposição (conflito propósito × necessidade); trígono (harmonia identidade-emoção).
SOL-SATURNO: conjunção/quadratura (vida séria que exige estrutura; carreira sólida e lenta); trígono (ambição saudável).
SOL-JÚPITER: conjunção/trígono (sorte, expansão, reconhecimento); quadratura (excesso — dispersão ou arrogância).
VÊNUS-MARTE: conjunção (paixão intensa); quadratura (tensão entre o que ama e o que deseja); trígono (afeto e ação fluem).
LUA-SATURNO: conjunção (emoções contidas); quadratura (dificuldade emocional que pede cura — padrão familiar difícil); trígono (maturidade afetiva).
`;

// -------------------------------------------------------------------------------
// CONSTANTE 11 — PADRÕES TEMÁTICOS, STELLIUMS, SAÚDE/DINHEIRO/RELAÇÃO
// -------------------------------------------------------------------------------

const PADROES_E_AREAS = `
## TEMA CENTRAL E STELLIUMS
Identificar o tema central: qual elemento domina? qual casa tem mais planetas? qual signo (Stellium)? qual planeta faz mais aspectos? Sol/Lua/ASC têm tema comum? Se 3+ indicadores apontam o mesmo tema = TEMA CENTRAL.
Stellium (3+ planetas no mesmo signo ou casa) concentra muita energia: intenso, dominante, às vezes desequilibrado. No signo: a qualidade permeia toda a personalidade. Na casa: a área é central (talentos E desafios).

## SAÚDE — observar Casa 6 (saúde/rotina), Casa 1 (vitalidade/corpo), Casa 12 (saúde mental/crônicas), Marte (energia), Saturno (estrutura/limitações crônicas). Atenção: Saturno/Plutão na 6 (cuidado sistemático); Marte na 12 (energia que adoece); Lua na 6 (saúde ligada ao emocional).

## FINANÇAS — observar Casa 2 (dinheiro/talentos), Casa 8 (recursos compartilhados/herança), Casa 11 (ganhos), Vênus (valores/o que atrai), Júpiter (expansão), Saturno (disciplina/limite). Júpiter na 2 ou 8 (prosperidade); Saturno na 2 (dinheiro com trabalho, sólido); Plutão na 8 (transformações financeiras radicais).

## RELACIONAMENTOS — observar Casa 7 (parcerias/casamento), Vênus (como ama), Marte (o que deseja), Lua (necessidade emocional), Casa 5 (romance). O parceiro ideal é indicado pelo signo do Descendente (oposto ao ASC) e pelos planetas na Casa 7.
`;

// -------------------------------------------------------------------------------
// CONSTANTE 12 — ESTRUTURA (20 seções) + UPSELL
// -------------------------------------------------------------------------------

const ESTRUTURA_NATAL = `
## ESTRUTURA DO RELATÓRIO (20 seções)
1. Carta ao cliente (abertura pessoal e acolhedora) (~300)
2. A Trindade Sol-Lua-Ascendente (integração das 3 camadas) (~800)
3. Seu Sol — quem você é (~500)
4. Sua Lua — como você sente (~500)
5. Seu Ascendente — como você aparece (~400)
6. Mercúrio — sua mente e comunicação (~350)
7. Vênus — como você ama (~400)
8. Marte — como você age (~400)
9. Júpiter e Saturno — expansão e lição (~500)
10. Planetas transpessoais — Urano, Netuno, Plutão (~400)
11. Pontos especiais — Quíron, Lilith, Nodos, Parte da Fortuna (~400)
12. Casas em destaque (as mais habitadas) (~600)
13. Padrão de saúde (~350)
14. Padrão financeiro (~350)
15. Padrão relacional (~400)
16. Aspectos principais — as conversas do mapa (~500)
17. Missão de vida — síntese (Sol + MC + Nodo Norte) (~500)
18. Desafios e como trabalhar (~400)
19. Afirmações personalizadas (10 do mapa) (~200)
20. Próximos passos práticos + Próximos passos Astralia (upsell individual) (~300)

## TOM E REGRAS
Use o nome do cliente. Cada planeta com signo + casa + aspectos integrados. Revelador mas NUNCA determinista; profundo mas acessível. Cada traço com luz E sombra; cada desafio com caminho de trabalho. Linguagem clara, calorosa, sem jargão excessivo.

## UPSELL (individual — NÃO combo; oferecer 1-2 no gancho real)
- Mapa Kármico: Nodo Sul em casa/signo de padrão visível, ou cliente repete ciclos.
- Revolução Solar: aniversário próximo / mudança de ciclo.
- Mapa Profissional: Casa 10/MC/Sol vocacionalmente relevantes.
- Mapa da Lilith: Lilith forte ou temas de poder reprimido emergindo.
`;

// -------------------------------------------------------------------------------
// FUNÇÃO BUILD
// -------------------------------------------------------------------------------
// dados: { nome, dataNascimento, horaNascimento, localNascimento, faseLunar?, contexto? }
// mapaNatal: { Sol, Lua, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno, Plutão,
//   "Quíron", Lilith, "Nodo Norte", "Parte da Fortuna", ASC, MC } (cada {signo,casa,grau,retrogrado})
// aspectos: [{ planeta1, aspecto, planeta2, orbe }]

function buildPromptMapaAstralPersonalizado(dados, mapaNatal, aspectos = []) {
  const nome = dados.nome || '[NOME]';
  const a = analisarMapaNatal(mapaNatal);
  const horaConhecida = dados.horaNascimento && !/desconhec|12:00/i.test(dados.horaNascimento);

  const planetasInfo = ["Sol","Lua","Mercúrio","Vênus","Marte","Júpiter","Saturno","Urano","Netuno","Plutão","Quíron","Lilith","Nodo Norte","Parte da Fortuna"]
    .map(p => mapaNatal[p] ? `  - ${p}: ${mapaNatal[p].signo} Casa ${mapaNatal[p].casa ?? '?'} ${mapaNatal[p].grau ?? ''}°${mapaNatal[p].retrogrado?' ℞':''}` : null)
    .filter(Boolean).join("\n");

  const prompt = `Você é um astrólogo com 30 anos de experiência em astrologia psicológica e humanista (Jung + astrologia, profundidade com acessibilidade). Sua leitura revela sem determinar, ilumina sem assustar, honra sem bajular.
Comprimento: 10.000-14.000 palavras.

# DADOS DO MAPA NATAL
Nome: ${nome} | Nascimento: ${dados.dataNascimento||'[DATA]'}, ${dados.horaNascimento||'[HORA]'}, ${dados.localNascimento||'[LOCAL]'}
${horaConhecida ? '' : 'ATENÇÃO: hora não confirmada — trate casas e Ascendente como indicativos; foque em análise solar (planetas por signo, aspectos).'}
${dados.faseLunar ? `Fase lunar: ${dados.faseLunar}` : ''}
${dados.contexto ? `Contexto da cliente: ${dados.contexto}` : ''}

## TRINDADE
Sol: ${a.sol} | Lua: ${a.lua} | ASC: ${a.asc} | Regente do mapa: ${a.regenteMapa}
MC: ${mapaNatal.MC ? (mapaNatal.MC.signo+' '+(mapaNatal.MC.grau||'')+'°') : '?'}

## PLANETAS E PONTOS
${planetasInfo}

# DIAGNÓSTICO (já calculado — use como base)
- Elemento dominante: ${a.elementoDominante} (${Object.entries(a.elementoPct).map(([k,v])=>k+' '+v+'%').join(', ')})
- Modalidade dominante: ${a.modalidadeDominante} (${Object.entries(a.modalidadePct).map(([k,v])=>k+' '+v+'%').join(', ')})
- Stelliums: ${a.stelliums.length?a.stelliums.join(" | "):"nenhum"}
- Planetas angulares (casas 1/4/7/10): ${a.angulares.length?a.angulares.join(", "):"nenhum"}
- Dignidades notáveis: ${a.dignidadesNotaveis.length?a.dignidadesNotaveis.join(", "):"nenhuma marcante"}

# ASPECTOS PRINCIPAIS
${aspectos.length ? aspectos.map(x=>`  - ${x.planeta1} ${x.aspecto} ${x.planeta2} (orbe ${x.orbe ?? '?'}°)`).join("\n") : "(não fornecidos)"}

${FUNDAMENTOS_NATAL}

## SOL POR SIGNO (use o desta cliente: ${mapaNatal.Sol?mapaNatal.Sol.signo:'?'})
${Object.entries(SOL_POR_SIGNO).map(([s,t])=>`${s}: ${t}`).join("\n\n")}
## SOL POR CASA
${Object.entries(SOL_POR_CASA).map(([c,t])=>`Casa ${c}: você ${t}`).join("\n")}

## LUA POR SIGNO (use a desta cliente: ${mapaNatal.Lua?mapaNatal.Lua.signo:'?'})
${Object.entries(LUA_POR_SIGNO).map(([s,t])=>`${s}: ${t}`).join("\n\n")}

## ASCENDENTE POR SIGNO (use o desta cliente: ${a.asc})
${Object.entries(ASC_POR_SIGNO).map(([s,t])=>`${s}: ${t}`).join("\n")}

## MERCÚRIO POR SIGNO
${Object.entries(MERCURIO_POR_SIGNO).map(([s,t])=>`${s}: ${t}`).join("\n")}
${mapaNatal.Mercúrio&&mapaNatal.Mercúrio.retrogrado?`(Mercúrio retrógrado nesta cliente) ${MERCURIO_RETROGRADO}`:`Nota sobre retrógrado: ${MERCURIO_RETROGRADO}`}

## VÊNUS POR SIGNO
${Object.entries(VENUS_POR_SIGNO).map(([s,t])=>`${s}: ${t}`).join("\n")}

## MARTE POR SIGNO
${Object.entries(MARTE_POR_SIGNO).map(([s,t])=>`${s}: ${t}`).join("\n")}

## JÚPITER POR SIGNO
${Object.entries(JUPITER_POR_SIGNO).map(([s,t])=>`${s}: ${t}`).join("\n")}
## SATURNO POR SIGNO
${Object.entries(SATURNO_POR_SIGNO).map(([s,t])=>`${s}: ${t}`).join("\n")}

## AS 12 CASAS
${Object.entries(CASAS_12).map(([c,t])=>`Casa ${c}: ${t}`).join("\n")}

${ASPECTOS_NATAL}
${PADROES_E_AREAS}
${ESTRUTURA_NATAL}

# FORMATO DE SAÍDA (OBRIGATÓRIO)
Responda EXCLUSIVAMENTE com JSON válido, sem texto antes/depois, sem markdown:
{ "secoes": [ { "numero": 1, "titulo": "Carta ao Cliente", "texto": "..." } ] }
REGRAS: aspas duplas; escape quebras como \\n e aspas internas como \\"; sem blocos de código; "numero" exato (1-20); "texto" em PROSA corrida (segunda pessoa), exceto a seção 19 (10 afirmações, lista dentro do texto com \\n).

# LEMBRETES
1. Use o nome ${nome} ao longo do documento
2. Analise a TRINDADE em conjunto antes de separar (Sol ${mapaNatal.Sol?mapaNatal.Sol.signo:'?'} + Lua ${mapaNatal.Lua?mapaNatal.Lua.signo:'?'} + ASC ${a.asc})
3. Cada planeta com signo + casa + aspectos integrados; mencione as dignidades notáveis e os stelliums
4. Cada característica tem luz E sombra; cada desafio tem caminho de trabalho
5. Tom revelador, NUNCA determinista — sempre potencial
6. Todas as 12 casas mencionadas; planetas angulares destacados; retrógrados interpretados
7. Missão de vida (seção 17): integrar Sol + MC + Nodo Norte
8. Upsell individual ao final (1-2: Kármico, Revolução, Profissional ou Lilith) — sem combo
9. Mínimo 10.000 palavras

Gere agora o Mapa Astral Personalizado completo (seções 1-20). Retorne apenas o JSON.`;

  return {
    diagnostico: { cliente: nome, horaConhecida, ...a },
    prompt,
    metadados: {
      framework: "Mapa Astral Personalizado — trindade + 10 planetas + pontos + 12 casas + aspectos + dignidades + stelliums",
      modeloRecomendado: "claude-opus-4-7",
      palavrasEsperadas: "10.000-14.000",
      tipo: "premium_assincrono_48h",
      saida: "JSON estruturado por seções (renderização de PDF é camada separada)",
      observacao: "PREMIUM — distinto da isca (Mapa Astral grátis/síncrono). Não canibalizar: este integra TODOS os indicadores em 20 seções.",
      versao: "2.0"
    }
  };
}

module.exports = {
  buildPromptMapaAstralPersonalizado,
  analisarMapaNatal, distribuir, detectarStellium, detectarAngulares, avaliarDignidade,
  FUNDAMENTOS_NATAL, SOL_POR_SIGNO, SOL_POR_CASA, LUA_POR_SIGNO, ASC_POR_SIGNO,
  MERCURIO_POR_SIGNO, MERCURIO_RETROGRADO, VENUS_POR_SIGNO, MARTE_POR_SIGNO,
  JUPITER_POR_SIGNO, SATURNO_POR_SIGNO, CASAS_12, ASPECTOS_NATAL, PADROES_E_AREAS, ESTRUTURA_NATAL,
  REGENTE_SIGNO, ELEMENTO_SIGNO, MODALIDADE_SIGNO
};
