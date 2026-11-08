// Режим 2 (промпт для Claude) і режим 3 (API) використовують один і той самий промпт.
// Тут: збирання промпту під розмітку конкретного відео та розбір відповіді моделі.

import { scriptToText } from '../data/winners.js';
import { getTimeline, sortedSegments, wordLimit } from './timeline.js';
import { normalizeVariant, dedupeByHook, FALLBACK_SEGMENTS } from './variants.js';

const ROLE = {
  hook: 'hook — spoken and shown as big text, must stop the scroll',
  firstLine: 'first line — spoken, continues the hook',
  onScreen: 'on-screen text — read silently, short and punchy',
  cta: 'call to action — keep the offer, change the wording',
  custom: 'extra text overlay',
};

/** Рядки таймлайну для промпту: id, роль, час, ліміт слів, поточний текст. */
export function timelineLines(segments) {
  return sortedSegments(segments).map((s) =>
    `- "${s.id}" | ${ROLE[s.type] || ROLE.custom} | ${s.start.toFixed(1)}–${s.end.toFixed(1)}s (${(s.end - s.start).toFixed(1)}s) | max ${wordLimit(s)} words | current: "${s.currentText}"`
  ).join('\n');
}

export function buildPrompt(winner, count = 20, timeline = getTimeline(winner)) {
  const m = winner.metrics;
  const segs = sortedSegments(timeline.segments);
  const example = Object.fromEntries(segs.map((s) => [s.id, '']));
  return `You are a performance creative strategist for SockLock: magnetic socks that never get lost in the wash. Subscription: 5 pairs for $29, then a new delivery every quarter. Audience: US adults, traffic from Meta ads (Reels, Stories, Feed).

WINNING AD
Topic: ${winner.topic}
Metrics: CTR ${m.ctr}%, hook rate ${m.hookRate}%, ROMI ${m.romi}%
Script:
${scriptToText(winner.script)}

VIDEO TIMELINE (${timeline.duration.toFixed(1)}s). Each segment is a text slot in this exact video:
${timelineLines(segs)}

TASK
Write ${count} variations of this winning ad for video modifications.
For every variation write new text for EVERY segment above, so the segments read as one story.
Keep the product promise and the offer. Each variation must use a clearly different angle
(question, POV, call-out, stop-doing, before/after, confession, challenge, comparison, curiosity, myth vs fact, listicle, social proof, price filter...).

RULES
- Respect "max N words" for each segment: the text must fit the segment duration.
- Plain spoken American English, no hashtags, no emoji.
- No invented statistics, no health or medical claims, no competitor names.
- Must comply with Meta advertising policies (no personal attributes like "Are you depressed?").
- Do not repeat the original hook.

OUTPUT
Return ONLY valid JSON, no markdown, no comments:
{"variants":[{"angle":"","texts":${JSON.stringify(example)},"what_changed":""}]}
"what_changed": one short sentence in Ukrainian explaining what differs from the original.`;
}

/**
 * Розбирає відповідь моделі. Терпимий до типових «прикрас» LLM:
 * ```json-обгорток, тексту до і після JSON, масиву замість об'єкта.
 * @returns {{ variants: import('./schema.js').Variant[], errors: string[] }}
 */
export function parseModelResponse(text, { winnerId, source = 'claude', batch = Date.now(), segments = FALLBACK_SEGMENTS } = {}) {
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
    const { variant, error } = normalizeVariant(raw, { id: `${winnerId}-${source[0]}${batch}-${i + 1}`, source, segments });
    if (error) errors.push(`варіант ${i + 1}: ${error}`);
    else variants.push(variant);
  });

  const unique = dedupeByHook(variants);
  if (unique.length < variants.length) errors.push(`прибрано дублікатів: ${variants.length - unique.length}`);

  const partial = unique.filter((v) => v.unchanged.length).length;
  if (partial) errors.push(`у ${partial} варіантах частина сегментів без нового тексту — лишився текст переможця`);

  return { variants: unique, errors };
}
