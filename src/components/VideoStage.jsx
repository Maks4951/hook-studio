import { useRef } from 'react';
import { fmtTime } from '../lib/timeline.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/**
 * Кадр 9:16 з відео і накладеним текстом активних сегментів.
 * Текст — HTML-шар поверх відео (рендерити MP4 не треба). В режимі editable текст можна тягнути мишкою:
 * позиція зберігається у % від кадру, тож однаково працює на будь-якому розмірі екрана.
 */
export default function VideoStage({ clock, videoUrl, onDuration, segments, textFor, editable, selectedId, onSelect, onMove, showSafe }) {
  const stageRef = useRef(null);
  const drag = useRef(null);
  const { t } = clock;
  const active = segments.filter((s) => t >= s.start && t < s.end);

  const down = (e, s) => {
    onSelect?.(s.id);
    if (!editable) return;
    e.preventDefault();
    drag.current = s.id;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!drag.current) return;
    const r = stageRef.current.getBoundingClientRect();
    onMove(drag.current, {
      x: Math.round(clamp(((e.clientX - r.left) / r.width) * 100, 8, 92)),
      y: Math.round(clamp(((e.clientY - r.top) / r.height) * 100, 5, 95)),
    });
  };
  const up = () => { drag.current = null; };

  return (
    <div className="phone" ref={stageRef}>
      {videoUrl ? (
        <video ref={clock.videoRef} src={videoUrl} muted loop autoPlay playsInline
          onLoadedMetadata={(e) => onDuration?.(e.currentTarget.duration)} />
      ) : (
        <div className="phone-placeholder small">відео переможця<br />(додайте файл, щоб розмітити справжні таймінги)</div>
      )}

      {showSafe && (
        <div className="safe" aria-hidden="true">
          <div className="safe-top">інтерфейс Reels</div>
          <div className="safe-right" />
          <div className="safe-bottom">підпис і кнопки</div>
        </div>
      )}

      {active.map((s) => {
        const text = textFor(s);
        if (!text) return null;
        return (
          <div key={s.id}
            className={`ov ov-${s.style} size-${s.size} align-${s.align} ${editable ? 'draggable' : ''} ${selectedId === s.id ? 'sel' : ''}`}
            style={{ left: `${s.pos.x}%`, top: `${s.pos.y}%` }}
            title={editable ? 'Перетягніть, щоб змінити позицію' : undefined}
            onPointerDown={(e) => down(e, s)} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            {text}
          </div>
        );
      })}

      <div className="phone-bar">
        <div className="row between xsmall">
          <span>{fmtTime(t)}</span>
          <span>{active.map((s) => s.label).join(' + ') || '—'}</span>
        </div>
      </div>
    </div>
  );
}
