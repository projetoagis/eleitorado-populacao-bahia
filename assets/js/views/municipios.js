import { formatInt, formatPct, escapeHtml, numCSV } from '../core/format.js';
import { FAIXAS_RAZAO, PORTES, razao, porte, filtrarMunicipios, totais, ordenar } from '../core/indicadores.js';
import { downloadCSV } from './download.js';

const $ = id => document.getElementById(id);

const COLUNAS = [
  { id: 'nome', t: 'Município', v: m => m.nome },
  { id: 'ibge', t: 'Cód. IBGE', v: m => m.ibge },
  { id: 'pop', t: 'Habitantes', sub: 'IBGE 2026', num: true, v: m => m.pop },
  { id: 'el', t: 'Eleitores', sub: 'TSE 2026', num: true, v: m => m.el },
  { id: 'razao', t: 'Eleitores / Habitantes', num: true, v: m => razao(m) },
  { id: 'sobra', t: 'Habitantes − Eleitores', num: true, v: m => m.pop - m.el },
];

const S = { busca: '', faixa: '', porte: '', col: 'nome', desc: false, pagina: 1, porPagina: 50 };
let D = null;

function celulaRazao(r) {
  const larg = Math.min(r, 1.2) / 1.2 * 100;
  const acima = r > 1;
  return `<span class="razao${acima ? ' razao--acima' : ''}" title="${acima ? 'Mais eleitores que habitantes estimados' : ''}">
    ${acima ? '<span aria-label="acima de 100%">▲</span>' : ''}${formatPct(r)}
    <span class="razao-barra" aria-hidden="true"><i style="width:${larg.toFixed(1)}%"></i><b style="left:${(100 / 1.2).toFixed(1)}%"></b></span>
  </span>`;
}

function celula(c, m) {
  if (c.id === 'nome') return `<a class="link-mun" href="#analise/${m.ibge}">${escapeHtml(m.nome)}</a>`;
  if (c.id === 'ibge') return `<span class="fraco">${m.ibge}</span>`;
  if (c.id === 'razao') return celulaRazao(razao(m));
  const v = c.v(m);
  return c.id === 'sobra' && v < 0 ? `<span class="razao--acima">${formatInt(v)}</span>` : formatInt(v);
}

function visiveis() {
  const c = COLUNAS.find(x => x.id === S.col);
  return ordenar(filtrarMunicipios(D.municipios, S), c.v, S.desc);
}

function desenhar() {
  const lista = visiveis();
  const porPagina = S.porPagina || lista.length || 1;
  const paginas = Math.max(1, Math.ceil(lista.length / porPagina));
  S.pagina = Math.min(S.pagina, paginas);
  const trecho = lista.slice((S.pagina - 1) * porPagina, S.pagina * porPagina);

  $('mun-head').innerHTML = `<tr>${COLUNAS.map(c => {
    const ord = S.col === c.id ? (S.desc ? ' sort-desc' : ' sort-asc') : '';
    return `<th class="th-sortable${c.num ? ' num' : ''}${ord}" data-col="${c.id}" title="${c.sub ? escapeHtml(c.sub) : ''}">${escapeHtml(c.t)}${c.sub ? ` <span class="fraco">· ${c.sub}</span>` : ''}</th>`;
  }).join('')}</tr>`;

  $('mun-body').innerHTML = trecho.length
    ? trecho.map(m => `<tr>${COLUNAS.map(c => `<td class="${c.num ? 'num' : ''}">${celula(c, m)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${COLUNAS.length}" class="tb-vazio">Nenhum município com esses filtros.</td></tr>`;

  const t = totais(lista);
  $('mun-foot').innerHTML = lista.length ? `<tr>
    <td colspan="2">${lista.length === D.municipios.length ? 'Bahia' : `Total filtrado · ${formatInt(t.n)} municípios`}</td>
    <td class="num">${formatInt(t.pop)}</td><td class="num">${formatInt(t.el)}</td>
    <td class="num">${formatPct(t.razao)}</td><td class="num">${formatInt(t.sobra)}</td></tr>` : '';

  const filtrado = lista.length !== D.municipios.length;
  const st = $('mun-status');
  st.textContent = filtrado ? `${formatInt(lista.length)} de ${formatInt(D.municipios.length)} municípios` : `${formatInt(D.municipios.length)} municípios`;
  st.classList.toggle('active', filtrado);
  $('mun-limpar').hidden = !filtrado;

  const ind = paginas > 1 ? `Página ${S.pagina} de ${paginas}` : '';
  for (const s of ['top', 'bot']) {
    $(`mun-page-${s}`).textContent = ind;
    $(`mun-prev-${s}`).disabled = S.pagina <= 1;
    $(`mun-next-${s}`).disabled = S.pagina >= paginas;
    $(`mun-pag-${s}`).hidden = paginas <= 1;
  }
  $('mun-info').textContent = lista.length
    ? `Mostrando ${formatInt((S.pagina - 1) * porPagina + 1)}–${formatInt((S.pagina - 1) * porPagina + trecho.length)} de ${formatInt(lista.length)}`
    : '';
}

function resumo() {
  const b = totais(D.municipios);
  const acima = D.municipios.filter(m => razao(m) > 1).length;
  const cards = [
    ['card--3', 'População estimada', formatInt(b.pop), 'IBGE · 1º jul. 2026'],
    ['card--1', 'Eleitores aptos', formatInt(b.el), `TSE · ${D.fontes.tse.gerado_em}`],
    ['card--4', 'Eleitores / Habitantes', formatPct(b.razao), `${formatInt(b.sobra)} habitantes a mais que eleitores`],
    ['card--2', 'Mais eleitores que habitantes', `${acima} municípios`, `de ${D.municipios.length} · razão acima de 100%`],
  ];
  $('mun-resumo').innerHTML = cards.map(([cls, l, v, s]) => `
    <div class="card ${cls}"><div class="card-label">${l}</div><div class="card-value">${v}</div><div class="card-sub">${s}</div></div>`).join('');
}

function exportar() {
  const lista = visiveis();
  downloadCSV('eleitores-habitantes-bahia.csv',
    ['Município', 'Código IBGE', 'Código TSE', 'Porte', 'Habitantes (IBGE 2026)', 'Eleitores (TSE 2026)', 'Eleitores / Habitantes (%)', 'Habitantes - Eleitores'],
    lista.map(m => [m.nome, m.ibge, m.tse, porte(m)?.nome || '', m.pop, m.el, numCSV(razao(m) * 100), m.pop - m.el]));
}

function opcoes(lista, vazio) {
  return `<option value="">${vazio}</option>` + lista.map(x => `<option value="${x.id}">${escapeHtml(x.nome)}</option>`).join('');
}

export function initMunicipios(dados) {
  D = dados;
  $('mun-faixa').innerHTML = opcoes(FAIXAS_RAZAO, 'Todas');
  $('mun-porte').innerHTML = opcoes(PORTES, 'Todos');
  resumo();

  const aplicar = () => { S.pagina = 1; desenhar(); };
  $('mun-busca').addEventListener('input', e => { S.busca = e.target.value; aplicar(); });
  $('mun-faixa').addEventListener('change', e => { S.faixa = e.target.value; aplicar(); });
  $('mun-porte').addEventListener('change', e => { S.porte = e.target.value; aplicar(); });
  $('mun-por-pagina').addEventListener('change', e => { S.porPagina = Number(e.target.value); aplicar(); });
  $('mun-limpar').addEventListener('click', () => {
    S.busca = S.faixa = S.porte = '';
    $('mun-busca').value = $('mun-faixa').value = $('mun-porte').value = '';
    aplicar();
  });
  $('mun-head').addEventListener('click', e => {
    const th = e.target.closest('th[data-col]');
    if (!th) return;
    const col = th.dataset.col;
    S.desc = S.col === col ? !S.desc : COLUNAS.find(c => c.id === col).num;
    S.col = col;
    desenhar();
  });
  for (const s of ['top', 'bot']) {
    $(`mun-prev-${s}`).addEventListener('click', () => { S.pagina--; desenhar(); });
    $(`mun-next-${s}`).addEventListener('click', () => { S.pagina++; desenhar(); });
  }
  $('mun-csv').addEventListener('click', exportar);
  desenhar();
}
