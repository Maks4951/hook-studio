import { useEffect, useMemo, useState } from 'react';
import { SEED_WINNERS } from './data/winners.js';
import { loadState, saveState } from './lib/storage.js';
import { formatDuration } from './lib/export.js';
import { useActiveTimer } from './hooks/useActiveTimer.js';
import Library from './components/Library.jsx';
import Generate from './components/Generate.jsx';
import Review from './components/Review.jsx';
import Brief from './components/Brief.jsx';

const STEPS = [
  ['library', '1 · Бібліотека'],
  ['generate', '2 · Генерація'],
  ['review', '3 · Перегляд'],
  ['brief', '4 · Бриф'],
];

// Увесь стан застосунку. Зберігається в localStorage (крім відеофайлів).
function initialState() {
  return {
    screen: 'library',
    designer: '',
    customWinners: [],   // переможці, додані через форму
    videoNames: {},      // winnerId → ім'я відеофайлу (сам файл у пам'яті браузера)
    winnerId: null,      // обраний переможець
    mode: 'templates',   // templates | claude | api
    count: 20,
    session: null,       // поточна модифікація (див. startSession)
    sessions: [],        // журнал завершених сесій — дані для метрик пілоту
    ...loadState(),
  };
}

export default function App() {
  const [state, setState] = useState(initialState);
  const [videos, setVideos] = useState({}); // winnerId → objectURL (не зберігається між перезавантаженнями)
  const [apiAvailable, setApiAvailable] = useState(false);

  const set = (patch) => setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));

  useEffect(() => { saveState(state); }, [state]);

  // Питаємо бекенд, чи налаштований ключ API. Немає бекенду (локальний vite dev) — режим вимкнено.
  useEffect(() => {
    fetch('/api/generate')
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((d) => setApiAvailable(Boolean(d.available)))
      .catch(() => setApiAvailable(false));
  }, []);

  const winners = useMemo(() => [...SEED_WINNERS, ...state.customWinners], [state.customWinners]);
  const winner = winners.find((w) => w.id === state.winnerId) || null;
  const session = state.session;
  const sessionWinner = session ? winners.find((w) => w.id === session.winnerId) : null;

  // Таймер іде, поки сесія не завершена (бриф не сформовано).
  useActiveTimer(Boolean(session && !session.finishedAt), () =>
    set((s) => ({ session: s.session && { ...s.session, activeSec: s.session.activeSec + 1 } })));

  // ---- дії ----
  const pickWinner = (id) => set({ winnerId: id, screen: 'generate' });

  const setVideo = (winnerId, file) => {
    setVideos((v) => {
      if (v[winnerId]) URL.revokeObjectURL(v[winnerId]);
      return { ...v, [winnerId]: URL.createObjectURL(file) };
    });
    set((s) => ({ videoNames: { ...s.videoNames, [winnerId]: file.name } }));
  };

  const addWinner = (w) => set((s) => ({ customWinners: [...s.customWinners, w] }));

  const startSession = (variants, source) => set({
    screen: 'review',
    session: {
      id: Date.now(),
      winnerId: winner.id,
      source,
      variants,
      decisions: {},            // variantId → 'yes' | 'no'
      selectedId: variants[0]?.id ?? null,
      startedAt: Date.now(),
      activeSec: 0,
      finishedAt: null,
    },
  });

  const updateSession = (patch) => set((s) => ({ session: { ...s.session, ...patch } }));

  const decide = (id, value) => set((s) => {
    const cur = s.session.decisions[id];
    return { session: { ...s.session, selectedId: id, decisions: { ...s.session.decisions, [id]: cur === value ? undefined : value } } };
  });

  const editVariant = (id, patch) => set((s) => ({
    session: { ...s.session, variants: s.session.variants.map((v) => (v.id === id ? { ...v, ...patch, edited: true } : v)) },
  }));

  // «Сформувати бриф»: зупиняємо таймер і пишемо сесію в журнал пілоту.
  const finishSession = () => set((s) => {
    if (s.session.finishedAt) return { screen: 'brief' };
    const finished = { ...s.session, finishedAt: Date.now() };
    const approved = Object.values(finished.decisions).filter((d) => d === 'yes').length;
    const w = winners.find((x) => x.id === finished.winnerId);
    return {
      screen: 'brief',
      session: finished,
      sessions: [...s.sessions, {
        id: finished.id, designer: s.designer || '—', winnerName: w?.name ?? finished.winnerId,
        source: finished.source, generated: finished.variants.length, approved,
        activeSec: finished.activeSec, startedAt: finished.startedAt, finishedAt: finished.finishedAt,
      }],
    };
  });

  const go = (screen) => set({ screen });

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">HS</div>
            <div>
              <div className="brand-name">Hook Studio</div>
              <div className="muted small">SockLock · варіації модифікацій з переможців</div>
            </div>
          </div>
          <nav className="steps" aria-label="Кроки">
            {STEPS.map(([key, label]) => (
              <button key={key} type="button" className={`step ${state.screen === key ? 'active' : ''}`} onClick={() => go(key)}>
                {label}
              </button>
            ))}
          </nav>
          <label className="designer">
            <span className="muted small">Дизайнер</span>
            <input value={state.designer} placeholder="Ім'я" onChange={(e) => set({ designer: e.target.value })} />
          </label>
        </div>
      </header>

      <main className="page">
        {state.screen === 'library' && (
          <Library winners={winners} videos={videos} videoNames={state.videoNames}
            onPick={pickWinner} onVideo={setVideo} onAdd={addWinner} />
        )}

        {state.screen === 'generate' && (winner ? (
          <Generate winner={winner} apiAvailable={apiAvailable}
            mode={state.mode} setMode={(mode) => set({ mode })}
            count={state.count} setCount={(count) => set({ count })}
            onGenerated={startSession} />
        ) : <Empty text="Спершу оберіть переможця в бібліотеці." action="До бібліотеки" onAction={() => go('library')} />)}

        {state.screen === 'review' && (session ? (
          <Review session={session} winner={sessionWinner} videoUrl={videos[session.winnerId]}
            elapsed={formatDuration(session.activeSec)}
            onSelect={(id) => updateSession({ selectedId: id })}
            onDecide={decide} onEdit={editVariant} onFinish={finishSession} />
        ) : <Empty text="Варіантів ще немає. Оберіть переможця і згенеруйте їх." action="До генерації" onAction={() => go(winner ? 'generate' : 'library')} />)}

        {state.screen === 'brief' && (session ? (
          <Brief session={session} winner={sessionWinner} sessions={state.sessions}
            onFinish={finishSession} onNew={() => set({ screen: 'library', winnerId: null })} />
        ) : <Empty text="Бриф з'явиться після перегляду варіантів." action="До бібліотеки" onAction={() => go('library')} />)}
      </main>
    </div>
  );
}

function Empty({ text, action, onAction }) {
  return (
    <div className="card empty">
      <p>{text}</p>
      <button type="button" className="btn primary" onClick={onAction}>{action}</button>
    </div>
  );
}
