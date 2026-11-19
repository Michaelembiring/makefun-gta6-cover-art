// Cover Snap Studio — the cover engine (canvas 2D, offline, system fonts only).
//
// A cover is three things stacked: a multi-panel photo collage, a colour
// grade, and poster lettering. Panels are polygons in normalised space, so
// the cuts stay angled at any export size; each panel cover-fits one photo
// with its own zoom / offset. The grade is a ctx.filter on the photos plus
// a soft-light tint wash and a vignette. Lettering is a bold condensed
// title (system stack only — no game logos, artwork or fonts) with a dark
// outline and gradient fill over a top scrim, a letterspaced subtitle on a
// dark bottom band with an accent rule, and a small maker's mark.
//
// renderCover(canvas, state) is the single entry point. state:
//   { layout, grade, size, title, subtitle,
//     photos: [Image, ...],              // one per slot; panels cycle through
//     frames: [{ zoom, ox, oy }, ...] }  // per-panel framing

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square post · 1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait post · 1080 × 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide post · 1920 × 1080' },
};

// Panel outlines, normalised (0..1). Angled cuts, not a grid: straight
// rectangles read as a photo grid, diagonal cuts read as a cover.
export const LAYOUTS = {
  classic: {
    label: 'Classic collage',
    panels: [
      [[0, 0], [0.47, 0], [0.41, 1], [0, 1]], // tall hero, left
      [[0.47, 0], [1, 0], [1, 0.46], [0.43, 0.53]], // top-right scene
      [[0.43, 0.53], [1, 0.46], [1, 1], [0.41, 1]], // bottom-right detail
    ],
  },
  slash: {
    label: 'Diagonal slash',
    panels: [
      [[0, 0], [0.64, 0], [0.36, 1], [0, 1]], // big diagonal field
      [[0.64, 0], [1, 0], [1, 1], [0.36, 1]], // opposite field
      [[0, 0.62], [0.56, 0.42], [0.48, 1], [0, 1]], // wedge across the join
    ],
  },
  trio: {
    label: 'Trio strips',
    panels: [
      [[0, 0], [0.37, 0], [0.31, 1], [0, 1]],
      [[0.37, 0], [0.69, 0], [0.65, 1], [0.31, 1]],
      [[0.69, 0], [1, 0], [1, 1], [0.65, 1]],
    ],
  },
};

// A grade: a filter for the photos, three tint stops washed over them in
// soft-light, and the title palette. `accent` rules the subtitle band.
export const GRADES = {
  sunset: {
    label: 'Vice sunset',
    filter: 'saturate(1.35) contrast(1.08) brightness(1.03) hue-rotate(-8deg)',
    tint: ['rgba(255, 94, 58, 0.20)', 'rgba(255, 0, 128, 0.16)', 'rgba(24, 0, 48, 0.26)'],
    titleA: '#ffffff', titleB: '#ffb03a', accent: '#ff2e88',
  },
  neon: {
    label: 'Neon nights',
    filter: 'saturate(1.55) contrast(1.12) brightness(0.97) hue-rotate(14deg)',
    tint: ['rgba(0, 229, 255, 0.15)', 'rgba(255, 0, 200, 0.18)', 'rgba(2, 0, 32, 0.36)'],
    titleA: '#eaffff', titleB: '#00e5ff', accent: '#ffea00',
  },
  day: {
    label: 'Leonida day',
    filter: 'saturate(1.22) contrast(1.05) brightness(1.06)',
    tint: ['rgba(255, 220, 120, 0.10)', 'rgba(0, 180, 255, 0.08)', 'rgba(0, 20, 44, 0.13)'],
    titleA: '#ffffff', titleB: '#7be0ff', accent: '#ff5e3a',
  },
  noir: {
    label: 'Noir',
    filter: 'grayscale(1) contrast(1.28) brightness(1.02)',
    tint: ['rgba(255, 255, 255, 0.06)', 'rgba(0, 0, 0, 0.12)', 'rgba(0, 0, 0, 0.42)'],
    titleA: '#ffffff', titleB: '#cfd6dd', accent: '#e8e8e8',
  },
};

const CONDENSED = `'Arial Narrow', 'Liberation Sans Narrow', Impact, 'Arial Black', sans-serif`;

/** Loads an image from a URL; resolves once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function trace(ctx, poly, W, H) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x * W, y * H);
    else ctx.lineTo(x * W, y * H);
  });
  ctx.closePath();
}

// Cover-fit one photo into a panel's bounding box, framed by the panel's
// zoom (around centre) and offset (fractions of the box).
function drawPhoto(ctx, img, poly, frame, W, H) {
  const xs = poly.map((p) => p[0] * W);
  const ys = poly.map((p) => p[1] * H);
  const bx = Math.min(...xs);
  const by = Math.min(...ys);
  const bw = Math.max(...xs) - bx;
  const bh = Math.max(...ys) - by;
  const zoom = frame?.zoom ?? 1;
  const scale = Math.max(bw / img.width, bh / img.height) * zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const cx = bx + bw / 2 + (frame?.ox ?? 0) * bw;
  const cy = by + bh / 2 + (frame?.oy ?? 0) * bh;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
}

function gradeWash(ctx, grade, W, H) {
  const wash = ctx.createLinearGradient(0, 0, W * 0.3, H);
  wash.addColorStop(0, grade.tint[0]);
  wash.addColorStop(0.55, grade.tint[1]);
  wash.addColorStop(1, grade.tint[2]);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  // Vignette: bright centre, darker corners.
  const vig = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.35,
    W / 2, H / 2, Math.max(W, H) * 0.78,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.30)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function lettering(ctx, state, W, H, grade) {
  const title = (state.title || '').trim().toUpperCase();
  const sub = (state.subtitle || '').trim().toUpperCase();

  // Top scrim so the title reads even over a bright photo.
  const scrim = ctx.createLinearGradient(0, 0, 0, H * 0.36);
  scrim.addColorStop(0, 'rgba(5, 0, 16, 0.64)');
  scrim.addColorStop(1, 'rgba(5, 0, 16, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, H * 0.36);

  if (title) {
    ctx.save();
    ctx.translate(W / 2, H * 0.045);
    ctx.transform(1, 0, -0.06, 1, 0, 0); // a whisper of poster italic
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    let size = H * 0.115;
    const width = () => {
      ctx.font = `900 ${size}px ${CONDENSED}`;
      return ctx.measureText(title).width;
    };
    while (width() > W * 0.92 && size > 10) size *= 0.94;
    const fill = ctx.createLinearGradient(0, 0, 0, size * 1.15);
    fill.addColorStop(0, grade.titleA);
    fill.addColorStop(1, grade.titleB);
    ctx.lineWidth = Math.max(2, size * 0.16);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0b0014';
    ctx.strokeText(title, 0, 0);
    ctx.fillStyle = fill;
    ctx.fillText(title, 0, 0);
    ctx.restore();
  }

  const bandH = sub ? H * 0.085 : 0;
  if (sub) {
    ctx.fillStyle = 'rgba(5, 0, 16, 0.78)';
    ctx.fillRect(0, H - bandH, W, bandH);
    ctx.fillStyle = grade.accent;
    ctx.fillRect(0, H - bandH, W, Math.max(3, H * 0.006));
    ctx.font = `700 ${bandH * 0.42}px ${CONDENSED}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    // Letterspacing by hand: canvas letter-spacing is not universal.
    ctx.fillText(sub.split('').join('  '), W / 2, H - bandH / 2 + 1);
  }

  // Maker's mark sits just above the subtitle band when one is present,
  // so it never collides with the centred subtitle text.
  ctx.font = `700 ${Math.max(10, H * 0.02)}px ${CONDENSED}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('COVER SNAP STUDIO', W * 0.985, sub ? H - bandH - H * 0.012 : H * 0.972);
}

/** Renders the whole cover onto `canvas` (resized to the chosen size). */
export function renderCover(canvas, state) {
  const size = SIZES[state.size] ?? SIZES.square;
  const W = (canvas.width = size.w);
  const H = (canvas.height = size.h);
  const ctx = canvas.getContext('2d');
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.classic;
  const grade = GRADES[state.grade] ?? GRADES.sunset;

  ctx.fillStyle = '#0b0014';
  ctx.fillRect(0, 0, W, H);

  const photos = state.photos ?? [];
  layout.panels.forEach((poly, i) => {
    const img = photos.length ? photos[i % photos.length] : null;
    ctx.save();
    trace(ctx, poly, W, H);
    ctx.clip();
    if (img) {
      ctx.filter = grade.filter;
      drawPhoto(ctx, img, poly, state.frames?.[i], W, H);
      ctx.filter = 'none';
    } else {
      ctx.fillStyle = '#241335';
      ctx.fillRect(0, 0, W, H);
    }
    gradeWash(ctx, grade, W, H);
    ctx.restore();
  });

  // Thick white dividers: the lines that make it read as a cover collage.
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(6, W * 0.009);
  ctx.lineJoin = 'round';
  for (const poly of layout.panels) {
    trace(ctx, poly, W, H);
    ctx.stroke();
  }
  ctx.restore();

  lettering(ctx, state, W, H, grade);
}
