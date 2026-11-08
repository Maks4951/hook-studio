import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_WINNERS } from '../src/data/winners.js';
import { defaultTimeline, fitToDuration, wordLimit, makeSegment, clampSegment, validateTimeline, nextSegmentId } from '../src/lib/timeline.js';
import { generateFromTemplates } from '../src/lib/templates.js';
import { buildPrompt, parseModelResponse } from '../src/lib/prompt.js';

const w1 = SEED_WINNERS[0];

test('стандартна розмітка 15 с: 0–3 / 3–8 / 8–15 з текстами переможця', () => {
  const tl = defaultTimeline(w1);
  assert.deepEqual(tl.segments.map((s) => [s.id, s.start, s.end]), [['hook', 0, 3], ['firstLine', 3, 8], ['onScreen', 8, 15]]);
  assert.equal(tl.segments[0].currentText, w1.script.hook);
});

test('ліміт слів рахується з тривалості: хук 2,4 с → 6 слів, текст на екрані не більше 7', () => {
  assert.equal(wordLimit(makeSegment('hook', 0, 2.4)), 6);
  assert.equal(wordLimit(makeSegment('onScreen', 0, 10)), 7);
  assert.equal(wordLimit(makeSegment('hook', 0, 0.5)), 2);
});

test('автоматична розмітка масштабується під справжню тривалість, ручна — обрізається', () => {
  const auto = fitToDuration(defaultTimeline(w1), w1, 22);
  assert.equal(auto.duration, 22);
  assert.equal(auto.segments.at(-1).end, 22);
  const manual = { ...defaultTimeline(w1), edited: true };
  const cut = fitToDuration(manual, w1, 10);
  assert.ok(cut.segments.every((s) => s.end <= 10 && s.end - s.start >= 0.5));
  assert.equal(cut.edited, true);
});

test('clampSegment не дає вийти за межі відео і зробити сегмент коротшим за 0,5 с', () => {
  assert.deepEqual([clampSegment({ start: -2, end: 0.1 }, 15).start, clampSegment({ start: -2, end: 0.1 }, 15).end], [0, 0.5]);
  assert.equal(clampSegment({ start: 14.9, end: 20 }, 15).end, 15);
});

test('nextSegmentId: другий CTA отримує id cta2', () => {
  const segs = [makeSegment('cta', 0, 1)];
  assert.equal(nextSegmentId(segs, 'cta'), 'cta2');
  assert.equal(nextSegmentId(segs, 'custom'), 'custom');
});

test('шаблони під короткий хук: варіанти, що вміщаються, йдуть першими', () => {
  const segs = [makeSegment('hook', 0, 2, 'x'), makeSegment('firstLine', 2, 6, 'y'), makeSegment('onScreen', 8, 12, 'z')];
  const v = generateFromTemplates(w1, 30, 1, segs);
  const firstLong = v.findIndex((x) => x.warnings.length);
  assert.ok(firstLong > 0, 'має бути хоч кілька коротких');
  assert.ok(v.slice(firstLong).every((x) => x.warnings.length), 'після першого задовгого — лише задовгі');
});

test('шаблони не чіпають CTA: лишається текст переможця і позначка unchanged', () => {
  const segs = [...defaultTimeline(w1).segments, makeSegment('cta', 13, 15, w1.script.cta)];
  const [v] = generateFromTemplates(w1, 1, 1, segs);
  assert.equal(v.texts.cta, w1.script.cta);
  assert.deepEqual(v.unchanged, ['cta']);
});

test('промпт описує кожен сегмент розмітки з часом і лімітом', () => {
  const tl = { duration: 20, edited: true, segments: [makeSegment('hook', 0, 2.4, 'Where?'), makeSegment('cta', 17, 20, 'Take the quiz')] };
  const p = buildPrompt(w1, 10, tl);
  assert.match(p, /VIDEO TIMELINE \(20\.0s\)/);
  assert.match(p, /"hook" \| .* \| 0\.0–2\.4s \(2\.4s\) \| max 6 words \| current: "Where\?"/);
  assert.match(p, /"cta" \| call to action/);
  assert.match(p, /"texts":\{"hook":"","cta":""\}/);
});

test('розбір нового формату texts під розмітку відео', () => {
  const segs = [makeSegment('hook', 0, 2.4, 'Where?'), makeSegment('cta', 17, 20, 'Take the quiz')];
  const text = JSON.stringify({ variants: [{ angle: 'POV', texts: { hook: 'POV: one sock left', cta: 'Get 5 pairs for $29' }, what_changed: 'x' }] });
  const { variants, errors } = parseModelResponse(text, { winnerId: 'w1', segments: segs });
  assert.deepEqual(errors, []);
  assert.deepEqual(variants[0].texts, { hook: 'POV: one sock left', cta: 'Get 5 pairs for $29' });
});

test('validateTimeline відкидає зламану розмітку', () => {
  assert.equal(validateTimeline(defaultTimeline(w1)), null);
  assert.match(validateTimeline({ duration: 15, segments: [] }), /сегментів/);
  assert.match(validateTimeline({ duration: 15, segments: [{ id: 'x y', type: 'hook', start: 0, end: 1 }] }), /id/);
  assert.match(validateTimeline({ duration: 15, segments: [{ id: 'h', type: 'hook', start: 5, end: 2 }] }), /час/);
});

test('незмінений сегмент (текст переможця) не дає попередження про довжину', () => {
  const segs = [makeSegment('hook', 0, 3, 'x'), makeSegment('cta', 13, 15, 'Take the 60-second quiz and get 5 pairs for $29 today')];
  const [v] = generateFromTemplates(w1, 1, 1, segs);
  assert.deepEqual(v.unchanged, ['cta']);
  assert.deepEqual(v.warnings, []);
});
