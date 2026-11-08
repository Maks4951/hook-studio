import { useEffect, useRef, useState } from 'react';

/**
 * Єдиний «годинник» для відео і таймлайну.
 * Є відео — час береться з <video>.currentTime (кожен кадр через requestAnimationFrame, щоб бігунок не смикався).
 * Немає відео — симулюємо програвання 0…duration по колу.
 */
export function useClock({ hasVideo, duration }) {
  const videoRef = useRef(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return undefined;
    let raf;
    let last = performance.now();
    const loop = (now) => {
      if (hasVideo) {
        if (videoRef.current) setT(videoRef.current.currentTime);
      } else {
        const dt = (now - last) / 1000;
        setT((x) => (x + dt >= duration ? 0 : x + dt));
      }
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, hasVideo, duration]);

  const seek = (x) => {
    const c = Math.max(0, Math.min(duration, x));
    if (hasVideo && videoRef.current) videoRef.current.currentTime = c;
    setT(c);
  };

  const toggle = () => {
    const v = videoRef.current;
    if (hasVideo && v) (playing ? v.pause() : v.play().catch(() => {}));
    setPlaying((p) => !p);
  };

  const pause = () => {
    if (hasVideo && videoRef.current) videoRef.current.pause();
    setPlaying(false);
  };

  return { videoRef, t, playing, toggle, seek, pause };
}
