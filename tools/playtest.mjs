// Solara Bay v13 — playtest: mission 1 end to end in a real browser.
// Loads ?playtest=1, drives the hero car to the pier waypoint with real
// keyboard input (steering from the live game state), and checks that the
// mission stage advances, the speed rises, and zero console errors occur.
// Run: node tools/playtest.mjs [port]
import { chromium } from '/opt/muse/assets/spaces/ts-runtime/dist/node_modules/playwright/index.mjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = Number(process.argv[2] || 8124);

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

let result = { pass: false, detail: 'not run' };
try {
  const browser = await chromium.launch({ executablePath: '/opt/meta-chromium/chrome', headless: true, args });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`file://${join(root, 'game', 'index.html')}?playtest=1`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });

  // start mission 1 and drive to the pier waypoint with real keys
  await page.evaluate(() => { window.__game.startMission(1); });
  await page.keyboard.down('KeyW');
  const t0 = Date.now();
  let stage = 1, maxSpeed = 0, reached = false;
  // NOTE: software WebGL (SwiftShader) runs the fixed-step sim at a fraction
  // of wall time (dt is capped per frame), so the drive needs minutes of
  // wall time to cover the 66 m to the pier. On a real GPU this is seconds.
  while (Date.now() - t0 < 300000) {
    const s = await page.evaluate(() => ({
      stage: window.__game.state.stage,
      speed: window.__game.state.speedKmh,
      px: window.__game.drive.pos.x, pz: window.__game.drive.pos.z,
      wx: window.__game.waypoint.x, wz: window.__game.waypoint.z,
      heading: window.__game.drive.heading,
      reached: window.__game.waypointReached(),
    }));
    stage = s.stage; maxSpeed = Math.max(maxSpeed, s.speed); reached = s.reached;
    if (reached) break;
    // steer toward the waypoint: desired heading vs current heading
    const desired = Math.atan2(s.wx - s.px, s.wz - s.pz);
    let diff = desired - s.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > 0.12) { await page.keyboard.down('KeyA'); await page.keyboard.up('KeyD'); }
    else if (diff < -0.12) { await page.keyboard.down('KeyD'); await page.keyboard.up('KeyA'); }
    else { await page.keyboard.up('KeyA'); await page.keyboard.up('KeyD'); }
    await page.waitForTimeout(500);
  }
  await page.keyboard.up('KeyW');
  await page.keyboard.up('KeyA');
  await page.keyboard.up('KeyD');
  const pageErrors = await page.evaluate(() => window.__errors || []);
  const allErrors = [...errors, ...pageErrors];
  // also verify enter/exit + weapon switch + meta screen work
  const extra = await page.evaluate(() => {
    const g = window.__game;
    g.exitCar();
    const onFoot = g.state.onFoot;
    g.enterCar();
    const backInCar = !g.state.onFoot;
    const w = g.state.selectWeapon(4);
    return { onFoot, backInCar, weaponOk: w.ok, weapon: g.state.weaponSlot };
  });
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(300);
  const metaVisible = await page.evaluate(() => document.getElementById('metaScreen').style.display === 'block');
  await page.keyboard.press('KeyM');
  result = {
    pass: reached && stage >= 2 && maxSpeed > 20 && allErrors.length === 0 && extra.onFoot && extra.backInCar && extra.weaponOk && metaVisible,
    detail: `mission1 stage=${stage} (reached=${reached}) maxSpeed=${maxSpeed.toFixed(1)} km/h errors=${allErrors.length} ${allErrors.slice(0, 2).join(' | ')} | onFoot=${extra.onFoot} backInCar=${extra.backInCar} weapon=${extra.weapon} meta=${metaVisible}`,
  };
  console.log('PLAYTEST', result.pass ? 'PASS' : 'FAIL', '-', result.detail);
  await browser.close();
} finally {
  server.kill();
}
process.exit(result.pass ? 0 : 1);
