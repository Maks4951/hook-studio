import VideoPreview from './VideoPreview.jsx';

const SOURCE_LABEL = { templates: 'Шаблони', claude: 'Claude', api: 'API' };

// Екран 3: дизайнер переглядає варіанти, править текст і вирішує «беру / не беру».
export default function Review({ session, winner, videoUrl, elapsed, onSelect, onDecide, onEdit, onFinish }) {
  const { variants, decisions, selectedId } = session;
  const selected = variants.find((v) => v.id === selectedId) || variants[0];
  const approved = Object.values(decisions).filter((d) => d === 'yes').length;

  return (
    <div className="stack">
      <div className="row between wrap gap-s center">
        <div>
          <h1>Варіанти для «{winner?.name}»</h1>
          <p className="muted">Джерело: {SOURCE_LABEL[session.source]} · {variants.length} варіантів</p>
        </div>
        <div className="row wrap gap-s center">
          <span className="chip big">Схвалено <strong>{approved}</strong> з {variants.length}</span>
          <span className="chip big" title="Рахується лише активний час: вкладка відкрита і були дії за останні 5 хв">
            Таймер <strong>{elapsed}</strong>{session.finishedAt ? ' · зупинено' : ''}
          </span>
          <button type="button" className="btn dark" disabled={!approved} onClick={onFinish}>Сформувати бриф →</button>
        </div>
      </div>

      <div className="row wrap gap-l start">
        <div className="grow-main stack-s">
          {variants.map((v, i) => {
            const d = decisions[v.id];
            return (
              <div key={v.id} className={`variant ${v.id === selected?.id ? 'selected' : ''} ${d === 'no' ? 'rejected' : ''}`}>
                <button type="button" className="variant-main" onClick={() => onSelect(v.id)}>
                  <span className="row gap-s center wrap">
                    <span className="muted xsmall">#{i + 1}</span>
                    <span className="tag">{v.angle}</span>
                    {v.edited && <span className="tag grey">змінено</span>}
                    {v.warnings?.map((w) => <span key={w} className="tag warn">{w}</span>)}
                  </span>
                  <span className="variant-hook">{v.hook}</span>
                  <span className="small">{v.firstLine}</span>
                  <span className="muted small">Текст на екрані: <strong className="text">{v.onScreen}</strong></span>
                </button>
                <div className="variant-actions">
                  <button type="button" className={`btn small-btn ${d === 'yes' ? 'primary' : 'outline-accent'}`}
                    aria-pressed={d === 'yes'} onClick={() => onDecide(v.id, 'yes')}>{d === 'yes' ? 'Беру ✓' : 'Беру'}</button>
                  <button type="button" className={`btn small-btn ${d === 'no' ? 'grey' : 'outline'}`}
                    aria-pressed={d === 'no'} onClick={() => onDecide(v.id, 'no')}>Не беру</button>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="card grow-side stack sticky">
          <div className="eyebrow">Прев'ю поверх відео · варіант #{variants.indexOf(selected) + 1}</div>
          <VideoPreview videoUrl={videoUrl} variant={selected} />
          {selected && (
            <div className="stack-s">
              <Field label="Хук (0–3 с)" value={selected.hook} onChange={(hook) => onEdit(selected.id, { hook })} />
              <Field label="Перша фраза (3–8 с)" value={selected.firstLine} onChange={(firstLine) => onEdit(selected.id, { firstLine })} />
              <Field label="Текст на екрані (8–15 с)" value={selected.onScreen} onChange={(onScreen) => onEdit(selected.id, { onScreen })} />
              <p className="note small"><span className="muted">Що змінено: </span>{selected.whatChanged || '—'}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="field">
      <span className="small strong">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
