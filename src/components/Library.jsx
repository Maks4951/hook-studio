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
              {/* Рядок відео завжди однакової висоти: іконка · назва або статус · дія.
                  Довга назва скорочується посередині, повна — у підказці. */}
              <div className="video-row">
                <span className={`video-icon ${videos[w.id] ? 'on' : ''}`} aria-hidden="true">▶</span>
                <span className={`video-name small ${videos[w.id] ? '' : 'muted'}`} title={videoNames[w.id] || undefined}>
                  {!videoNames[w.id] && 'Відео не додано'}
                  {videoNames[w.id] && !videos[w.id] && <span className="vn-prefix">Оберіть знову:&nbsp;</span>}
                  {videoNames[w.id] && <FileName name={videoNames[w.id]} />}
                </span>
                <label className="file-pick small">
                  <input type="file" accept="video/*" onChange={(e) => e.target.files[0] && onVideo(w.id, e.target.files[0])} />
                  {videos[w.id] ? 'Замінити' : 'Додати'}
                </label>
              </div>
              <button type="button" className="btn primary card-cta" onClick={() => onPick(w.id)}>Зробити модифікації →</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// Довга назва файлу: початок обрізається з «…» під ширину картки, а кінець (версія + розширення) видно завжди,
// бо файли зазвичай відрізняються саме в кінці: «…_v2.mp4» vs «…_v3_final.mp4».
function FileName({ name }) {
  const tail = name.length > 14 ? name.slice(-10) : '';
  return (
    <>
      <span className="vn-head">{tail ? name.slice(0, -10) : name}</span>
      {tail && <span className="vn-tail">{tail}</span>}
    </>
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
