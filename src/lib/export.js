// Експорт брифу і журналу пілоту у файли. Працює повністю в браузері.

/** Екранує значення для CSV: лапки подвоюються, усе береться в лапки. */
const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/**
 * @param {object[]} rows
 * @param {[string, (row:object)=>any][]} columns  [назва колонки, як дістати значення]
 */
export function toCsv(rows, columns) {
  const head = columns.map(([name]) => cell(name)).join(',');
  const body = rows.map((r) => columns.map(([, get]) => cell(get(r))).join(','));
  return [head, ...body].join('\n');
}

// Колонки брифу для дизайнера.
export const BRIEF_COLUMNS = [
  ['id', (v) => v.id],
  ['winner_id', (v) => v.winnerId],
  ['winner_name', (v) => v.winnerName],
  ['angle', (v) => v.angle],
  ['hook_0_3s', (v) => v.hook],
  ['first_line_3_8s', (v) => v.firstLine],
  ['on_screen_8_15s', (v) => v.onScreen],
  ['what_changed', (v) => v.whatChanged],
  ['source', (v) => v.source],
];

// Колонки журналу пілоту: з них рахуємо метрики успіху.
export const SESSION_COLUMNS = [
  ['designer', (s) => s.designer],
  ['winner', (s) => s.winnerName],
  ['source', (s) => s.source],
  ['generated', (s) => s.generated],
  ['approved', (s) => s.approved],
  ['approve_rate_pct', (s) => (s.generated ? Math.round((s.approved / s.generated) * 100) : 0)],
  ['active_minutes', (s) => (s.activeSec / 60).toFixed(1)],
  ['started_at', (s) => new Date(s.startedAt).toISOString()],
  ['finished_at', (s) => new Date(s.finishedAt).toISOString()],
];

/** Віддає текст браузеру як файл для завантаження. */
export function download(filename, text, type = 'text/csv') {
  // BOM (﻿) потрібен, щоб Excel правильно відкрив UTF-8 (кирилицю, тире).
  const blob = new Blob([type === 'text/csv' ? '﻿' + text : text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const formatDuration = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};
