// Режим 1: шаблонний генератор. Працює без LLM і без інтернету.
// Ідея: беремо перевірені формули хуків з performance-маркетингу і підставляємо в них
// біль (pain / painShort), обіцянку (promise) та оффер (offer) конкретного переможця.
//
// Кожна заготовка — це ЗВ'ЯЗНА ТРІЙКА: хук (0–3 с) + перша фраза (3–8 с) + текст на екрані (8–15 с).
// Перша фраза продовжує саме свій хук, тому варіант читається як одна історія.
//
// (w) => ...  — заготовка з пропуском: отримує переможця w і підставляє його дані.
// () => ...   — фіксований текст, однаковий для всіх переможців.

import { normalizeVariant, dedupeByHook } from './variants.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// 15 прийомів × 2 трійки = 30 заготовок. Це максимум для шаблонного режиму.
export const FORMULAS = [
  { angle: 'POV', why: 'біль подано від першої особи', variants: [
    { hook: (w) => `POV: ${w.pain}`,
      first: () => 'Every. Single. Time.',
      onScreen: () => 'Pairs that never split up' },
    { hook: (w) => `POV: ${w.pain}. Again.`,
      first: () => 'So I finally fixed it for good.',
      onScreen: () => 'Pairs that stay pairs' }] },

  { angle: 'Question', why: 'хук-питання замість твердження', variants: [
    { hook: () => 'Where do your socks actually go?',
      first: () => 'Not to another dimension. The washer just splits them up.',
      onScreen: () => 'A magnet keeps them together' },
    { hook: () => 'Why is there always one sock left?',
      first: () => 'Because nothing keeps the pair together. Until now.',
      onScreen: () => 'Wash together. Stay together.' }] },

  { angle: 'Call-out', why: 'пряме звернення до аудиторії з болем', variants: [
    { hook: (w) => `Tired of ${w.painShort}? Watch this`,
      first: (w) => `${cap(w.promise)}.`,
      onScreen: (w) => w.offer },
    { hook: (w) => `${cap(w.painShort)}? This fixes it`,
      first: () => 'One tiny magnet on the cuff. That\'s it.',
      onScreen: () => 'Never sort socks again' }] },

  { angle: 'Stop doing X', why: 'формула «перестань робити X»', variants: [
    { hook: () => 'Stop buying new socks every month',
      first: () => 'The problem isn\'t your socks. It\'s the wash.',
      onScreen: () => 'Click together. Wash. Still a pair.' },
    { hook: () => 'Stop sorting socks after every wash',
      first: () => 'Let the socks sort themselves.',
      onScreen: () => 'They come out paired' }] },

  { angle: 'Before / after', why: 'контраст до і після', variants: [
    { hook: () => 'My sock drawer: before vs after',
      first: () => 'Before: a pile of singles. After: actual pairs.',
      onScreen: (w) => w.offer },
    { hook: () => 'Laundry day before and after SockLock',
      first: () => 'Same washer. Same dryer. Zero lost socks.',
      onScreen: () => 'The only thing I changed' }] },

  { angle: 'Confession', why: 'особиста історія, м\'якший тон', variants: [
    { hook: () => 'I thought my dryer was eating socks',
      first: () => 'Turns out pairs just drift apart in the drum.',
      onScreen: () => 'Magnet cuff keeps them locked' },
    { hook: (w) => `I used to accept ${w.painShort}`,
      first: () => 'Then I found out it\'s a five-second fix.',
      onScreen: (w) => w.offer }] },

  { angle: 'Challenge', why: 'інтерактив у першу секунду', variants: [
    { hook: () => 'Find a matching pair in 5 seconds',
      first: () => 'Most of us can\'t. That\'s the real morning stress.',
      onScreen: () => 'Never sort socks again' },
    { hook: () => 'Bet you can\'t find a matching pair',
      first: (w) => `Unless ${w.promise}.`,
      onScreen: (w) => w.offer }] },

  { angle: 'Comparison', why: 'порівняння з альтернативою', variants: [
    { hook: () => 'Regular socks vs SockLock in the washer',
      first: () => 'One comes out alone. One comes out as a pair.',
      onScreen: () => 'Same wash. Zero lost socks.' },
    { hook: () => 'Same wash. Two very different results.',
      first: () => 'Left: regular socks. Right: SockLock.',
      onScreen: () => 'Guess which pair survived' }] },

  { angle: 'Curiosity', why: 'інтрига через деталь продукту', variants: [
    { hook: () => 'This tiny magnet fixed my laundry',
      first: () => 'It sits on the cuff. You won\'t even feel it.',
      onScreen: () => 'Take the 60-second quiz' },
    { hook: () => 'The weird reason I never lose socks now',
      first: () => 'There\'s a magnet hidden in the cuff.',
      onScreen: () => 'Pairs click together' }] },

  { angle: 'Problem → fix', why: 'біль і рішення в одному реченні', variants: [
    { hook: (w) => `${cap(w.pain)}? Here's why`,
      first: () => 'Nothing holds the pair together in the wash.',
      onScreen: () => 'Now a magnet does' },
    { hook: (w) => `The real fix for ${w.painShort}`,
      first: () => 'Not a new drawer. Not a sock clip. A magnet.',
      onScreen: (w) => w.offer }] },

  { angle: 'Nobody talks about', why: '«ніхто про це не говорить»', variants: [
    { hook: (w) => `Nobody talks about ${w.painShort}`,
      first: () => 'But everyone has a drawer full of singles.',
      onScreen: () => 'There\'s finally a fix' },
    { hook: () => 'The laundry problem nobody solves',
      first: () => 'Socks go in as pairs and come out alone.',
      onScreen: () => 'Not anymore' }] },

  { angle: 'Price filter', why: 'оффер у хуку як фільтр аудиторії', variants: [
    { hook: (w) => `${cap(w.offer)}. Never lose one again.`,
      first: () => 'Each pair clicks together with a tiny magnet.',
      onScreen: () => 'Take the 60-second quiz' },
    { hook: (w) => `${cap(w.offer)}. Zero lost socks.`,
      first: () => 'And a fresh delivery every quarter.',
      onScreen: () => 'Start with the quiz' }] },

  { angle: 'Myth vs fact', why: 'руйнування міфу', variants: [
    { hook: () => 'Myth: the washer eats your socks',
      first: () => 'Fact: pairs just get separated in the drum.',
      onScreen: () => 'Keep them together' },
    { hook: () => 'Your washer isn\'t eating socks. Here\'s proof.',
      first: () => 'Pairs that stay connected never go missing.',
      onScreen: () => 'Magnet on the cuff' }] },

  { angle: 'Listicle', why: 'формат списку', variants: [
    { hook: () => '3 reasons you keep losing socks',
      first: () => 'Number one: nothing keeps the pair together.',
      onScreen: () => 'Fix all three at once' },
    { hook: () => '2 things I changed to stop losing socks',
      first: () => 'One: new socks. Two: there is no two.',
      onScreen: (w) => w.offer }] },

  { angle: 'Social proof', why: 'голос клієнта', variants: [
    { hook: () => 'My wife made me try these socks',
      first: () => 'Three months later, not one lost sock.',
      onScreen: () => 'Pairs that stay pairs' },
    { hook: () => 'I didn\'t believe the magnet would work',
      first: () => 'Twenty washes later, every pair is still a pair.',
      onScreen: () => 'See it for yourself' }] },
];

// Детермінований генератор випадкових чисел (mulberry32): той самий seed → той самий набір.
// Кнопка «Ще варіанти» просто змінює seed.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Перемішування Фішера–Єйтса з нашим генератором.
function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Генерує до `count` варіантів для переможця.
 * 1) перемішує 15 прийомів; 2) коло 1 — перша трійка кожного прийому, коло 2 — друга;
 * 3) підставляє дані переможця; 4) відрізає перші `count`.
 * @returns {import('./schema.js').Variant[]}
 */
export function generateFromTemplates(winner, count = 20, seed = 1) {
  const order = shuffle(FORMULAS, rng(seed));

  const raw = [];
  for (let round = 0; round < 2; round++) {
    for (const f of order) {
      const t = f.variants[round];
      raw.push({
        angle: f.angle,
        hook: t.hook(winner),
        first_line: t.first(winner),
        on_screen: t.onScreen(winner),
        what_changed: `Кут «${f.angle}»: ${f.why}`,
      });
    }
  }

  // Хук переможця не пропонуємо як «новий» варіант.
  const notOriginal = raw.filter((r) => r.hook.toLowerCase() !== winner.script.hook.toLowerCase());

  const variants = notOriginal
    .map((r, i) => normalizeVariant(r, { id: `${winner.id}-t${seed}-${i + 1}`, source: 'templates' }).variant)
    .filter(Boolean);

  return dedupeByHook(variants).slice(0, count);
}
