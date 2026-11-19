// Fixed scenes for screenshots: ?shot=editor shows the studio with a scene
// loaded; ?shot=cover shows the cover alone, full-bleed. Query params pick
// the look: layout, grade, size, title, subtitle, and photos (a comma list
// of sample names, one per panel). window.__shotReady is set once painted.
import { loadImage } from './cover.js';

export async function runShot(shot, query, state, redraw) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  state.layout = query.get('layout') ?? 'classic';
  state.grade = query.get('grade') ?? 'sunset';
  state.size = query.get('size') ?? 'square';
  state.title = query.get('title') ?? 'Vice Nights';
  state.subtitle = query.get('subtitle') ?? 'Leonida Stories';
  const names = (query.get('photos') ?? 'pier,boulevard,pier').split(',');
  state.photos = [];
  for (const name of names) state.photos.push(await loadImage(`samples/${name}.jpg`));
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
