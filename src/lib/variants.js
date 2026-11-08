// Спільні правила для варіантів з будь-якого джерела: нормалізація, перевірка довжини, дублікати.
// Цей файл використовують і браузер (шаблони, режим Claude), і Node-функція api/generate.js.

import { LIMITS } from './schema.js';

export const wordCount = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/**
 * Перетворює сирий об'єкт (snake_case від LLM або camelCase від шаблонів) у Variant.
 * Повертає { variant } або { error }, щоб один поганий варіант не зламав увесь список.
 */
export function normalizeVariant(raw, { id, source }) {
  if (!raw || typeof raw !== 'object') return { error: 'варіант не є об\'єктом' };

  const v = {
    id,
    source,
    angle: clean(raw.angle),
    hook: clean(raw.hook),
    firstLine: clean(raw.first_line ?? raw.firstLine),
    onScreen: clean(raw.on_screen ?? raw.onScreen),
    whatChanged: clean(raw.what_changed ?? raw.whatChanged),
  };

  const missing = ['angle', 'hook', 'firstLine', 'onScreen'].filter((k) => !v[k]);
  if (missing.length) return { error: `бракує полів: ${missing.join(', ')}` };

  // Довжину не відкидаємо, а позначаємо: дизайнер сам вирішить, чи скоротити.
  v.warnings = [];
  if (wordCount(v.hook) > LIMITS.hookWords) v.warnings.push(`хук довший за ${LIMITS.hookWords} слів`);
  if (wordCount(v.onScreen) > LIMITS.onScreenWords) v.warnings.push(`текст на екрані довший за ${LIMITS.onScreenWords} слів`);

  return { variant: v };
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
