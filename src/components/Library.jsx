import { useState } from 'react';
import AddWinnerForm from './AddWinnerForm.jsx';

// Екран 1: бібліотека переможців. Відео обирається з комп'ютера і показується лише в цьому браузері.
export default function Library({ winners, videos, videoNames, onPick, onVideo, onAdd }) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="stack">
      <div className="row between end">
        <div>
          <h1>Бібліотека переможців</h1>
          <p className="muted">Оберіть креатив-переможець: з його скрипту згенеруємо варіанти хуків і тексту для модифікацій.</p>
        </div>
        <button type="button" className="btn dashed" onClick={() => setAdding((a) => !a)}>
          {adding ? 'Сховати форму' : '+ Додати переможця'}
        </button>
      </div>

      {adding && <AddWinnerForm onAdd={(w) => { onAdd(w); setAdding(false); }} />}

      <div className="grid-cards">
        {winners.map((w) => (
          <article key={w.id} className="card winner">
            <div className="winner-media">
              {videos[w.id]
                ? <video src={videos[w.id]} muted loop autoPlay playsInline />
                : <span className="winner-hook">{w.script.hook}</span>}
              <span className="badge yellow">Переможець</span>
            </div>
            <div className="winner-body">
              <h2 className="h3">{w.name}</h2>
              <div className="muted small">Топік: {w.topic}</div>
              <div className="metrics">
                <Metric label="CTR" value={`${w.metrics.ctr}%`} />
                <Metric label="Hook rate" value={`${w.metrics.hookRate}%`} />
                <Metric label="ROMI" value={`${w.metrics.romi}%`} />
              </div>
              <label className="file-pick small">
                <input type="file" accept="video/*" onChange={(e) => e.target.files[0] && onVideo(w.id, e.target.files[0])} />
                {videos[w.id]
                  ? `Відео: ${videoNames[w.id]} · замінити`
                  : videoNames[w.id] ? `Оберіть «${videoNames[w.id]}» знову` : '+ Додати відео'}
              </label>
              <button type="button" className="btn primary" onClick={() => onPick(w.id)}>Зробити модифікації →</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <div className="muted xsmall">{label}</div>
      <div className="strong">{value}</div>
    </div>
  );
}
