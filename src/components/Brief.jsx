import { toCsv, download, BRIEF_COLUMNS, SESSION_COLUMNS, formatDuration } from '../lib/export.js';

const TARGET_APPROVE = 30; // % схвалених варіантів — ціль пілоту з пітчу

// Екран 4: бриф для дизайнера (вихід утиліти) + журнал пілоту (метрики успіху).
export default function Brief({ session, winner, sessions, onFinish, onNew }) {
  const approvedList = session.variants
    .filter((v) => session.decisions[v.id] === 'yes')
    .map((v) => ({ ...v, winnerId: session.winnerId, winnerName: winner?.name }));
  const total = session.variants.length;
  const rate = total ? Math.round((approvedList.length / total) * 100) : 0;
  const csv = toCsv(approvedList, BRIEF_COLUMNS);
  const stamp = new Date(session.startedAt).toISOString().slice(0, 10);

  // Агрегати по журналу пілоту.
  const done = sessions.filter((s) => s.generated);
  const avgMin = done.length ? done.reduce((a, s) => a + s.activeSec, 0) / done.length / 60 : 0;
  const avgRate = done.length ? Math.round(done.reduce((a, s) => a + s.approved / s.generated, 0) / done.length * 100) : 0;

  return (
    <div className="stack">
      <div className="row between wrap gap-s end">
        <div>
          <h1>Бриф для дизайнера · «{winner?.name}»</h1>
          <p className="muted">Лише схвалені варіанти з таймінгами. Дизайнер бере їх у монтаж без переписування текстів.</p>
        </div>
        <button type="button" className="btn outline" onClick={onNew}>Новий переможець</button>
      </div>

      {!session.finishedAt && (
        <p className="alert warn small">Сесія ще триває. <button type="button" className="link" onClick={onFinish}>Завершити і зупинити таймер</button></p>
      )}

      <div className="stats">
        <Stat label="Згенеровано варіантів" value={total} />
        <Stat label={`Схвалено (ціль ≥${TARGET_APPROVE}%)`} value={`${approvedList.length} · ${rate}%`}
          note={rate >= TARGET_APPROVE ? 'Ціль досягнуто' : 'Нижче цілі'} good={rate >= TARGET_APPROVE} />
        <Stat label="Активний час на тексти" value={formatDuration(session.activeSec)} note="Базова лінія: близько 1,5 год" />
        <Stat label="Джерело" value={{ templates: 'Шаблони', claude: 'Claude', api: 'API' }[session.source]} />
      </div>

      {approvedList.length === 0 ? (
        <p className="alert warn small">Жодного схваленого варіанта. Поверніться на «Перегляд» і натисніть «Беру».</p>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Кут</th><th>Хук · 0–3 с</th><th>Перша фраза · 3–8 с</th><th>Текст на екрані · 8–15 с</th></tr>
            </thead>
            <tbody>
              {approvedList.map((v, i) => (
                <tr key={v.id}><td className="muted">{i + 1}</td><td>{v.angle}</td><td className="strong">{v.hook}</td><td>{v.firstLine}</td><td>{v.onScreen}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="card stack-s">
        <div className="row between wrap gap-s center">
          <h2 className="h3">Експорт брифу</h2>
          <div className="row gap-s wrap">
            <button type="button" className="btn primary" disabled={!approvedList.length}
              onClick={() => download(`brief_${session.winnerId}_${stamp}.csv`, csv)}>Завантажити CSV</button>
            <button type="button" className="btn outline" disabled={!approvedList.length}
              onClick={() => download(`brief_${session.winnerId}_${stamp}.json`, JSON.stringify({ winner: winner?.name, variants: approvedList }, null, 2), 'application/json')}>Завантажити JSON</button>
          </div>
        </div>
        <pre className="code scroll">{csv}</pre>
      </section>

      <section className="card stack-s">
        <div className="row between wrap gap-s center">
          <div>
            <h2 className="h3">Журнал пілоту</h2>
            <p className="muted small">Кожна завершена сесія. Середній активний час: <strong>{avgMin.toFixed(1)} хв</strong> · середня частка схвалених: <strong>{avgRate}%</strong> · сесій: {done.length}</p>
          </div>
          <button type="button" className="btn outline" disabled={!sessions.length}
            onClick={() => download(`pilot_log_${stamp}.csv`, toCsv(sessions, SESSION_COLUMNS))}>Експорт журналу CSV</button>
        </div>
        {sessions.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Дизайнер</th><th>Переможець</th><th>Джерело</th><th>Схвалено</th><th>Активний час</th></tr></thead>
              <tbody>
                {[...sessions].reverse().map((s) => (
                  <tr key={s.id}><td>{s.designer}</td><td>{s.winnerName}</td><td>{s.source}</td><td>{s.approved} / {s.generated}</td><td>{formatDuration(s.activeSec)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, note, good }) {
  return (
    <div className="card stat">
      <div className="muted small">{label}</div>
      <div className="stat-value">{value}</div>
      {note && <div className={`xsmall strong ${good ? 'accent' : 'muted'}`}>{note}</div>}
    </div>
  );
}
