/**
 * Generates all PWA / Android icons and splash screens from inline SVG art.
 *
 *   npm run generate:icons
 *
 * Requires `sharp` (a devDependency). Output goes to /public/icons and
 * /public/splash. Re-run any time you tweak the artwork below.
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const iconsDir = path.join(root, "public", "icons");
const splashDir = path.join(root, "public", "splash");
const resDir = path.join(root, "android", "app", "src", "main", "res");

// Soft blush the Android adaptive-icon background sits on (flower reads on it).
const ANDROID_BG = "#fbeef2";

/** Shared gradient defs for the flower mark (dusty rose petals, soft-gold center). */
function flowerDefs() {
  return `
    <radialGradient id="petalGrad" cx="50%" cy="36%" r="70%">
      <stop offset="0%" stop-color="#fdeef4"/>
      <stop offset="100%" stop-color="#d488a8"/>
    </radialGradient>
    <radialGradient id="centerGrad" cx="50%" cy="40%" r="62%">
      <stop offset="0%" stop-color="#f7e7c2"/>
      <stop offset="100%" stop-color="#d9b46b"/>
    </radialGradient>`;
}

/** Full defs for the rounded-tile icon (background + flower). */
function gradDefs() {
  return `
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fdf6f2"/>
      <stop offset="55%" stop-color="#f7dde7"/>
      <stop offset="100%" stop-color="#e9def2"/>
    </linearGradient>
    ${flowerDefs()}`;
}

/** A single soft, round-tipped petal pointing up, base at the origin. */
function petalPath(size) {
  const L = size * 0.31; // length from center to tip
  const W = size * 0.21; // widest point
  const base = size * 0.02;
  const f = (n) => n.toFixed(2);
  return (
    `M0 ${f(-base)}` +
    `C ${f(W * 0.72)} ${f(-0.1 * L)}, ${f(W * 0.64)} ${f(-0.72 * L)}, ${f(W * 0.22)} ${f(-0.95 * L)}` +
    `C ${f(W * 0.1)} ${f(-1.02 * L)}, ${f(-W * 0.1)} ${f(-1.02 * L)}, ${f(-W * 0.22)} ${f(-0.95 * L)}` +
    `C ${f(-W * 0.64)} ${f(-0.72 * L)}, ${f(-W * 0.72)} ${f(-0.1 * L)}, 0 ${f(-base)} Z`
  );
}

/** Minimal single blossom, centered in a `size` x `size` viewBox. */
function flowerMark(size) {
  const c = size / 2;
  const sw = size * 0.0085;
  const petal = petalPath(size);
  const petals = [0, 72, 144, 216, 288]
    .map(
      (a) =>
        `<path d="${petal}" transform="rotate(${a})" fill="url(#petalGrad)" stroke="#c46d92" stroke-width="${sw}" stroke-linejoin="round"/>`
    )
    .join("");
  return `
    <g transform="translate(${c} ${c})">
      ${petals}
      <circle r="${size * 0.07}" fill="url(#centerGrad)"/>
      <circle r="${size * 0.028}" fill="#f6efe3"/>
    </g>`;
}

function sparkle(x, y, r) {
  return `<g transform="translate(${x} ${y})" fill="#ffffff" opacity="0.85">
    <path d="M0 ${-r} C ${r * 0.2} ${-r * 0.2}, ${r * 0.2} ${-r * 0.2}, ${r} 0
             C ${r * 0.2} ${r * 0.2}, ${r * 0.2} ${r * 0.2}, 0 ${r}
             C ${-r * 0.2} ${r * 0.2}, ${-r * 0.2} ${r * 0.2}, ${-r} 0
             C ${-r * 0.2} ${-r * 0.2}, ${-r * 0.2} ${-r * 0.2}, 0 ${-r} Z"/>
  </g>`;
}

function iconSvg(size, { bg = true } = {}) {
  const bgRect = bg
    ? `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bgGrad)"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>${gradDefs()}</defs>
    ${bgRect}
    ${flowerMark(size)}
  </svg>`;
}

/** Maskable icons need the art inside the inner 80% "safe zone". */
function maskableSvg(size) {
  const inner = size * 0.78;
  const pad = (size - inner) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>${gradDefs()}</defs>
    <rect width="${size}" height="${size}" fill="url(#bgGrad)"/>
    <g transform="translate(${pad} ${pad})">${flowerMark(inner)}</g>
  </svg>`;
}

function splashSvg(w, h) {
  const s = Math.min(w, h) * 0.34;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fdf6f2"/>
        <stop offset="55%" stop-color="#f7dde7"/>
        <stop offset="100%" stop-color="#e9def2"/>
      </linearGradient>
      ${flowerDefs()}
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bgGrad)"/>
    <g transform="translate(${(w - s) / 2} ${(h - s) / 2 - s * 0.25})">${flowerMark(s)}</g>
    <text x="${w / 2}" y="${h / 2 + s * 0.5}" text-anchor="middle"
      font-family="Georgia, 'Cormorant Garamond', serif" font-size="${s * 0.2}"
      fill="#a8567a" font-weight="600" letter-spacing="1">Pink Petals</text>
  </svg>`;
}

/** Flower only, on a transparent canvas, sized for an adaptive-icon foreground. */
function foregroundSvg(size) {
  const fs = size * 0.82; // keep the bloom inside the adaptive safe zone
  const pad = (size - fs) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>${flowerDefs()}</defs>
    <g transform="translate(${pad} ${pad})">${flowerMark(fs)}</g>
  </svg>`;
}

async function render(svg, file) {
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log("  ✓", path.relative(root, file));
}

/** Regenerate the native Android launcher icons (adaptive + legacy). */
async function generateAndroidIcons() {
  if (!existsSync(resDir)) {
    console.log("\n(skipping Android icons — no android/ project found)");
    return;
  }
  console.log("Generating Android launcher icons…");
  const legacy = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  const fg = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
  for (const [d, px] of Object.entries(legacy)) {
    const dir = path.join(resDir, `mipmap-${d}`);
    await mkdir(dir, { recursive: true });
    await render(iconSvg(px, { bg: true }), path.join(dir, "ic_launcher.png"));
    await render(iconSvg(px, { bg: true }), path.join(dir, "ic_launcher_round.png"));
    await render(foregroundSvg(fg[d]), path.join(dir, "ic_launcher_foreground.png"));
  }
  await writeFile(
    path.join(resDir, "values", "ic_launcher_background.xml"),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${ANDROID_BG.toUpperCase()}</color>\n</resources>\n`
  );
  console.log("  ✓", "android …/values/ic_launcher_background.xml");
}

async function main() {
  await mkdir(iconsDir, { recursive: true });
  await mkdir(splashDir, { recursive: true });

  console.log("Generating app icons…");
  await render(iconSvg(192), path.join(iconsDir, "icon-192.png"));
  await render(iconSvg(512), path.join(iconsDir, "icon-512.png"));
  await render(iconSvg(180), path.join(iconsDir, "apple-touch-icon.png"));
  await render(iconSvg(1024, { bg: true }), path.join(iconsDir, "icon-1024.png"));
  await render(maskableSvg(192), path.join(iconsDir, "maskable-192.png"));
  await render(maskableSvg(512), path.join(iconsDir, "maskable-512.png"));
  // Square source used by Capacitor / @capacitor/assets
  await render(iconSvg(1024, { bg: true }), path.join(root, "public", "icon-source.png"));
  // Keep the browser-tab favicon in sync with the same artwork.
  await writeFile(path.join(root, "public", "favicon.svg"), iconSvg(64, { bg: true }));
  console.log("  ✓", "public/favicon.svg");

  console.log("Generating splash screens…");
  const splashes = [
    [1242, 2688],
    [1170, 2532],
    [1080, 1920],
    [828, 1792],
    [750, 1334],
    [2048, 2732],
  ];
  for (const [w, h] of splashes) {
    await render(splashSvg(w, h), path.join(splashDir, `splash-${w}x${h}.png`));
  }
  await render(splashSvg(2732, 2732), path.join(root, "public", "splash-source.png"));

  await generateAndroidIcons();

  console.log("\nAll assets generated ✨");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
