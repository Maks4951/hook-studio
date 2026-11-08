// Модель даних утиліти. Це "контракт" між генераторами (шаблони, Claude, API)
// та інтерфейсом: будь-яке джерело має повернути варіанти саме такої форми.
// Таймлайн відео (сегменти, ліміти слів, позиції тексту) описаний у ./timeline.js.

/**
 * Переможець — креатив, з якого робимо модифікації.
 * @typedef {Object} Winner
 * @property {string} id
 * @property {string} name      Назва для команди (українською)
 * @property {string} topic     Топік / біль
 * @property {string} pain      Біль як закінчене речення без крапки (англ.), напр. "your socks vanish in the wash".
 *                              Підставляється в шаблони, тому має читатися після "POV:". До 6 слів.
 * @property {string} painShort Біль як іменник (англ.), до 4 слів, напр. "lost socks". Для "Tired of ___?"
 * @property {string} promise   Обіцянка продукту (англ.)
 * @property {string} offer     Оффер / CTA (англ.)
 * @property {{hook:string, firstLine:string, onScreen:string, body:string, cta:string}} script
 * @property {{ctr:number, hookRate:number, romi:number}} metrics  у відсотках
 * @property {string|null} videoName  Ім'я відеофайлу (сам файл живе лише в браузері)
 * @property {import('./timeline.js').Timeline} [timeline]  розмітка відео (якщо немає — автоматична)
 */

/**
 * Варіант — одна пропозиція для модифікації.
 * @typedef {Object} Variant
 * @property {string} id
 * @property {string} angle        Кут: "Question", "POV", ...
 * @property {Object<string,string>} texts  текст для кожного сегмента таймлайну: { hook: "...", onScreen: "..." }
 * @property {string} hook         текст першого сегмента-хука (для заголовка картки і пошуку дублікатів)
 * @property {string[]} unchanged  сегменти, де лишився текст переможця
 * @property {string[]} warnings   перевищення лімітів слів
 * @property {string} whatChanged  Що змінено відносно переможця
 * @property {'templates'|'claude'|'api'} source
 */

export {};
