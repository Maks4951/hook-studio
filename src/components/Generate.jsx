import { useState } from 'react';
import { scriptToText } from '../data/winners.js';
import { generateFromTemplates } from '../lib/templates.js';
import { buildPrompt, parseModelResponse } from '../lib/prompt.js';
import { sortedSegments, wordLimit, fmtTime } from '../lib/timeline.js';

const MODES = [
  { key: 'templates', title: 'Шаблони формул', desc: 'Працює одразу, без LLM і без інтернету.', badge: 'Без LLM' },
  { key: 'claude', title: 'Промпт для Claude', desc: 'Копіюєте промпт у Claude, вставляєте JSON-відповідь назад.', badge: 'Без API' },
  { key: 'api', title: 'API', desc: 'Генерація одним кліком через ключ на сервері.', badge: 'Потрібен ключ' },
];

// Екран 2: вхід (скрипт переможця) і вибір режиму генерації.
export default function Generate({ winner, timeline, apiAvailable, mode, setMode, count, setCount, onGenerated, onEditMarkup }) {
  const [pasted, setPasted] = useState('');
  const [errors, setErrors] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const segments = sortedSegments(timeline.segments);
  const prompt = buildPrompt(winner, count, timeline);

  const fromTemplates = () => {
    // Новий seed щоразу — інший порядок прийомів при повторній генерації.
    onGenerated(generateFromTemplates(winner, count, Date.now() % 100000, timeline.segments), 'templates');
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrors(['Браузер не дав доступ до буфера. Виділіть промпт вручну і скопіюйте (Ctrl/Cmd + C).']);
    }
  };

  const fromClaude = () => {
    const { variants, errors: errs } = parseModelResponse(pasted, { winnerId: winner.id, source: 'claude', segments: timeline.segments });
    setErrors(errs);
    if (variants.length) onGenerated(variants, 'claude');
  };

  const fromApi = async () => {
    setLoading(true);
    setErrors([]);
    try {
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ winner: { ...winner, timeline }, count }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `помилка ${r.status}`);
      setErrors(data.errors || []);
      if (data.variants?.length) onGenerated(data.variants, 'api');
      else setErrors(['модель не повернула жодного валідного варіанта', ...(data.errors || [])]);
    } catch (e) {
      setErrors([e.message]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row wrap gap-l start">
      <section className="card grow-main">
        <div className="eyebrow">Вхід · скрипт переможця</div>
        <h2>{winner.name}</h2>
        <div className="chips">
          <span className="chip">Топік: {winner.topic}</span>
          <span className="chip">CTR {winner.metrics.ctr}%</span>
          <span className="chip">Hook rate {winner.metrics.hookRate}%</span>
          <span className="chip">ROMI {winner.metrics.romi}%</span>
        </div>
        <pre className="code">{scriptToText(winner.script)}</pre>

        <div className="row between wrap gap-s center mt">
          <h3 className="h3">Розмітка відео · {timeline.duration.toFixed(1)} с</h3>
          <button type="button" className="link" onClick={onEditMarkup}>Змінити розмітку</button>
        </div>
        <div className="table-wrap">
          <table className="compact">
            <thead><tr><th>Сегмент</th><th>Час</th><th>Ліміт</th><th>Зараз</th></tr></thead>
            <tbody>
              {segments.map((s) => (
                <tr key={s.id}><td className="strong">{s.label}</td><td>{fmtTime(s.start)}–{fmtTime(s.end)}</td><td>до {wordLimit(s)} слів</td><td className="muted">{s.currentText || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {!timeline.edited && <p className="muted xsmall">Розмітка автоматична. Для точних лімітів слів додайте відео і підсуньте межі на кроці «Розмітка».</p>}
      </section>

      <section className="card grow-side stack">
        <div>
          <div className="eyebrow">Генерація</div>
          <h2>Як згенерувати варіанти</h2>
        </div>

        <div className="stack-s" role="radiogroup" aria-label="Режим генерації">
          {MODES.map((m) => {
            const disabled = m.key === 'api' && !apiAvailable;
            return (
              <button key={m.key} type="button" role="radio" aria-checked={mode === m.key}
                className={`mode ${mode === m.key ? 'active' : ''}`} onClick={() => { setMode(m.key); setErrors([]); }}>
                <span>
                  <span className="strong">{m.title}</span>
                  <span className="muted small block">{m.desc}</span>
                </span>
                <span className="badge">{disabled ? 'Ключа немає' : m.badge}</span>
              </button>
            );
          })}
        </div>

        <div className="row wrap gap-s center">
          <span className="muted small">Кількість варіантів:</span>
          {[10, 20, 30].map((n) => (
            <button key={n} type="button" className={`pill ${count === n ? 'active' : ''}`} onClick={() => setCount(n)}>{n}</button>
          ))}
        </div>

        {mode === 'templates' && (
          <div className="stack-s">
            <p className="muted small">15 прийомів × 2 зв'язні трійки (хук + перша фраза + текст на екрані). Максимум 30 варіантів. Ті, що вміщаються в ліміти розмітки, йдуть першими. CTA і власні сегменти шаблони не змінюють — для них режим Claude.</p>
            <button type="button" className="btn primary big" onClick={fromTemplates}>Згенерувати {count} варіантів</button>
          </div>
        )}

        {mode === 'claude' && (
          <div className="stack-s">
            <p className="small"><strong>1.</strong> Скопіюйте промпт і вставте в Claude (claude.ai або Claude Code).</p>
            <pre className="code dark scroll">{prompt}</pre>
            <button type="button" className="btn outline" onClick={copyPrompt}>{copied ? 'Скопійовано ✓' : 'Скопіювати промпт'}</button>
            <label className="small" htmlFor="paste"><strong>2.</strong> Вставте JSON-відповідь моделі:</label>
            <textarea id="paste" className="code-input" rows={6} value={pasted}
              placeholder='{"variants":[{"angle":"…","hook":"…","first_line":"…","on_screen":"…","what_changed":"…"}]}'
              onChange={(e) => setPasted(e.target.value)} />
            <button type="button" className="btn primary big" disabled={!pasted.trim()} onClick={fromClaude}>Перевірити JSON і показати варіанти</button>
          </div>
        )}

        {mode === 'api' && (
          <div className="stack-s">
            {!apiAvailable && (
              <p className="alert warn small">Ключ API не налаштований. Додайте <code>ANTHROPIC_API_KEY</code> у Vercel → Settings → Environment Variables. Поки що користуйтеся режимом «Промпт для Claude»: промпт той самий.</p>
            )}
            <button type="button" className="btn primary big" disabled={!apiAvailable || loading} onClick={fromApi}>
              {loading ? 'Генеруємо… (15–30 с)' : `Згенерувати ${count} варіантів через API`}
            </button>
          </div>
        )}

        {errors.length > 0 && (
          <ul className="alert warn small">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
