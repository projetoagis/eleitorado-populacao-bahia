import { lerDados } from './core/indicadores.js';
import { escapeHtml } from './core/format.js';
import { initMunicipios } from './views/municipios.js';
import { initAnalise, abrirAnalise, desenharAnalise } from './views/analise.js';

const THEME_KEY = 'eleitorado-ba-theme';
const $ = id => document.getElementById(id);

const VIEWS = {
  '': { subtitulo: 'ELEITORES × HABITANTES POR MUNICÍPIO', crumb: '' },
  analise: { subtitulo: 'ANÁLISE DETALHADA DO ELEITORADO', crumb: 'Análise Detalhada' },
};

let dados = null;
let viewAtual = null;

function isLight() {
  return document.documentElement.classList.contains('theme-light');
}

function applyTheme(light) {
  document.documentElement.classList.toggle('theme-light', light);
  const btn = $('btn-theme');
  btn.textContent = light ? '☾ Escuro' : '☀ Claro';
  btn.setAttribute('aria-label', light ? 'Mudar para tema escuro' : 'Mudar para tema claro');
  if (viewAtual === 'analise') desenharAnalise();
}

function initTheme() {
  applyTheme(isLight());
  $('btn-theme').addEventListener('click', () => {
    const light = !isLight();
    try { localStorage.setItem(THEME_KEY, light ? 'light' : 'dark'); } catch (e) {}
    applyTheme(light);
  });
}

function initHeader() {
  const btnSobre = $('btn-sobre');
  const aboutPanel = $('header-about');
  btnSobre.addEventListener('click', () => {
    const isOpen = btnSobre.getAttribute('aria-expanded') === 'true';
    btnSobre.setAttribute('aria-expanded', String(!isOpen));
    aboutPanel.classList.toggle('open', !isOpen);
    aboutPanel.setAttribute('aria-hidden', String(isOpen));
  });
}

function lerHash() {
  const [view = '', arg = ''] = location.hash.replace(/^#\/?/, '').split('/');
  return VIEWS[view] ? { view, arg } : { view: '', arg: '' };
}

function mostrar() {
  const { view, arg } = lerHash();
  const mudou = view !== viewAtual;
  viewAtual = view;
  $('view-inicio').hidden = view !== '';
  $('view-analise').hidden = view !== 'analise';
  $('toolbar').hidden = view === '';
  $('header-subtitle').textContent = VIEWS[view].subtitulo;
  $('crumb-atual').textContent = VIEWS[view].crumb;
  if (view === 'analise' && dados) abrirAnalise(arg || 'BA');
  if (mudou) window.scrollTo({ top: 0 });
}

function initRouter() {
  window.addEventListener('hashchange', mostrar);
  $('crumb-home').addEventListener('click', e => {
    e.preventDefault();
    history.pushState(null, '', location.pathname + location.search);
    mostrar();
  });
  mostrar();
}

function fontes(d) {
  const t = d.fontes.tse, i = d.fontes.ibge;
  document.querySelectorAll('[data-fonte="tse"]').forEach(a => { a.href = t.url; });
  document.querySelectorAll('[data-fonte="ibge"]').forEach(a => { a.href = i.url; });
  document.querySelectorAll('[data-tse-data]').forEach(el => { el.textContent = t.gerado_em; });
}

async function carregar() {
  try {
    const r = await fetch('assets/data/eleitorado.json');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    dados = lerDados(await r.json());
  } catch (e) {
    $('mun-area').innerHTML = `<div class="estado estado--erro">Não foi possível carregar os dados (${escapeHtml(e.message)}). Recarregue a página.</div>`;
    return;
  }
  fontes(dados);
  initMunicipios(dados);
  initAnalise(dados, id => {
    history.replaceState(null, '', '#analise' + (id === 'BA' ? '' : '/' + id));
  });
  if (viewAtual === 'analise') abrirAnalise(lerHash().arg || 'BA');
}

initTheme();
initHeader();
initRouter();
carregar();
