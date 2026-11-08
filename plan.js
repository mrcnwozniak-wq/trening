// Plan treningowy z PDF "Etap II – Trening oporowy: maszyny".
// rest = przerwa po ćwiczeniu w sekundach, bw = ćwiczenie bez ciężaru (liczymy tylko powtórzenia).
const PLAN = {
  1: {
    name: 'Dzień 1',
    blocks: [
      { id: 'A', ex: [
        { id: 'd1a1', pl: 'Wypychanie nóg na maszynie', en: 'Machine Leg Press', sets: 3, reps: '8', tempo: '2010', rest: 10, img: ['img/d1a1.png'] },
        { id: 'd1a2', pl: 'Rozpiętki na maszynie', en: 'Machine Flyes', sets: 3, reps: '10', tempo: '1010', rest: 120, img: ['img/d1a2.png'] },
      ]},
      { id: 'B', ex: [
        { id: 'd1b1', pl: 'Wypychanie bioder na maszynie', en: 'Machine Hip Thrust', sets: 3, reps: '8', tempo: '2010', rest: 10, img: ['img/d1b1.png'] },
        { id: 'd1b2', pl: 'Ściąganie na maszynie – szeroki nachwyt', en: 'Machine Pull Down – wide, pronated grip', sets: 3, reps: '8', tempo: '2010', rest: 120, img: ['img/d1b2.png'] },
      ]},
      { id: 'C', ex: [
        { id: 'd1c1', pl: 'Uginanie nóg na maszynie – siedząc', en: 'Machine Hamstring Curl – seated', sets: 3, reps: '8', tempo: '2010', rest: 10, img: ['img/d1c1.png'] },
        { id: 'd1c2', pl: 'Unoszenie ramion bokiem na maszynie', en: 'Machine Lateral Raises', sets: 3, reps: '8', tempo: '2010', rest: 120, img: ['img/d1c2.png'] },
      ]},
      { id: 'D', ex: [
        { id: 'd1d1', pl: 'Odwodzenie nóg na maszynie', en: 'Machine Abduction', sets: 3, reps: '8', tempo: '2010', rest: 10, img: ['img/d1d1.png'] },
        { id: 'd1d2', pl: 'Przywodzenie nóg na maszynie', en: 'Machine Adduction', sets: 3, reps: '8', tempo: '2010', rest: 90, img: ['img/d1d2.png'] },
      ]},
      { id: 'E', ex: [
        { id: 'd1e', pl: 'Brzuszki na GHD / na ławce skośnej', en: 'GHD Sit Ups / Decline Bench Sit Ups', sets: 3, reps: '8', tempo: '2010', rest: 60, img: ['img/d1e.png', 'img/d1e_alt.png'], bw: true },
      ]},
    ],
  },
  2: {
    name: 'Dzień 2',
    blocks: [
      { id: 'A', ex: [
        { id: 'd2a1', pl: 'Prostowanie nóg na maszynie', en: 'Machine Leg Extension', sets: 3, reps: '8', tempo: '2010', rest: 10, img: ['img/d2a1.png'] },
        { id: 'd2a2', pl: 'Wyciskanie poziome na maszynie', en: 'Machine Horizontal Press', sets: 3, reps: '8', tempo: '2010', rest: 120, img: ['img/d2a2.png'] },
      ]},
      { id: 'B', ex: [
        { id: 'd2b1', pl: 'Uginanie nóg na maszynie – leżąc', en: 'Machine Hamstring Curl – lying', sets: 3, reps: '10', tempo: '2010', rest: 10, img: ['img/d2b1.png'] },
        { id: 'd2b2', pl: 'Przyciąganie poziome na maszynie', en: 'Machine Horizontal Pull', sets: 3, reps: '8', tempo: '2010', rest: 120, img: ['img/d2b2.png'] },
      ]},
      { id: 'C', ex: [
        { id: 'd2c', pl: 'Wyciskanie nad głowę na maszynie', en: 'Machine Overhead Press', sets: 3, reps: '8', tempo: '2010', rest: 90, img: ['img/d2c.png'] },
      ]},
      { id: 'D', ex: [
        { id: 'd2d1', pl: 'Unoszenie przodostopia', en: 'Tibialis Raises', sets: 3, reps: 'MAX', tempo: '—', rest: 10, img: ['img/d2d1.png'], bw: true },
        { id: 'd2d2', pl: 'Wspięcia na palce na maszynie', en: 'Machine Calf Raises', sets: 3, reps: '10', tempo: '3010', rest: 90, img: ['img/d2d2.png'] },
      ]},
      { id: 'E', ex: [
        { id: 'd2e', pl: 'Prostowanie tułowia na GHD', en: 'GHD Back Extension', sets: 3, reps: '8', tempo: '3010', rest: 60, img: ['img/d2e.png'], bw: true },
      ]},
    ],
  },
};
