const INT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const DEC = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatInt(n) {
  return n == null || isNaN(n) ? '—' : INT.format(n);
}

export function formatDec(n) {
  return n == null || isNaN(n) ? '—' : DEC.format(n);
}

export function formatPct(v, casas = 1) {
  if (v == null || !isFinite(v)) return '—';
  return (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + '%';
}

export function formatPp(v) {
  if (v == null || !isFinite(v)) return '—';
  const n = v * 100;
  const s = Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (n > 0.05 ? '+' : n < -0.05 ? '−' : '') + s + ' p.p.';
}

export function normStr(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function numCSV(v, casas = 2) {
  return v == null || !isFinite(v) ? '' : v.toFixed(casas).replace('.', ',');
}

export function linhasCSV(cabecalho, linhas) {
  const q = v => {
    const s = String(v == null ? '' : v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cabecalho.map(q).join(';')].concat(linhas.map(r => r.map(q).join(';'))).join('\r\n');
}
