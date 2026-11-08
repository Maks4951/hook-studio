import { useEffect, useRef, useState } from 'react';
import { TIMELINE } from '../lib/schema.js';

// Прев'ю варіанта поверх відео. Текст накладається HTML-шаром у потрібні секунди —
// рендерити MP4 не треба. Без відео показуємо макет із симульованим часом.
export default function VideoPreview({ videoUrl, variant }) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const videoRef = useRef(null);

  // Без відео: «годинник» 0–15 с по колу.
  useEffect(() => {
    if (videoUrl || !playing) return undefined;
    const id = setInterval(() => setT((x) => (x + 0.1 >= TIMELINE.total ? 0 : x + 0.1)), 100);
    return () => clearInterval(id);
  }, [videoUrl, playing]);

  // Новий варіант — починаємо з нуля, щоб одразу побачити хук.
  useEffect(() => {
    setT(0);
    if (videoRef.current) videoRef.current.currentTime = 0;
  }, [variant?.id]);

  const toggle = () => {
    const v = videoRef.current;
    if (v) (v.paused ? v.play() : v.pause());
    setPlaying((p) => !p);
  };

  const inRange = ([a, b]) => t >= a && t < b;
  const phase = inRange(TIMELINE.hook) ? 'хук' : inRange(TIMELINE.firstLine) ? 'перша фраза' : inRange(TIMELINE.onScreen) ? 'текст на екрані' : 'далі — оригінал';

  return (
    <div className="stack-s">
      <div className="phone">
        {videoUrl ? (
          <video ref={videoRef} src={videoUrl} muted loop autoPlay playsInline
            onTimeUpdate={(e) => setT(e.currentTarget.currentTime)} />
        ) : (
          <div className="phone-placeholder small">відео переможця<br />(додайте його в бібліотеці)</div>
        )}

        {variant && inRange(TIMELINE.hook) && <div className="ov ov-hook">{variant.hook}</div>}
        {variant && inRange(TIMELINE.firstLine) && <div className="ov ov-line">{variant.firstLine}</div>}
        {variant && inRange(TIMELINE.onScreen) && <div className="ov ov-screen">{variant.onScreen}</div>}

        <div className="phone-bar">
          <div className="row between xsmall"><span>{t.toFixed(1)} с</span><span>{phase}</span></div>
          <div className="progress"><div style={{ width: `${Math.min(100, (t / TIMELINE.total) * 100)}%` }} /></div>
        </div>
      </div>
      <div className="row wrap gap-s center">
        <button type="button" className="btn outline" onClick={toggle}>{playing ? 'Пауза' : 'Відтворити'}</button>
        <span className="muted xsmall">0–3 с хук · 3–8 с перша фраза · 8–15 с текст на екрані</span>
      </div>
    </div>
  );
}
