// Експорт брифу і журналу пілоту у файли. Працює повністю в браузері.

import { sortedSegments, fmtTime, wordLimit, STYLES, ALIGNS } from './timeline.js';

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

/** Колонки брифу будуються з розмітки: по колонці на кожен сегмент, у назві — таймкод. */
export function briefColumns(segments) {
  return [
    ['id', (v) => v.id],
    ['winner_name', (v) => v.winnerName],
    ['angle', (v) => v.angle],
    ...sortedSegments(segments).map((s) => [`${s.label} ${fmtTime(s.start)}-${fmtTime(s.end)}`, (v) => v.texts?.[s.id] ?? s.currentText]),
    ['what_changed', (v) => v.whatChanged],
    ['source', (v) => v.source],
  ];
}

/** Розмітка для дизайнера: де й як ставити кожен текст. */
export function markupRows(segments) {
  return sortedSegments(segments).map((s) => ({
    segment: s.label,
    time: `${fmtTime(s.start)}–${fmtTime(s.end)}`,
    position: `x ${s.pos.x}%, y ${s.pos.y}%`,
    style: `${STYLES[s.style]}, ${s.size}, ${ALIGNS[s.align].toLowerCase()}`,
    limit: `${wordLimit(s)} слів`,
  }));
}

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
