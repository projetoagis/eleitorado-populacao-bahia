import { linhasCSV } from '../core/format.js';

export function downloadCSV(arquivo, cabecalho, linhas) {
  const blob = new Blob(['\uFEFF' + linhasCSV(cabecalho, linhas)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = arquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
