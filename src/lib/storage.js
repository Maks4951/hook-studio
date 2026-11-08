// Збереження стану в браузері (localStorage).
// На Vercel немає постійного диска, тому для MVP дані живуть у браузері користувача,
// а назовні виходять через експорт CSV/JSON. Наступна ітерація — база (Airtable / Postgres).

const KEY = 'hook-studio:v1';

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // localStorage може бути недоступний (приватний режим, вбудований фрейм) — працюємо без нього.
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Немає місця або сховище заблоковане — не ламаємо інтерфейс, просто не зберігаємо.
  }
}
