import { escapeHtml, normStr, formatInt } from '../core/format.js';
import { ordenar } from '../core/indicadores.js';
import { downloadCSV } from './download.js';

export function tabela(el, { colunas, linhas, csv = null, porPagina = 50, ordem = null, filtros = '', filtrar = null, atual = null, vazio = 'Nada para mostrar.', aoClicar = null }) {
  const S = { busca: '', pagina: 1, col: ordem ? ordem.col : '', desc: ordem ? !!ordem.desc : false };
  const texto = new Map(linhas.map(l => [l, normStr(colunas.filter(c => c.busca !== false).map(c => c.v(l)).join(' '))]));

  el.innerHTML = `
    <div class="tb-barra">
      <input type="search" class="filter-input tb-busca" placeholder="Buscar nesta lista..." autocomplete="off" />
      ${filtros}
      <span class="tb-info"></span>
      ${csv ? '<button type="button" class="btn-ghost tb-csv">&#8681; Exportar CSV</button>' : ''}
    </div>
    <div class="table-wrapper"><table><thead></thead><tbody></tbody></table></div>
    <div class="tb-pag"></div>`;
  const q = s => el.querySelector(s);

  function visiveis() {
    const termo = normStr(S.busca);
    let lista = linhas;
    if (filtrar) lista = lista.filter(l => filtrar(l, el));
    if (termo) lista = lista.filter(l => texto.get(l).includes(termo));
    const c = colunas.find(x => x.id === S.col);
    return c ? ordenar(lista, c.v, S.desc) : lista;
  }

  function desenhar() {
    const lista = visiveis();
    const paginas = Math.max(1, Math.ceil(lista.length / porPagina));
    S.pagina = Math.min(S.pagina, paginas);
    const trecho = lista.slice((S.pagina - 1) * porPagina, S.pagina * porPagina);

    q('thead').innerHTML = `<tr>${colunas.map(c =>
      `<th class="th-sortable${c.num ? ' num' : ''}${S.col === c.id ? (S.desc ? ' sort-desc' : ' sort-asc') : ''}" data-col="${c.id}"${c.dica ? ` title="${escapeHtml(c.dica)}"` : ''}>${escapeHtml(c.t)}</th>`).join('')}</tr>`;
    q('tbody').innerHTML = trecho.length ? trecho.map(l => {
      const cls = [aoClicar ? 'linha-clicavel' : '', atual && atual(l) ? 'linha-atual' : ''].filter(Boolean).join(' ');
      return `<tr data-i="${linhas.indexOf(l)}"${cls ? ` class="${cls}"` : ''}>${colunas.map(c =>
        `<td class="${c.num ? 'num' : ''}">${c.html ? c.html(l) : escapeHtml(c.f ? c.f(c.v(l)) : c.v(l) ?? '')}</td>`).join('')}</tr>`;
    }).join('') : `<tr><td colspan="${colunas.length}" class="tb-vazio">${escapeHtml(vazio)}</td></tr>`;

    q('.tb-info').textContent = lista.length === linhas.length
      ? `${formatInt(linhas.length)} registro(s)`
      : `${formatInt(lista.length)} de ${formatInt(linhas.length)} registro(s)`;
    q('.tb-pag').innerHTML = paginas > 1 ? `
      <button type="button" class="btn-page" data-p="-1"${S.pagina === 1 ? ' disabled' : ''}>&#8592; Anterior</button>
      <span class="page-indicator">Página ${S.pagina} de ${paginas}</span>
      <button type="button" class="btn-page" data-p="1"${S.pagina === paginas ? ' disabled' : ''}>Próxima &#8594;</button>` : '';
  }

  q('.tb-busca').addEventListener('input', e => { S.busca = e.target.value; S.pagina = 1; desenhar(); });
  el.querySelectorAll('.tb-barra select').forEach(s => s.addEventListener('change', () => { S.pagina = 1; desenhar(); }));
  q('thead').addEventListener('click', e => {
    const th = e.target.closest('th[data-col]');
    if (!th) return;
    const c = colunas.find(x => x.id === th.dataset.col);
    S.desc = S.col === c.id ? !S.desc : !!c.num;
    S.col = c.id;
    desenhar();
  });
  q('tbody').addEventListener('click', e => {
    if (!aoClicar || e.target.closest('a, button')) return;
    const tr = e.target.closest('tr[data-i]');
    if (tr) aoClicar(linhas[Number(tr.dataset.i)]);
  });
  q('.tb-pag').addEventListener('click', e => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    S.pagina += Number(b.dataset.p);
    desenhar();
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  if (csv) {
    q('.tb-csv').addEventListener('click', () => {
      downloadCSV(csv.arquivo, colunas.map(c => c.t), visiveis().map(l => colunas.map(c => (c.csv ? c.csv(l) : c.v(l)))));
    });
  }
  desenhar();
  return { desenhar };
}
