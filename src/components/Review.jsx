import VideoStage from './VideoStage.jsx';
import { useClock } from '../hooks/useClock.js';
import { sortedSegments, wordLimit } from '../lib/timeline.js';
import { checkLimits, wordCount } from '../lib/variants.js';

const SOURCE_LABEL = { templates: 'Шаблони', claude: 'Claude', api: 'API' };

// Екран «Перегляд»: дизайнер дивиться варіанти поверх відео, править текст і вирішує «беру / не беру».
export default function Review({ session, winner, timeline, videoUrl, elapsed, onSelect, onDecide, onEdit, onFinish, onMoveText }) {
  const clock = useClock({ hasVideo: Boolean(videoUrl), duration: timeline.duration });
  const { variants, decisions, selectedId } = session;
  const segments = sortedSegments(timeline.segments);
  const selected = variants.find((v) => v.id === selectedId) || variants[0];
  const approved = Object.values(decisions).filter((d) => d === 'yes').length;
  const textOf = (v, s) => v.texts?.[s.id] ?? s.currentText;

  return (
    <div className="stack">
      <div className="row between wrap gap-s center">
        <div>
          <h1>Варіанти для «{winner?.name}»</h1>
          <p className="muted">Джерело: {SOURCE_LABEL[session.source]} · {variants.length} варіантів · розмітка {timeline.duration.toFixed(1)} с, сегментів: {segments.length}</p>
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
            const warnings = checkLimits(v.texts || {}, segments.filter((s) => !v.unchanged?.includes(s.id)));
            return (
              <div key={v.id} className={`variant ${v.id === selected?.id ? 'selected' : ''} ${d === 'no' ? 'rejected' : ''}`}>
                <button type="button" className="variant-main" onClick={() => { onSelect(v.id); clock.seek(0); }}>
                  <span className="row gap-s center wrap">
                    <span className="muted xsmall">#{i + 1}</span>
                    <span className="tag">{v.angle}</span>
                    {v.edited && <span className="tag grey">змінено</span>}
                    {warnings.map((w) => <span key={w} className="tag warn">{w}</span>)}
                  </span>
                  <span className="variant-hook">{v.hook}</span>
                  {segments.filter((s) => s.type !== 'hook' || s.id !== segments.find((x) => x.type === 'hook')?.id).map((s) => (
                    <span key={s.id} className="small">
                      <span className="muted">{s.label}: </span>{textOf(v, s)}
                      {v.unchanged?.includes(s.id) && <span className="muted xsmall"> (як у переможця)</span>}
                    </span>
                  ))}
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
          <VideoStage clock={clock} videoUrl={videoUrl} segments={timeline.segments}
            textFor={(s) => (selected ? textOf(selected, s) : '')}
            editable onMove={onMoveText} />
          <div className="row wrap gap-s center">
            <button type="button" className="btn outline" onClick={clock.toggle}>{clock.playing ? 'Пауза' : 'Відтворити'}</button>
            <button type="button" className="btn outline" onClick={() => clock.seek(0)}>З початку</button>
            <span className="muted xsmall">Текст можна перетягнути — позиція збережеться в розмітці.</span>
          </div>
          {selected && (
            <div className="stack-s">
              {segments.map((s) => {
                const val = textOf(selected, s);
                const wc = wordCount(val);
                const lim = wordLimit(s);
                return (
                  <label key={s.id} className="field">
                    <span className="row between small">
                      <span className="strong">{s.label} · {s.start.toFixed(1)}–{s.end.toFixed(1)} с</span>
                      <span className={wc > lim ? 'warn-text strong' : 'muted'}>{wc}/{lim} слів</span>
                    </span>
                    <input value={val} onChange={(e) => onEdit(selected.id, s.id, e.target.value)}
                      onFocus={() => clock.seek(s.start + 0.05)} />
                  </label>
                );
              })}
              <p className="note small"><span className="muted">Що змінено: </span>{selected.whatChanged || '—'}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
