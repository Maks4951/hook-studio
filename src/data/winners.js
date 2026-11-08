// Тестові переможці SockLock. Дані вигадані: доступу до реального Airtable немає.
// У бібліотеці користувач може додати власного переможця через форму.

/** @type {import('../lib/schema.js').Winner[]} */
export const SEED_WINNERS = [
  {
    id: 'w1',
    name: 'Куди зникають шкарпетки',
    topic: 'Шкарпетки губляться в пральці',
    pain: 'your socks vanish in the wash',
    painShort: 'lost socks',
    promise: 'a tiny magnet keeps every pair together',
    offer: '5 pairs for $29',
    script: {
      hook: 'Where do all the socks go?',
      firstLine: 'Every wash, one sock disappears.',
      body: 'SockLock pairs have a tiny magnet on the cuff, so they go in together and come out together.',
      onScreen: 'Wash together. Stay together.',
      cta: 'Take the 60-second quiz — 5 pairs for $29.',
    },
    metrics: { ctr: 1.6, hookRate: 38, romi: 152 },
    videoName: null,
  },
  {
    id: 'w2',
    name: 'Ранкові пошуки пари',
    topic: 'Ранкова рутина',
    pain: "you can't find a matching sock",
    painShort: 'the 7am sock hunt',
    promise: 'pairs click together, so your drawer is always matched',
    offer: '5 pairs for $29',
    script: {
      hook: 'Me at 7am looking for a matching sock',
      firstLine: 'Ten minutes. Two different socks. Late again.',
      body: 'SockLock pairs click together, so your drawer is always matched.',
      onScreen: 'Grab a pair. Already matched.',
      cta: 'Take the quiz — 5 pairs for $29.',
    },
    metrics: { ctr: 1.4, hookRate: 34, romi: 141 },
    videoName: null,
  },
  {
    id: 'w3',
    name: 'Подарунок для тата',
    topic: 'Подарунки',
    pain: 'dad only has single socks',
    painShort: "dad's single socks",
    promise: 'a tiny magnet keeps every pair together through every wash',
    offer: '5 pairs for $29',
    script: {
      hook: 'The gift dad will actually use',
      firstLine: 'No more single socks in his drawer.',
      body: 'A tiny magnet keeps every SockLock pair together through every wash.',
      onScreen: '5 pairs. Zero lost socks.',
      cta: 'Take the quiz — 5 pairs for $29.',
    },
    metrics: { ctr: 1.3, hookRate: 31, romi: 138 },
    videoName: null,
  },
];

// Скрипт одним текстом — для показу в інтерфейсі та для промпту.
export function scriptToText(script) {
  return [
    `HOOK (0–3s): ${script.hook}`,
    `LINE (3–8s): ${script.firstLine}`,
    `BODY: ${script.body}`,
    `ON-SCREEN (8–15s): ${script.onScreen}`,
    `CTA: ${script.cta}`,
  ].join('\n');
}
