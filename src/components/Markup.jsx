import { useState } from 'react';
import VideoStage from './VideoStage.jsx';
import TimelineEditor from './TimelineEditor.jsx';
import { useClock } from '../hooks/useClock.js';
import { wordCount } from '../lib/variants.js';
import {
  SEGMENT_TYPES, STYLES, SIZES, ALIGNS, SNAP_Y, MIN_SEG,
  sortedSegments, wordLimit, defaultTimeline, r1, fmtTime,
} from '../lib/timeline.js';

// Екран «Розмітка»: дизайнер один раз позначає, де в цьому відео звучить/з'являється кожен текст,
// де він стоїть у кадрі і яким стилем. Від цього залежать ліміти слів, промпт, прев'ю і бриф.
export default function Markup({ winner, timeline, videoUrl, onVideo, onDuration, onChange, onNext }) {
  const clock = useClock({ hasVideo: Boolean(videoUrl), duration: timeline.duration });
  const [selectedId, setSelectedId] = useState(timeline.segments[0]?.id);
  const segments = sortedSegments(timeline.segments);
  const sel = timeline.segments.find((s) => s.id === selectedId);

  // Будь-яка ручна правка робить розмітку «ручною» — далі вона не перебудовується автоматично.
  const updateSeg = (id, patch) => onChange({
    ...timeline,
    edited: true,
    segments: timeline.segments.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  });

  const setTime = (field, value) => {
    const v = r1(Number(value));
    if (Number.isNaN(v)) return;
    const start = field === 'start' ? Math.min(Math.max(0, v), sel.end - MIN_SEG) : sel.start;
    const end = field === 'end' ? Math.max(Math.min(timeline.duration, v), sel.start + MIN_SEG) : sel.end;
    updateSeg(sel.id, { start: r1(start), end: r1(end) });
  };

  const reset = () => {
    onChange(defaultTimeline(winner, timeline.duration));
    setSelectedId('hook');
  };

  return (
    <div className="stack">
      <div className="row between wrap gap-s end">
        <div>
          <h1>Розмітка відео · «{winner.name}»</h1>
          <p className="muted">Позначте, де в ролику кожен текст і де він стоїть у кадрі. Від тривалості сегмента залежить ліміт слів для генерації.</p>
        </div>
        <div className="row wrap gap-s">
          <label className="btn outline file-btn">
            <input type="file" accept="video/*" onChange={(e) => e.target.files[0] && onVideo(e.target.files[0])} />
            {videoUrl ? 'Замінити відео' : '+ Додати відео'}
          </label>
          <button type="button" className="btn primary" onClick={onNext}>Далі: генерація →</button>
        </div>
      </div>

      {!videoUrl && <p className="alert warn small">Відео не додано: розмітка стандартна на {timeline.duration} с. Додайте файл, і сегменти підлаштуються під його тривалість.</p>}

      <div className="row wrap gap-l start">
        <div className="stack-s stage-col">
          <VideoStage clock={clock} videoUrl={videoUrl} onDuration={onDuration}
            segments={timeline.segments} textFor={(s) => s.currentText || s.label}
            editable selectedId={selectedId} onSelect={setSelectedId}
            onMove={(id, pos) => updateSeg(id, { pos })} />
          <div className="row wrap gap-s center">
            <button type="button" className="btn outline" onClick={clock.toggle}>{clock.playing ? 'Пауза' : 'Відтворити'}</button>
          </div>
          <p className="muted xsmall">Текст у кадрі можна перетягнути мишкою.</p>
        </div>

        {sel && (
          <section className="card grow-main stack-s">
            <div className="row between wrap gap-s center">
              <div className="eyebrow">Сегмент · {SEGMENT_TYPES[sel.type].label}</div>
              <span className="chip">{(sel.end - sel.start).toFixed(1)} с → до {wordLimit(sel)} слів</span>
            </div>

            <label className="field">
              <span className="small strong">Назва</span>
              <input value={sel.label} onChange={(e) => updateSeg(sel.id, { label: e.target.value })} />
            </label>
            <label className="field">
              <span className="small strong">Що там зараз (текст переможця)</span>
              <textarea rows={2} value={sel.currentText} onChange={(e) => updateSeg(sel.id, { currentText: e.target.value })} />
              {wordCount(sel.currentText) > wordLimit(sel) && (
                <span className="xsmall warn-text">Текст переможця — {wordCount(sel.currentText)} слів, а сегмент вміщає {wordLimit(sel)}. Подовжте сегмент або нові варіанти будуть коротшими.</span>
              )}
            </label>

            <div className="row wrap gap-s end">
              <label className="field num">
                <span className="small strong">Початок, с</span>
                <input type="number" step="0.1" min="0" value={sel.start} onChange={(e) => setTime('start', e.target.value)} />
              </label>
              <button type="button" className="btn outline" onClick={() => setTime('start', clock.t)}>Початок тут ({fmtTime(clock.t)})</button>
              <label className="field num">
                <span className="small strong">Кінець, с</span>
                <input type="number" step="0.1" min="0" value={sel.end} onChange={(e) => setTime('end', e.target.value)} />
              </label>
              <button type="button" className="btn outline" onClick={() => setTime('end', clock.t)}>Кінець тут</button>
            </div>

            <div className="row wrap gap-l">
              <fieldset className="seg-group">
                <legend className="small strong">Вигляд</legend>
                {Object.entries(STYLES).map(([k, label]) => (
                  <button key={k} type="button" className={`pill ${sel.style === k ? 'active' : ''}`} aria-pressed={sel.style === k}
                    onClick={() => updateSeg(sel.id, { style: k })}>{label}</button>
                ))}
              </fieldset>
              <fieldset className="seg-group">
                <legend className="small strong">Розмір</legend>
                {SIZES.map((k) => (
                  <button key={k} type="button" className={`pill ${sel.size === k ? 'active' : ''}`} aria-pressed={sel.size === k}
                    onClick={() => updateSeg(sel.id, { size: k })}>{k}</button>
                ))}
              </fieldset>
            </div>
            <div className="row wrap gap-l">
              <fieldset className="seg-group">
                <legend className="small strong">Вирівнювання</legend>
                {Object.entries(ALIGNS).map(([k, label]) => (
                  <button key={k} type="button" className={`pill ${sel.align === k ? 'active' : ''}`} aria-pressed={sel.align === k}
                    onClick={() => updateSeg(sel.id, { align: k })}>{label}</button>
                ))}
              </fieldset>
              <fieldset className="seg-group">
                <legend className="small strong">Позиція · зараз {sel.pos.y}% від верху</legend>
                {[['top', 'Верх'], ['middle', 'Центр'], ['bottom', 'Низ']].map(([k, label]) => (
                  <button key={k} type="button" className="pill" onClick={() => updateSeg(sel.id, { pos: { x: 50, y: SNAP_Y[k] } })}>{label}</button>
                ))}
              </fieldset>
            </div>

          </section>
        )}
      </div>

      <section className="card stack-s">
        <div className="row between wrap gap-s center">
          <h2 className="h3">Таймлайн · {timeline.duration.toFixed(1)} с {timeline.edited ? '' : '· автоматична розмітка'}</h2>
          <button type="button" className="btn outline" onClick={reset}>Скинути розмітку</button>
        </div>
        <TimelineEditor duration={timeline.duration} t={clock.t} segments={segments} selectedId={selectedId}
          onSelect={setSelectedId} onChange={updateSeg} onSeek={(x) => { clock.pause(); clock.seek(x); }} />
        <p className="muted xsmall">Тягніть край блока, щоб змінити початок чи кінець, або сам блок, щоб зсунути. Клік по шкалі перемотує відео.</p>
      </section>
    </div>
  );
}
