// Тести функції api/generate.js без реального API: підміняємо fetch і об'єкти req/res.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import handler, { validateInput } from '../api/generate.js';
import { SEED_WINNERS } from '../src/data/winners.js';

// Імітація відповіді Vercel: res.status(...).json(...)
function mockRes() {
  const res = { statusCode: 0, body: null, headers: {} };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  return res;
}

const llmReply = (text) => async () => ({
  ok: true,
  json: async () => ({ model: 'claude-sonnet-5-5', content: [{ type: 'text', text }], usage: { input_tokens: 900, output_tokens: 700 } }),
});

beforeEach(() => { delete process.env.ANTHROPIC_API_KEY; });

test('GET без ключа: available = false', async () => {
  const res = mockRes();
  await handler({ method: 'GET' }, res);
  assert.equal(res.body.available, false);
});

test('POST без ключа: 503 і підказка про режим Claude', async () => {
  const res = mockRes();
  await handler({ method: 'POST', body: { winner: SEED_WINNERS[0], count: 10 } }, res);
  assert.equal(res.statusCode, 503);
  assert.match(res.body.error, /Промпт для Claude/);
});

test('валідація: count поза 1–30 і зламаний winner', () => {
  assert.match(validateInput({ winner: SEED_WINNERS[0], count: 50 }), /count/);
  assert.match(validateInput({ winner: { id: 'x' }, count: 5 }), /topic/);
  assert.equal(validateInput({ winner: SEED_WINNERS[0], count: 20 }), null);
});

test('POST з ключем: відповідь моделі розбирається у варіанти', async () => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  let sent;
  const fetchImpl = async (url, opts) => { sent = { url, opts }; return llmReply('```json\n{"variants":[{"angle":"POV","hook":"POV: one sock again","first_line":"Every wash.","on_screen":"Pairs stay pairs","what_changed":"новий кут"}]}\n```')(); };
  const res = mockRes();
  await handler({ method: 'POST', body: { winner: SEED_WINNERS[0], count: 10 } }, res, { fetchImpl });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.variants.length, 1);
  assert.equal(res.body.variants[0].source, 'api');
  assert.equal(sent.opts.headers['x-api-key'], 'test-key');
  assert.match(JSON.parse(sent.opts.body).messages[0].content, /Write 10 variations/);
});

test('POST: помилка LLM API повертає 502', async () => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  const fetchImpl = async () => ({ ok: false, status: 429, text: async () => 'rate limited' });
  const res = mockRes();
  await handler({ method: 'POST', body: { winner: SEED_WINNERS[0], count: 10 } }, res, { fetchImpl });
  assert.equal(res.statusCode, 502);
  assert.match(res.body.error, /429/);
});
