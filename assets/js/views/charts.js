import { formatInt, formatPct } from '../core/format.js';

function cssVar(nome) {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
}

export function tema() {
  return {
    series: [1, 2, 3, 4].map(i => cssVar(`--series-${i}`)),
    other: cssVar('--series-other'),
    text: cssVar('--chart-text'),
    grid: cssVar('--chart-grid'),
    surface: cssVar('--bg-1'),
    ink: cssVar('--text-0'),
    border: cssVar('--border'),
  };
}

export function opcoes({ valor = 'int', horizontal = false, empilhado = false, legenda = true, absoluto = false, tooltip = null } = {}) {
  const t = tema();
  const f = valor === 'pct' ? v => formatPct(v, 1) : formatInt;
  const eixo = v => f(absoluto ? Math.abs(v) : v);
  const valorAxis = {
    stacked: empilhado,
    beginAtZero: true,
    grid: { color: t.grid, drawTicks: false },
    border: { display: false },
    ticks: { color: t.text, font: { size: 11 }, padding: 6, callback: eixo },
  };
  const catAxis = {
    stacked: empilhado,
    grid: { display: false },
    border: { color: t.grid },
    ticks: { color: t.text, font: { size: 11 }, autoSkip: false, maxRotation: 0 },
  };
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    interaction: { mode: 'index', intersect: false, axis: horizontal ? 'y' : 'x' },
    animation: { duration: 250 },
    plugins: {
      legend: {
        display: legenda,
        position: 'top',
        align: 'start',
        labels: { color: t.text, boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 2, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: t.surface,
        borderColor: t.border,
        borderWidth: 1,
        titleColor: t.ink,
        bodyColor: t.ink,
        padding: 10,
        boxPadding: 4,
        callbacks: {
          label: tooltip || (ctx => {
            const v = horizontal ? ctx.parsed.x : ctx.parsed.y;
            return ` ${ctx.dataset.label}: ${eixo(v)}`;
          }),
        },
      },
    },
    scales: horizontal ? { x: valorAxis, y: catAxis } : { x: catAxis, y: valorAxis },
  };
}

export function barras(label, data, cor, extra = {}) {
  return {
    label, data,
    backgroundColor: cor,
    borderColor: tema().surface,
    borderWidth: 0,
    borderRadius: 4,
    borderSkipped: 'start',
    maxBarThickness: 26,
    categoryPercentage: 0.82,
    barPercentage: 0.92,
    ...extra,
  };
}

export function criar(canvas, config) {
  if (typeof window.Chart === 'undefined' || !canvas) return null;
  return new window.Chart(canvas.getContext('2d'), config);
}
