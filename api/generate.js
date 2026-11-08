// Режим 3: генерація через LLM API. Це Node.js-функція Vercel:
// файл api/generate.js автоматично стає ендпоінтом /api/generate.
//
// GET  /api/generate  → { available: true|false, model }  — чи налаштований ключ (інтерфейс вмикає/вимикає режим)
// POST /api/generate  → { variants, errors }               — тіло: { winner, count }
//
// Ключ живе лише на сервері (змінна оточення ANTHROPIC_API_KEY) і ніколи не потрапляє в браузер.

import { buildPrompt, parseModelResponse } from '../src/lib/prompt.js';

export const config = { maxDuration: 60 }; // генерація 20–30 варіантів може тривати 15–30 с

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

// Мінімальна перевірка вхідних даних: не довіряємо тому, що прийшло з браузера.
export function validateInput(body) {
  const { winner, count } = body || {};
  if (!winner || typeof winner !== 'object') return 'немає winner';
  for (const k of ['id', 'topic', 'script', 'metrics']) if (!winner[k]) return `winner.${k} відсутнє`;
  for (const k of ['hook', 'firstLine', 'onScreen']) if (typeof winner.script[k] !== 'string') return `winner.script.${k} має бути рядком`;
  const n = Number(count);
  if (!Number.isInteger(n) || n < 1 || n > 30) return 'count має бути цілим числом від 1 до 30';
  return null;
}

export default async function handler(req, res, { fetchImpl = fetch } = {}) {
  const key = process.env.ANTHROPIC_API_KEY;

  if (req.method === 'GET') {
    return res.status(200).json({ available: Boolean(key), model: MODEL() });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'метод не підтримується' });
  }
  if (!key) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY не налаштований. Скористайтеся режимом «Промпт для Claude».' });
  }

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
  const invalid = validateInput(body);
  if (invalid) return res.status(400).json({ error: invalid });

  const { winner } = body;
  const count = Number(body.count);

  // Обмежуємо час очікування, щоб функція не зависла до ліміту Vercel.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55_000);

  try {
    const r = await fetchImpl(API_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL(),
        max_tokens: 4000, // 30 варіантів × ~100 токенів з запасом
        messages: [{ role: 'user', content: buildPrompt(winner, count) }],
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return res.status(502).json({ error: `LLM API відповів ${r.status}`, detail: detail.slice(0, 300) });
    }

    const data = await r.json();
    // Відповідь Anthropic: { content: [{ type: 'text', text: '...' }], usage: {...} }
    const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    const { variants, errors } = parseModelResponse(text, { winnerId: winner.id, source: 'api' });

    return res.status(200).json({ variants, errors, model: data.model, usage: data.usage });
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'LLM API не відповів за 55 с' : `помилка запиту: ${e.message}`;
    return res.status(504).json({ error: msg });
  } finally {
    clearTimeout(timer);
  }
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}
