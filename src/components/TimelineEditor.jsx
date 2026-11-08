import { useRef } from 'react';
import { MIN_SEG, r1, fmtTime, wordLimit } from '../lib/timeline.js';

/**
 * Шкала часу з сегментами. Кожен сегмент — свій рядок, щоб сегменти могли перекриватися в часі
 * (наприклад, субтитр і текст на екрані одночасно).
 *  - тягнете край блока  → змінюється початок або кінець
 *  - тягнете сам блок    → сегмент зсувається, тривалість та сама
 *  - клік по порожній шкалі → перемотування відео
 * Поки тягнете, відео перемотується на межу, щоб було видно кадр.
 */
export default function TimelineEditor({ duration, t, segments, selectedId, onSelect, onChange, onSeek }) {
  const drag = useRef(null);
  const pct = (x) => `${(x / duration) * 100}%`;
  const step = duration > 40 ? 5 : duration > 20 ? 2 : 1;
  const ticks = Array.from({ length: Math.floor(duration / step) + 1 }, (_, i) => i * step);

  const timeAt = (e, track) => {
    const r = track.getBoundingClientRect();
    return Math.max(0, Math.min(duration, ((e.clientX - r.left) / r.width) * duration));
  };

  const startDrag = (e, seg, kind) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(seg.id);
    const track = e.currentTarget.closest('.tl-track');
    drag.current = { id: seg.id, kind, x0: e.clientX, start0: seg.start, end0: seg.end, width: track.getBoundingClientRect().width };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dt = ((e.clientX - d.x0) / d.width) * duration;
    let { start0: start, end0: end } = d;
    if (d.kind === 'start') start = Math.min(Math.max(0, start + dt), end - MIN_SEG);
    if (d.kind === 'end') end = Math.max(Math.min(duration, end + dt), start + MIN_SEG);
    if (d.kind === 'move') {
      const len = end - start;
      start = Math.min(Math.max(0, start + dt), duration - len);
      end = start + len;
    }
    start = r1(start);
    end = r1(end);
    onChange(d.id, { start, end });
    onSeek(d.kind === 'end' ? Math.max(start, end - 0.05) : start);
  };

  const endDrag = () => { drag.current = null; };

  return (
    <div className="tl" onPointerMove={onMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
      <div className="tl-row">
        <div className="tl-label" />
        <div className="tl-ruler">
          {ticks.map((x) => <span key={x} style={{ left: pct(x) }}>{x}с</span>)}
          <div className="tl-playhead" style={{ left: pct(t) }} />
        </div>
      </div>

      {segments.map((s) => (
        <div key={s.id} className="tl-row">
          <button type="button" className={`tl-label ${selectedId === s.id ? 'active' : ''}`} onClick={() => onSelect(s.id)}>
            <span className="strong">{s.label}</span>
            <span className="muted xsmall block">{fmtTime(s.start)}–{fmtTime(s.end)} · до {wordLimit(s)} сл.</span>
          </button>
          <div className="tl-track" onPointerDown={(e) => onSeek(timeAt(e, e.currentTarget))}>
            <div className={`tl-seg tl-${s.type} ${selectedId === s.id ? 'sel' : ''}`} style={{ left: pct(s.start), width: pct(s.end - s.start) }}
              onPointerDown={(e) => startDrag(e, s, 'move')}>
              <span className="tl-handle left" aria-label={`Початок «${s.label}»`} onPointerDown={(e) => startDrag(e, s, 'start')} />
              <span className="tl-seg-text">{(s.end - s.start).toFixed(1)} с</span>
              <span className="tl-handle right" aria-label={`Кінець «${s.label}»`} onPointerDown={(e) => startDrag(e, s, 'end')} />
            </div>
            <div className="tl-playhead" style={{ left: pct(t) }} />
          </div>
        </div>
      ))}
    </div>
  );
}
