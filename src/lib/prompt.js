// Режим 2 (промпт для Claude) і режим 3 (API) використовують один і той самий промпт.
// Тут: збирання промпту та розбір відповіді моделі.

import { scriptToText } from '../data/winners.js';
import { LIMITS } from './schema.js';
import { normalizeVariant, dedupeByHook } from './variants.js';

export function buildPrompt(winner, count = 20) {
  const m = winner.metrics;
  return `You are a performance creative strategist for SockLock: magnetic socks that never get lost in the wash. Subscription: 5 pairs for $29, then a new delivery every quarter. Audience: US adults, traffic from Meta ads (Reels, Stories, Feed).

WINNING AD
Topic: ${winner.topic}
Metrics: CTR ${m.ctr}%, hook rate ${m.hookRate}%, ROMI ${m.romi}%
Script:
${scriptToText(winner.script)}

TASK
Write ${count} variations of this winning ad for video modifications.
Keep the product promise and the CTA. Change only:
- hook (0–3s, spoken and shown as text)
- first line (3–8s)
- on-screen text (8–15s)
Each variation must use a clearly different angle (question, POV, call-out, stop-doing, before/after, confession, challenge, comparison, curiosity, myth vs fact, listicle, social proof, price filter...).

RULES
- Hook: ${LIMITS.hookWords} words max. On-screen text: ${LIMITS.onScreenWords} words max.
- Plain spoken American English, no hashtags, no emoji.
- No invented statistics, no health or medical claims, no competitor names.
- Must comply with Meta advertising policies (no personal attributes like "Are you depressed?").
- Do not repeat the original hook.

OUTPUT
Return ONLY valid JSON, no markdown, no comments:
{"variants":[{"angle":"","hook":"","first_line":"","on_screen":"","what_changed":""}]}
"what_changed": one short sentence in Ukrainian explaining what differs from the original.`;
}

/**
 * Розбирає відповідь моделі. Терпимий до типових «прикрас» LLM:
 * ```json-обгорток, тексту до і після JSON, масиву замість об'єкта.
 * @returns {{ variants: import('./schema.js').Variant[], errors: string[] }}
 */
export function parseModelResponse(text, { winnerId, source = 'claude', batch = Date.now() } = {}) {
  const errors = [];
  if (!text || !text.trim()) return { variants: [], errors: ['відповідь порожня'] };

  // 1. Прибираємо ```json ... ``` якщо модель їх додала.
  let body = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  // 2. Вирізаємо JSON між першою { або [ і останньою } або ].
  const start = body.search(/[[{]/);
  const end = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'));
  if (start === -1 || end === -1) return { variants: [], errors: ['не знайдено JSON у відповіді'] };
  body = body.slice(start, end + 1);

  let data;
  try {
    data = JSON.parse(body);
  } catch (e) {
    return { variants: [], errors: [`JSON не розбирається: ${e.message}`] };
  }

  // 3. Приймаємо і {"variants":[...]}, і просто [...].
  const list = Array.isArray(data) ? data : data.variants;
  if (!Array.isArray(list)) return { variants: [], errors: ['немає масиву "variants"'] };

  const variants = [];
  list.forEach((raw, i) => {
    const { variant, error } = normalizeVariant(raw, { id: `${winnerId}-${source[0]}${batch}-${i + 1}`, source });
    if (error) errors.push(`варіант ${i + 1}: ${error}`);
    else variants.push(variant);
  });

  const unique = dedupeByHook(variants);
  if (unique.length < variants.length) errors.push(`прибрано дублікатів: ${variants.length - unique.length}`);

  return { variants: unique, errors };
}
