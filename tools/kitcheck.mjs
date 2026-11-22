// Solara Bay v13 — kit check (local mirror of the sealed scorer's gate):
// 1. game_files: game/ plain files/dirs only, <=993 entries, <=48 MiB,
//    index.html regular and <=1 MiB.
// 2. references: no http(s) URLs, no bare specifiers outside the import map,
//    no paths climbing out of game/ in index.html or reachable scripts.
// 3. screenshots: 3-4 files, names valid, <=256 KiB, PNG/JPEG, long side
//    <=1280, short side >=480.
// 4. dossier_matches: main.ts output byte-identical across two runs and
//    <=1.5 MiB. Also: every .js parses as an ES module.
// Run: node tools/kitcheck.mjs
import { readdirSync, statSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, extname, basename, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const gameDir = join(root, 'game');
const shotsDir = join(root, 'screenshots');
let passes = 0, fails = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (ok) passes += 1; else fails += 1;
}

// --- 1. game_files
let entries = 0, bytes = 0, badPaths = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    entries += 1;
    if (st.isSymbolicLink()) badPaths.push(`symlink: ${relative(root, p)}`);
    if (st.isFile()) bytes += st.size;
    if (relative(gameDir, p).length > 1000) badPaths.push(`path too long: ${relative(root, p)}`);
    if (st.isDirectory()) walk(p);
  }
}
walk(gameDir);
check('game_files count<=993', entries <= 993, `${entries} entries`);
check('game_files size<=48MiB', bytes <= 48 * 1024 * 1024, `${(bytes / 1048576).toFixed(2)} MiB`);
check('game_files plain files', badPaths.length === 0, badPaths.join('; '));
const idx = join(gameDir, 'index.html');
check('index.html <=1MiB', existsSync(idx) && statSync(idx).isFile() && statSync(idx).size <= 1048576, `${statSync(idx).size} bytes`);

// --- 2. references (reachable scripts from index.html)
const html = readFileSync(idx, 'utf-8');
const srcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map((m) => m[1]);
const importmap = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
let importMapOk = true;
try { JSON.parse(importmap[1]); } catch { importMapOk = false; }
check('importmap parses', importMapOk);
const reachable = new Set();
function collectJs(file) {
  if (reachable.has(file)) return;
  reachable.add(file);
  const text = readFileSync(file, 'utf-8');
  for (const m of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) resolveImport(file, m[1]);
  for (const m of text.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) resolveImport(file, m[1]);
}
function resolveImport(fromFile, spec) {
  if (spec.startsWith('http') || spec.startsWith('//')) { badPaths.push(`external URL in ${basename(fromFile)}: ${spec}`); return; }
  if (spec === 'three') return; // import-mapped
  if (!spec.startsWith('.')) { badPaths.push(`bare specifier in ${basename(fromFile)}: ${spec}`); return; }
  const target = join(dirname(fromFile), spec);
  if (!target.startsWith(gameDir)) { badPaths.push(`escapes game/: ${spec}`); return; }
  if (existsSync(target)) collectJs(target);
}
for (const s of srcs) {
  const f = join(gameDir, s.replace(/^\.\//, ''));
  if (existsSync(f)) collectJs(f);
  else badPaths.push(`missing script: ${s}`);
}
check('references: no external/bare/escaping imports', badPaths.length === 0, badPaths.join('; ') || `${reachable.size} reachable files`);
const httpInHtml = /https?:\/\//.test(html.replace(/https:\/\/make\.fun/g, ''));
check('index.html has no external URLs', !/src="https?:|href="https?:/.test(html));

// --- 3. screenshots
const shots = existsSync(shotsDir) ? readdirSync(shotsDir).filter((f) => !f.startsWith('.')) : [];
check('screenshots count 3-4', shots.length >= 3 && shots.length <= 4, `${shots.length} files`);
let shotOk = true, shotDetail = [];
for (const f of shots) {
  const p = join(shotsDir, f);
  const st = statSync(p);
  const buf = readFileSync(p);
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
  let w = 0, h = 0;
  if (isPng) { w = buf.readUInt32BE(16); h = buf.readUInt32BE(20); }
  if (isJpg) {
    // scan JPEG segments for SOF0/SOF2
    let off = 2;
    while (off < buf.length - 9) {
      if (buf[off] !== 0xff) break;
      const marker = buf[off + 1];
      const len = buf.readUInt16BE(off + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        h = buf.readUInt16BE(off + 5); w = buf.readUInt16BE(off + 7); break;
      }
      off += 2 + len;
    }
  }
  const ok = /^[A-Za-z0-9._-]{1,128}$/.test(f) && !f.startsWith('.') && !f.startsWith('-')
    && st.size <= 262144 && (isPng || isJpg) && Math.max(w, h) <= 1280 && Math.min(w, h) >= 480;
  if (!ok) shotOk = false;
  shotDetail.push(`${f} ${st.size}B ${w}x${h} ${isPng ? 'PNG' : isJpg ? 'JPG' : '?'}`);
}
check('screenshots size/format/dimensions', shotOk, shotDetail.join(' | '));

// --- 4. dossier: run main.ts twice, compare bytes
const outA = join(root, '.kitcheck-a'), outB = join(root, '.kitcheck-b');
for (const d of [outA, outB]) rmSync(d, { recursive: true, force: true });
const runA = spawnSync('node', ['main.ts'], { cwd: root, env: { ...process.env, MAKEFUN_OUTPUT_DIR: outA } });
const runB = spawnSync('node', ['main.ts'], { cwd: root, env: { ...process.env, MAKEFUN_OUTPUT_DIR: outB } });
let dossierOk = runA.status === 0 && runB.status === 0;
let dossierDetail = '';
if (dossierOk) {
  const a = readFileSync(join(outA, 'dossier.json'));
  const b = readFileSync(join(outB, 'dossier.json'));
  dossierOk = a.equals(b) && a.length <= 1572864;
  dossierDetail = `dossier.json ${a.length} bytes, deterministic=${a.equals(b)}`;
} else {
  dossierDetail = `main.ts failed: ${(runA.stderr || runB.stderr || '').toString().slice(0, 300)}`;
}
check('dossier_matches (deterministic, <=1.5MiB)', dossierOk, dossierDetail);
for (const d of [outA, outB]) rmSync(d, { recursive: true, force: true });

// --- 5. js parses as ES module
let parseOk = true, parseDetail = [];
for (const f of reachable) {
  const r = spawnSync('node', ['--check', f], { encoding: 'utf-8' });
  if (r.status !== 0) { parseOk = false; parseDetail.push(`${basename(f)}: ${r.stderr.split('\n')[0]}`); }
}
check('js_parses (ES modules)', parseOk, parseDetail.join('; ') || `${reachable.size} files`);

console.log(`\nKIT-CHECK: ${passes} pass / ${fails} fail`);
process.exit(fails ? 1 : 0);
