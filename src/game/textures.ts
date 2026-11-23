import * as THREE from 'three';
import type { NeighborhoodConfig } from './types';

export interface ProceduralTextures {
  cobbleMap: THREE.CanvasTexture;
  cobbleBump: THREE.CanvasTexture;
  snowAlbedoMap: THREE.CanvasTexture;
  snowNormalMap: THREE.CanvasTexture;
  snowRoughnessMap: THREE.CanvasTexture;
  snowBump: THREE.CanvasTexture;
  snowPuffMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  lampGlowMap: THREE.CanvasTexture;
  woodBump: THREE.CanvasTexture;
  bladeStripeMap: THREE.CanvasTexture;
  garageSignMap: THREE.CanvasTexture;
  cityGateSignMap: THREE.CanvasTexture;
  cafeSignMap: THREE.CanvasTexture;
  awningMaps: THREE.CanvasTexture[];
  dispose: () => void;
}

/**
 * Seamless tileable 2D value noise helper using periodic lattice wrap.
 */
function createPeriodicNoise(period: number, seedOffset: number): (u: number, v: number) => number {
  const table = new Float32Array(period * period);
  let s = (1337 + seedOffset * 7919) >>> 0;
  for (let i = 0; i < table.length; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    table[i] = s / 4294967296;
  }

  return (u: number, v: number): number => {
    const x = (((u % 1) + 1) % 1) * period;
    const y = (((v % 1) + 1) % 1) * period;
    const x0 = Math.floor(x) % period;
    const y0 = Math.floor(y) % period;
    const x1 = (x0 + 1) % period;
    const y1 = (y0 + 1) % period;
    const fx = x - Math.floor(x);
    const fy = y - Math.floor(y);
    // Quintic smoothstep for silk-smooth derivatives (zero grid creases in normal map)
    const sx = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    const sy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);

    const n00 = table[y0 * period + x0];
    const n10 = table[y0 * period + x1];
    const n01 = table[y1 * period + x0];
    const n11 = table[y1 * period + x1];

    const nx0 = n00 + (n10 - n00) * sx;
    const nx1 = n01 + (n11 - n01) * sx;
    return nx0 + (nx1 - nx0) * sy;
  };
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  const aniso = Math.min(8, Math.max(1, maxAnisotropy));

  let seed = 4219;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // 1. Warm Alpine Cobblestone Albedo + Bump (slightly damp frost-rimmed winter cobbles)
  const cobbleCanvas = document.createElement('canvas');
  cobbleCanvas.width = 512;
  cobbleCanvas.height = 512;
  const cctx = cobbleCanvas.getContext('2d')!;

  const cobbleBumpCanvas = document.createElement('canvas');
  cobbleBumpCanvas.width = 512;
  cobbleBumpCanvas.height = 512;
  const bctx = cobbleBumpCanvas.getContext('2d')!;

  cctx.fillStyle = '#333b47';
  cctx.fillRect(0, 0, 512, 512);
  bctx.fillStyle = '#1e1e1e';
  bctx.fillRect(0, 0, 512, 512);

  const rows = 8;
  const cols = 6;
  const rowH = 512 / rows;
  const colW = 512 / cols;

  const stonePalette = ['#5e6775', '#6b727d', '#56606e', '#737882', '#666b73', '#756f68'];

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (colW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * colW + offset + 3;
      const y = r * rowH + 3;
      const w = colW - 6;
      const h = rowH - 6;

      cctx.fillStyle = stonePalette[Math.floor(nextRand() * stonePalette.length)];
      roundRect(cctx, x, y, w, h, 7);
      cctx.fill();

      cctx.fillStyle = 'rgba(255, 245, 224, 0.10)';
      roundRect(cctx, x + 2, y + 2, w - 4, h * 0.34, 5);
      cctx.fill();

      // Subtle powdery frost rim trapped in cobblestone mortar crevices
      if (nextRand() > 0.52) {
        cctx.fillStyle = 'rgba(222, 238, 255, 0.18)';
        cctx.fillRect(x, y + h - 3, w * (0.4 + nextRand() * 0.4), 2);
      }

      const lum = Math.floor(175 + nextRand() * 55);
      bctx.fillStyle = `rgb(${lum},${lum},${lum})`;
      roundRect(bctx, x + 1, y + 1, w - 2, h - 2, 7);
      bctx.fill();
    }
  }

  const cobbleMap = new THREE.CanvasTexture(cobbleCanvas);
  cobbleMap.colorSpace = THREE.SRGBColorSpace;
  cobbleMap.wrapS = THREE.RepeatWrapping;
  cobbleMap.wrapT = THREE.RepeatWrapping;
  cobbleMap.repeat.set(9, 9);
  cobbleMap.anisotropy = aniso;

  const cobbleBump = new THREE.CanvasTexture(cobbleBumpCanvas);
  cobbleBump.wrapS = THREE.RepeatWrapping;
  cobbleBump.wrapT = THREE.RepeatWrapping;
  cobbleBump.repeat.set(9, 9);
  cobbleBump.anisotropy = aniso;

  // 2. Real Alpine Snow PBR Suite (Seamless 512x512 Albedo + Tangent Normal + Frost-Sparkle Roughness + Bump)
  const S = 512;
  const heightField = new Float32Array(S * S);

  const nBroad = createPeriodicNoise(4, 1);
  const nWind = createPeriodicNoise(8, 2);
  const nPillow = createPeriodicNoise(16, 3);
  const nFine = createPeriodicNoise(48, 4);
  const nMicro = createPeriodicNoise(128, 5);

  for (let y = 0; y < S; y++) {
    const v = y / S;
    for (let x = 0; x < S; x++) {
      const u = x / S;

      // Diagonal windblown sastrugi ripples (periodic along u + v)
      const warp = nBroad(u, v) * 0.14;
      const windWave =
        Math.sin((u * 2.0 + v * 1.0 + warp) * Math.PI * 2) * 0.28 +
        Math.sin((u * 3.0 - v * 2.0 + warp * 1.5) * Math.PI * 2) * 0.14;

      const broad = nBroad(u, v);
      const wind = nWind(u + warp * 0.5, v - warp * 0.35);
      const pillow = nPillow(u, v);
      const fine = nFine(u, v);
      const micro = nMicro(u, v);

      // Combine macro drifts, wind sastrugi, soft powder pillows, and crisp snow crystal grain
      const h =
        0.5 +
        windWave * 0.24 +
        (broad - 0.5) * 0.30 +
        (wind - 0.5) * 0.22 +
        (pillow - 0.5) * 0.14 +
        (fine - 0.5) * 0.08 +
        (micro - 0.5) * 0.045;

      heightField[y * S + x] = Math.max(0, Math.min(1, h));
    }
  }

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = S;
  albedoCanvas.height = S;
  const actx = albedoCanvas.getContext('2d')!;
  const albedoImg = actx.createImageData(S, S);

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = S;
  normalCanvas.height = S;
  const nctx = normalCanvas.getContext('2d')!;
  const normalImg = nctx.createImageData(S, S);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = S;
  roughCanvas.height = S;
  const rctx = roughCanvas.getContext('2d')!;
  const roughImg = rctx.createImageData(S, S);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = S;
  bumpCanvas.height = S;
  const sbctx = bumpCanvas.getContext('2d')!;
  const bumpImg = sbctx.createImageData(S, S);

  const normalStrength = 6.8;

  for (let y = 0; y < S; y++) {
    const ym = (y - 1 + S) % S;
    const yp = (y + 1) % S;
    for (let x = 0; x < S; x++) {
      const xm = (x - 1 + S) % S;
      const xp = (x + 1) % S;
      const idx = y * S + x;
      const p4 = idx * 4;

      const h = heightField[idx];
      const hL = heightField[y * S + xm];
      const hR = heightField[y * S + xp];
      const hU = heightField[ym * S + x];
      const hD = heightField[yp * S + x];

      // Tangent-space normal from wrapped central differences
      const dx = (hL - hR) * normalStrength;
      const dy = (hU - hD) * normalStrength;
      const dz = 1.0;
      const invLen = 1 / Math.hypot(dx, dy, dz);
      normalImg.data[p4] = Math.round((dx * invLen * 0.5 + 0.5) * 255);
      normalImg.data[p4 + 1] = Math.round((dy * invLen * 0.5 + 0.5) * 255);
      normalImg.data[p4 + 2] = Math.round((dz * invLen * 0.5 + 0.5) * 255);
      normalImg.data[p4 + 3] = 255;

      // Rich real-snow subsurface scattering albedo:
      // Distinct alpine sky-blue in wind-carved sastrugi troughs, warm powdery ivory on sunlit crests
      const grain = (nextRand() - 0.5) * 9;
      const crest = Math.max(0, Math.min(1, (h - 0.24) / 0.52));
      const rCol = Math.min(255, Math.max(0, Math.round(182 + crest * 68 + grain)));
      const gCol = Math.min(255, Math.max(0, Math.round(204 + crest * 47 + grain)));
      const bCol = Math.min(255, Math.max(0, Math.round(230 + crest * 24 + grain * 0.6)));

      // Crisp glittering frost crystal flecks on upper snow facets
      const sparkleRoll = nextRand();
      const isSparkle = sparkleRoll > 0.982 && crest > 0.30;
      albedoImg.data[p4] = isSparkle ? 255 : rCol;
      albedoImg.data[p4 + 1] = isSparkle ? 255 : gCol;
      albedoImg.data[p4 + 2] = isSparkle ? 255 : bCol;
      albedoImg.data[p4 + 3] = 255;

      // Roughness map: velvety matte snow (0.82–0.94) + sharp ice-crystal specular sparkles (0.08–0.22)
      let roughVal = Math.round(212 + (1 - crest) * 26 + (nextRand() - 0.5) * 16);
      if (isSparkle) {
        roughVal = Math.round(20 + nextRand() * 32);
      } else if (sparkleRoll > 0.945) {
        roughVal = Math.round(84 + nextRand() * 42);
      }
      roughVal = Math.min(250, Math.max(20, roughVal));
      roughImg.data[p4] = roughVal;
      roughImg.data[p4 + 1] = roughVal;
      roughImg.data[p4 + 2] = roughVal;
      roughImg.data[p4 + 3] = 255;

      const bVal = Math.round(h * 255);
      bumpImg.data[p4] = bVal;
      bumpImg.data[p4 + 1] = bVal;
      bumpImg.data[p4 + 2] = bVal;
      bumpImg.data[p4 + 3] = 255;
    }
  }

  actx.putImageData(albedoImg, 0, 0);
  nctx.putImageData(normalImg, 0, 0);
  rctx.putImageData(roughImg, 0, 0);
  sbctx.putImageData(bumpImg, 0, 0);

  const snowAlbedoMap = new THREE.CanvasTexture(albedoCanvas);
  snowAlbedoMap.colorSpace = THREE.SRGBColorSpace;
  snowAlbedoMap.wrapS = THREE.RepeatWrapping;
  snowAlbedoMap.wrapT = THREE.RepeatWrapping;
  snowAlbedoMap.anisotropy = aniso;

  const snowNormalMap = new THREE.CanvasTexture(normalCanvas);
  snowNormalMap.wrapS = THREE.RepeatWrapping;
  snowNormalMap.wrapT = THREE.RepeatWrapping;
  snowNormalMap.anisotropy = aniso;

  const snowRoughnessMap = new THREE.CanvasTexture(roughCanvas);
  snowRoughnessMap.wrapS = THREE.RepeatWrapping;
  snowRoughnessMap.wrapT = THREE.RepeatWrapping;
  snowRoughnessMap.anisotropy = aniso;

  const snowBump = new THREE.CanvasTexture(bumpCanvas);
  snowBump.wrapS = THREE.RepeatWrapping;
  snowBump.wrapT = THREE.RepeatWrapping;
  snowBump.anisotropy = aniso;

  // 3. Soft Volumetric Billowing Snow Spray Puff Texture (for airborne powder plumes)
  const puffCanvas = document.createElement('canvas');
  puffCanvas.width = 128;
  puffCanvas.height = 128;
  const pctx = puffCanvas.getContext('2d')!;
  pctx.clearRect(0, 0, 128, 128);

  const lobes = [
    { x: 64, y: 66, r: 46, a: 0.85 },
    { x: 44, y: 58, r: 34, a: 0.72 },
    { x: 84, y: 60, r: 32, a: 0.70 },
    { x: 62, y: 44, r: 30, a: 0.74 },
    { x: 60, y: 80, r: 28, a: 0.58 },
  ];
  for (const lobe of lobes) {
    const pg = pctx.createRadialGradient(lobe.x, lobe.y, 4, lobe.x, lobe.y, lobe.r);
    pg.addColorStop(0, `rgba(255, 255, 255, ${lobe.a})`);
    pg.addColorStop(0.50, `rgba(208, 229, 250, ${lobe.a * 0.62})`);
    pg.addColorStop(1, 'rgba(176, 208, 240, 0)');
    pctx.fillStyle = pg;
    pctx.beginPath();
    pctx.arc(lobe.x, lobe.y, lobe.r, 0, Math.PI * 2);
    pctx.fill();
  }
  const snowPuffMap = new THREE.CanvasTexture(puffCanvas);
  snowPuffMap.colorSpace = THREE.SRGBColorSpace;

  // 4. Soft Radial Contact Shadow Alpha Map
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const shctx = shadowCanvas.getContext('2d')!;
  const sg = shctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  sg.addColorStop(0, 'rgba(12, 20, 34, 0.85)');
  sg.addColorStop(0.55, 'rgba(15, 25, 42, 0.45)');
  sg.addColorStop(1, 'rgba(15, 25, 42, 0)');
  shctx.fillStyle = sg;
  shctx.fillRect(0, 0, 128, 128);

  const contactShadowMap = new THREE.CanvasTexture(shadowCanvas);
  contactShadowMap.colorSpace = THREE.SRGBColorSpace;

  // 5. Warm Cozy Amber Lantern Ground-Pool Glow
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 128;
  glowCanvas.height = 128;
  const gctx = glowCanvas.getContext('2d')!;
  const gg = gctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  gg.addColorStop(0, 'rgba(255, 208, 110, 0.62)');
  gg.addColorStop(0.45, 'rgba(255, 178, 72, 0.25)');
  gg.addColorStop(1, 'rgba(255, 160, 48, 0)');
  gctx.fillStyle = gg;
  gctx.fillRect(0, 0, 128, 128);

  const lampGlowMap = new THREE.CanvasTexture(glowCanvas);
  lampGlowMap.colorSpace = THREE.SRGBColorSpace;

  // 6. Timber Grain Bump Map
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 128;
  woodCanvas.height = 128;
  const wctx = woodCanvas.getContext('2d')!;
  wctx.fillStyle = '#808080';
  wctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 3) {
    const shade = 105 + Math.floor(nextRand() * 48);
    wctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    wctx.fillRect(0, y, 128, 2);
  }
  const woodBump = new THREE.CanvasTexture(woodCanvas);
  woodBump.wrapS = THREE.RepeatWrapping;
  woodBump.wrapT = THREE.RepeatWrapping;

  // 7. Plow Blade Yellow/Charcoal Chevron Hazard Trim Texture
  const stripeCanvas = document.createElement('canvas');
  stripeCanvas.width = 256;
  stripeCanvas.height = 64;
  const stctx = stripeCanvas.getContext('2d')!;
  stctx.fillStyle = '#efb026';
  stctx.fillRect(0, 0, 256, 64);
  stctx.fillStyle = '#242933';
  for (let x = -64; x < 320; x += 36) {
    stctx.beginPath();
    stctx.moveTo(x, 0);
    stctx.lineTo(x + 16, 0);
    stctx.lineTo(x + 36, 64);
    stctx.lineTo(x + 20, 64);
    stctx.closePath();
    stctx.fill();
  }
  const bladeStripeMap = new THREE.CanvasTexture(stripeCanvas);
  bladeStripeMap.colorSpace = THREE.SRGBColorSpace;
  bladeStripeMap.wrapS = THREE.RepeatWrapping;
  bladeStripeMap.wrapT = THREE.ClampToEdgeWrapping;
  bladeStripeMap.anisotropy = aniso;

  // 8. Painted Wooden "GARAGE" Signboard Texture
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 256;
  signCanvas.height = 64;
  const sgctx = signCanvas.getContext('2d')!;
  sgctx.fillStyle = '#253549';
  sgctx.fillRect(0, 0, 256, 64);
  sgctx.strokeStyle = '#f5c156';
  sgctx.lineWidth = 6;
  sgctx.strokeRect(4, 4, 248, 56);
  sgctx.fillStyle = '#fff5d6';
  sgctx.font = 'bold 34px "Plus Jakarta Sans", system-ui, sans-serif';
  sgctx.textAlign = 'center';
  sgctx.textBaseline = 'middle';
  sgctx.fillText('GARAGE', 128, 34);

  const garageSignMap = new THREE.CanvasTexture(signCanvas);
  garageSignMap.colorSpace = THREE.SRGBColorSpace;
  garageSignMap.anisotropy = aniso;

  // 9. Grand Stone City Gate Crest Signboard Texture ("DRIFTCLEAR CITY")
  const gateSignCanvas = document.createElement('canvas');
  gateSignCanvas.width = 512;
  gateSignCanvas.height = 96;
  const gtctx = gateSignCanvas.getContext('2d')!;
  gtctx.fillStyle = '#1d2b3c';
  gtctx.fillRect(0, 0, 512, 96);
  gtctx.strokeStyle = '#e5b24d';
  gtctx.lineWidth = 8;
  gtctx.strokeRect(5, 5, 502, 86);
  gtctx.strokeStyle = '#9ec5e8';
  gtctx.lineWidth = 2;
  gtctx.strokeRect(13, 13, 486, 70);
  gtctx.fillStyle = '#fef3c7';
  gtctx.font = '800 38px "Bricolage Grotesque", "Plus Jakarta Sans", system-ui, sans-serif';
  gtctx.textAlign = 'center';
  gtctx.textBaseline = 'middle';
  gtctx.fillText('DRIFTCLEAR', 256, 48);

  const cityGateSignMap = new THREE.CanvasTexture(gateSignCanvas);
  cityGateSignMap.colorSpace = THREE.SRGBColorSpace;
  cityGateSignMap.anisotropy = aniso;

  // 10. Cozy Corner Bakery & Cocoa Café Signboard Texture
  const cafeSignCanvas = document.createElement('canvas');
  cafeSignCanvas.width = 256;
  cafeSignCanvas.height = 64;
  const cfctx = cafeSignCanvas.getContext('2d')!;
  cfctx.fillStyle = '#5c2320';
  cfctx.fillRect(0, 0, 256, 64);
  cfctx.strokeStyle = '#f5c156';
  cfctx.lineWidth = 5;
  cfctx.strokeRect(4, 4, 248, 56);
  cfctx.fillStyle = '#fff5e0';
  cfctx.font = 'bold 26px "Plus Jakarta Sans", system-ui, sans-serif';
  cfctx.textAlign = 'center';
  cfctx.textBaseline = 'middle';
  cfctx.fillText('BAKERY & CAFÉ', 128, 34);

  const cafeSignMap = new THREE.CanvasTexture(cafeSignCanvas);
  cafeSignMap.colorSpace = THREE.SRGBColorSpace;
  cafeSignMap.anisotropy = aniso;

  // 11. Striped European Storefront Awning Textures (Burgundy, Alpine Pine Green, Navy Blue)
  const awningColors: Array<[string, string]> = [
    ['#9e2f2b', '#f5ecdc'],
    ['#26533e', '#f5ecdc'],
    ['#294161', '#f5ecdc'],
  ];
  const awningMaps = awningColors.map(([colA, colB]) => {
    const ac = document.createElement('canvas');
    ac.width = 256;
    ac.height = 128;
    const act = ac.getContext('2d')!;
    const stripes = 8;
    const sw = 256 / stripes;
    for (let i = 0; i < stripes; i++) {
      act.fillStyle = i % 2 === 0 ? colA : colB;
      act.fillRect(i * sw, 0, sw + 1, 128);
    }
    // Subtle scalloped hem shadow along bottom edge
    act.fillStyle = 'rgba(18, 22, 28, 0.22)';
    act.fillRect(0, 114, 256, 14);
    const tex = new THREE.CanvasTexture(ac);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = aniso;
    return tex;
  });

  return {
    cobbleMap,
    cobbleBump,
    snowAlbedoMap,
    snowNormalMap,
    snowRoughnessMap,
    snowBump,
    snowPuffMap,
    contactShadowMap,
    lampGlowMap,
    woodBump,
    bladeStripeMap,
    garageSignMap,
    cityGateSignMap,
    cafeSignMap,
    awningMaps,
    dispose: () => {
      cobbleMap.dispose();
      cobbleBump.dispose();
      snowAlbedoMap.dispose();
      snowNormalMap.dispose();
      snowRoughnessMap.dispose();
      snowBump.dispose();
      snowPuffMap.dispose();
      contactShadowMap.dispose();
      lampGlowMap.dispose();
      woodBump.dispose();
      bladeStripeMap.dispose();
      garageSignMap.dispose();
      cityGateSignMap.dispose();
      cafeSignMap.dispose();
      awningMaps.forEach((m) => m.dispose());
    },
  };
}

/**
 * Generates a crisp 1024x1024 real winter city ground texture for a specific district:
 * - Dark winter asphalt boulevards & ring road with gravel grain
 * - Golden-yellow dashed center lines & crisp white shoulder edge lines
 * - White zebra pedestrian crosswalks at intersections & inside the South City Gate
 * - Raised pale-granite tiled sidewalks & urban block courtyards
 * - Central cobblestone roundabout plaza surrounding the City Hall Clock Tower
 */
export function createCityRoadTexture(
  config: NeighborhoodConfig,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const arenaSize = config.gridSize * config.cellSize;
  const arenaHalf = arenaSize / 2;
  const scale = size / arenaSize;
  const toPxX = (wx: number) => (wx + arenaHalf) * scale;
  const toPxZ = (wz: number) => (wz + arenaHalf) * scale;
  const toPxLen = (len: number) => len * scale;

  const { roads } = config;

  // 1. Base Pale-Granite Stone Sidewalk / Urban Paving everywhere
  ctx.fillStyle = '#8b929d';
  ctx.fillRect(0, 0, size, size);

  // Subtle paved stone flagstone tile grid on sidewalks
  ctx.strokeStyle = 'rgba(54, 62, 74, 0.28)';
  ctx.lineWidth = 1.2;
  const tileStep = toPxLen(1.35);
  for (let p = 0; p <= size; p += tileStep) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  // Subtle deterministic flagstone warmth variation
  let s = (config.seed + 7717) >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < 420; i++) {
    const rx = Math.floor(rand() * (size / tileStep)) * tileStep;
    const ry = Math.floor(rand() * (size / tileStep)) * tileStep;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255, 248, 236, 0.09)' : 'rgba(32, 40, 52, 0.09)';
    ctx.fillRect(rx + 1, ry + 1, tileStep - 2, tileStep - 2);
  }

  // Helper to paint an asphalt avenue strip with crisp granite curbs
  const asphaltColor = '#343c48';
  const curbLight = '#b7bec8';
  const curbDark = '#232933';

  const drawAsphaltRect = (wx: number, wz: number, w: number, d: number) => {
    const px = toPxX(wx - w / 2);
    const pz = toPxZ(wz - d / 2);
    const pw = toPxLen(w);
    const pd = toPxLen(d);
    const curb = Math.max(3, toPxLen(0.28));

    // Curb highlight border
    ctx.fillStyle = curbLight;
    ctx.fillRect(px - curb, pz - curb, pw + curb * 2, pd + curb * 2);
    // Gutter shadow
    ctx.fillStyle = curbDark;
    ctx.fillRect(px - 2, pz - 2, pw + 4, pd + 4);
    // Asphalt roadbed
    ctx.fillStyle = asphaltColor;
    ctx.fillRect(px, pz, pw, pd);
  };

  // 2. Outer City Ring Boulevard (4 wide perimeter avenues inside the stone city wall)
  const rC = roads.ringCenter;
  const rW = roads.ringHalfW * 2;
  const ringSpan = rC * 2 + rW;
  drawAsphaltRect(0, -rC, ringSpan, rW);
  drawAsphaltRect(0, rC, ringSpan, rW);
  drawAsphaltRect(-rC, 0, rW, ringSpan);
  drawAsphaltRect(rC, 0, rW, ringSpan);

  // 3. Cross Avenues (E-W)
  const crossSpan = rC * 2 + rW;
  for (const cz of roads.crossAveZ) {
    drawAsphaltRect(0, cz, crossSpan, roads.crossAveHalfW * 2);
  }

  // 4. Grand North-South Main Boulevard (runs straight out through South City Gate!)
  drawAsphaltRect(0, 1.0, roads.mainAveHalfW * 2, arenaSize + 2.0);

  // Cleanly re-fill asphalt interiors so intersections blend seamlessly without curb bars cutting across lanes!
  ctx.fillStyle = asphaltColor;
  ctx.fillRect(toPxX(-rC - roads.ringHalfW), toPxZ(-rC - roads.ringHalfW), toPxLen(ringSpan), toPxLen(rW));
  ctx.fillRect(toPxX(-rC - roads.ringHalfW), toPxZ(rC - roads.ringHalfW), toPxLen(ringSpan), toPxLen(rW));
  ctx.fillRect(toPxX(-rC - roads.ringHalfW), toPxZ(-rC - roads.ringHalfW), toPxLen(rW), toPxLen(ringSpan));
  ctx.fillRect(toPxX(rC - roads.ringHalfW), toPxZ(-rC - roads.ringHalfW), toPxLen(rW), toPxLen(ringSpan));
  for (const cz of roads.crossAveZ) {
    ctx.fillRect(
      toPxX(-rC - roads.ringHalfW),
      toPxZ(cz - roads.crossAveHalfW),
      toPxLen(crossSpan),
      toPxLen(roads.crossAveHalfW * 2)
    );
  }
  ctx.fillRect(
    toPxX(-roads.mainAveHalfW),
    0,
    toPxLen(roads.mainAveHalfW * 2),
    size
  );

  // 5. Central Roundabout Asphalt Ring & Cobblestone Town Square Plaza around Clock Tower
  const pCx = toPxX(roads.plazaX);
  const pCz = toPxZ(roads.plazaZ);
  const outerRoundR = toPxLen(roads.plazaRadius + 3.1);
  const innerPlazaR = toPxLen(roads.plazaRadius);

  // Outer roundabout curb + asphalt loop
  ctx.beginPath();
  ctx.arc(pCx, pCz, outerRoundR + 4, 0, Math.PI * 2);
  ctx.fillStyle = curbLight;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(pCx, pCz, outerRoundR, 0, Math.PI * 2);
  ctx.fillStyle = asphaltColor;
  ctx.fill();

  // Subtle asphalt aggregate micro-grain across all roads
  for (let i = 0; i < 3200; i++) {
    const gx = rand() * size;
    const gy = rand() * size;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(12,16,22,0.08)';
    ctx.fillRect(gx, gy, 2, 2);
  }

  // 6. Painted Golden-Yellow Dashed Road Centerlines & Roundabout Lane Ring
  ctx.save();
  ctx.strokeStyle = '#e4b74d';
  ctx.lineWidth = Math.max(2.5, toPxLen(0.16));
  ctx.setLineDash([toPxLen(1.15), toPxLen(0.95)]);

  // Main N-S Boulevard centerline
  ctx.beginPath();
  ctx.moveTo(toPxX(0), toPxZ(-rC));
  ctx.lineTo(toPxX(0), size);
  ctx.stroke();

  // E-W Cross Avenue centerlines
  for (const cz of roads.crossAveZ) {
    ctx.beginPath();
    ctx.moveTo(toPxX(-rC), toPxZ(cz));
    ctx.lineTo(toPxX(rC), toPxZ(cz));
    ctx.stroke();
  }

  // Outer Ring Boulevard dashed loop
  ctx.strokeRect(toPxX(-rC), toPxZ(-rC), toPxLen(rC * 2), toPxLen(rC * 2));

  // Roundabout circular lane line
  ctx.beginPath();
  ctx.arc(pCx, pCz, toPxLen(roads.plazaRadius + 1.55), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 7. Crisp White Zebra Pedestrian Crosswalks at Key Intersections & South City Gate
  const drawZebraCrosswalk = (
    cx: number,
    cz: number,
    horizontal: boolean,
    roadWidth: number
  ) => {
    ctx.fillStyle = 'rgba(241, 245, 249, 0.85)';
    const stripes = 6;
    const stripeLen = toPxLen(1.45);
    const totalSpan = toPxLen(roadWidth - 0.9);
    const step = totalSpan / stripes;
    const stripeThick = step * 0.52;

    for (let i = 0; i < stripes; i++) {
      const offset = -totalSpan / 2 + i * step + (step - stripeThick) / 2;
      if (horizontal) {
        // Crosswalk spans across a N-S road
        ctx.fillRect(toPxX(cx) + offset, toPxZ(cz) - stripeLen / 2, stripeThick, stripeLen);
      } else {
        // Crosswalk spans across an E-W road
        ctx.fillRect(toPxX(cx) - stripeLen / 2, toPxZ(cz) + offset, stripeLen, stripeThick);
      }
    }
  };

  // Crosswalks flanking the Central Roundabout & inside the South City Gate
  drawZebraCrosswalk(0, roads.plazaZ + roads.plazaRadius + 3.8, true, roads.mainAveHalfW * 2);
  drawZebraCrosswalk(0, roads.plazaZ - roads.plazaRadius - 3.8, true, roads.mainAveHalfW * 2);
  drawZebraCrosswalk(-roads.plazaRadius - 3.8, roads.plazaZ, false, roads.crossAveHalfW * 2);
  drawZebraCrosswalk(roads.plazaRadius + 3.8, roads.plazaZ, false, roads.crossAveHalfW * 2);
  // Welcome crosswalk right inside the South City Gate!
  drawZebraCrosswalk(0, rC - roads.ringHalfW - 1.1, true, roads.mainAveHalfW * 2);
  drawZebraCrosswalk(0, arenaHalf - 1.2, true, roads.mainAveHalfW * 2);

  // 8. Central Ornamental Cobblestone Plaza Island (surrounding the Clock Tower)
  ctx.beginPath();
  ctx.arc(pCx, pCz, innerPlazaR + 3, 0, Math.PI * 2);
  ctx.fillStyle = curbLight;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(pCx, pCz, innerPlazaR, 0, Math.PI * 2);
  ctx.fillStyle = '#7c818a';
  ctx.fill();

  // Concentric decorative cobblestone rings in the Town Square Plaza
  ctx.strokeStyle = 'rgba(42, 48, 58, 0.38)';
  ctx.lineWidth = 2;
  for (let rr = 14; rr < innerPlazaR - 4; rr += 13) {
    ctx.beginPath();
    ctx.arc(pCx, pCz, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(pCx + Math.cos(ang) * 14, pCz + Math.sin(ang) * 14);
    ctx.lineTo(pCx + Math.cos(ang) * innerPlazaR, pCz + Math.sin(ang) * innerPlazaR);
    ctx.stroke();
  }

  // 9. Crisp Raised Sidewalk Block Outlines with Inner Stone Courtyard Detail
  for (const blk of roads.blocks) {
    const bx = toPxX(blk.x - blk.w / 2);
    const bz = toPxZ(blk.z - blk.d / 2);
    const bw = toPxLen(blk.w);
    const bd = toPxLen(blk.d);

    ctx.fillStyle = '#a3aab4';
    ctx.fillRect(bx, bz, bw, bd);
    ctx.strokeStyle = '#d3d9e2';
    ctx.lineWidth = 3;
    ctx.strokeRect(bx + 1.5, bz + 1.5, bw - 3, bd - 3);
    ctx.strokeStyle = 'rgba(45, 55, 70, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx + 7, bz + 7, bw - 14, bd - 14);
  }

  // 9b. Painted Drive-In "FUEL & SALT" Service Bay Pad in front of Municipal Garage Depot
  const garageObs = config.obstacles.find((o) => o.kind === 'garage');
  if (garageObs) {
    const gx = toPxX(garageObs.x);
    const gz = toPxZ(garageObs.z + 3.4);
    const pw = toPxLen(3.6);
    const pd = toPxLen(2.4);
    ctx.save();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
    ctx.fillRect(gx - pw / 2, gz - pd / 2, pw, pd);
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(gx - pw / 2, gz - pd / 2, pw, pd);
    ctx.setLineDash([]);
    ctx.fillStyle = '#d1fae5';
    ctx.font = 'bold 14px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FUEL + SALT', gx, gz);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, Math.max(1, maxAnisotropy));
  return tex;
}

/**
 * Stamps subtle persistent wet-asphalt tire ruts (or sparkling pale salt sheen) directly onto the road CanvasTexture.
 */
export function stampRoadTireTrack(
  tex: THREE.CanvasTexture,
  config: NeighborhoodConfig,
  wx: number,
  wz: number,
  angle: number,
  halfTrackW = 0.72,
  isSalting = false
): void {
  const canvas = tex.image as HTMLCanvasElement | undefined;
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = canvas.width;
  const arenaSize = config.gridSize * config.cellSize;
  const arenaHalf = arenaSize / 2;
  const rightX = Math.cos(angle);
  const rightZ = -Math.sin(angle);

  ctx.save();
  ctx.fillStyle = isSalting ? 'rgba(226, 244, 255, 0.22)' : 'rgba(15, 22, 32, 0.24)';
  const r = Math.max(2.2, (0.20 / arenaSize) * size);

  for (const side of [-1, 1]) {
    const tx = wx + rightX * halfTrackW * side;
    const tz = wz + rightZ * halfTrackW * side;
    const px = ((tx + arenaHalf) / arenaSize) * size;
    const py = ((tz + arenaHalf) / arenaSize) * size;
    if (px < 0 || px > size || py < 0 || py > size) continue;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  tex.needsUpdate = true;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
