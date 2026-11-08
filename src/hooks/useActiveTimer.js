import { useEffect, useRef } from 'react';

const IDLE_MS = 5 * 60 * 1000; // 5 хвилин без дій = дизайнер відійшов

/**
 * Рахує АКТИВНІ секунди роботи над модифікацією.
 * Секунда зараховується, лише якщо вкладка відкрита й була дія (мишка, клавіатура, скрол)
 * за останні 5 хвилин. Так обідня перерва не потрапить у метрику пілоту.
 *
 * @param {boolean} running  чи йде зараз сесія
 * @param {() => void} onTick  викликається щосекунди активної роботи
 */
export function useActiveTimer(running, onTick) {
  const lastActivity = useRef(Date.now());
  const tick = useRef(onTick);
  tick.current = onTick;

  useEffect(() => {
    const mark = () => { lastActivity.current = Date.now(); };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, mark));
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    lastActivity.current = Date.now();
    const id = setInterval(() => {
      const visible = document.visibilityState === 'visible';
      const active = Date.now() - lastActivity.current < IDLE_MS;
      if (visible && active) tick.current();
    }, 1000);
    return () => clearInterval(id);
  }, [running]);
}
