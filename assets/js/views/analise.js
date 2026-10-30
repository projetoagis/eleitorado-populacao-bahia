import { formatInt, formatPct, formatPp, formatDec, escapeHtml, numCSV } from '../core/format.js';
import {
  PORTES, porte, indicadores, distribuicao, semNaoInformado, faixaTotal,
  recortes, agregarRecorte, lerLocais,
} from '../core/indicadores.js';
import { tema, opcoes, barras, criar } from './charts.js';
import { tabela } from './tabela.js';
import { downloadCSV } from './download.js';

const $ = id => document.getElementById(id);

const ABAS = [
  { id: 'idade', nome: 'Faixa etária' },
  { id: 'genero', nome: 'Gênero e estado civil' },
  { id: 'escolaridade', nome: 'Escolaridade' },
  { id: 'autodeclaracao', nome: 'Autodeclarações' },
  { id: 'comparar', nome: 'Comparar municípios' },
  { id: 'locais', nome: 'Locais de votação' },
];

const S = { recorte: 'BA', aba: 'idade' };
let D = null;
let RECORTES = [];
let graficos = [];
let locais = null;
let carregandoLocais = null;

function atual() {
  return RECORTES.find(r => r.id === S.recorte) || RECORTES[0];
}

function ehBahia(r) {
  return r.id === 'BA';
}

function limparGraficos() {
  graficos.forEach(g => g && g.destroy());
  graficos = [];
}

function card(cls, label, valor, sub) {
  return `<div class="card ${cls}"><div class="card-label">${label}</div><div class="card-value">${valor}</div><div class="card-sub">${sub}</div></div>`;
}

function desenharCabecalho(rec, ag) {
  const ind = indicadores(ag, D.dims);
  const indBA = indicadores(D.bahia, D.dims);
  const bahia = ehBahia(rec);
  const sub = rec.municipios.length === 1
    ? `Cód. IBGE ${ag.ibge} · Cód. TSE ${ag.tse} · ${porte(ag)?.nome || ''} · Zona(s) ${ag.zonas.join(', ')}`
    : `${formatInt(rec.municipios.length)} municípios · ${formatInt(ag.zonas.length)} zonas eleitorais`;
  $('an-cab').innerHTML = `<span class="an-recorte-nome">${escapeHtml(rec.municipios.length === 1 ? rec.municipios[0].nome : rec.nome)}</span>
    <span class="an-recorte-sub">${escapeHtml(sub)}</span>`;
  $('an-cards').innerHTML = [
    card('card--1', 'Eleitores aptos', formatInt(ag.el), bahia ? 'TSE 2026' : `${formatPct(ag.el / D.bahia.el, 2)} do eleitorado da Bahia`),
    card('card--3', 'Habitantes', formatInt(ag.pop), bahia ? 'IBGE · estimativa 2026' : `${formatPct(ag.pop / D.bahia.pop, 2)} da população da Bahia`),
    card(ind.razao > 1 ? 'card--2' : 'card--4', 'Eleitores / Habitantes', formatPct(ind.razao), bahia ? `${formatInt(ag.pop - ag.el)} habitantes a mais que eleitores` : `Bahia: ${formatPct(indBA.razao)}`),
    card('card--3', 'Com biometria', formatPct(ind.bio), `${formatInt(ag.bio)} eleitores${bahia ? '' : ` · Bahia: ${formatPct(indBA.bio)}`}`),
    card('card--4', 'Com deficiência', formatInt(ag.def), `${formatPct(ind.def, 2)} · ou mobilidade reduzida`),
    card('card--1', 'Seções eleitorais', formatInt(ag.secoes), `${formatInt(ag.locais)} locais · ${formatDec(ind.porSecao)} eleitores por seção`),
  ].join('');
}

function blocoHtml(id, titulo, { nota = '', fatos = '', alto = false, so = false, altura = 0 } = {}) {
  return `<section class="bloco" id="bl-${id}">
    <div class="bloco-cab"><span class="bloco-titulo">${titulo}</span><button type="button" class="btn-ghost" data-csv="${id}">&#8681; CSV</button></div>
    ${fatos ? `<div class="fatos">${fatos}</div>` : ''}
    ${nota ? `<p class="bloco-nota">${nota}</p>` : ''}
    <div class="bloco-corpo${so ? ' bloco-corpo--um' : ''}">
      <div class="grafico${alto ? ' grafico--alto' : ''}"${altura ? ` style="height:${altura}px"` : ''}><canvas aria-label="${escapeHtml(titulo)}"></canvas></div>
      <div class="table-wrapper"><table></table></div>
    </div>
  </section>`;
}

const CSV = {};

function tabelaDistrib(id, linhas, comBase, rotuloCol, nomeRecorte) {
  const t = $('bl-' + id).querySelector('table');
  t.innerHTML = `<thead><tr><th>${rotuloCol}</th><th class="num">Eleitores</th><th class="num">%</th>${comBase ? '<th class="num">% Bahia</th><th class="num">Diferença</th>' : ''}</tr></thead>
    <tbody>${linhas.map(l => `<tr><td>${escapeHtml(l.rotulo)}</td><td class="num">${formatInt(l.valor)}</td><td class="num">${formatPct(l.pct)}</td>
      ${comBase ? `<td class="num fraco">${formatPct(l.pctBase)}</td><td class="num ${l.dif > 0.0005 ? 'dif-mais' : l.dif < -0.0005 ? 'dif-menos' : 'fraco'}">${formatPp(l.dif)}</td>` : ''}</tr>`).join('')}</tbody>
    <tfoot><tr><td>Total</td><td class="num">${formatInt(linhas.reduce((s, l) => s + l.valor, 0))}</td><td class="num">100%</td>${comBase ? '<td></td><td></td>' : ''}</tr></tfoot>`;
  CSV[id] = () => [
    [rotuloCol, 'Eleitores', '%', ...(comBase ? ['% Bahia', 'Diferença (p.p.)'] : [])],
    linhas.map(l => [l.rotulo, l.valor, numCSV(l.pct * 100), ...(comBase ? [numCSV(l.pctBase * 100), numCSV(l.dif * 100)] : [])]),
    `${id}-${nomeRecorte}`,
  ];
}

function graficoDistrib(id, linhas, comBase, nomeRecorte) {
  const t = tema();
  const ds = [barras(nomeRecorte, linhas.map(l => l.pct), t.series[0])];
  if (comBase) ds.push(barras('Bahia', linhas.map(l => l.pctBase), t.other));
  graficos.push(criar($('bl-' + id).querySelector('canvas'), {
    type: 'bar',
    data: { labels: linhas.map(l => l.rotulo), datasets: ds },
    options: opcoes({ valor: 'pct', horizontal: true, legenda: comBase }),
  }));
}

function distrib(id, titulo, dim, ag, rec, { semNI = false, fatos = '', rotuloCol = 'Categoria' } = {}) {
  const comBase = !ehBahia(rec);
  let valores = ag[dim], rotulos = D.dims[dim], base = D.bahia[dim], nota = '';
  if (semNI) {
    const a = semNaoInformado(valores, rotulos);
    const b = semNaoInformado(base, rotulos);
    const inf = ag.el - a.naoInf;
    nota = `Informado por <strong>${formatInt(inf)}</strong> eleitores (${formatPct(inf / ag.el)} do recorte); ${formatInt(a.naoInf)} sem informação. Os percentuais consideram só quem informou.`;
    valores = a.valores; rotulos = a.rotulos; base = b.valores;
  }
  const linhas = distribuicao(valores, rotulos, base);
  return {
    html: blocoHtml(id, titulo, { nota, fatos, altura: Math.min(300, 70 + linhas.length * (comBase ? 40 : 30)) }),
    depois: nome => { tabelaDistrib(id, linhas, comBase, rotuloCol, nome); graficoDistrib(id, linhas, comBase, nome); },
  };
}

function fato(rotulo, v, vBA, comBase) {
  return `<span>${rotulo}: <strong>${formatPct(v)}</strong>${comBase ? ` <span class="fraco">(Bahia ${formatPct(vBA)})</span>` : ''}</span>`;
}

function abaIdade(ag, rec, nome) {
  const comBase = !ehBahia(rec);
  const ind = indicadores(ag, D.dims), indBA = indicadores(D.bahia, D.dims);
  const fatos = [
    fato('Voto facultativo 16–17 anos', ind.jovem, indBA.jovem, comBase),
    fato('Obrigatório 18–69 anos', 1 - ind.facultativo, 1 - indBA.facultativo, comBase),
    fato('Facultativo 70 anos ou mais', ind.idoso, indBA.idoso, comBase),
    fato('60 anos ou mais', ind.sessenta, indBA.sessenta, comBase),
  ].join('');
  $('an-corpo').innerHTML = blocoHtml('idade', 'Pirâmide etária do eleitorado', { fatos, alto: true });

  const rot = D.dims.faixa;
  const tot = faixaTotal(ag), totBA = faixaTotal(D.bahia);
  const idx = rot.map((_, i) => i).filter(i => rot[i] !== 'Inválida' || tot[i] > 0);
  const linhas = distribuicao(idx.map(i => tot[i]), idx.map(i => rot[i]), idx.map(i => totBA[i]));
  const t = $('bl-idade').querySelector('table');
  t.innerHTML = `<thead><tr><th>Faixa</th><th class="num">Mulheres</th><th class="num">Homens</th><th class="num">Total</th><th class="num">%</th>${comBase ? '<th class="num">% Bahia</th>' : ''}</tr></thead>
    <tbody>${idx.map((i, k) => `<tr><td>${escapeHtml(rot[i])}</td><td class="num">${formatInt(ag.faixa_f[i])}</td><td class="num">${formatInt(ag.faixa_m[i])}</td>
      <td class="num">${formatInt(tot[i])}</td><td class="num">${formatPct(linhas[k].pct)}</td>${comBase ? `<td class="num fraco">${formatPct(linhas[k].pctBase)}</td>` : ''}</tr>`).join('')}</tbody>`;
  CSV.idade = () => [
    ['Faixa', 'Mulheres', 'Homens', 'Gênero não informado', 'Total', '%', ...(comBase ? ['% Bahia'] : [])],
    idx.map((i, k) => [rot[i], ag.faixa_f[i], ag.faixa_m[i], ag.faixa_n[i], tot[i], numCSV(linhas[k].pct * 100), ...(comBase ? [numCSV(linhas[k].pctBase * 100)] : [])]),
    `faixa-etaria-${nome}`,
  ];

  const tm = tema();
  const ordem = idx.filter(i => rot[i] !== 'Inválida').reverse();
  const o = opcoes({ horizontal: true, empilhado: true, absoluto: true });
  const maior = Math.max(1, ...ordem.map(i => Math.max(ag.faixa_f[i], ag.faixa_m[i])));
  const passo = 10 ** Math.floor(Math.log10(maior)) / 2;
  const lim = Math.ceil(maior / passo) * passo;
  o.scales.x.min = -lim;
  o.scales.x.max = lim;
  graficos.push(criar($('bl-idade').querySelector('canvas'), {
    type: 'bar',
    data: {
      labels: ordem.map(i => rot[i]),
      datasets: [
        barras('Mulheres', ordem.map(i => -ag.faixa_f[i]), tm.series[0], { borderSkipped: false, barPercentage: 0.96, categoryPercentage: 0.96 }),
        barras('Homens', ordem.map(i => ag.faixa_m[i]), tm.series[1], { borderSkipped: false, barPercentage: 0.96, categoryPercentage: 0.96 }),
      ],
    },
    options: o,
  }));
}

function abaDistribuicoes(itens, ag, rec, nome) {
  const partes = itens.map(([id, titulo, dim, cfg]) => distrib(id, titulo, dim, ag, rec, cfg));
  $('an-corpo').innerHTML = partes.map(p => p.html).join('');
  partes.forEach(p => p.depois(nome));
}

function abaGenero(ag, rec, nome) {
  abaDistribuicoes([
    ['genero', 'Gênero', 'genero', { rotuloCol: 'Gênero' }],
    ['estado-civil', 'Estado civil', 'estado_civil', { rotuloCol: 'Estado civil' }],
  ], ag, rec, nome);
}

function abaEscolaridade(ag, rec, nome) {
  const comBase = !ehBahia(rec);
  const ind = indicadores(ag, D.dims), indBA = indicadores(D.bahia, D.dims);
  const fatos = [
    fato('Analfabetos', ind.analfabeto, indBA.analfabeto, comBase),
    fato('Analfabetos + lê e escreve', ind.baixaEsc, indBA.baixaEsc, comBase),
    fato('Superior completo', ind.superior, indBA.superior, comBase),
  ].join('');
  abaDistribuicoes([['escolaridade', 'Grau de escolaridade declarado', 'escolaridade', { fatos, rotuloCol: 'Escolaridade' }]], ag, rec, nome);
}

function abaAutodeclaracao(ag, rec, nome) {
  abaDistribuicoes([
    ['raca', 'Raça / cor', 'raca', { semNI: true, rotuloCol: 'Raça / cor' }],
    ['identidade', 'Identidade de gênero', 'identidade', { semNI: true, rotuloCol: 'Identidade de gênero' }],
    ['quilombola', 'Quilombola', 'quilombola', { semNI: true, rotuloCol: 'Quilombola' }],
    ['libras', 'Intérprete de Libras', 'libras', { semNI: true, rotuloCol: 'Intérprete de Libras' }],
  ], ag, rec, nome);
  $('an-corpo').insertAdjacentHTML('afterbegin', `<p class="intro">Raça/cor, identidade de gênero, quilombola e intérprete de Libras são <strong>autodeclarações recentes</strong> no cadastro eleitoral: a maior parte do eleitorado ainda não as informou. Leia os percentuais como retrato de quem respondeu, não do eleitorado inteiro.</p>`);
}

const pctCol = (id, t, campo, dica) => ({ id, t, num: true, dica, v: l => l.ind[campo], f: v => formatPct(v), csv: l => numCSV(l.ind[campo] * 100) });

function abaComparar(rec) {
  const base = rec.municipios.length > 1 ? rec.municipios : D.municipios;
  const linhas = base.map(m => ({ m, ind: indicadores(m, D.dims) }));
  $('an-corpo').innerHTML = `<p class="intro">Indicadores de cada município lado a lado. Clique no cabeçalho para ordenar e no nome para abrir o município.
    ${rec.municipios.length > 1 && !ehBahia(rec) ? `Mostrando o recorte <strong>${escapeHtml(rec.nome)}</strong>.` : ''}</p><div id="an-comparar"></div>`;
  const filtroPorte = rec.municipios.length > 1 && !ehBahia(rec) ? '' : `<select class="filter-select" data-f="porte" aria-label="Porte"><option value="">Todos os portes</option>${PORTES.map(p => `<option value="${p.id}">${p.nome}</option>`).join('')}</select>`;
  tabela($('an-comparar'), {
    linhas,
    porPagina: 50,
    ordem: { col: 'razao', desc: true },
    filtros: filtroPorte,
    filtrar: (l, el) => {
      const s = el.querySelector('[data-f="porte"]');
      return !s || !s.value || porte(l.m)?.id === s.value;
    },
    atual: l => l.m.ibge === S.recorte,
    csv: { arquivo: 'comparar-municipios-bahia.csv' },
    colunas: [
      { id: 'nome', t: 'Município', v: l => l.m.nome, html: l => `<a class="link-mun" href="#analise/${l.m.ibge}">${escapeHtml(l.m.nome)}</a>` },
      { id: 'pop', t: 'Habitantes', num: true, v: l => l.m.pop, f: formatInt },
      { id: 'el', t: 'Eleitores', num: true, v: l => l.m.el, f: formatInt },
      pctCol('razao', 'Eleit./Hab.', 'razao', 'Eleitores aptos ÷ habitantes estimados'),
      pctCol('mulheres', '% Mulheres', 'mulheres'),
      pctCol('jovem', '% 16–17', 'jovem', 'Voto facultativo (16 e 17 anos)'),
      pctCol('ate24', '% até 24', 'ate24'),
      pctCol('sessenta', '% 60+', 'sessenta'),
      pctCol('idoso', '% 70+', 'idoso', 'Voto facultativo (70 anos ou mais)'),
      pctCol('baixaEsc', '% Analf. + lê/escreve', 'baixaEsc'),
      pctCol('superior', '% Superior', 'superior', 'Superior completo'),
      pctCol('bio', '% Biometria', 'bio'),
      pctCol('def', '% PcD', 'def', 'Eleitores com deficiência ou mobilidade reduzida'),
      { id: 'porSecao', t: 'Eleit./seção', num: true, v: l => l.ind.porSecao, f: formatDec, csv: l => numCSV(l.ind.porSecao, 1) },
      { id: 'secoes', t: 'Seções', num: true, v: l => l.m.secoes, f: formatInt },
      { id: 'locais', t: 'Locais', num: true, v: l => l.m.locais, f: formatInt },
    ],
  });
}

async function obterLocais() {
  if (locais) return locais;
  if (!carregandoLocais) {
    carregandoLocais = fetch('assets/data/locais.json')
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(obj => (locais = lerLocais(obj, D.porIbge)))
      .catch(e => { carregandoLocais = null; throw e; });
  }
  return carregandoLocais;
}

async function abaLocais(rec) {
  $('an-corpo').innerHTML = '<div class="carregando">Carregando locais de votação…</div>';
  let todos;
  try {
    todos = await obterLocais();
  } catch (e) {
    $('an-corpo').innerHTML = `<div class="estado estado--erro">Não foi possível carregar os locais de votação (${escapeHtml(e.message)}).</div>`;
    return;
  }
  if (S.aba !== 'locais' || atual() !== rec) return;
  const ibges = new Set(rec.municipios.map(m => m.ibge));
  const linhas = ehBahia(rec) ? todos : todos.filter(l => ibges.has(l.ibge));
  const zonas = [...new Set(linhas.map(l => l.zona))].sort((a, b) => a - b);
  const varios = rec.municipios.length > 1;
  $('an-corpo').innerHTML = `<p class="intro">Cada local de votação com suas seções e eleitores aptos. Locais muito cheios ou com média alta de eleitores por seção ajudam a ver onde a votação concentra.</p><div id="an-locais"></div>`;
  tabela($('an-locais'), {
    linhas,
    porPagina: 50,
    ordem: { col: 'el', desc: true },
    filtros: zonas.length > 1 ? `<select class="filter-select" data-f="zona" aria-label="Zona"><option value="">Todas as zonas</option>${zonas.map(z => `<option value="${z}">Zona ${z}</option>`).join('')}</select>` : '',
    filtrar: (l, el) => {
      const s = el.querySelector('[data-f="zona"]');
      return !s || !s.value || String(l.zona) === s.value;
    },
    csv: { arquivo: `locais-votacao-${varios ? rec.id.toLowerCase() : rec.municipios[0].ibge}.csv` },
    colunas: [
      ...(varios ? [{ id: 'municipio', t: 'Município', v: l => l.municipio, html: l => `<a class="link-mun" href="#analise/${l.ibge}">${escapeHtml(l.municipio)}</a>` }] : []),
      { id: 'zona', t: 'Zona', num: true, v: l => l.zona },
      { id: 'local', t: 'Nº local', num: true, v: l => l.local },
      { id: 'nome', t: 'Local de votação', v: l => l.nome },
      { id: 'secoes', t: 'Seções', num: true, v: l => l.secoes, f: formatInt },
      { id: 'el', t: 'Eleitores', num: true, v: l => l.el, f: formatInt },
      { id: 'porSecao', t: 'Eleit./seção', num: true, v: l => l.porSecao, f: formatDec, csv: l => numCSV(l.porSecao, 1) },
      { id: 'pctBio', t: '% Biometria', num: true, v: l => l.pctBio, f: v => formatPct(v), csv: l => numCSV(l.pctBio * 100) },
      { id: 'def', t: 'PcD', num: true, v: l => l.def, f: formatInt, dica: 'Eleitores com deficiência ou mobilidade reduzida' },
    ],
  });
}

function nomeCurto(rec) {
  return rec.municipios.length === 1 ? rec.municipios[0].nome : ehBahia(rec) ? 'Bahia' : 'Recorte';
}

function slug(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function desenharAnalise() {
  if (!D) return;
  limparGraficos();
  const rec = atual();
  const ag = agregarRecorte(D, rec);
  desenharCabecalho(rec, ag);
  $('an-recorte').value = rec.id;
  $('an-abas').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.aba === S.aba)));
  const nome = nomeCurto(rec);
  for (const k of Object.keys(CSV)) delete CSV[k];
  if (S.aba === 'idade') abaIdade(ag, rec, nome);
  else if (S.aba === 'genero') abaGenero(ag, rec, nome);
  else if (S.aba === 'escolaridade') abaEscolaridade(ag, rec, nome);
  else if (S.aba === 'autodeclaracao') abaAutodeclaracao(ag, rec, nome);
  else if (S.aba === 'comparar') abaComparar(rec);
  else abaLocais(rec);
}

export function abrirAnalise(id) {
  if (!D) return;
  const alvo = RECORTES.find(r => r.id === id) ? id : 'BA';
  S.recorte = alvo;
  desenharAnalise();
}

export function initAnalise(dados, aoMudarRecorte) {
  D = dados;
  RECORTES = recortes(dados);
  const grupos = [...new Set(RECORTES.map(r => r.grupo))];
  $('an-recorte').innerHTML = grupos.map(g => `<optgroup label="${g}">${RECORTES.filter(r => r.grupo === g)
    .map(r => `<option value="${r.id}">${escapeHtml(r.nome)}</option>`).join('')}</optgroup>`).join('');
  $('an-abas').innerHTML = ABAS.map(a => `<button type="button" role="tab" data-aba="${a.id}">${a.nome}</button>`).join('');

  $('an-recorte').addEventListener('change', e => {
    S.recorte = e.target.value;
    aoMudarRecorte(S.recorte);
    desenharAnalise();
  });
  $('an-abas').addEventListener('click', e => {
    const b = e.target.closest('button[data-aba]');
    if (!b || b.dataset.aba === S.aba) return;
    S.aba = b.dataset.aba;
    desenharAnalise();
  });
  $('an-corpo').addEventListener('click', e => {
    const b = e.target.closest('[data-csv]');
    if (!b || !CSV[b.dataset.csv]) return;
    const [cab, linhas, arq] = CSV[b.dataset.csv]();
    downloadCSV(slug(arq) + '.csv', cab, linhas);
  });
}

export function recorteAtual() {
  return S.recorte;
}

