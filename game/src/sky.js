// Sky + clouds for Solara Bay v13.
// One sun direction drives the sky dome, the fog colour, the key light and the
// cloud tint. Tier 1 Preetham-style gradient dome (shader, no download) +
// Tier 2 billboard clouds built from soft white radial puffs — white all
// over, no grey pancake undersides. Fog colour === horizon colour, always.
import * as THREE from 'three';
import { mulberry32, range } from './random.js';
import { cloudPuffTexture } from './textures.js';

function sunVector(elevationDeg, azimuthDeg) {
  const el = (elevationDeg * Math.PI) / 180;
  const az = (azimuthDeg * Math.PI) / 180;
  return new THREE.Vector3(
    Math.cos(el) * Math.sin(az),
    Math.sin(el),
    Math.cos(el) * Math.cos(az),
  );
}

export class SkySystem {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.cloudGroup = new THREE.Group();
    this.cloudGroup.name = 'clouds';
    scene.add(this.cloudGroup);

    // Gradient dome: zenith -> mid -> horizon, plus a soft sun glow.
    this.skyUniforms = {
      topColor: { value: new THREE.Color(0x2f7fe0) },
      midColor: { value: new THREE.Color(0x7ec3f2) },
      bottomColor: { value: new THREE.Color(0xcfe9f7) },
      sunDirection: { value: new THREE.Vector3(0, 1, 0) },
      sunColor: { value: new THREE.Color(0xfff6e0) },
      nightFactor: { value: 0 },
    };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_Position.z = gl_Position.w;
        }`,
      fragmentShader: `
        uniform vec3 topColor; uniform vec3 midColor; uniform vec3 bottomColor;
        uniform vec3 sunDirection; uniform vec3 sunColor; uniform float nightFactor;
        varying vec3 vDir;
        float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
        void main() {
          float h = clamp(vDir.y, -1.0, 1.0);
          vec3 col = h > 0.12
            ? mix(midColor, topColor, smoothstep(0.12, 0.85, h))
            : mix(bottomColor, midColor, smoothstep(-0.08, 0.12, h));
          float sunAmt = max(dot(normalize(vDir), normalize(sunDirection)), 0.0);
          col += sunColor * pow(sunAmt, 220.0) * 1.4;   // disc
          col += sunColor * pow(sunAmt, 10.0) * 0.35;   // halo
          // stars by hash, only at night
          float star = step(0.9985, hash(floor(vDir * 220.0)));
          col += vec3(star * nightFactor * smoothstep(0.05, 0.4, h));
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(880, 32, 20), skyMat);
    this.skyMesh.name = 'skyDome';
    this.skyMesh.renderOrder = -10;
    scene.add(this.skyMesh);

    // Sun billboard: soft white-gold disc, same direction as the light.
    const sunCanvas = document.createElement('canvas');
    sunCanvas.width = 256; sunCanvas.height = 256;
    const sctx = sunCanvas.getContext('2d');
    const sg = sctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    sg.addColorStop(0, 'rgba(255,250,230,1)');
    sg.addColorStop(0.25, 'rgba(255,240,200,0.9)');
    sg.addColorStop(0.6, 'rgba(255,220,150,0.25)');
    sg.addColorStop(1, 'rgba(255,220,150,0)');
    sctx.fillStyle = sg; sctx.fillRect(0, 0, 256, 256);
    const sunTex = new THREE.CanvasTexture(sunCanvas);
    sunTex.colorSpace = THREE.SRGBColorSpace;
    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sunTex, fog: false, depthWrite: false, transparent: true,
    }));
    this.sunSprite.scale.set(150, 150, 1);
    scene.add(this.sunSprite);

    // Moon: pale disc, shown only at night.
    const moonCanvas = document.createElement('canvas');
    moonCanvas.width = 128; moonCanvas.height = 128;
    const mctx = moonCanvas.getContext('2d');
    const mg = mctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    mg.addColorStop(0, 'rgba(235,240,255,1)');
    mg.addColorStop(0.7, 'rgba(210,220,255,0.9)');
    mg.addColorStop(1, 'rgba(210,220,255,0)');
    mctx.fillStyle = mg; mctx.beginPath(); mctx.arc(64, 64, 62, 0, Math.PI * 2); mctx.fill();
    const moonTex = new THREE.CanvasTexture(moonCanvas);
    moonTex.colorSpace = THREE.SRGBColorSpace;
    this.moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: moonTex, fog: false, depthWrite: false, transparent: true, opacity: 0,
    }));
    this.moonSprite.scale.set(60, 60, 1);
    scene.add(this.moonSprite);

    this.buildClouds();
  }

  // Tier-2 billboard clouds: 3 drift layers, each cloud a cluster of soft
  // white sprites. Tinted by the preset palette, never grey underneath.
  buildClouds() {
    const rng = mulberry32(4242);
    const puff = cloudPuffTexture();
    this.cloudSprites = [];
    const layers = [
      { count: 6, y: 150, scale: 90, speed: 0.55, opacity: 0.92 },
      { count: 7, y: 115, scale: 65, speed: 0.9, opacity: 0.85 },
      { count: 6, y: 82, scale: 44, speed: 1.4, opacity: 0.78 },
    ];
    for (const layer of layers) {
      for (let i = 0; i < layer.count; i++) {
        const group = new THREE.Group();
        const puffs = 3 + Math.floor(rng() * 3);
        for (let p = 0; p < puffs; p++) {
          const mat = new THREE.SpriteMaterial({
            map: puff, transparent: true, depthWrite: false, fog: false,
            opacity: layer.opacity,
          });
          const s = new THREE.Sprite(mat);
          const sc = layer.scale * range(rng, 0.55, 1.05);
          s.scale.set(sc, sc * 0.55, 1);
          s.position.set(range(rng, -34, 34), range(rng, -6, 8), range(rng, -12, 12));
          group.add(s);
          this.cloudSprites.push({ sprite: s, baseOpacity: layer.opacity });
        }
        group.position.set(range(rng, -420, 420), layer.y + range(rng, -14, 14), range(rng, -420, 320));
        group.userData.drift = layer.speed;
        this.cloudGroup.add(group);
      }
    }
    // Hero clouds: big soft puffs in the forward sky (z 80..300), so the
    // daytime cover actually has clouds in frame — white all over.
    const heroLayers = [
      { count: 4, y: 95, scale: 130, speed: 0.5, opacity: 0.95 },
      { count: 5, y: 70, scale: 95, speed: 0.8, opacity: 0.9 },
    ];
    for (const layer of heroLayers) {
      for (let i = 0; i < layer.count; i++) {
        const group = new THREE.Group();
        const puffs = 4 + Math.floor(rng() * 3);
        for (let p = 0; p < puffs; p++) {
          const mat = new THREE.SpriteMaterial({
            map: puff, transparent: true, depthWrite: false, fog: false,
            opacity: layer.opacity,
          });
          const s = new THREE.Sprite(mat);
          const sc = layer.scale * range(rng, 0.6, 1.1);
          s.scale.set(sc, sc * 0.5, 1);
          s.position.set(range(rng, -40, 40), range(rng, -6, 8), range(rng, -14, 14));
          group.add(s);
          this.cloudSprites.push({ sprite: s, baseOpacity: layer.opacity });
        }
        group.position.set(range(rng, -240, 240), layer.y + range(rng, -10, 10), range(rng, 80, 300));
        group.userData.drift = layer.speed;
        this.cloudGroup.add(group);
      }
    }
  }

  applyPreset(preset) {
    const u = this.skyUniforms;
    u.topColor.value.setHex(preset.zenith);
    u.midColor.value.setHex(preset.mid);
    u.bottomColor.value.setHex(preset.horizon);
    u.sunColor.value.setHex(preset.sunColor);
    this.sunDir.copy(sunVector(preset.sunElevation, preset.sunAzimuth));
    u.sunDirection.value.copy(this.sunDir);
    u.nightFactor.value = preset.sunElevation < 0 ? 1 : 0;
    this.sunSprite.position.copy(this.sunDir).multiplyScalar(800);
    this.sunSprite.material.opacity = preset.sunElevation < 0 ? 0 : 1;
    this.moonSprite.position.set(-this.sunDir.x * 760, 320, -this.sunDir.z * 760);
    this.moonSprite.material.opacity = preset.sunElevation < 0 ? 0.95 : 0;
    // fog colour === horizon colour
    this.scene.fog = new THREE.FogExp2(preset.fog, preset.fogDensity);
    this.scene.background = null; // the dome is the background
    const tint = new THREE.Color(preset.cloudTint);
    for (const { sprite, baseOpacity } of this.cloudSprites) {
      sprite.material.color.copy(tint);
      sprite.material.opacity = baseOpacity * preset.cloudOpacity;
    }
    this.renderer.toneMappingExposure = preset.exposure;
  }

  // IBL from the sky itself: render a small copy of the dome into a PMREM
  // environment map so PBR materials reflect the current sky (r160 API).
  buildEnvironment() {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    const envDome = new THREE.Mesh(
      new THREE.SphereGeometry(50, 32, 20),
      new THREE.ShaderMaterial({
        uniforms: this.skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
        vertexShader: this.skyMesh.material.vertexShader,
        fragmentShader: this.skyMesh.material.fragmentShader,
      }),
    );
    envScene.add(envDome);
    const rt = pmrem.fromScene(envScene, 0.04);
    this.scene.environment = rt.texture;
    pmrem.dispose();
  }

  update(dt, t) {
    // clouds drift with the wind, never regenerate
    for (const group of this.cloudGroup.children) {
      group.position.x += group.userData.drift * dt;
      if (group.position.x > 480) group.position.x = -480;
    }
    void t;
  }
}
