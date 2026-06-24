#!/usr/bin/env node
// Regenerate work thumbnails + the README gallery block.
//
// Source of truth is the **Works** table in README.md. A row is a work if it has
// either a local `claude-design-works/FILE.html` source OR an explicit
// `[Thumb](assets/thumbnails/FILE)` link. For local works without a Thumb we
// render the page in headless Chromium and save a PNG under assets/thumbnails/;
// works with an explicit Thumb (e.g. a GIF, or an external project hosted in
// another repo) use that image as-is and are not rendered. Either way we rebuild
// the block between <!-- GALLERY:START --> and <!-- GALLERY:END -->.
//
// Run: node .github/scripts/gen-thumbnails.mjs
//   SKIP_RENDER=1 node ...  — rebuild only the gallery block, skipping rendering
//   (and Playwright); useful after editing the table without touching a work.
import http from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const README = path.join(ROOT, 'README.md');
const THUMB_DIR = path.join(ROOT, 'assets', 'thumbnails');
const PORT = 8731;

// --- viewport / capture tuning ---------------------------------------------
// 1200 wide stays above the works' 640px mobile breakpoints (desktop layout),
// 1.6:1 crops to a clean "card". We capture the top fold, not the full scroll.
const VW = 1200, VH = 750, DSF = 1;
const COLS = 2;          // gallery grid columns
const IMG_W = 420;       // displayed thumbnail width in the README

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
};

function serve(rootDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const filePath = path.join(rootDir, urlPath);
      if (!filePath.startsWith(rootDir)) { res.writeHead(403).end(); return; }
      stat(filePath).then((s) => {
        if (s.isDirectory()) { res.writeHead(403).end(); return; }
        res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' });
        createReadStream(filePath).pipe(res);
      }).catch(() => { res.writeHead(404).end('not found'); });
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

// Parse the Works table. Rows look like:
// | **Name** — desc | Type | Date | [View](https://…) · [Source](claude-design-works/FILE) |
// | **Name** — desc | Type | Date | [View](https://…) · [Source](https://…) · [Thumb](assets/thumbnails/FILE) |
// A row counts as a work if it has a local claude-design-works/*.html source OR
// an explicit [Thumb](assets/thumbnails/…) link (external/custom-thumbnail works).
function parseWorks(md) {
  const works = [];
  for (const line of md.split('\n')) {
    if (!line.startsWith('| ')) continue;
    const src = line.match(/\(claude-design-works\/([^)\s]+\.html)\)/);
    const thumb = line.match(/\[Thumb\]\((assets\/thumbnails\/[^)\s]+)\)/);
    if (!src && !thumb) continue;                         // skip header/separator/non-work rows
    const name = (line.match(/\*\*(.+?)\*\*/) || [, (src ? src[1] : 'work')])[1];
    const view = (line.match(/\[View\]\((https?:\/\/[^)]+)\)/) || [])[1] || null;
    works.push({ file: src ? src[1] : null, name: name.trim(), view, thumb: thumb ? thumb[1] : null });
  }
  return works;
}

// An explicit [Thumb] wins; otherwise a local work's thumbnail is its rendered PNG.
const thumbSrc = (w) => w.thumb || `assets/thumbnails/${w.file.replace(/\.html$/, '.png')}`;

function galleryHTML(works) {
  const cell = (w) => {
    const img = `<img src="${thumbSrc(w)}" alt="${w.name}" width="${IMG_W}">`;
    const inner = w.view ? `<a href="${w.view}">${img}</a>` : img;
    return `<td width="50%" align="center" valign="top">${inner}<br><sub><b>${w.name}</b></sub></td>`;
  };
  let out = '<table>\n';
  for (let i = 0; i < works.length; i += COLS) {
    out += '  <tr>\n';
    for (const w of works.slice(i, i + COLS)) out += `    ${cell(w)}\n`;
    out += '  </tr>\n';
  }
  return out + '</table>';
}

async function main() {
  await mkdir(THUMB_DIR, { recursive: true });
  let md = await readFile(README, 'utf8');
  const works = parseWorks(md);
  if (!works.length) throw new Error('No works parsed from README table — refusing to wipe the gallery.');

  // Only local works without an explicit [Thumb] get rendered; Thumb works
  // (GIFs, external projects) supply their own image and are left untouched.
  const toRender = works.filter((w) => w.file && !w.thumb);
  if (toRender.length && !process.env.SKIP_RENDER) {
    const { chromium } = await import('playwright');
    const server = await serve(ROOT);
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: DSF });

    for (const w of toRender) {
      const url = `http://127.0.0.1:${PORT}/claude-design-works/${w.file}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(2200);                    // let fonts + bar animations settle
      const outPng = path.join(THUMB_DIR, w.file.replace(/\.html$/, '.png'));
      await page.screenshot({ path: outPng, clip: { x: 0, y: 0, width: VW, height: VH } });
      console.log('thumb', path.relative(ROOT, outPng));
    }

    await browser.close();
    server.close();
  }

  const block = `<!-- GALLERY:START -->\n${galleryHTML(works)}\n<!-- GALLERY:END -->`;
  const re = /<!-- GALLERY:START -->[\s\S]*?<!-- GALLERY:END -->/;
  if (!re.test(md)) throw new Error('Gallery markers not found in README.md.');
  const next = md.replace(re, block);
  if (next !== md) { await writeFile(README, next); console.log('README gallery updated'); }
  console.log(`done — ${works.length} works`);
}

main().catch((e) => { console.error(e); process.exit(1); });
