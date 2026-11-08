// Спільні правила для варіантів з будь-якого джерела: розкладання тексту по сегментах,
// перевірка довжини, дублікати. Використовують і браузер (шаблони, режим Claude), і api/generate.js.

import { wordLimit, defaultTimeline } from './timeline.js';

export const wordCount = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// Сегменти за замовчуванням (0–3 / 3–8 / 8–15 с) — коли розмітки немає.
export const FALLBACK_SEGMENTS = defaultTimeline(null).segments;

/** Попередження про довжину для кожного сегмента: «Хук: 9/6 слів». */
export function checkLimits(texts, segments) {
  const out = [];
  for (const s of segments) {
    const wc = wordCount(texts[s.id]);
    const lim = wordLimit(s);
    if (wc > lim) out.push(`${s.label}: ${wc}/${lim} слів`);
  }
  return out;
}

/**
 * Перетворює сирий об'єкт від LLM або шаблонів у Variant з текстом для КОЖНОГО сегмента.
 * Приймає два формати:
 *   новий:  { angle, texts: { hook: "...", onScreen: "..." }, what_changed }
 *   старий: { angle, hook, first_line, on_screen, cta } — розкладаємо по типах сегментів
 * Сегмент без нового тексту лишається з текстом переможця і позначається як незмінений.
 * Повертає { variant } або { error }, щоб один поганий варіант не зламав увесь список.
 */
export function normalizeVariant(raw, { id, source, segments = FALLBACK_SEGMENTS }) {
  if (!raw || typeof raw !== 'object') return { error: 'варіант не є об\'єктом' };

  const legacy = { hook: raw.hook, firstLine: raw.first_line ?? raw.firstLine, onScreen: raw.on_screen ?? raw.onScreen, cta: raw.cta };
  const map = raw.texts && typeof raw.texts === 'object' ? raw.texts : {};
  const usedType = new Set();
  const texts = {};
  const unchanged = [];

  for (const s of segments) {
    let v = map[s.id];
    // старе поле (hook, first_line...) заповнює перший сегмент свого типу
    if (v == null && !usedType.has(s.type)) v = legacy[s.type];
    usedType.add(s.type);
    v = clean(v);
    if (!v) { v = s.currentText; unchanged.push(s.id); }
    texts[s.id] = v;
  }

  const hookSeg = segments.find((s) => s.type === 'hook');
  if (hookSeg && unchanged.includes(hookSeg.id)) return { error: 'бракує тексту хука' };
  if (unchanged.length === segments.length) return { error: 'жоден сегмент не змінено' };

  return {
    variant: {
      id,
      source,
      angle: clean(raw.angle) || 'Варіант',
      whatChanged: clean(raw.what_changed ?? raw.whatChanged),
      texts,
      hook: texts[(hookSeg || segments[0]).id],
      unchanged,
      // Довжину не відкидаємо, а позначаємо: дизайнер сам вирішить, чи скоротити.
      // Незмінені сегменти (текст переможця) не перевіряємо — це не нова пропозиція.
      warnings: checkLimits(texts, segments.filter((s) => !unchanged.includes(s.id))),
    },
  };
}

/** Прибирає варіанти з однаковим хуком (без урахування регістру й розділових знаків). */
export function dedupeByHook(variants) {
  const seen = new Set();
  return variants.filter((v) => {
    const key = v.hook.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
