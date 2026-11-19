// Cover Snap Studio — the editor.
//
// Three photo slots, title/subtitle, layout/grade/size pickers, per-panel
// framing (sliders + drag on the canvas), sample photos, PNG export.
// A `?shot=` query hands control to ./shots.js for fixed screenshot scenes;
// otherwise the studio starts with the sample photos already loaded, so
// the first paint is already a finished cover.
import { renderCover, loadImage, LAYOUTS, GRADES, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');

export const state = {
  layout: 'classic',
  grade: 'sunset',
  size: 'square',
  title: 'Vice Nights',
  subtitle: 'Leonida Stories',
  photos: [], // Image objects, one per slot
  frames: [{}, {}, {}], // { zoom, ox, oy } per panel
  selected: 0, // which panel the framing controls move
};

export function redraw() {
  renderCover(canvas, state);
}

function fillSelect(id, table) {
  const sel = document.getElementById(id);
  for (const [key, v] of Object.entries(table)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = v.label;
    sel.appendChild(opt);
  }
  return sel;
}

function bindEditor() {
  fillSelect('layout', LAYOUTS).addEventListener('change', (e) => {
    state.layout = e.target.value;
    redraw();
  });
  fillSelect('grade', GRADES).addEventListener('change', (e) => {
    state.grade = e.target.value;
    redraw();
  });
  fillSelect('size', SIZES).addEventListener('change', (e) => {
    state.size = e.target.value;
    redraw();
  });
  document.getElementById('title').addEventListener('input', (e) => {
    state.title = e.target.value;
    redraw();
  });
  document.getElementById('subtitle').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    redraw();
  });

  // One file input per slot; picking a photo selects that panel for framing.
  document.querySelectorAll('.slot input[type=file]').forEach((input, i) => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      state.photos[i] = await loadImage(URL.createObjectURL(file));
      state.selected = i;
      markSelected();
      redraw();
      status.textContent = `Panel ${i + 1} photo set — drag the cover to reposition it, or use the sliders.`;
    });
  });

  const zoom = document.getElementById('zoom');
  const ox = document.getElementById('ox');
  const oy = document.getElementById('oy');
  const syncSliders = () => {
    const f = state.frames[state.selected] ?? {};
    zoom.value = f.zoom ?? 1;
    ox.value = f.ox ?? 0;
    oy.value = f.oy ?? 0;
  };
  const applySliders = () => {
    state.frames[state.selected] = { zoom: +zoom.value, ox: +ox.value, oy: +oy.value };
    redraw();
  };
  [zoom, ox, oy].forEach((el) => el.addEventListener('input', applySliders));

  function markSelected() {
    document.querySelectorAll('.slot').forEach((el, i) => {
      el.classList.toggle('active', i === state.selected);
    });
    syncSliders();
  }
  document.querySelectorAll('.slot').forEach((el, i) => {
    el.addEventListener('click', () => {
      state.selected = i;
      markSelected();
    });
  });

  // Drag on the canvas pans the selected panel's photo. Offsets are in
  // fractions of the canvas, so a drag feels the same at any preview size.
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, f: { ...(state.frames[state.selected] ?? {}) } };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    const f = state.frames[state.selected] ?? (state.frames[state.selected] = {});
    f.ox = (drag.f.ox ?? 0) + (e.clientX - drag.x) / r.width;
    f.oy = (drag.f.oy ?? 0) + (e.clientY - drag.y) / r.height;
    f.zoom = drag.f.zoom ?? 1;
    syncSliders();
    redraw();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });

  document.getElementById('samples').addEventListener('click', async () => {
    state.photos = await loadSamples();
    redraw();
    status.textContent = 'Sample photos loaded. Swap any panel with your own photo.';
  });

  document.getElementById('export').addEventListener('click', () => {
    const { w, h } = SIZES[state.size];
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cover-${w}x${h}.png`;
      a.click();
      status.textContent = `Saved cover-${w}x${h}.png`;
    }, 'image/png');
  });

  markSelected();
}

async function loadSamples() {
  return [
    await loadImage('samples/pier.jpg'),
    await loadImage('samples/boulevard.jpg'),
    await loadImage('samples/pier.jpg'),
  ];
}

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  // Bind the editor too, so the editor shot shows populated controls; the
  // shot then overrides the state and the controls are re-synced to it.
  bindEditor();
  runShot(shot, params, state, redraw).then(() => {
    for (const [id, key] of [['layout', 'layout'], ['grade', 'grade'], ['size', 'size']]) {
      const el = document.getElementById(id);
      if (el) el.value = state[key];
    }
    document.getElementById('title').value = state.title;
    document.getElementById('subtitle').value = state.subtitle;
  });
} else {
  bindEditor();
  // Auto-load the samples so the first paint is already a cover.
  (async () => {
    state.photos = await loadSamples();
    redraw();
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
  })();
}
