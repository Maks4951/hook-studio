import { useState } from 'react';

// Форма додавання нового переможця. Поля відповідають моделі Winner з lib/schema.js.
const FIELDS = [
  ['name', 'Назва для команди', 'Куди зникають шкарпетки'],
  ['topic', 'Топік / біль', 'Шкарпетки губляться в пральці'],
  ['hook', 'Хук (0–3 с), англ.', 'Where do all the socks go?'],
  ['firstLine', 'Перша фраза (3–8 с)', 'Every wash, one sock disappears.'],
  ['body', 'Основна частина', 'SockLock pairs have a tiny magnet on the cuff...'],
  ['onScreen', 'Текст на екрані (8–15 с)', 'Wash together. Stay together.'],
  ['cta', 'CTA', 'Take the 60-second quiz — 5 pairs for $29.'],
  ['pain', 'Біль реченням (до 6 слів) — для шаблонів', 'your socks vanish in the wash'],
  ['painShort', 'Біль коротко (до 4 слів) — для шаблонів', 'lost socks'],
  ['promise', 'Обіцянка продукту', 'a tiny magnet keeps every pair together'],
  ['offer', 'Оффер', '5 pairs for $29'],
];
const METRICS = [['ctr', 'CTR, %'], ['hookRate', 'Hook rate, %'], ['romi', 'ROMI, %']];
const REQUIRED = ['name', 'topic', 'hook', 'firstLine', 'onScreen', 'pain', 'painShort', 'promise', 'offer'];

export default function AddWinnerForm({ onAdd }) {
  const [f, setF] = useState({});
  const [error, setError] = useState('');
  const upd = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const missing = REQUIRED.filter((k) => !f[k]?.trim());
    if (missing.length) return setError(`Заповніть: ${missing.map((k) => FIELDS.find(([n]) => n === k)[1]).join(', ')}`);
    onAdd({
      id: `c${Date.now()}`,
      name: f.name.trim(), topic: f.topic.trim(),
      pain: f.pain.trim(), painShort: f.painShort.trim(), promise: f.promise.trim(), offer: f.offer.trim(),
      script: { hook: f.hook.trim(), firstLine: f.firstLine.trim(), body: f.body?.trim() || '', onScreen: f.onScreen.trim(), cta: f.cta?.trim() || '' },
      metrics: { ctr: Number(f.ctr) || 0, hookRate: Number(f.hookRate) || 0, romi: Number(f.romi) || 0 },
      videoName: null,
    });
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2 className="h3">Новий переможець</h2>
      <div className="form-grid">
        {FIELDS.map(([k, label, ph]) => (
          <label key={k} className="field">
            <span className="small">{label}{REQUIRED.includes(k) ? ' *' : ''}</span>
            <input value={f[k] || ''} placeholder={ph} onChange={upd(k)} />
          </label>
        ))}
        {METRICS.map(([k, label]) => (
          <label key={k} className="field">
            <span className="small">{label}</span>
            <input type="number" step="0.1" value={f[k] || ''} onChange={upd(k)} />
          </label>
        ))}
      </div>
      {error && <p className="alert warn small">{error}</p>}
      <button type="submit" className="btn primary">Додати в бібліотеку</button>
    </form>
  );
}
