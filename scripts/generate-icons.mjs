/**
 * Generates all PWA / Android icons and splash screens for each accent color.
 *
 *   npm run generate:icons
 *
 * Requires `sharp` (a devDependency). Output goes to /public/icons/<color>/
 * and /public/splash. Android icons go to android/.../res/mipmap-<dpi>-<color>/.
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

const COLORS = {
  pink: {
    petalLight: "#fdeef4", petalDark: "#d488a8", petalStroke: "#c46d92",
    centerLight: "#f7e7c2", centerDark: "#d9b46b",
    bgGrad: ["#fdf6f2", "#f7dde7", "#e9def2"],
    bgColor: "#FBEEF2",
    splashText: "#a8567a",
  },
  blue: {
    petalLight: "#e8f0fd", petalDark: "#7ba9cd", petalStroke: "#6d9fc4",
    centerLight: "#d4e0f0", centerDark: "#7ba9cd",
    bgGrad: ["#f0f5fd", "#dde8f5", "#d0ddf0"],
    bgColor: "#EEF2FB",
    splashText: "#5588b0",
  },
  green: {
    petalLight: "#e8f5ea", petalDark: "#7bb88a", petalStroke: "#6da87a",
    centerLight: "#d4e8d8", centerDark: "#7bb88a",
    bgGrad: ["#f0f8f0", "#ddefe0", "#d0e8d4"],
    bgColor: "#EEF8F0",
    splashText: "#558860",
  },
  gray: {
    petalLight: "#f0ecf0", petalDark: "#9a8a9a", petalStroke: "#8a7a8a",
    centerLight: "#d8d0d8", centerDark: "#9a8a9a",
    bgGrad: ["#f5f2f5", "#e8e0e8", "#ddd5dd"],
    bgColor: "#F2EEF2",
    splashText: "#7a6a7a",
  },
};

function flowerDefs(color) {
  const c = COLORS[color];
  return `
    <radialGradient id="petalGrad" cx="50%" cy="36%" r="70%">
      <stop offset="0%" stop-color="${c.petalLight}"/>
      <stop offset="100%" stop-color="${c.petalDark}"/>
    </radialGradient>
    <radialGradient id="centerGrad" cx="50%" cy="40%" r="62%">
      <stop offset="0%" stop-color="${c.centerLight}"/>
      <stop offset="100%" stop-color="${c.centerDark}"/>
    </radialGradient>`;
}

function gradDefs(color) {
  const c = COLORS[color];
  return `
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c.bgGrad[0]}"/>
      <stop offset="55%" stop-color="${c.bgGrad[1]}"/>
      <stop offset="100%" stop-color="${c.bgGrad[2]}"/>
    </linearGradient>
    ${flowerDefs(color)}`;
}

function petalPath(size) {
  const L = size * 0.31;
  const W = size * 0.21;
  const base = size * 0.02;
  const f = (n) => n.toFixed(2);
  return (
    `M0 ${f(-base)}` +
    `C ${f(W * 0.72)} ${f(-0.1 * L)}, ${f(W * 0.64)} ${f(-0.72 * L)}, ${f(W * 0.22)} ${f(-0.95 * L)}` +
    `C ${f(W * 0.1)} ${f(-1.02 * L)}, ${f(-W * 0.1)} ${f(-1.02 * L)}, ${f(-W * 0.22)} ${f(-0.95 * L)}` +
    `C ${f(-W * 0.64)} ${f(-0.72 * L)}, ${f(-W * 0.72)} ${f(-0.1 * L)}, 0 ${f(-base)} Z`
  );
}

function flowerMark(size, color) {
  const c = COLORS[color];
  const sw = size * 0.0085;
  const petal = petalPath(size);
  const petals = [0, 72, 144, 216, 288]
    .map(
      (a) =>
        `<path d="${petal}" transform="rotate(${a})" fill="url(#petalGrad)" stroke="${c.petalStroke}" stroke-width="${sw}" stroke-linejoin="round"/>`
    )
    .join("");
  return `
    <g transform="translate(${size / 2} ${size / 2})">
      ${petals}
      <circle r="${size * 0.07}" fill="url(#centerGrad)"/>
      <circle r="${size * 0.028}" fill="${c.centerLight}"/>
    </g>`;
}

function iconSvg(size, color, { bg = true } = {}) {
  const c = COLORS[color];
  const bgRect = bg
    ? `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bgGrad)"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>${gradDefs(color)}</defs>
    ${bgRect}
    ${flowerMark(size, color)}
  </svg>`;
}

function maskableSvg(size, color) {
  const inner = size * 0.78;
  const pad = (size - inner) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>${gradDefs(color)}</defs>
    <rect width="${size}" height="${size}" fill="url(#bgGrad)"/>
    <g transform="translate(${pad} ${pad})">${flowerMark(inner, color)}</g>
  </svg>`;
}

function splashSvg(w, h, color) {
  const c = COLORS[color];
  const s = Math.min(w, h) * 0.34;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c.bgGrad[0]}"/>
        <stop offset="55%" stop-color="${c.bgGrad[1]}"/>
        <stop offset="100%" stop-color="${c.bgGrad[2]}"/>
      </linearGradient>
      ${flowerDefs(color)}
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bgGrad)"/>
    <g transform="translate(${(w - s) / 2} ${(h - s) / 2 - s * 0.25})">${flowerMark(s, color)}</g>
    <text x="${w / 2}" y="${h / 2 + s * 0.5}" text-anchor="middle"
      font-family="Georgia, 'Cormorant Garamond', serif" font-size="${s * 0.2}"
      fill="${c.splashText}" font-weight="600" letter-spacing="1">Pink Petals</text>
  </svg>`;
}

function foregroundSvg(size, color) {
  const fs = size * 0.82;
  const pad = (size - fs) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>${flowerDefs(color)}</defs>
    <g transform="translate(${pad} ${pad})">${flowerMark(fs, color)}</g>
  </svg>`;
}

async function render(svg, file) {
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log("  ✓", path.relative(root, file));
}

async function generateAndroidIcons() {
  if (!existsSync(resDir)) {
    console.log("\n(skipping Android icons — no android/ project found)");
    return;
  }
  const legacy = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  const fg = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

  for (const [color] of Object.entries(COLORS)) {
    const suffix = color === "pink" ? "" : `_${color}`;
    console.log(`\nGenerating Android icons for ${color}…`);

    for (const [d, px] of Object.entries(legacy)) {
      const dir = path.join(resDir, `mipmap-${d}`);
      await mkdir(dir, { recursive: true });
      await render(iconSvg(px, color, { bg: true }), path.join(dir, `ic_launcher${suffix}.png`));
      await render(iconSvg(px, color, { bg: true }), path.join(dir, `ic_launcher${suffix}_round.png`));
      await render(foregroundSvg(fg[d], color), path.join(dir, `ic_launcher${suffix}_foreground.png`));
    }

    // Adaptive icon XML for API 26+
    const anydpiDir = path.join(resDir, "mipmap-anydpi-v26");
    await mkdir(anydpiDir, { recursive: true });
    const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background${suffix}"/>\n    <foreground android:drawable="@mipmap/ic_launcher${suffix}_foreground"/>\n</adaptive-icon>\n`;
    await writeFile(path.join(anydpiDir, `ic_launcher${suffix}.xml`), adaptiveXml);
    await writeFile(path.join(anydpiDir, `ic_launcher${suffix}_round.xml`), adaptiveXml);

    // Background color resource
    const valuesDir = path.join(resDir, "values");
    await mkdir(valuesDir, { recursive: true });
    const bgColor = COLORS[color].bgColor;
    await writeFile(
      path.join(valuesDir, `ic_launcher_background${suffix}.xml`),
      `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background${suffix}">${bgColor}</color>\n</resources>\n`
    );
  }
}

async function main() {
  await mkdir(iconsDir, { recursive: true });
  await mkdir(splashDir, { recursive: true });

  for (const [color] of Object.entries(COLORS)) {
    const colorIconsDir = path.join(iconsDir, color);
    await mkdir(colorIconsDir, { recursive: true });
    console.log(`\nGenerating PWA icons for ${color}…`);
    await render(iconSvg(192, color), path.join(colorIconsDir, "icon-192.png"));
    await render(iconSvg(512, color), path.join(colorIconsDir, "icon-512.png"));
    await render(iconSvg(180, color), path.join(colorIconsDir, "apple-touch-icon.png"));
    await render(iconSvg(1024, color, { bg: true }), path.join(colorIconsDir, "icon-1024.png"));
    await render(maskableSvg(192, color), path.join(colorIconsDir, "maskable-192.png"));
    await render(maskableSvg(512, color), path.join(colorIconsDir, "maskable-512.png"));
  }

  // Default (pink) icons go to root icons dir too
  await writeFile(path.join(root, "public", "favicon.svg"), iconSvg(64, "pink", { bg: true }));

  console.log("\nGenerating splash screens (pink)…");
  const splashes = [
    [1242, 2688], [1170, 2532], [1080, 1920],
    [828, 1792], [750, 1334], [2048, 2732],
  ];
  for (const [w, h] of splashes) {
    await render(splashSvg(w, h, "pink"), path.join(splashDir, `splash-${w}x${h}.png`));
  }
  await render(splashSvg(2732, 2732, "pink"), path.join(root, "public", "splash-source.png"));

  await generateAndroidIcons();

  console.log("\nAll assets generated ✨");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
