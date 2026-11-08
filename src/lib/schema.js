// Модель даних утиліти. Це "контракт" між генераторами (шаблони, Claude, API)
// та інтерфейсом: будь-яке джерело має повернути варіанти саме такої форми.

/**
 * Переможець — креатив, з якого робимо модифікації.
 * @typedef {Object} Winner
 * @property {string} id
 * @property {string} name      Назва для команди (українською)
 * @property {string} topic     Топік / біль
 * @property {string} pain      Біль як закінчене речення без крапки (англ.), напр. "your socks disappear in the wash".
 *                              Підставляється в шаблони, тому має читатися після "POV:". До 6 слів.
 * @property {string} painShort Біль як іменник (англ.), до 4 слів, напр. "lost socks". Для "Tired of ___?"
 * @property {string} promise   Обіцянка продукту (англ.)
 * @property {string} offer     Оффер / CTA (англ.)
 * @property {{hook:string, firstLine:string, onScreen:string, body:string, cta:string}} script
 * @property {{ctr:number, hookRate:number, romi:number}} metrics  у відсотках
 * @property {string|null} videoName  Ім'я відеофайлу (сам файл живе лише в браузері)
 */

/**
 * Варіант — одна пропозиція для модифікації.
 * @typedef {Object} Variant
 * @property {string} id
 * @property {string} angle        Кут: "Question", "POV", ...
 * @property {string} hook         0–3 с
 * @property {string} firstLine    3–8 с
 * @property {string} onScreen     8–15 с
 * @property {string} whatChanged  Що змінено відносно переможця
 * @property {'templates'|'claude'|'api'} source
 */

// Поля, які мусить мати кожен варіант (snake_case — так їх повертає LLM у JSON).
export const VARIANT_FIELDS = ['angle', 'hook', 'first_line', 'on_screen', 'what_changed'];

// Таймінги накладання тексту в прев'ю, секунди.
export const TIMELINE = {
  hook: [0, 3],
  firstLine: [3, 8],
  onScreen: [8, 15],
  total: 15,
};

// Межі довжини, які ми просимо в моделі й перевіряємо самі.
export const LIMITS = {
  hookWords: 8,
  onScreenWords: 7,
};
