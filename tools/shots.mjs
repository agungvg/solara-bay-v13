// Solara Bay v13 — screenshot tool. Serves game/ on a local port, loads each
// shot from shots.json in headless Chromium (WebGL allowed), waits for
// window.__ready, captures a 1280x720 PNG into screenshots/ and reports
// console errors. Run: node tools/shots.mjs [port]
import { chromium } from '/opt/muse/assets/spaces/ts-runtime/dist/node_modules/playwright/index.mjs';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = Number(process.argv[2] || 8123);
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf-8'));
mkdirSync(join(root, 'screenshots'), { recursive: true });

const POLICY = '/var/lib/hatch-browser/rootfs-base/usr/share/hatch/chromium/webgl-allowed-domains.txt';
const policy = readFileSync(POLICY);
const args = [
  '--disable-sync', '--disable-domain-reliability', '--disable-component-update',
  '--disable-http2', '--disable-quic',
  '--webrtc-ip-handling-policy=disable_non_proxied_udp', '--force-webrtc-ip-handling-policy',
  '--disable-features=OptimizationHints,OptimizationGuideModelDownloading,AutofillServerCommunication,HatchFortress',
  '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
  `--hatch-webgl-allowed-domains-file=${POLICY}`,
  `--hatch-webgl-allowed-domains-sha256=${createHash('sha256').update(policy).digest('hex')}`,
];

const server = spawn('node', ['serve.ts', '--port', String(port)], { cwd: root, stdio: 'pipe' });
await new Promise((res) => setTimeout(res, 1200));

let failures = 0;
try {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', headless: true, args });
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`file://${join(root, 'game', 'index.html')}${shot.query}`, { waitUntil: 'load', timeout: 30000 });
    try {
      await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
    } catch {
      errors.push('TIMEOUT waiting for __ready');
    }
    await page.waitForTimeout(400);
    const out = join(root, 'screenshots', shot.name);
    await page.screenshot({ path: out, timeout: 180000 });
    const pageErrors = await page.evaluate(() => window.__errors || []);
    const all = [...errors, ...pageErrors];
    const size = (await import('node:fs')).statSync(out).size;
    console.log(`${shot.name}: ${size} bytes, errors=${all.length}${all.length ? ' :: ' + all.slice(0, 3).join(' | ') : ''}`);
    if (all.length) failures += 1;
    await page.close();
  }
  await browser.close();
} finally {
  server.kill();
}
process.exit(failures ? 1 : 0);
