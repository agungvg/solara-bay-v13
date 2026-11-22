// Solara Bay v13 — HUD: DOM overlay + circular minimap canvas + the full
// MAP/STATS meta screen. Every element names its source field in GameState;
// the HUD presents state, it never owns it.
import { GAME_TITLE, GAME_SUBTITLE } from './config.js';

const CSS = `
* { box-sizing: border-box; }
#hud { position: fixed; inset: 0; pointer-events: none; font-family: Arial, Helvetica, sans-serif; color: #fff; z-index: 5; }
.panel { background: rgba(8, 12, 20, 0.72); border: 1px solid rgba(255,255,255,0.14); border-radius: 8px; padding: 10px 12px; backdrop-filter: blur(2px); }
#missionCard { position: absolute; top: 14px; left: 14px; width: 400px; }
#missionCard .mTag { display: inline-block; background: #ffb020; color: #111; font-weight: 800; font-size: 12px; padding: 2px 7px; border-radius: 4px; margin-right: 8px; }
#missionCard .mName { font-weight: 800; font-size: 15px; letter-spacing: 0.5px; }
#missionCard h1 { margin: 6px 0 2px; font-size: 26px; letter-spacing: 0.5px; }
#missionCard .mDesc { font-size: 13px; color: #d8dee8; margin: 2px 0 8px; }
#missionCard .timer { position: absolute; top: 10px; right: 12px; color: #ffb020; font-weight: 800; font-size: 15px; }
.stageBar { height: 8px; background: rgba(255,255,255,0.18); border-radius: 4px; overflow: hidden; }
.stageBar > div { height: 100%; background: linear-gradient(90deg, #ffb020, #ff5a1e); }
.stageRow { display: flex; gap: 10px; align-items: center; margin-top: 6px; font-size: 13px; }
.stageRow .stageTag { background: #ff5a1e; color: #fff; font-weight: 800; font-size: 12px; padding: 2px 7px; border-radius: 4px; }
#kpdPanel { position: absolute; top: 168px; left: 14px; width: 250px; font-size: 13px; }
#kpdPanel h3 { margin: 0 0 6px; color: #ffb020; font-size: 14px; letter-spacing: 1px; }
#kpdPanel h3 span { float: right; color: #fff; }
#kpdPanel .unit { display: flex; justify-content: space-between; padding: 2px 0; }
#kpdPanel .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
#districtCard { position: absolute; top: 330px; left: 14px; width: 250px; }
#districtCard h3 { margin: 0; color: #ffb020; font-size: 16px; letter-spacing: 1px; }
#districtCard .dLabel { font-size: 12px; color: #d8dee8; }
#districtCard .dBar { height: 7px; background: rgba(255,255,255,0.18); border-radius: 4px; margin-top: 6px; overflow: hidden; }
#districtCard .dBar > div { height: 100%; background: #37c978; }
#districtCard .dFriendly { font-size: 12px; margin-top: 4px; color: #d8dee8; }
#minimapWrap { position: absolute; left: 14px; bottom: 64px; width: 210px; height: 210px; }
#minimap { width: 210px; height: 210px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.85); background: transparent; }
#vitals { position: absolute; left: 14px; bottom: 14px; font-size: 12px; font-weight: 700; width: 210px; }
#vitals .bar { height: 9px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden; margin: 3px 0 6px; }
#vitals .bar > div { height: 100%; }
#cashBox { position: absolute; top: 18px; right: 16px; text-align: right; }
#cashBox .clock { font-size: 14px; font-weight: 700; }
#cashBox .cash { font-size: 34px; font-weight: 900; color: #37e08a; text-shadow: 0 2px 8px rgba(0,0,0,0.5); }
#cashBox .stars { font-size: 22px; letter-spacing: 3px; color: #ffd23c; text-shadow: 0 1px 4px rgba(0,0,0,0.6); }
#cashBox .stars .off { color: rgba(255,255,255,0.35); }
#cashBox .rankTag { display: inline-block; background: #37c978; color: #062b16; font-weight: 800; font-size: 12px; padding: 2px 8px; border-radius: 4px; }
#cashBox .rpBar { width: 200px; height: 7px; background: rgba(255,255,255,0.2); border-radius: 4px; margin: 6px 0 3px auto; overflow: hidden; }
#cashBox .rpBar > div { height: 100%; background: #37e08a; }
#cashBox .rpText { font-size: 12px; font-weight: 700; color: #e8eef4; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
#airTag { position: absolute; top: 168px; right: 16px; background: #d83c2e; color: #fff; font-weight: 800; font-size: 13px; padding: 5px 10px; border-radius: 5px; letter-spacing: 0.5px; }
#weapons { position: absolute; top: 200px; right: 16px; display: flex; gap: 8px; }
#weapons .slot { width: 62px; background: rgba(8,12,20,0.72); border: 1px solid rgba(255,255,255,0.16); border-radius: 7px; padding: 6px 4px; text-align: center; font-size: 11px; }
#weapons .slot.active { border-color: #ffb020; background: rgba(60,40,8,0.8); }
#weapons .slot .num { font-size: 11px; color: #ffb020; font-weight: 800; }
#weapons .slot .icon { font-size: 17px; }
#weapons .slot .wname { font-weight: 800; font-size: 11px; }
#weapons .slot .ammo { color: #d8dee8; }
#crewCards { position: absolute; top: 292px; right: 16px; width: 300px; display: flex; flex-direction: column; gap: 8px; }
#crewCards .crew { display: flex; align-items: center; gap: 8px; background: rgba(8,12,20,0.72); border: 1px solid rgba(255,255,255,0.14); border-radius: 7px; padding: 7px 10px; font-size: 12px; }
#crewCards .key { background: #ffb020; color: #111; font-weight: 800; border-radius: 4px; padding: 2px 7px; }
#crewCards .avatar { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; background: #2e7ad8; }
#crewCards .cAbility { font-weight: 800; color: #ffb020; }
#crewCards .cName { color: #d8dee8; }
#crewCards .cd { margin-left: auto; color: #ffb020; font-weight: 800; }
#dialogue { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); width: 560px; background: rgba(8,12,20,0.8); border: 1px solid rgba(255,255,255,0.14); border-radius: 8px; padding: 10px 14px; font-size: 14px; }
#dialogue .dAvatar { display: inline-block; width: 42px; height: 42px; border-radius: 6px; background: #2e7ad8; color: #fff; font-weight: 800; text-align: center; line-height: 42px; margin-right: 10px; vertical-align: top; }
#dialogue .dName { color: #6db3ff; font-weight: 800; font-size: 13px; }
#speedBox { position: absolute; right: 16px; bottom: 14px; text-align: right; }
#speedBox .cond { font-size: 13px; font-weight: 800; color: #ffb020; }
#speedBox .condBar { width: 170px; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; margin: 4px 0 2px auto; overflow: hidden; }
#speedBox .condBar > div { height: 100%; background: #ff5a1e; }
#speedBox .speed { font-size: 46px; font-weight: 900; line-height: 1; }
#speedBox .speed small { font-size: 15px; font-weight: 700; }
#speedBox .radio { font-size: 12px; font-weight: 700; color: #37e08a; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
#crewChips { position: absolute; top: 64px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; }
#crewChips .chip { background: rgba(8,12,20,0.75); border: 1px solid rgba(255,255,255,0.2); border-radius: 20px; padding: 5px 12px; font-size: 12px; font-weight: 800; }
#crewChips .chip .dot { color: #37e08a; }
#inSight { position: absolute; top: 100px; left: 50%; transform: translateX(-50%); background: #d83c2e; color: #fff; font-weight: 800; font-size: 13px; padding: 5px 12px; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.35); }
#hintLine { position: absolute; bottom: 150px; left: 50%; transform: translateX(-50%); background: rgba(8,12,20,0.8); border-radius: 6px; padding: 7px 12px; font-size: 13px; font-weight: 700; }
#feedLine { position: absolute; bottom: 116px; left: 50%; transform: translateX(-50%); background: rgba(8,12,20,0.8); border-radius: 6px; padding: 7px 12px; font-size: 13px; }
#metaScreen { position: fixed; inset: 0; background: #0a0e16; color: #fff; z-index: 10; overflow: auto; font-family: Arial, Helvetica, sans-serif; padding: 12px 20px; display: none; }
#metaScreen h1 { font-size: 28px; letter-spacing: 4px; margin: 0; }
#metaScreen .sub { color: #ffb020; font-weight: 800; font-size: 12px; letter-spacing: 1px; margin-bottom: 10px; }
#metaScreen .tabs { position: absolute; top: 26px; right: 26px; display: flex; gap: 18px; font-weight: 800; font-size: 14px; color: #9aa4b2; }
#metaScreen .tabs .on { color: #ffb020; border-bottom: 3px solid #ffb020; padding-bottom: 4px; }
#metaScreen .cols { display: grid; grid-template-columns: 420px 1fr 420px; gap: 14px; }
#metaScreen .cols > div { min-width: 0; }
#metaScreen .mbox { background: #121826; border: 1px solid rgba(255,255,255,0.08); border-radius: 9px; padding: 9px 12px; margin-bottom: 8px; }
#metaScreen .mbox h3 { margin: 0 0 8px; color: #ffb020; font-size: 13px; letter-spacing: 1px; }
#metaScreen .ring { width: 92px; height: 92px; border-radius: 50%; border: 9px solid #2a3346; border-top-color: #ffb020; border-right-color: #ffb020; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; }
#metaScreen .ring small { font-size: 10px; color: #9aa4b2; }
#metaScreen .track { display: flex; align-items: center; gap: 10px; font-size: 13px; margin: 4px 0; }
#metaScreen .track .tname { width: 150px; }
#metaScreen .track .tbar { flex: 1; height: 8px; background: #2a3346; border-radius: 4px; overflow: hidden; }
#metaScreen .track .tbar > div { height: 100%; background: #35c4e8; }
#metaScreen .ratings { display: flex; gap: 8px; }
#metaScreen .ratings .r { width: 44px; height: 44px; background: #1c2436; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 900; font-size: 18px; }
#metaScreen .ratings .r small { font-size: 9px; color: #9aa4b2; }
#metaScreen .careerGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
#metaScreen .careerGrid .cell { background: #1c2436; border-radius: 7px; padding: 5px 10px; font-size: 12px; color: #9aa4b2; }
#metaScreen .careerGrid .cell b { display: block; font-size: 17px; color: #fff; }
#metaScreen .upg { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
#metaScreen .upg .owned { color: #37e08a; font-weight: 800; }
#metaScreen .upg .locked { color: #ff5a5a; font-weight: 800; }
#metaScreen .saveRow { display: flex; justify-content: space-between; font-size: 13px; padding: 5px 0; }
#metaScreen .saveRow .filled { color: #fff; }
#metaScreen .distRow { display: flex; align-items: center; gap: 10px; font-size: 12px; margin: 5px 0; }
#metaScreen .distRow .dname { width: 140px; font-weight: 700; }
#metaScreen .distRow .dbar { flex: 1; height: 7px; background: #2a3346; border-radius: 4px; overflow: hidden; }
#metaScreen .distRow .dbar > div { height: 100%; background: #37c978; }
#startScreen { position: fixed; inset: 0; background: linear-gradient(180deg, rgba(6,10,20,0.55), rgba(6,10,20,0.85)); z-index: 20; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; font-family: Arial, Helvetica, sans-serif; text-align: center; }
#startScreen h1 { font-size: 64px; letter-spacing: 8px; margin: 0; text-shadow: 0 4px 24px rgba(0,0,0,0.7); }
#startScreen .tag { color: #ffb020; font-weight: 800; letter-spacing: 2px; margin: 10px 0 30px; }
#startScreen .keys { background: rgba(8,12,20,0.8); border-radius: 10px; padding: 16px 22px; font-size: 14px; line-height: 1.9; text-align: left; }
#startScreen .play { margin-top: 26px; background: #ff5a1e; color: #fff; border: none; border-radius: 8px; font-size: 20px; font-weight: 900; padding: 14px 44px; cursor: pointer; pointer-events: auto; }
`;

function el(tag, id, cls) {
  const e = document.createElement(tag);
  if (id) e.id = id;
  if (cls) e.className = cls;
  return e;
}

export class Hud {
  constructor(root) {
    this.root = root;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    this.hud = el('div', 'hud');
    this.hud.innerHTML = `
      <div id="missionCard" class="panel">
        <div class="timer" id="hudTimer">2:23</div>
        <span class="mTag" id="hudMissionTag">MISSION 6</span><span class="mName" id="hudMissionName">ORU'S FALL</span>
        <h1 id="hudMissionTitle">WRECK THE REGENT</h1>
        <div class="mDesc" id="hudMissionDesc"></div>
        <div class="stageBar"><div id="hudStageFill" style="width:75%"></div></div>
        <div class="stageRow"><span class="stageTag" id="hudStageTag">STAGE 3/4</span><span>NEXT <b id="hudNext">Vanish</b></span></div>
      </div>
      <div id="kpdPanel" class="panel">
        <h3>KPD RESPONSE <span id="hudUnitCount">6 UNITS</span></h3>
        <div id="hudUnits"></div>
        <div style="color:#d8dee8;font-size:12px;margin-top:4px">+1 more · roadblock ahead</div>
      </div>
      <div id="districtCard" class="panel">
        <h3 id="hudDistrict">KUMALA STRAND</h3>
        <div class="dLabel" id="hudDistrictLabel">Strand Boulevard</div>
        <div class="dBar"><div id="hudDistrictFill" style="width:58%"></div></div>
        <div class="dFriendly" id="hudDistrictFriendly">FRIENDLY · 58</div>
      </div>
      <div id="minimapWrap"><canvas id="minimap" width="420" height="420"></canvas></div>
      <div id="vitals">
        <div>HEALTH <span id="hudHealthNum" style="float:right">72</span></div>
        <div class="bar"><div id="hudHealthFill" style="width:72%;background:#37e08a"></div></div>
        <div>ARMOUR <span id="hudArmourNum" style="float:right">55</span></div>
        <div class="bar"><div id="hudArmourFill" style="width:55%;background:#35a8e8"></div></div>
      </div>
      <div id="cashBox">
        <div class="clock" id="hudClock">12:00</div>
        <div class="cash" id="hudCash">$18,450</div>
        <div class="stars" id="hudStars"></div>
        <div><span class="rankTag" id="hudRank">RANK B</span> <b id="hudRankLabel">FIXER</b></div>
        <div class="rpBar"><div id="hudRpFill" style="width:75%"></div></div>
        <div class="rpText" id="hudRpText">3900 / 5200 RP</div>
      </div>
      <div id="airTag">AIR UNIT DEPLOYED</div>
      <div id="weapons"></div>
      <div id="crewCards"></div>
      <div id="crewChips"></div>
      <div id="inSight">IN SIGHT</div>
      <div id="hintLine" style="display:none">💡 <span id="hudHint"></span></div>
      <div id="feedLine" style="display:none">📻 <span id="hudFeed"></span></div>
      <div id="dialogue"><span class="dAvatar" id="hudDlgAvatar">MK</span><span><span class="dName" id="hudDlgName">MIRA KESANG · FIXER</span><br><span id="hudDlgText"></span></span></div>
      <div id="speedBox">
        <div class="cond" id="hudCond">RUKAN PELO GT&nbsp;&nbsp;62% DENTED</div>
        <div class="condBar"><div id="hudCondFill" style="width:62%"></div></div>
        <div class="speed"><span id="hudSpeed">111</span><small> KM/H</small></div>
        <div class="radio" id="hudRadio">♪ OMBO 98.4 — Island Pop</div>
      </div>`;
    root.appendChild(this.hud);
    this.minimap = this.hud.querySelector('#minimap');
    this.mmCtx = this.minimap.getContext('2d');
    this.meta = el('div', 'metaScreen');
    root.appendChild(this.meta);
    this.start = null;
  }

  showStart(onPlay) {
    this.start = el('div', 'startScreen');
    this.start.innerHTML = `
      <h1>${GAME_TITLE}</h1>
      <div class="tag">${GAME_SUBTITLE.toUpperCase()}</div>
      <div class="keys">
        <b>W A S D</b> — drive / walk &nbsp;·&nbsp; <b>E</b> — enter / exit car<br>
        <b>SPACE</b> — handbrake &nbsp;·&nbsp; <b>1–6</b> — weapons &nbsp;·&nbsp; <b>Z X C</b> — crew abilities<br>
        <b>M</b> — map &amp; stats &nbsp;·&nbsp; <b>F5</b> — quick save &nbsp;·&nbsp; <b>MOUSE</b> — look around
      </div>
      <button class="play" id="playBtn">▶&nbsp; PLAY SOLARA BAY</button>`;
    this.root.appendChild(this.start);
    this.start.querySelector('#playBtn').addEventListener('click', onPlay);
  }

  hideStart() {
    if (this.start) { this.start.remove(); this.start = null; }
  }

  fmtTime(secs) {
    const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  update(state, playerPos, policePos) {
    const $ = (id) => this.hud.querySelector(id);
    $('#hudTimer').textContent = this.fmtTime(state.timer);
    $('#hudMissionTag').textContent = `MISSION ${state.mission.id}`;
    $('#hudMissionName').textContent = state.mission.name;
    $('#hudMissionTitle').textContent = state.mission.title;
    $('#hudMissionDesc').textContent = state.mission.desc;
    $('#hudStageFill').style.width = `${(state.stage / state.stages) * 100}%`;
    $('#hudStageTag').textContent = `STAGE ${state.stage}/${state.stages}`;
    $('#hudNext').textContent = state.next;
    $('#hudUnitCount').textContent = `${state.units.length} UNITS`;
    $('#hudUnits').innerHTML = state.units.slice(0, 5).map((u) => `
      <div class="unit"><span><span class="dot" style="background:${u.state === 'pursue' ? '#ff4444' : '#35c4e8'}"></span>${u.id}</span><span style="color:#ffb020">${u.role}</span><span>${u.dist} m</span></div>`).join('');
    $('#hudDistrict').textContent = state.district.name;
    $('#hudDistrictLabel').textContent = state.district.label;
    $('#hudDistrictFill').style.width = `${state.district.friendly}%`;
    $('#hudDistrictFriendly').textContent = `FRIENDLY · ${state.district.friendly}`;
    $('#hudHealthNum').textContent = state.health;
    $('#hudHealthFill').style.width = `${state.health}%`;
    $('#hudArmourNum').textContent = state.armour;
    $('#hudArmourFill').style.width = `${state.armour}%`;
    $('#hudClock').textContent = state.clock;
    $('#hudCash').textContent = `$${state.cash.toLocaleString('en-US')}`;
    $('#hudStars').innerHTML = Array.from({ length: 6 }, (_, i) =>
      `<span class="${i < state.wanted ? '' : 'off'}">★</span>`).join('');
    $('#hudRank').textContent = `RANK ${state.rank}`;
    $('#hudRankLabel').textContent = state.rankLabel;
    $('#hudRpFill').style.width = `${(state.rp / state.rpMax) * 100}%`;
    $('#hudRpText').textContent = `${state.rp.toLocaleString('en-US')} / ${state.rpMax.toLocaleString('en-US')} RP`;
    $('#airTag').style.display = state.airUnit ? 'block' : 'none';
    $('#weapons').innerHTML = state.weapons.map((w) => `
      <div class="slot ${w.slot === state.weaponSlot ? 'active' : ''}">
        <div class="num">${w.slot}</div><div class="icon">${w.icon}</div>
        <div class="wname">${w.name}</div><div class="ammo">${w.ammo}</div>
      </div>`).join('');
    $('#crewCards').innerHTML = state.crew.slice(0, 3).map((c) => `
      <div class="crew"><span class="key">${c.key}</span><span class="avatar">${c.initials}</span>
      <span><span class="cAbility">${c.ability}</span><br><span class="cName">${c.name} · ${c.role}</span></span>
      <span class="cd">${c.cooldown > 0 ? c.cooldown + 's' : ''}</span></div>`).join('');
    $('#crewChips').innerHTML = state.crew.slice(3).map((c) => `
      <span class="chip"><span class="dot">●</span> ${c.name.split(' ')[0].toUpperCase()} · ${c.ability}</span>`).join('');
    $('#inSight').style.display = state.inSight ? 'block' : 'none';
    const hint = $('#hintLine');
    if (state.hint) { hint.style.display = 'block'; $('#hudHint').textContent = state.hint; }
    else hint.style.display = 'none';
    const feed = $('#feedLine');
    if (state.policeFeed) { feed.style.display = 'block'; $('#hudFeed').textContent = state.policeFeed; }
    else feed.style.display = 'none';
    if (state.dialogue) {
      $('#hudDlgAvatar').textContent = state.dialogue.initials;
      $('#hudDlgName').textContent = `${state.dialogue.name} · ${state.dialogue.role}`;
      $('#hudDlgText').textContent = state.dialogue.text;
    }
    $('#hudCond').innerHTML = state.onFoot
      ? 'ON FOOT&nbsp;&nbsp;WALKING'
      : `${state.carName}&nbsp;&nbsp;${state.condition}% DENTED`;
    $('#hudCondFill').style.width = `${state.condition}%`;
    $('#hudSpeed').textContent = Math.round(state.speedKmh);
    $('#hudRadio').textContent = state.radio;
    this.drawMinimap(state, playerPos, policePos);
  }

  // Map projection: world x -60..70 -> 0..1, world z -70..70 -> 0..1.
  // Sea starts at world x = 14 (mx 0.57); the boulevard is world x = 0.
  mapX(x) { return (x + 60) / 130; }
  mapY(z) { return (z + 70) / 140; }

  drawMinimap(state, playerPos, policePos) {
    const ctx = this.mmCtx, S = 420;
    const X = (x) => this.mapX(x) * S;
    const Y = (z) => this.mapY(z) * S;
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); ctx.clip();
    // sea (right) + land (left) + beach strip
    ctx.fillStyle = '#1d7fb8'; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#232d3d'; ctx.fillRect(0, 0, X(14), S);
    ctx.fillStyle = '#e8c98d'; ctx.fillRect(X(8), 0, X(14) - X(8), S);
    // street grid
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
    for (let i = 1; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(0, (i * S) / 6); ctx.lineTo(X(14), (i * S) / 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo((i * X(14)) / 6, 0); ctx.lineTo((i * X(14)) / 6, S); ctx.stroke();
    }
    // main boulevard (world x = 0)
    ctx.strokeStyle = '#ffb020'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(X(0), 0); ctx.lineTo(X(0), S); ctx.stroke();
    // district dots
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial';
    ctx.fillText('N', 14, 26);
    for (const d of state.districts) {
      ctx.fillStyle = '#37c978';
      ctx.beginPath(); ctx.arc(X(d.x), Y(d.z), 4, 0, Math.PI * 2); ctx.fill();
    }
    // route: dotted pink line to the pier (world 44, 62)
    ctx.strokeStyle = '#ff5fa8'; ctx.lineWidth = 3; ctx.setLineDash([2, 9]);
    ctx.beginPath();
    ctx.moveTo(X(playerPos.x), Y(playerPos.z));
    ctx.lineTo(X(44), Y(62));
    ctx.stroke();
    ctx.setLineDash([]);
    // police blips
    ctx.fillStyle = '#ff4444';
    for (const p of policePos || []) {
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.z), 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // player arrow
    const px = X(playerPos.x), py = Y(playerPos.z);
    ctx.fillStyle = '#ffb020';
    ctx.beginPath();
    ctx.moveTo(px, py - 11); ctx.lineTo(px - 8, py + 8); ctx.lineTo(px + 8, py + 8);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }

  showMeta(state) {
    const m = state;
    const ratings = m.missions.map((x) => `<div class="r">${x.rating}<small>M${x.id}</small></div>`).join('');
    const tracks = m.tracks.map((t) => `
      <div class="track"><span class="tname">${t.name}</span><span class="tbar"><div style="width:${(t.done / t.total) * 100}%"></div></span><span>${t.done}/${t.total}</span></div>`).join('');
    const districts = m.districts.map((d) => `
      <div class="distRow"><span class="dname">${d.name}</span><span class="dbar"><div style="width:${d.friendly}%"></div></span><span>${d.friendly}</span></div>`).join('');
    const upgrades = m.workshop.upgrades.map((u) => `
      <div class="upg"><span>${u.name}</span><span>$${u.price.toLocaleString('en-US')} <span class="${u.state === 'OWNED' ? 'owned' : 'locked'}">${u.state}</span></span></div>`).join('');
    const saves = m.saves.map((s) => `
      <div class="saveRow"><span>SLOT ${s.slot}</span><span class="${s.filled ? 'filled' : ''}">${s.filled ? s.label : 'EMPTY SLOT'}</span></div>`).join('');
    this.meta.innerHTML = `
      <h1>${GAME_TITLE}</h1>
      <div class="sub">MAP · STORY · STATS · CREW · WORKSHOP · SAVE</div>
      <div class="tabs"><span class="on">MAP</span><span>STORY</span><span>STATS</span><span>CREW</span><span>SETTINGS</span><span>CONTROLS</span><span>SAVE</span></div>
      <div class="cols">
        <div>
          <div class="mbox">
            <canvas id="metaMap" width="400" height="250" style="width:100%;border-radius:6px"></canvas>
            <div style="color:#ffb020;font-weight:800;font-size:12px;margin-top:6px">8 DISTRICTS · ROUTE TO KUMALA PIER</div>
          </div>
          <div class="mbox"><h3>DISTRICT STANDING</h3>${districts}</div>
        </div>
        <div>
          <div class="mbox" style="display:flex;gap:18px;align-items:center">
            <div class="ring">${m.career.completion}%<small>COMPLETE</small></div>
            <div><span style="background:#37c978;color:#062b16;font-weight:800;padding:3px 9px;border-radius:4px">RANK ${m.rank}</span>
            <div style="font-size:22px;font-weight:900;margin-top:4px">${m.rankLabel}</div>
            <div style="color:#9aa4b2;font-size:13px">${m.rp.toLocaleString('en-US')} / ${m.rpMax.toLocaleString('en-US')} RP</div></div>
          </div>
          <div class="mbox"><h3>PROGRESS</h3>${tracks}</div>
          <div class="mbox"><h3>MISSION RATINGS</h3><div class="ratings">${ratings}</div></div>
          <div class="mbox"><h3>CAREER</h3><div class="careerGrid">
            <div class="cell"><b>${m.career.carsStolen}</b>Cars stolen</div>
            <div class="cell"><b>${m.career.copsEscaped}</b>Cops escaped</div>
            <div class="cell"><b>${m.career.highestWanted}★</b>Highest wanted</div>
            <div class="cell"><b>${m.career.distanceKm} km</b>Distance driven</div>
            <div class="cell"><b>${m.career.peopleTakenOut}</b>People taken out</div>
            <div class="cell"><b>${m.career.longestJumpM} m</b>Longest jump</div>
            <div class="cell"><b>${m.career.crewRecruited}</b>Crew recruited</div>
            <div class="cell"><b>${m.career.hiddenByLocals}</b>Hidden by locals</div>
          </div></div>
        </div>
        <div>
          <div class="mbox"><h3>WORKSHOP — ${m.workshop.garage}</h3>
            <div style="font-size:13px;margin-bottom:6px">🚗 ${m.carName} on the lift · ${m.condition}% dented</div>
            <div style="font-size:13px;color:#d8dee8;font-style:italic;margin-bottom:8px">${m.workshop.mechanicQuote}</div>
            ${upgrades}
            <div style="color:#ffb020;font-weight:800;font-size:13px;margin-top:8px">⬅ BACK TO THE STREET</div>
          </div>
          <div class="mbox"><h3>WEAPONS &amp; GEAR</h3>
            ${m.weapons.map((w) => `<div class="upg"><span>${w.slot}. ${w.name}</span><span>${w.ammo === '—' ? '<span class="locked">LOCKED</span>' : w.ammo}</span></div>`).join('')}
          </div>
          <div class="mbox"><h3>SAVE SLOTS</h3>${saves}</div>
        </div>
      </div>`;
    this.meta.style.display = 'block';
    this.hud.style.display = 'none';
    this.lastDistricts = m.districts;
    this.drawMetaMap();
  }

  drawMetaMap() {
    const cv = this.meta.querySelector('#metaMap');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = 400, H = 250;
    const X = (x) => this.mapX(x) * W;
    const Y = (z) => this.mapY(z) * H;
    ctx.fillStyle = '#1d7fb8'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#232d3d'; ctx.fillRect(0, 0, X(14), H);
    ctx.fillStyle = '#e8c98d'; ctx.fillRect(X(8), 0, X(14) - X(8), H);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5;
    for (let i = 1; i < 8; i++) {
      ctx.beginPath(); ctx.moveTo(0, (i * H) / 8); ctx.lineTo(X(14), (i * H) / 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo((i * X(14)) / 8, 0); ctx.lineTo((i * X(14)) / 8, H); ctx.stroke();
    }
    ctx.strokeStyle = '#ffb020'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(X(0), 0); ctx.lineTo(X(0), H); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial';
    ctx.fillText('N', 10, 22);
    ctx.font = 'bold 11px Arial';
    for (const d of this.lastDistricts || []) {
      const x = X(d.x), y = Y(d.z);
      ctx.fillStyle = '#37c978';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      // labels flip to the left when the dot is on the right half
      if (x > W * 0.55) ctx.fillText(d.name, Math.max(4, x - 8 - ctx.measureText(d.name).width), y + 4);
      else ctx.fillText(d.name, Math.min(x + 8, W - 4 - ctx.measureText(d.name).width), y + 4);
    }
    ctx.strokeStyle = '#ff5fa8'; ctx.lineWidth = 3; ctx.setLineDash([2, 8]);
    ctx.beginPath(); ctx.moveTo(X(-6), Y(62)); ctx.lineTo(X(44), Y(62)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffb020';
    ctx.beginPath(); ctx.moveTo(X(44), Y(62) - 9); ctx.lineTo(X(44) - 7, Y(62) + 7); ctx.lineTo(X(44) + 7, Y(62) + 7); ctx.closePath(); ctx.fill();
  }

  hideMeta() {
    this.meta.style.display = 'none';
    this.hud.style.display = 'block';
  }
}
