import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEED_WINNERS } from '../src/data/winners.js';
import { generateFromTemplates, FORMULAS } from '../src/lib/templates.js';
import { buildPrompt, parseModelResponse } from '../src/lib/prompt.js';

const w1 = SEED_WINNERS[0];

test('шаблони: повертає рівно стільки варіантів, скільки просили', () => {
  assert.equal(generateFromTemplates(w1, 10).length, 10);
  assert.equal(generateFromTemplates(w1, 20).length, 20);
});

test('шаблони: 30 варіантів без дублікатів хуків', () => {
  const v = generateFromTemplates(w1, 30);
  assert.ok(v.length >= 28, `очікували близько 30, отримали ${v.length}`);
  assert.equal(new Set(v.map((x) => x.hook.toLowerCase())).size, v.length);
});

test('шаблони: кожен варіант має всі поля і не повторює хук переможця', () => {
  for (const w of SEED_WINNERS) {
    for (const v of generateFromTemplates(w, 30)) {
      for (const k of ['angle', 'hook', 'firstLine', 'onScreen', 'whatChanged']) assert.ok(v[k], `${v.id}: порожнє ${k}`);
      assert.notEqual(v.hook.toLowerCase(), w.script.hook.toLowerCase());
    }
  }
});

test('шаблони: хуки до 8 слів і текст на екрані до 7 слів у всіх тестових переможців', () => {
  for (const w of SEED_WINNERS) {
    const long = generateFromTemplates(w, 30).filter((v) => v.warnings.length);
    assert.deepEqual(long.map((v) => `${v.hook} | ${v.onScreen} | ${v.warnings}`), [], `${w.id}: порушено ліміт`);
  }
});

test('шаблони: кожна трійка має свою першу фразу (без повторів у наборі)', () => {
  const v = generateFromTemplates(w1, 30);
  assert.equal(new Set(v.map((x) => x.firstLine)).size, v.length);
});

test('шаблони: кожен прийом має рівно 2 повні трійки', () => {
  for (const f of FORMULAS) {
    assert.equal(f.variants.length, 2, f.angle);
    for (const t of f.variants) for (const k of ['hook', 'first', 'onScreen']) assert.equal(typeof t[k], 'function', `${f.angle}.${k}`);
  }
});

test('шаблони: той самий seed дає той самий набір, інший seed — інший порядок', () => {
  const a = generateFromTemplates(w1, 10, 1).map((v) => v.hook);
  const b = generateFromTemplates(w1, 10, 1).map((v) => v.hook);
  const c = generateFromTemplates(w1, 10, 2).map((v) => v.hook);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test('шаблони: перші 10 варіантів — 10 різних кутів', () => {
  const angles = generateFromTemplates(w1, 10).map((v) => v.angle);
  assert.equal(new Set(angles).size, 10);
  assert.ok(FORMULAS.length >= 15);
});

test('промпт: містить скрипт, метрики, кількість і JSON-схему', () => {
  const p = buildPrompt(w1, 25);
  assert.match(p, /Where do all the socks go\?/);
  assert.match(p, /hook rate 38%/);
  assert.match(p, /Write 25 variations/);
  assert.match(p, /"first_line"/);
});

test('розбір: чистий JSON', () => {
  const { variants, errors } = parseModelResponse(
    '{"variants":[{"angle":"POV","hook":"POV: one sock again","first_line":"Every wash.","on_screen":"Pairs stay pairs","what_changed":"POV"}]}',
    { winnerId: 'w1' });
  assert.equal(variants.length, 1);
  assert.equal(variants[0].firstLine, 'Every wash.');
  assert.deepEqual(errors, []);
});

test('розбір: ```json-обгортка і текст навколо', () => {
  const text = 'Here you go:\n```json\n[{"angle":"Q","hook":"Where?","first_line":"x","on_screen":"y","what_changed":"z"}]\n```\nEnjoy!';
  const { variants } = parseModelResponse(text, { winnerId: 'w1' });
  assert.equal(variants.length, 1);
});

test('розбір: поганий варіант не ламає решту, дублікати прибираються', () => {
  const text = JSON.stringify({ variants: [
    { angle: 'A', hook: 'Same hook', first_line: 'a', on_screen: 'b' },
    { angle: 'B', hook: 'same hook!', first_line: 'a', on_screen: 'b' },
    { angle: 'C', hook: '', first_line: 'a', on_screen: 'b' },
  ] });
  const { variants, errors } = parseModelResponse(text, { winnerId: 'w1' });
  assert.equal(variants.length, 1);
  assert.equal(errors.length, 2);
});

test('розбір: зламаний JSON повертає зрозумілу помилку', () => {
  const { variants, errors } = parseModelResponse('{"variants": [ {"hook": ', { winnerId: 'w1' });
  assert.equal(variants.length, 0);
  assert.match(errors[0], /JSON|не знайдено/);
});

test('розбір: довгий хук позначається попередженням', () => {
  const text = JSON.stringify([{ angle: 'A', hook: 'one two three four five six seven eight nine ten', first_line: 'a', on_screen: 'b' }]);
  const { variants } = parseModelResponse(text, { winnerId: 'w1' });
  assert.equal(variants[0].warnings.length, 1);
});
