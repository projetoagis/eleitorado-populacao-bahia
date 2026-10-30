import { normStr } from './format.js';

export const FORMATO = 'eleitorado-populacao';
export const VERSAO_MAXIMA = 1;

export const FAIXAS_RAZAO = [
  { id: 'acima', nome: 'Acima de 100%', teste: r => r > 1 },
  { id: '90', nome: '90% a 100%', teste: r => r > 0.9 && r <= 1 },
  { id: '80', nome: '80% a 90%', teste: r => r > 0.8 && r <= 0.9 },
  { id: '70', nome: '70% a 80%', teste: r => r > 0.7 && r <= 0.8 },
  { id: 'abaixo', nome: 'Até 70%', teste: r => r <= 0.7 },
];

export const PORTES = [
  { id: 'ate10', nome: 'Até 10 mil hab.', min: 0, max: 10000 },
  { id: 'ate20', nome: '10 a 20 mil hab.', min: 10000, max: 20000 },
  { id: 'ate50', nome: '20 a 50 mil hab.', min: 20000, max: 50000 },
  { id: 'ate100', nome: '50 a 100 mil hab.', min: 50000, max: 100000 },
  { id: 'ate500', nome: '100 a 500 mil hab.', min: 100000, max: 500000 },
  { id: 'mais500', nome: 'Acima de 500 mil hab.', min: 500000, max: Infinity },
];

const ESCALARES = ['pop', 'el', 'bio', 'def', 'ns', 'secoes', 'locais'];

export function lerDados(obj) {
  if (!obj || obj.formato !== FORMATO) throw new Error('Arquivo de dados não reconhecido.');
  if (obj.versao_formato > VERSAO_MAXIMA) throw new Error('Versão do arquivo de dados mais nova que a página. Recarregue a página.');
  if (!Array.isArray(obj.municipios) || !obj.municipios.length) throw new Error('Arquivo de dados sem municípios.');
  const municipios = obj.municipios.map(m => ({ ...m, chave: normStr(m.nome), junto: normStr(m.nome).replace(/ /g, '') }));
  const porIbge = new Map(municipios.map(m => [m.ibge, m]));
  return { ...obj, municipios, porIbge, bahia: somar(municipios, obj.dims, 'Bahia') };
}

export function razao(m) {
  return m.pop > 0 ? m.el / m.pop : NaN;
}

export function porte(m) {
  return PORTES.find(p => m.pop >= p.min && m.pop < p.max) || null;
}

export function somar(lista, dims, nome) {
  const r = { nome, ibge: '', zonas: [], n: lista.length };
  for (const k of ESCALARES) r[k] = 0;
  const vetores = [...Object.keys(dims).filter(k => k !== 'faixa'), 'faixa_f', 'faixa_m', 'faixa_n'];
  for (const k of vetores) r[k] = null;
  const zonas = new Set();
  for (const m of lista) {
    for (const k of ESCALARES) r[k] += m[k] || 0;
    for (const k of vetores) {
      if (!m[k]) continue;
      if (!r[k]) r[k] = m[k].map(() => 0);
      m[k].forEach((v, i) => { r[k][i] += v; });
    }
    (m.zonas || []).forEach(z => zonas.add(z));
  }
  for (const k of vetores) if (!r[k]) r[k] = [];
  r.zonas = [...zonas].sort((a, b) => a - b);
  return r;
}

export function faixaTotal(m) {
  return m.faixa_f.map((v, i) => v + (m.faixa_m[i] || 0) + (m.faixa_n[i] || 0));
}

function indiceFaixas(dims) {
  const f = dims.faixa;
  const i = rotulo => f.indexOf(rotulo);
  const ate = (de, a) => f.slice(i(de), i(a) + 1).map((_, k) => i(de) + k);
  return {
    jovem: ate('16 anos', '17 anos'),
    obrig: ate('18 anos', '65 a 69'),
    idoso: ate('70 a 74', '100 ou mais'),
    sessenta: ate('60 a 64', '100 ou mais'),
    ate24: ate('16 anos', '21 a 24'),
  };
}

const soma = (vet, idx) => idx.reduce((s, i) => s + (vet[i] || 0), 0);

export function indicadores(m, dims) {
  const fx = indiceFaixas(dims);
  const tot = faixaTotal(m);
  const esc = dims.escolaridade;
  const e = rot => m.escolaridade[esc.indexOf(rot)] || 0;
  const gen = rot => m.genero[dims.genero.indexOf(rot)] || 0;
  const div = (a, b) => (b > 0 ? a / b : NaN);
  return {
    razao: razao(m),
    sobra: m.pop - m.el,
    mulheres: div(gen('Feminino'), m.el),
    jovem: div(soma(tot, fx.jovem), m.el),
    ate24: div(soma(tot, fx.ate24), m.el),
    sessenta: div(soma(tot, fx.sessenta), m.el),
    idoso: div(soma(tot, fx.idoso), m.el),
    facultativo: div(soma(tot, fx.jovem) + soma(tot, fx.idoso), m.el),
    baixaEsc: div(e('Analfabeto') + e('Lê e escreve'), m.el),
    analfabeto: div(e('Analfabeto'), m.el),
    superior: div(e('Superior completo'), m.el),
    bio: div(m.bio, m.el),
    def: div(m.def, m.el),
    porSecao: div(m.el, m.secoes),
    porLocal: div(m.el, m.locais),
  };
}

export function distribuicao(valores, rotulos, base = null) {
  const total = valores.reduce((s, v) => s + v, 0);
  const totalBase = base ? base.reduce((s, v) => s + v, 0) : 0;
  return rotulos.map((rotulo, i) => {
    const pct = total > 0 ? valores[i] / total : NaN;
    const pctBase = base && totalBase > 0 ? base[i] / totalBase : NaN;
    return { rotulo, valor: valores[i], pct, pctBase, dif: pct - pctBase };
  });
}

export function semNaoInformado(valores, rotulos) {
  const i = rotulos.indexOf('Não informado');
  if (i < 0) return { valores, rotulos, naoInf: 0 };
  return {
    valores: valores.filter((_, k) => k !== i),
    rotulos: rotulos.filter((_, k) => k !== i),
    naoInf: valores[i],
  };
}

export function filtrarMunicipios(lista, { busca = '', faixa = '', porte: idPorte = '' } = {}) {
  const termo = normStr(busca);
  const junto = termo.replace(/ /g, '');
  const fr = FAIXAS_RAZAO.find(f => f.id === faixa);
  const pt = PORTES.find(p => p.id === idPorte);
  return lista.filter(m =>
    (!termo || m.chave.includes(termo) || m.junto.includes(junto) || m.ibge.includes(termo)) &&
    (!fr || fr.teste(razao(m))) &&
    (!pt || (m.pop >= pt.min && m.pop < pt.max)));
}

export function totais(lista) {
  const pop = lista.reduce((s, m) => s + m.pop, 0);
  const el = lista.reduce((s, m) => s + m.el, 0);
  return { pop, el, razao: pop > 0 ? el / pop : NaN, sobra: pop - el, n: lista.length };
}

export function ordenar(lista, valor, desc) {
  return [...lista].sort((a, b) => {
    const x = valor(a), y = valor(b);
    const r = typeof x === 'number' && typeof y === 'number'
      ? (isNaN(x) ? -Infinity : x) - (isNaN(y) ? -Infinity : y)
      : String(x ?? '').localeCompare(String(y ?? ''), 'pt-BR', { numeric: true });
    return desc ? -r : r;
  });
}

export function recortes(dados) {
  const lista = [{ id: 'BA', grupo: 'Estado', nome: 'Bahia — todos os municípios', municipios: dados.municipios }];
  for (const p of PORTES) {
    const ms = dados.municipios.filter(m => m.pop >= p.min && m.pop < p.max);
    if (ms.length) lista.push({ id: 'porte-' + p.id, grupo: 'Porte', nome: `${p.nome} (${ms.length} municípios)`, municipios: ms });
  }
  for (const m of dados.municipios) lista.push({ id: m.ibge, grupo: 'Município', nome: m.nome, municipios: [m] });
  return lista;
}

export function agregarRecorte(dados, recorte) {
  if (recorte.municipios.length === 1) return { ...recorte.municipios[0], n: 1 };
  if (recorte.id === 'BA') return dados.bahia;
  return somar(recorte.municipios, dados.dims, recorte.nome);
}

export function lerLocais(obj, porIbge) {
  if (!obj || obj.formato !== 'locais-votacao') throw new Error('Arquivo de locais não reconhecido.');
  const c = Object.fromEntries(obj.campos.map((k, i) => [k, i]));
  return obj.linhas.map(r => {
    const m = porIbge.get(r[c.ibge]);
    const el = r[c.el];
    return {
      ibge: r[c.ibge], municipio: m ? m.nome : r[c.ibge], zona: r[c.zona], local: r[c.local],
      nome: r[c.nome], secoes: r[c.secoes], el, bio: r[c.bio], def: r[c.def],
      porSecao: r[c.secoes] > 0 ? el / r[c.secoes] : NaN,
      pctBio: el > 0 ? r[c.bio] / el : NaN,
      chave: normStr(r[c.nome]),
    };
  });
}
