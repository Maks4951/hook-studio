// Таймлайн відео: де в ролику звучить/з'являється кожен текст, де він стоїть у кадрі і яким стилем.
// Розмітка робиться один раз на переможця і далі керує генерацією, прев'ю та брифом.

/**
 * @typedef {Object} Segment
 * @property {string} id         стабільний id: 'hook', 'firstLine', 'onScreen', 'cta', 'custom2'...
 * @property {'hook'|'firstLine'|'onScreen'|'cta'|'custom'} type
 * @property {string} label      назва для людей
 * @property {number} start      секунди (крок 0,1)
 * @property {number} end
 * @property {string} currentText що там зараз у переможці
 * @property {{x:number, y:number}} pos  центр тексту у % від кадру
 * @property {'card'|'subtitle'|'badge'} style
 * @property {'S'|'M'|'L'} size
 * @property {'left'|'center'|'right'} align
 *
 * @typedef {Object} Timeline
 * @property {number} duration
 * @property {boolean} edited    false — розмітка автоматична і масштабується під тривалість відео
 * @property {Segment[]} segments
 */

// rate — слів за секунду: мова ~2,5 слова/с, текст на екрані читають повільніше (~2 слова/с).
// cap — верхня межа незалежно від тривалості (довгий текст на екрані ніхто не дочитає).
export const SEGMENT_TYPES = {
  hook:      { label: 'Хук',             rate: 2.5, cap: 10, pos: { x: 50, y: 22 }, style: 'card',     size: 'L' },
  firstLine: { label: 'Перша фраза',     rate: 2.5, cap: 16, pos: { x: 50, y: 72 }, style: 'subtitle', size: 'M' },
  onScreen:  { label: 'Текст на екрані', rate: 2.0, cap: 7,  pos: { x: 50, y: 45 }, style: 'badge',    size: 'M' },
  cta:       { label: 'CTA',             rate: 2.5, cap: 10, pos: { x: 50, y: 62 }, style: 'badge',    size: 'M' },
  custom:    { label: 'Свій текст',      rate: 2.0, cap: 10, pos: { x: 50, y: 50 }, style: 'card',     size: 'M' },
};

export const STYLES = { card: 'Біла плашка', subtitle: 'Субтитр', badge: 'Жовтий бейдж' };
export const SIZES = ['S', 'M', 'L'];
export const ALIGNS = { left: 'Ліворуч', center: 'Центр', right: 'Праворуч' };
export const SNAP_Y = { top: 18, middle: 50, bottom: 74 };

export const DEFAULT_DURATION = 15;
export const MIN_SEG = 0.5;

export const r1 = (x) => Math.round(x * 10) / 10;

/** 0:02.4 */
export const fmtTime = (s) => {
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`;
};

/** Скільки слів вміщається в сегмент. */
export function wordLimit(seg) {
  const t = SEGMENT_TYPES[seg.type] || SEGMENT_TYPES.custom;
  return Math.max(2, Math.min(t.cap, Math.round((seg.end - seg.start) * t.rate)));
}

export function makeSegment(type, start, end, currentText = '', id = type) {
  const t = SEGMENT_TYPES[type] || SEGMENT_TYPES.custom;
  return { id, type, label: t.label, start: r1(start), end: r1(end), currentText, pos: { ...t.pos }, style: t.style, size: t.size, align: 'center' };
}

/**
 * Автоматична стартова розмітка: хук — перші 20% ролика, перша фраза — до 53%, текст на екрані — до кінця.
 * Для 15-секундного ролика це рівно 0–3 / 3–8 / 8–15 с.
 */
export function defaultTimeline(winner, duration = DEFAULT_DURATION) {
  const d = duration;
  const s = winner?.script || {};
  return {
    duration: r1(d),
    edited: false,
    segments: [
      makeSegment('hook', 0, 0.2 * d, s.hook || ''),
      makeSegment('firstLine', 0.2 * d, (8 / 15) * d, s.firstLine || ''),
      makeSegment('onScreen', (8 / 15) * d, d, s.onScreen || ''),
    ],
  };
}

/** Розмітка переможця: збережена користувачем → вбудована → автоматична. */
export function getTimeline(winner, overrides = {}) {
  return overrides[winner.id] || winner.timeline || defaultTimeline(winner);
}

export function clampSegment(seg, duration) {
  const start = Math.max(0, Math.min(seg.start, duration - MIN_SEG));
  const end = Math.max(start + MIN_SEG, Math.min(seg.end, duration));
  return { ...seg, start: r1(start), end: r1(end) };
}

/** Коли дізналися справжню тривалість відео: автоматичну розмітку перебудовуємо, ручну — обрізаємо. */
export function fitToDuration(timeline, winner, duration) {
  if (!timeline.edited) return defaultTimeline(winner, duration);
  return { ...timeline, duration: r1(duration), segments: timeline.segments.map((s) => clampSegment(s, duration)) };
}

export const sortedSegments = (segs) => [...segs].sort((a, b) => a.start - b.start || a.end - b.end);

export function nextSegmentId(segments, type) {
  const ids = new Set(segments.map((s) => s.id));
  if (!ids.has(type)) return type;
  let n = 2;
  while (ids.has(`${type}${n}`)) n++;
  return `${type}${n}`;
}

/** Перевірка розмітки, що прийшла ззовні (API): не довіряємо браузеру. */
export function validateTimeline(tl) {
  if (!tl || typeof tl !== 'object') return 'timeline не є об\'єктом';
  if (!(tl.duration > 0 && tl.duration <= 600)) return 'timeline.duration має бути від 0 до 600 с';
  if (!Array.isArray(tl.segments) || tl.segments.length < 1 || tl.segments.length > 10) return 'timeline.segments: від 1 до 10 сегментів';
  for (const s of tl.segments) {
    if (typeof s.id !== 'string' || !/^[a-zA-Z0-9]{1,20}$/.test(s.id)) return 'некоректний id сегмента';
    if (!SEGMENT_TYPES[s.type]) return `невідомий тип сегмента: ${s.type}`;
    if (!(s.end > s.start && s.start >= 0 && s.end <= tl.duration + 0.05)) return `сегмент ${s.id}: некоректний час`;
  }
  return null;
}
