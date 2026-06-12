// Pipeline de assets: lê PNGs de /raw, apara margens transparentes (sharp),
// redimensiona para a largura-alvo de config.ts e salva em /public/assets.
// Sempre regrava public/assets/manifest.json com o que existe na pasta —
// o Boot só carrega o que está no manifest (sem 404 quando /raw está vazia).
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ASSET_WIDTHS, DEFAULT_ASSET_WIDTH } from '../src/config.ts';

const RAW = 'raw';
const OUT = 'public/assets';

await mkdir(OUT, { recursive: true });

/**
 * A arte vem com checkerboard de "transparência" pintado no pixel (sem canal
 * alpha). Remove por flood-fill a partir das bordas: pixels neutros e claros
 * (cinza/branco do xadrez) conectados à borda viram alpha 0. Brancos internos
 * (olhos, capacete) não encostam na borda e são preservados.
 */
async function stripCheckerboard(inputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;
  const isBg = (i) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    return mx - mn <= 14 && r >= 170;
  };
  const visited = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) {
      return;
    }
    const p = y * w + x;
    if (visited[p] || !isBg(p * channels)) {
      return;
    }
    visited[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length > 0) {
    const p = stack.pop();
    const x = p % w;
    const y = (p - x) / w;
    data[p * channels + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  return sharp(data, { raw: { width: w, height: h, channels } });
}

let processed = 0;
const warnings = [];

if (!existsSync(RAW)) {
  console.log('pasta /raw não encontrada — nada a processar.');
} else {
  const files = (await readdir(RAW)).filter((f) => f.toLowerCase().endsWith('.png'));
  if (files.length === 0) {
    console.log('nenhum PNG em /raw.');
  }
  for (const file of files) {
    // normaliza sufixos de cópia ("nome (2).png" -> "nome.png")
    const name = path.basename(file, path.extname(file)).replace(/\s*\(\d+\)$/, '');
    let width = ASSET_WIDTHS[name];
    if (!width) {
      warnings.push(
        `sem largura-alvo para "${name}" — usando ${DEFAULT_ASSET_WIDTH}px (adicione em ASSET_WIDTHS)`,
      );
      width = DEFAULT_ASSET_WIDTH;
    }
    const cleaned = await stripCheckerboard(path.join(RAW, file));
    await cleaned
      .trim()
      .resize({ width })
      .png()
      .toFile(path.join(OUT, `${name}.png`));
    processed += 1;
    console.log(`ok: ${file} -> ${OUT}/${name}.png @ ${width}px`);
  }
}

const manifest = (await readdir(OUT))
  .filter((f) => f.toLowerCase().endsWith('.png'))
  .map((f) => path.basename(f, '.png'))
  .sort();
await writeFile(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

for (const w of warnings) {
  console.warn('aviso:', w);
}
console.log(`${processed} processado(s), ${manifest.length} asset(s) no manifest.`);
