import * as THREE from 'three';
import type { ProceduralTextures } from './textures';
import type { PickupKind, VehicleId } from './types';

export interface TruckRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  bladePivot: THREE.Group;
  bladeScaleGroup: THREE.Group;
  blowerChutes: THREE.Group;
  snowWaveGroup: THREE.Group;
  snowWaveMesh: THREE.Mesh;
  heatedCoilMat: THREE.MeshStandardMaterial;
  beaconGroup: THREE.Group;
  frontWheels: THREE.Group[];
  rearWheels: THREE.Group[];
  headlightGlowMat: THREE.MeshStandardMaterial;
  headBeamMat: THREE.MeshBasicMaterial;
  paintPrimaryMat: THREE.MeshStandardMaterial;
  paintTrimMat: THREE.MeshStandardMaterial;
  bladeAccentMat: THREE.MeshStandardMaterial;
  augerMesh?: THREE.Group;
  exhaustTipLeft: THREE.Vector3;
  exhaustTipRight: THREE.Vector3;
}

/**
 * Rich Composite Vintage Red Alpine Snowplow Truck
 * Grounded with bottom-center pivot at y = 0. Faces +Z in local space.
 * Details: beveled curved blade with chevron hazard strip & heated copper edge,
 * hydraulic struts, headlight beams, wing mirrors, brass roof rack, salt sacks,
 * wooden barrel, snow shovel, dual chrome exhausts, spinning amber beacon,
 * and 4 rotating/steering chunky off-road wheels.
 */
export function createSnowplowTruck(textures: ProceduralTextures): TruckRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  // Soft radial contact shadow disc directly on ground (y = 0.016)
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 4.4),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, 0.016, 0.22);
  root.add(contactShadow);

  // Materials with crisp roughness/metalness contrast (>= 0.25 separation)
  const paintRedMat = new THREE.MeshStandardMaterial({
    color: 0xd64531,
    roughness: 0.34,
    metalness: 0.14,
  });
  const paintCreamMat = new THREE.MeshStandardMaterial({
    color: 0xf4ead8,
    roughness: 0.42,
    metalness: 0.08,
  });
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x252c37,
    roughness: 0.78,
    metalness: 0.32,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xdce4ee,
    roughness: 0.16,
    metalness: 0.88,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd9a13b,
    roughness: 0.25,
    metalness: 0.82,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1b2b3e,
    roughness: 0.10,
    metalness: 0.58,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1c2026,
    roughness: 0.90,
    metalness: 0.04,
  });
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x8b5a34,
    roughness: 0.82,
    metalness: 0.02,
    bumpMap: textures.woodBump,
    bumpScale: 0.02,
  });
  const plowYellowMat = new THREE.MeshStandardMaterial({
    color: 0xefb026,
    roughness: 0.34,
    metalness: 0.40,
  });
  const bladeStripeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.bladeStripeMap,
    roughness: 0.38,
    metalness: 0.25,
  });
  const heatedCoilMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    emissive: 0xff5a1f,
    emissiveIntensity: 0.0,
    roughness: 0.26,
    metalness: 0.75,
  });
  const headlightGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfff8cc,
    emissive: 0xffdf7a,
    emissiveIntensity: 2.0,
    roughness: 0.12,
    metalness: 0.1,
  });
  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.95,
    roughness: 0.2,
  });

  // 1. Undercarriage, Wheel Arches & Rear Bumper
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.26, 2.75), chassisMat);
  chassis.position.set(0, 0.42, -0.05);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  bodyGroup.add(chassis);

  // Side running boards / step plates
  for (const side of [-1, 1]) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 1.05), chassisMat);
    step.position.set(side * 0.76, 0.36, -0.04);
    bodyGroup.add(step);
  }

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.18, 0.16), chromeMat);
  rearBumper.position.set(0, 0.44, -1.46);
  rearBumper.castShadow = true;
  bodyGroup.add(rearBumper);

  for (const side of [-1, 1]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.06), tailLightMat);
    tail.position.set(side * 0.56, 0.62, -1.42);
    bodyGroup.add(tail);
  }

  // 2. Vintage Rounded Hood, Grille, Front Fenders & Headlight Pods
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.56, 0.92), paintRedMat);
  hood.position.set(0, 0.80, 0.84);
  hood.castShadow = true;
  hood.receiveShadow = true;
  bodyGroup.add(hood);

  // Cream racing/heritage trim stripe along the hood sides
  const hoodTrim = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.08, 0.88), paintCreamMat);
  hoodTrim.position.set(0, 0.84, 0.84);
  bodyGroup.add(hoodTrim);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.38, 0.08), chromeMat);
  grille.position.set(0, 0.78, 1.30);
  bodyGroup.add(grille);

  // Subtle warm headlight glow cones on the ground ahead
  const beamMat = new THREE.MeshBasicMaterial({
    map: textures.lampGlowMap,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const headBeam = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.6), beamMat);
  headBeam.rotation.x = -Math.PI / 2;
  headBeam.position.set(0, 0.026, 2.95);
  root.add(headBeam);

  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.18, 14), chromeMat);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(side * 0.54, 0.82, 1.26);
    bodyGroup.add(pod);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.05, 14), headlightGlowMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(side * 0.54, 0.82, 1.35);
    bodyGroup.add(lens);
  }

  // 3. Cozy Cab, Cream Roof Cap, Wing Mirrors, Visor & Brass Roof Rack
  const cabLower = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.66, 1.06), paintRedMat);
  cabLower.position.set(0, 0.88, -0.02);
  cabLower.castShadow = true;
  cabLower.receiveShadow = true;
  bodyGroup.add(cabLower);

  const cabStripe = new THREE.Mesh(new THREE.BoxGeometry(1.47, 0.08, 1.02), paintCreamMat);
  cabStripe.position.set(0, 0.84, -0.02);
  bodyGroup.add(cabStripe);

  const cabUpper = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.52, 0.96), paintRedMat);
  cabUpper.position.set(0, 1.42, -0.06);
  cabUpper.castShadow = true;
  bodyGroup.add(cabUpper);

  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.13, 1.06), paintCreamMat);
  cabRoof.position.set(0, 1.72, -0.06);
  cabRoof.castShadow = true;
  bodyGroup.add(cabRoof);

  // Sun visor above windshield
  const visor = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.06, 0.24), paintRedMat);
  visor.position.set(0, 1.65, 0.50);
  visor.rotation.x = 0.25;
  bodyGroup.add(visor);

  // Brass roof rack rails
  for (const side of [-1, 1]) {
    const rackRail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.82), brassMat);
    rackRail.position.set(side * 0.56, 1.82, -0.08);
    bodyGroup.add(rackRail);

    // Side wing mirrors
    const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.04), chromeMat);
    mirrorArm.position.set(side * 0.78, 1.28, 0.26);
    bodyGroup.add(mirrorArm);
    const mirrorHead = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.12), chromeMat);
    mirrorHead.position.set(side * 0.87, 1.32, 0.26);
    bodyGroup.add(mirrorHead);
  }

  // Front windshield + side windows + rear window
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.38, 0.08), glassMat);
  windshield.position.set(0, 1.42, 0.41);
  windshield.rotation.x = -0.14;
  bodyGroup.add(windshield);

  const sideWindows = new THREE.Mesh(new THREE.BoxGeometry(1.40, 0.36, 0.72), glassMat);
  sideWindows.position.set(0, 1.42, -0.06);
  bodyGroup.add(sideWindows);

  // 4. Spinning Amber Rooftop Beacon Light
  const beaconBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.10, 14), chassisMat);
  beaconBase.position.set(0, 1.82, -0.02);
  bodyGroup.add(beaconBase);

  const beaconGroup = new THREE.Group();
  beaconGroup.position.set(0, 1.96, -0.02);
  bodyGroup.add(beaconGroup);

  const beaconDome = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.22, 14),
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.7,
      roughness: 0.14,
      metalness: 0.1,
    })
  );
  beaconGroup.add(beaconDome);

  const beaconBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.30, 0.06, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xfbbf24,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    })
  );
  beaconGroup.add(beaconBar);

  // 5. Timber Salt-Spreader Bed with Salt Sacks, Wooden Barrel & Red Snow Shovel
  const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.14, 0.96), timberMat);
  bedFloor.position.set(0, 0.62, -0.96);
  bedFloor.castShadow = true;
  bedFloor.receiveShadow = true;
  bodyGroup.add(bedFloor);

  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.34, 0.95), timberMat);
    rail.position.set(side * 0.68, 0.84, -0.96);
    rail.castShadow = true;
    bodyGroup.add(rail);
  }
  const backRail = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.34, 0.10), timberMat);
  backRail.position.set(0, 0.84, -1.39);
  backRail.castShadow = true;
  bodyGroup.add(backRail);

  const sackMat = new THREE.MeshStandardMaterial({ color: 0xe6d7bf, roughness: 0.88 });
  const sack1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.30, 0.42), sackMat);
  sack1.position.set(-0.28, 0.84, -0.94);
  sack1.rotation.y = 0.12;
  sack1.castShadow = true;
  bodyGroup.add(sack1);

  // Mini cozy salt barrel in truck bed
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.20, 0.42, 12), timberMat);
  barrel.position.set(0.32, 0.90, -0.96);
  barrel.castShadow = true;
  bodyGroup.add(barrel);
  const barrelBand = new THREE.Mesh(new THREE.CylinderGeometry(0.228, 0.228, 0.06, 12), chassisMat);
  barrelBand.position.set(0.32, 0.94, -0.96);
  bodyGroup.add(barrelBand);

  // Shovel resting on side rail
  const shovelHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.88, 8), timberMat);
  shovelHandle.rotation.x = Math.PI / 2;
  shovelHandle.position.set(-0.74, 1.04, -0.96);
  bodyGroup.add(shovelHandle);

  // 6. Dual Vertical Chrome Exhaust Pipes behind cab
  for (const side of [-1, 1]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.08, 10), chromeMat);
    pipe.position.set(side * 0.74, 1.30, -0.52);
    pipe.castShadow = true;
    bodyGroup.add(pipe);

    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.055, 0.16, 10), chassisMat);
    tip.position.set(side * 0.74, 1.86, -0.52);
    bodyGroup.add(tip);
  }

  // 7. Curved Beveled Snowplow Blade with Chevron Hazard Bar & Heated Copper Edge
  const bladePivot = new THREE.Group();
  bladePivot.position.set(0, 0.14, 1.32);
  bodyGroup.add(bladePivot);

  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.58), chassisMat);
    strut.position.set(side * 0.42, 0.24, 0.18);
    strut.rotation.y = -side * 0.18;
    bladePivot.add(strut);
  }

  const bladeScaleGroup = new THREE.Group();
  bladeScaleGroup.position.set(0, 0, 0.42);
  bladePivot.add(bladeScaleGroup);

  const bladeProfile = new THREE.Shape();
  bladeProfile.moveTo(0, 0);
  bladeProfile.lineTo(0.14, 0);
  bladeProfile.quadraticCurveTo(-0.04, 0.36, 0.18, 0.72);
  bladeProfile.lineTo(0.06, 0.76);
  bladeProfile.quadraticCurveTo(-0.18, 0.36, 0, 0);

  const bladeGeo = new THREE.ExtrudeGeometry(bladeProfile, {
    depth: 2.4,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.03,
    bevelThickness: 0.03,
  });
  bladeGeo.rotateY(Math.PI / 2);
  bladeGeo.translate(-1.2, 0, 0);

  const bladeMesh = new THREE.Mesh(bladeGeo, plowYellowMat);
  bladeMesh.castShadow = true;
  bladeMesh.receiveShadow = true;
  bladeScaleGroup.add(bladeMesh);

  // Chevron hazard bar along top rim of plow blade
  const hazardTrim = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.14, 0.12), bladeStripeMat);
  hazardTrim.position.set(0, 0.68, 0.14);
  bladeScaleGroup.add(hazardTrim);

  // Heated copper scraper edge along bottom
  const scraperEdge = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.11, 0.12), heatedCoilMat);
  scraperEdge.position.set(0, 0.06, 0.07);
  bladeScaleGroup.add(scraperEdge);

  for (const side of [-1, 1]) {
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.56, 8), paintRedMat);
    marker.position.set(side * 1.18, 0.90, 0.08);
    bladeScaleGroup.add(marker);

    const markerTip = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), paintCreamMat);
    markerTip.position.set(side * 1.18, 1.18, 0.08);
    bladeScaleGroup.add(markerTip);
  }

  // Upgradeable Side Snow-Blower Chutes (revealed when snowBlower >= Lv 2)
  const blowerChutes = new THREE.Group();
  blowerChutes.visible = false;
  bladeScaleGroup.add(blowerChutes);
  for (const side of [-1, 1]) {
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.34, 10), paintRedMat);
    housing.position.set(side * 1.24, 0.50, 0.02);
    housing.rotation.z = -side * 0.32;
    blowerChutes.add(housing);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.28, 10), chromeMat);
    nozzle.position.set(side * 1.38, 0.72, 0.04);
    nozzle.rotation.z = -side * 0.78;
    blowerChutes.add(nozzle);
  }

  // Sculpted Dynamic Rolling Snow Wave curling inside & spilling past the plow scoop while plowing!
  const snowWaveGroup = new THREE.Group();
  snowWaveGroup.position.set(0, 0.30, 0.36);
  snowWaveGroup.visible = false;
  bladeScaleGroup.add(snowWaveGroup);

  const waveGeo = new THREE.CylinderGeometry(0.35, 0.41, 2.62, 16, 10);
  waveGeo.rotateZ(Math.PI / 2);
  const wPos = waveGeo.attributes.position;
  for (let i = 0; i < wPos.count; i++) {
    const x = wPos.getX(i);
    const y = wPos.getY(i);
    const z = wPos.getZ(i);
    const ang = Math.atan2(y, z);
    const endTaper = 1 - Math.pow(Math.min(1, Math.abs(x) / 1.32), 3) * 0.30;
    const ripple = 1 + Math.sin(x * 5.0 + ang * 2.0) * 0.22 + Math.cos(x * 8.5 - ang * 3.0) * 0.11;
    wPos.setY(i, y * ripple * endTaper);
    wPos.setZ(i, z * ripple * endTaper);
  }
  waveGeo.computeVertexNormals();

  const waveMat = new THREE.MeshStandardMaterial({
    color: 0xebf4fc,
    map: textures.snowAlbedoMap,
    normalMap: textures.snowNormalMap,
    normalScale: new THREE.Vector2(1.35, 1.35),
    roughnessMap: textures.snowRoughnessMap,
    roughness: 0.94,
    metalness: 0.04,
    envMapIntensity: 0.42,
  });
  const snowWaveMesh = new THREE.Mesh(waveGeo, waveMat);
  snowWaveMesh.castShadow = true;
  snowWaveGroup.add(snowWaveMesh);

  // 8. 4 Chunky Off-Road Tires with Steel Rims
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.30, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.32, 12);
  rimGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.BoxGeometry(0.34, 0.10, 0.10);

  const makeWheel = (x: number, z: number): THREE.Group => {
    const steerGroup = new THREE.Group();
    steerGroup.position.set(x, 0.36, z);
    const spinGroup = new THREE.Group();
    steerGroup.add(spinGroup);

    const tire = new THREE.Mesh(wheelGeo, tireMat);
    tire.castShadow = true;
    spinGroup.add(tire);

    const rim = new THREE.Mesh(rimGeo, chromeMat);
    spinGroup.add(rim);

    const lug = new THREE.Mesh(hubGeo, paintRedMat);
    spinGroup.add(lug);

    steerGroup.userData.spinGroup = spinGroup;
    root.add(steerGroup);
    return steerGroup;
  };

  const frontWheels = [makeWheel(-0.76, 0.78), makeWheel(0.76, 0.78)];
  const rearWheels = [makeWheel(-0.76, -0.84), makeWheel(0.76, -0.84)];

  return {
    root,
    bodyGroup,
    bladePivot,
    bladeScaleGroup,
    blowerChutes,
    snowWaveGroup,
    snowWaveMesh,
    heatedCoilMat,
    beaconGroup,
    frontWheels,
    rearWheels,
    headlightGlowMat,
    headBeamMat: beamMat,
    paintPrimaryMat: paintRedMat,
    paintTrimMat: paintCreamMat,
    bladeAccentMat: plowYellowMat,
    exhaustTipLeft: new THREE.Vector3(-0.74, 1.88, -0.52),
    exhaustTipRight: new THREE.Vector3(0.74, 1.88, -0.52),
  };
}

/**
 * Rich Composite Cozy Alpine Chalet Cottage
 * Details: stone foundation, plaster walls, timber corner & gable framing,
 * painted wooden window shutters, glowing mullioned windows, porch wall-lantern,
 * stacked firewood logs, draped snow roof with overhanging icicles, and brick chimney.
 */
export function createAlpineCottage(style: number, textures: ProceduralTextures): {
  group: THREE.Group;
  chimneyWorldOffset: THREE.Vector3;
} {
  const group = new THREE.Group();

  const wallColors = [0xf2e8d8, 0xe8dfd0, 0xdfe7e1];
  const roofColors = [0x6b3a2c, 0x3b4e5c, 0x7c4332];
  const shutterColors = [0x2c5243, 0x8c352b, 0x364d63];
  const trimColor = 0x523624;

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.9, metalness: 0.05 });
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColors[style % wallColors.length], roughness: 0.85, metalness: 0.02 });
  const timberMat = new THREE.MeshStandardMaterial({
    color: trimColor,
    roughness: 0.80,
    bumpMap: textures.woodBump,
    bumpScale: 0.02,
  });
  const shutterMat = new THREE.MeshStandardMaterial({ color: shutterColors[style % shutterColors.length], roughness: 0.72 });
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColors[style % roofColors.length], roughness: 0.74, metalness: 0.06 });
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf4f8fc,
    map: textures.snowAlbedoMap,
    normalMap: textures.snowNormalMap,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughnessMap: textures.snowRoughnessMap,
    roughness: 0.94,
    metalness: 0.04,
    envMapIntensity: 0.45,
  });
  const warmWindowMat = new THREE.MeshStandardMaterial({
    color: 0xffd57a,
    emissive: 0xffa62b,
    emissiveIntensity: 2.35,
    roughness: 0.16,
  });
  const icicleMat = new THREE.MeshStandardMaterial({
    color: 0xdbeeff,
    roughness: 0.15,
    metalness: 0.1,
  });
  const brickMat = new THREE.MeshStandardMaterial({ color: 0x8a4236, roughness: 0.88 });

  // 1. Stone foundation plinth
  const base = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.55, 3.7), stoneMat);
  base.position.set(0, 0.275, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // 2. Main plaster walls
  const walls = new THREE.Mesh(new THREE.BoxGeometry(4.1, 2.25, 3.5), wallMat);
  walls.position.set(0, 1.65, 0);
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // 3. Corner & Horizontal Half-Timber Beams
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.32, 0.24), timberMat);
      post.position.set(sx * 2.02, 1.66, sz * 1.72);
      group.add(post);
    }
  }
  const beltBeam = new THREE.Mesh(new THREE.BoxGeometry(4.24, 0.14, 3.64), timberMat);
  beltBeam.position.set(0, 2.66, 0);
  group.add(beltBeam);

  // 4. Pitched Alpine Gable Roof
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-2.45, 0);
  gableShape.lineTo(2.45, 0);
  gableShape.lineTo(0, 1.80);
  gableShape.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(gableShape, {
    depth: 4.05,
    bevelEnabled: false,
  });
  roofGeo.translate(0, 0, -2.025);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 2.70, 0);
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  // 5. Thick Cozy Snow Blanket draped over pitched roof
  const snowShape = new THREE.Shape();
  snowShape.moveTo(-2.56, 0.04);
  snowShape.lineTo(0, 1.98);
  snowShape.lineTo(2.56, 0.04);
  snowShape.lineTo(2.34, -0.10);
  snowShape.lineTo(0, 1.74);
  snowShape.lineTo(-2.34, -0.10);
  snowShape.closePath();

  const snowRoofGeo = new THREE.ExtrudeGeometry(snowShape, {
    depth: 4.18,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.08,
    bevelThickness: 0.08,
  });
  snowRoofGeo.translate(0, 0, -2.09);
  const snowRoof = new THREE.Mesh(snowRoofGeo, snowMat);
  snowRoof.position.set(0, 2.75, 0);
  snowRoof.castShadow = true;
  snowRoof.receiveShadow = true;
  group.add(snowRoof);

  // Subtle hanging icicles along the front/right eaves
  for (let i = -3; i <= 3; i++) {
    const icicle = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.24 + (Math.abs(i) % 2) * 0.1, 5), icicleMat);
    icicle.rotation.x = Math.PI;
    icicle.position.set(2.42, 2.58, i * 0.55);
    group.add(icicle);
  }

  // 6. Brick Chimney + Snow Rim
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.60, 1.48, 0.60), brickMat);
  chimney.position.set(1.12, 4.10, -0.60);
  chimney.castShadow = true;
  group.add(chimney);

  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.14, 0.74), snowMat);
  chimneyCap.position.set(1.12, 4.86, -0.60);
  group.add(chimneyCap);

  // 7. Glowing Mullioned Windows with Painted Shutters & Snowy Flower Boxes
  const addWindow = (x: number, y: number, z: number, ry: number, withShutters = true) => {
    const winGroup = new THREE.Group();
    winGroup.position.set(x, y, z);
    winGroup.rotation.y = ry;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.90, 0.12), timberMat);
    winGroup.add(frame);

    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.74, 0.14), warmWindowMat);
    winGroup.add(pane);

    const barH = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.06, 0.16), timberMat);
    winGroup.add(barH);
    const barV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.78, 0.16), timberMat);
    winGroup.add(barV);

    if (withShutters) {
      for (const s of [-1, 1]) {
        const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.88, 0.08), shutterMat);
        shutter.position.set(s * 0.56, 0, 0.02);
        winGroup.add(shutter);
      }
    }

    const sill = new THREE.Mesh(new THREE.BoxGeometry(1.00, 0.13, 0.24), snowMat);
    sill.position.set(0, -0.46, 0.08);
    winGroup.add(sill);

    group.add(winGroup);
  };

  addWindow(-1.14, 1.72, 1.76, 0, true);
  addWindow(1.14, 1.72, 1.76, 0, true);
  addWindow(2.06, 1.72, 0, Math.PI / 2, true);
  addWindow(-2.06, 1.72, 0, -Math.PI / 2, true);

  // Cozy attic round gable window on front
  const atticRing = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 14), timberMat);
  atticRing.rotation.x = Math.PI / 2;
  atticRing.position.set(0, 3.48, 2.02);
  group.add(atticRing);
  const atticPane = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 14), warmWindowMat);
  atticPane.rotation.x = Math.PI / 2;
  atticPane.position.set(0, 3.48, 2.03);
  group.add(atticPane);

  // 8. Front Timber Door, Glowing Porch Lantern & Stacked Firewood
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.80, 1.46, 0.14), timberMat);
  door.position.set(0, 1.24, 1.76);
  group.add(door);

  const porchLantern = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.18), warmWindowMat);
  porchLantern.position.set(0.56, 1.85, 1.88);
  group.add(porchLantern);

  const awning = new THREE.Mesh(new THREE.BoxGeometry(1.40, 0.16, 0.72), snowMat);
  awning.position.set(0, 2.15, 2.02);
  awning.rotation.x = 0.2;
  group.add(awning);

  // Stacked firewood bundle along right side foundation
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.56, 7), timberMat);
      log.rotation.z = Math.PI / 2;
      log.position.set(2.14, 0.62 + row * 0.15, 0.85 + col * 0.17);
      group.add(log);
    }
  }

  // Contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 4.8),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.014, 0);
  group.add(shadow);

  return {
    group,
    chimneyWorldOffset: new THREE.Vector3(1.12, 5.05, -0.60),
  };
}

/**
 * Tall Village Square Landmark: Alpine Clock Tower with Festive Pine Garlands & Arched Door
 */
export function createClockTowerLandmark(textures: ProceduralTextures): THREE.Group {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6f7885, roughness: 0.88 });
  const plasterMat = new THREE.MeshStandardMaterial({ color: 0xf0e7d8, roughness: 0.82 });
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x4d3221,
    roughness: 0.78,
    bumpMap: textures.woodBump,
    bumpScale: 0.02,
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x33535c, roughness: 0.45, metalness: 0.25 });
  const garlandMat = new THREE.MeshStandardMaterial({ color: 0x22523d, roughness: 0.85 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf4f8fd, roughness: 0.72 });
  const clockFaceMat = new THREE.MeshStandardMaterial({
    color: 0xfff5d6,
    emissive: 0xffc864,
    emissiveIntensity: 1.35,
    roughness: 0.22,
  });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd9a13b, roughness: 0.25, metalness: 0.85 });

  // Stone plaza step & octagonal base
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.35, 0.45, 8), stoneMat);
  plinth.position.y = 0.225;
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  group.add(plinth);

  const lowerShaft = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.5, 2.2), stoneMat);
  lowerShaft.position.y = 1.65;
  lowerShaft.castShadow = true;
  lowerShaft.receiveShadow = true;
  group.add(lowerShaft);

  // Arched wooden tower door facing +Z
  const archDoor = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.35, 0.14), timberMat);
  archDoor.position.set(0, 1.12, 1.12);
  group.add(archDoor);

  // Upper timbered clock chamber
  const upperShaft = new THREE.Mesh(new THREE.BoxGeometry(1.95, 2.4, 1.95), plasterMat);
  upperShaft.position.y = 4.05;
  upperShaft.castShadow = true;
  group.add(upperShaft);

  // Timber cornice band + festive winter pine garland
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.26, 2.42), timberMat);
  cornice.position.y = 2.90;
  group.add(cornice);

  const garland = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.14, 6, 16), garlandMat);
  garland.rotation.x = Math.PI / 2;
  garland.rotation.z = Math.PI / 4;
  garland.position.y = 3.12;
  group.add(garland);

  // 4 glowing clock faces with brass rims & hands
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const dialGroup = new THREE.Group();
    dialGroup.position.set(Math.sin(angle) * 1.0, 4.25, Math.cos(angle) * 1.0);
    dialGroup.rotation.y = angle;

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.1, 18), brassMat);
    rim.rotation.x = Math.PI / 2;
    dialGroup.add(rim);

    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.12, 18), clockFaceMat);
    face.rotation.x = Math.PI / 2;
    dialGroup.add(face);

    const hand1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.15), timberMat);
    hand1.position.set(0, 0.12, 0.01);
    dialGroup.add(hand1);

    const hand2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.15), timberMat);
    hand2.position.set(0.09, 0, 0.01);
    dialGroup.add(hand2);

    group.add(dialGroup);
  }

  // Steep alpine spire + snow cap + brass finial
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.75, 2.55, 4), roofMat);
  spire.position.y = 6.50;
  spire.rotation.y = Math.PI / 4;
  spire.castShadow = true;
  group.add(spire);

  const snowCap = new THREE.Mesh(new THREE.ConeGeometry(1.38, 1.85, 4), snowMat);
  snowCap.position.y = 6.95;
  snowCap.rotation.y = Math.PI / 4;
  group.add(snowCap);

  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8), brassMat);
  finial.position.y = 8.15;
  group.add(finial);

  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.20, 0), brassMat);
  star.position.y = 8.62;
  group.add(star);

  return group;
}

/**
 * Cozy Alpine Plow Garage Workshop Bay (Upgrades landmark!)
 * Faces +Z toward the isometric camera with readable painted "GARAGE" sign,
 * glowing warm interior bay, striped winter bollards, spare tire, and ground pad ring.
 */
export function createGarageBay(textures: ProceduralTextures): THREE.Group {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x7c482b,
    roughness: 0.80,
    bumpMap: textures.woodBump,
    bumpScale: 0.025,
  });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3b2316, roughness: 0.84 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8f3328, roughness: 0.65 });
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf2f7fc,
    map: textures.snowAlbedoMap,
    normalMap: textures.snowNormalMap,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: textures.snowRoughnessMap,
    roughness: 0.94,
    metalness: 0.04,
    envMapIntensity: 0.45,
  });
  const bayGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffe4a0,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.65,
    roughness: 0.22,
  });
  const signMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.garageSignMap,
    roughness: 0.35,
  });
  const bollardRedMat = new THREE.MeshStandardMaterial({ color: 0xd64531, roughness: 0.45 });
  const bollardCreamMat = new THREE.MeshStandardMaterial({ color: 0xf4ead8, roughness: 0.5 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.65, 3.8), woodMat);
  body.position.set(0, 1.325, 0);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Corner timber posts
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.7, 0.24), darkWoodMat);
      post.position.set(sx * 2.22, 1.35, sz * 1.88);
      group.add(post);
    }
  }

  // Warm open glowing garage door recess facing +Z
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.02, 0.2), darkWoodMat);
  doorFrame.position.set(0, 1.01, 1.88);
  group.add(doorFrame);

  const bayInner = new THREE.Mesh(new THREE.BoxGeometry(2.36, 1.82, 0.22), bayGlowMat);
  bayInner.position.set(0, 0.92, 1.90);
  group.add(bayInner);

  // Painted "GARAGE" Signboard above garage door (cleanly below roof eaves)
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.52, 0.16), signMat);
  sign.position.set(0, 2.24, 1.98);
  group.add(sign);

  // Striped winter safety bollards flanking the open bay
  for (const side of [-1, 1]) {
    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.72, 10), bollardRedMat);
    bollard.position.set(side * 1.62, 0.36, 2.18);
    group.add(bollard);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 10), bollardCreamMat);
    band.position.set(side * 1.62, 0.54, 2.18);
    group.add(band);
  }

  // Sloped shed roof + thick snow layer
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.95, 0.30, 4.35), roofMat);
  roof.position.set(0, 2.86, 0);
  roof.rotation.x = -0.14;
  roof.castShadow = true;
  group.add(roof);

  const snowCap = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.24, 4.45), snowMat);
  snowCap.position.set(0, 3.08, 0);
  snowCap.rotation.x = -0.14;
  group.add(snowCap);

  // Warm light spilling out of the garage bay onto the cleared cobblestone pad
  const bayLight = new THREE.PointLight(0xffb454, 8.5, 13, 1.7);
  bayLight.position.set(0, 2.1, 2.6);
  group.add(bayLight);

  // Glowing amber upgrade ring pad on cleared cobblestones in front of the garage
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.05, 1.35, 28),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.80,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.025, 3.4);
  group.add(ring);

  const padGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 4.2),
    new THREE.MeshBasicMaterial({
      map: textures.lampGlowMap,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );
  padGlow.rotation.x = -Math.PI / 2;
  padGlow.position.set(0, 0.020, 3.1);
  group.add(padGlow);

  // Municipal Salt Silo Hopper mounted beside the depot bay (within halfW 2.55 footprint)
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xc2ccd6, roughness: 0.34, metalness: 0.68 });
  const siloLegMat = new THREE.MeshStandardMaterial({ color: 0x2c3440, roughness: 0.62, metalness: 0.52 });
  const siloX = -2.06;
  const siloZ = -0.35;
  for (const lx of [-0.28, 0.28]) {
    for (const lz of [-0.28, 0.28]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 1.15, 6), siloLegMat);
      leg.position.set(siloX + lx, 0.575, siloZ + lz);
      group.add(leg);
    }
  }
  const hopper = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.62, 12), steelMat);
  hopper.rotation.x = Math.PI;
  hopper.position.set(siloX, 1.05, siloZ);
  group.add(hopper);
  const siloTank = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.85, 12), steelMat);
  siloTank.position.set(siloX, 2.28, siloZ);
  siloTank.castShadow = true;
  group.add(siloTank);
  const siloStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.22, 12), bollardRedMat);
  siloStripe.position.set(siloX, 2.55, siloZ);
  group.add(siloStripe);
  const siloCone = new THREE.Mesh(new THREE.ConeGeometry(0.49, 0.46, 12), snowMat);
  siloCone.position.set(siloX, 3.43, siloZ);
  group.add(siloCone);

  return group;
}

/**
 * Ornate Double-Globe European City Boulevard Streetlamp with Warm Glowing Lanterns
 */
export function createStreetLamp(textures: ProceduralTextures): THREE.Group {
  const group = new THREE.Group();
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e2530, roughness: 0.38, metalness: 0.76 });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xffe999,
    emissive: 0xffa726,
    emissiveIntensity: 3.25,
    roughness: 0.12,
  });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf4f8fd, roughness: 0.72 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.25, 0.52, 8), ironMat);
  base.position.y = 0.26;
  base.castShadow = true;
  group.add(base);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.14, 8), ironMat);
  collar.position.y = 0.58;
  group.add(collar);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.105, 2.95, 8), ironMat);
  pole.position.y = 2.02;
  pole.castShadow = true;
  group.add(pole);

  // Scrolled double-arm bracket holding two warm boulevard lantern globes
  const armBar = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.065, 0.065), ironMat);
  armBar.position.y = 3.24;
  group.add(armBar);

  for (const side of [-1, 1]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.045, 0.045), ironMat);
    brace.position.set(side * 0.22, 3.08, 0);
    brace.rotation.z = side * 0.65;
    group.add(brace);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 6), ironMat);
    neck.position.set(side * 0.44, 3.34, 0);
    group.add(neck);

    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 10), lanternMat);
    globe.position.set(side * 0.44, 3.54, 0);
    group.add(globe);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.14, 8), ironMat);
    cap.position.set(side * 0.44, 3.74, 0);
    group.add(cap);

    const snow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.09, 8), snowMat);
    snow.position.set(side * 0.44, 3.80, 0);
    group.add(snow);
  }

  // Central decorative finial spire
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.34, 6), ironMat);
  finial.position.y = 3.66;
  group.add(finial);

  // Warm cozy pool of golden lantern light on snow & asphalt avenues
  const lampLight = new THREE.PointLight(0xffb454, 7.8, 14, 1.7);
  lampLight.position.set(0, 3.45, 0);
  group.add(lampLight);

  const poolGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 5.2),
    new THREE.MeshBasicMaterial({
      map: textures.lampGlowMap,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    })
  );
  poolGlow.rotation.x = -Math.PI / 2;
  poolGlow.position.y = 0.018;
  group.add(poolGlow);

  return group;
}

/**
 * Cozy Village Snowman Prop with Twig Arms, Scarf & Top Hat
 */
export function createSnowman(): THREE.Group {
  const group = new THREE.Group();
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf6fafe, roughness: 0.78 });
  const scarfMat = new THREE.MeshStandardMaterial({ color: 0xd64531, roughness: 0.85 });
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.65 });
  const carrotMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 });
  const twigMat = new THREE.MeshStandardMaterial({ color: 0x5c3c24, roughness: 0.9 });

  const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), snowMat);
  bottom.position.y = 0.36;
  bottom.castShadow = true;
  group.add(bottom);

  const mid = new THREE.Mesh(new THREE.SphereGeometry(0.31, 14, 12), snowMat);
  mid.position.y = 0.88;
  mid.castShadow = true;
  group.add(mid);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), snowMat);
  head.position.y = 1.28;
  head.castShadow = true;
  group.add(head);

  // Coal buttons
  for (const by of [0.78, 0.94]) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), hatMat);
    btn.position.set(0, by, 0.29);
    group.add(btn);
  }

  // Twig arms
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.52, 6), twigMat);
    arm.position.set(side * 0.42, 0.96, 0);
    arm.rotation.z = -side * 1.1;
    group.add(arm);
  }

  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 8, 16), scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.09;
  group.add(scarf);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 8), carrotMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.28, 0.25);
  group.add(nose);

  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 12), hatMat);
  brim.position.y = 1.48;
  group.add(brim);

  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.26, 12), hatMat);
  crown.position.y = 1.62;
  group.add(crown);

  return group;
}

/**
 * Monumental European Alpine Stone Arched City Gate ("DRIFTCLEAR")
 * Spans the South Entrance Boulevard (7.8m clear drive-through arch, 4.0m tall)
 * with twin stone spire towers, vaulted bridge, snow-blanketed roofs, heraldic banners,
 * hanging warm iron lanterns, and dual-sided "DRIFTCLEAR" crest signs.
 */
export function createCityGate(textures: ProceduralTextures): THREE.Group {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7a8391, roughness: 0.88, metalness: 0.05 });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x57606e, roughness: 0.90, metalness: 0.06 });
  const plasterMat = new THREE.MeshStandardMaterial({ color: 0xeee5d5, roughness: 0.82 });
  const slateMat = new THREE.MeshStandardMaterial({ color: 0x334756, roughness: 0.54, metalness: 0.22 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1d232d, roughness: 0.40, metalness: 0.78 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd9a13b, roughness: 0.25, metalness: 0.84 });
  const bannerMat = new THREE.MeshStandardMaterial({ color: 0xa62c2b, roughness: 0.78 });
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf4f8fc,
    map: textures.snowAlbedoMap,
    normalMap: textures.snowNormalMap,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughnessMap: textures.snowRoughnessMap,
    roughness: 0.94,
    metalness: 0.04,
    envMapIntensity: 0.45,
  });
  const warmGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffe49e,
    emissive: 0xffa62b,
    emissiveIntensity: 2.85,
    roughness: 0.14,
  });
  const signMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.cityGateSignMap,
    roughness: 0.34,
    metalness: 0.18,
  });

  // 1. Twin Monumental Stone Gatehouse Towers flanking the 7.8m boulevard opening
  for (const side of [-1, 1]) {
    const tx = side * 4.85;

    // Heavy stone buttress base
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.15, 2.55), darkStoneMat);
    plinth.position.set(tx, 0.575, 0);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Main square dressed-stone tower shaft
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.05, 4.95, 2.15), stoneMat);
    shaft.position.set(tx, 3.55, 0);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    group.add(shaft);

    // Upper timber/plaster belfry band
    const belfry = new THREE.Mesh(new THREE.BoxGeometry(2.22, 1.15, 2.30), plasterMat);
    belfry.position.set(tx, 6.45, 0);
    belfry.castShadow = true;
    group.add(belfry);

    const cornice = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.22, 2.46), darkStoneMat);
    cornice.position.set(tx, 5.88, 0);
    group.add(cornice);

    // Warm glowing arched turret windows facing South (+Z) and North (-Z)
    for (const faceZ of [-1, 1]) {
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.92, 0.10), darkStoneMat);
      winFrame.position.set(tx, 4.35, faceZ * 1.08);
      group.add(winFrame);

      const winPane = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.76, 0.12), warmGlowMat);
      winPane.position.set(tx, 4.35, faceZ * 1.09);
      group.add(winPane);

      // Upper belfry slit window
      const topWin = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.54, 0.10), warmGlowMat);
      topWin.position.set(tx, 6.48, faceZ * 1.16);
      group.add(topWin);
    }

    // Crimson & gold alpine heraldic banner hanging on front & back of tower
    for (const faceZ of [-1, 1]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.92, 6), brassMat);
      pole.rotation.z = Math.PI / 2;
      pole.position.set(tx, 3.35, faceZ * 1.18);
      group.add(pole);

      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.70, 1.55, 0.05), bannerMat);
      cloth.position.set(tx, 2.55, faceZ * 1.18);
      group.add(cloth);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.06), brassMat);
      trim.position.set(tx, 1.82, faceZ * 1.18);
      group.add(trim);
    }

    // Steep 4-sided slate spire roof + crisp snow cap + golden brass weathervane finial
    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.88, 2.75, 4), slateMat);
    spire.position.set(tx, 8.38, 0);
    spire.rotation.y = Math.PI / 4;
    spire.castShadow = true;
    group.add(spire);

    const spireSnow = new THREE.Mesh(new THREE.ConeGeometry(1.48, 2.02, 4), snowMat);
    spireSnow.position.set(tx, 8.85, 0);
    spireSnow.rotation.y = Math.PI / 4;
    group.add(spireSnow);

    const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 6), brassMat);
    finial.position.set(tx, 10.12, 0);
    group.add(finial);

    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), brassMat);
    orb.position.set(tx, 10.56, 0);
    group.add(orb);

    // Wing wall connectors bridging into the perimeter city wall seamlessly
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.18, 0.56), stoneMat);
    wing.position.set(side * 5.82, 0.59, 0);
    group.add(wing);

    const wingSnow = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.14, 0.60), snowMat);
    wingSnow.position.set(side * 5.82, 1.24, 0);
    group.add(wingSnow);

    // Hanging warm wrought-iron gatehouse lantern tucked in the inner arch corner
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 0.07), ironMat);
    bracket.position.set(side * 3.62, 3.82, 0.88);
    group.add(bracket);

    const lanternGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.38, 6), warmGlowMat);
    lanternGlass.position.set(side * 3.40, 3.55, 0.88);
    group.add(lanternGlass);

    const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.18, 6), ironMat);
    lanternCap.position.set(side * 3.40, 3.80, 0.88);
    group.add(lanternCap);

    // Sculpted stone arch spandrel corbel curving smoothly from tower into bridge
    const corbel = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 1.85), darkStoneMat);
    corbel.position.set(side * 3.58, 4.18, 0);
    corbel.rotation.z = side * 0.48;
    group.add(corbel);
  }

  // 2. Vaulted Overhead Stone Gatehouse Bridge spanning the boulevard (clear height >= 4.05m)
  const bridgeStone = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.32, 2.05), stoneMat);
  bridgeStone.position.set(0, 4.86, 0);
  bridgeStone.castShadow = true;
  bridgeStone.receiveShadow = true;
  group.add(bridgeStone);

  const bridgeCornice = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.20, 2.30), darkStoneMat);
  bridgeCornice.position.set(0, 5.56, 0);
  group.add(bridgeCornice);

  // Keystone emblem centered on both faces of the stone arch
  const keystone = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 2.18), brassMat);
  keystone.position.set(0, 4.30, 0);
  group.add(keystone);

  // Steep pitched slate roof + snow blanket over the overhead gatehouse gallery
  const ridgeShape = new THREE.Shape();
  ridgeShape.moveTo(-1.35, 0);
  ridgeShape.lineTo(1.35, 0);
  ridgeShape.lineTo(0, 1.32);
  ridgeShape.closePath();

  const ridgeGeo = new THREE.ExtrudeGeometry(ridgeShape, { depth: 8.3, bevelEnabled: false });
  ridgeGeo.rotateY(Math.PI / 2);
  ridgeGeo.translate(-4.15, 0, 0);
  const ridgeRoof = new THREE.Mesh(ridgeGeo, slateMat);
  ridgeRoof.position.set(0, 5.62, 0);
  ridgeRoof.castShadow = true;
  group.add(ridgeRoof);

  const ridgeSnowGeo = new THREE.ExtrudeGeometry(ridgeShape, {
    depth: 8.42,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.06,
    bevelThickness: 0.06,
  });
  ridgeSnowGeo.rotateY(Math.PI / 2);
  ridgeSnowGeo.translate(-4.21, 0, 0);
  const ridgeSnow = new THREE.Mesh(ridgeSnowGeo, snowMat);
  ridgeSnow.position.set(0, 5.74, 0);
  ridgeSnow.scale.set(1, 0.92, 0.96);
  group.add(ridgeSnow);

  // Dual-sided "DRIFTCLEAR" City Crest Signboards (visible from approach + inside town)
  const signSouth = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.96, 0.14), signMat);
  signSouth.position.set(0, 4.92, 1.08);
  group.add(signSouth);

  const signNorth = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.96, 0.14), signMat);
  signNorth.position.set(0, 4.92, -1.08);
  signNorth.rotation.y = Math.PI;
  group.add(signNorth);

  // Warm welcoming golden gatehouse light + ground light pool under the archway
  const gateLight = new THREE.PointLight(0xffbe63, 12.0, 18, 1.6);
  gateLight.position.set(0, 3.85, 0.4);
  group.add(gateLight);

  const gateGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(8.8, 6.2),
    new THREE.MeshBasicMaterial({
      map: textures.lampGlowMap,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    })
  );
  gateGlow.rotation.x = -Math.PI / 2;
  gateGlow.position.set(0, 0.022, 0);
  group.add(gateGlow);

  return group;
}

/**
 * Tall 3-Story European Alpine Townhouse
 * Ground-floor stone storefront with glowing shop windows & striped awning,
 * pastel alpine plaster upper floors, wrought-iron Juliet balcony, dormer attic,
 * snow-draped steep roof, and brick chimney.
 */
export function createAlpineTownhouse(style: number, textures: ProceduralTextures): {
  group: THREE.Group;
  chimneyWorldOffset: THREE.Vector3;
} {
  const group = new THREE.Group();

  const plasterPalette = [0xe8c78e, 0xdba396, 0xa8beae, 0xeee2cc];
  const roofPalette = [0x4c3532, 0x334857, 0x69372e, 0x3f4754];
  const shutterPalette = [0x2c4f41, 0x7c2d2d, 0x2d445c, 0x5c3c28];

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6f7785, roughness: 0.88, metalness: 0.05 });
  const wallMat = new THREE.MeshStandardMaterial({
    color: plasterPalette[style % plasterPalette.length],
    roughness: 0.84,
    metalness: 0.02,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: roofPalette[style % roofPalette.length],
    roughness: 0.70,
    metalness: 0.08,
  });
  const shutterMat = new THREE.MeshStandardMaterial({
    color: shutterPalette[style % shutterPalette.length],
    roughness: 0.72,
  });
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x4b3121,
    roughness: 0.80,
    bumpMap: textures.woodBump,
    bumpScale: 0.02,
  });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e2530, roughness: 0.42, metalness: 0.76 });
  const brickMat = new THREE.MeshStandardMaterial({ color: 0x874035, roughness: 0.88 });
  const awningMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.awningMaps[style % textures.awningMaps.length],
    roughness: 0.72,
  });
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf4f8fc,
    map: textures.snowAlbedoMap,
    normalMap: textures.snowNormalMap,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughnessMap: textures.snowRoughnessMap,
    roughness: 0.94,
    metalness: 0.04,
    envMapIntensity: 0.45,
  });
  const warmWinMat = new THREE.MeshStandardMaterial({
    color: 0xffd982,
    emissive: 0xffa62b,
    emissiveIntensity: 2.35,
    roughness: 0.16,
  });

  // 1. Ground-floor dressed-stone storefront (y = 0..2.1)
  const groundFloor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.1, 3.6), stoneMat);
  groundFloor.position.set(0, 1.05, 0);
  groundFloor.castShadow = true;
  groundFloor.receiveShadow = true;
  group.add(groundFloor);

  // Storefront glowing display windows + timber entry door on +Z face
  const shopDoor = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.62, 0.14), timberMat);
  shopDoor.position.set(-1.15, 0.86, 1.80);
  group.add(shopDoor);

  const displayFrame = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.38, 0.14), timberMat);
  displayFrame.position.set(0.68, 1.08, 1.80);
  group.add(displayFrame);

  const displayPane = new THREE.Mesh(new THREE.BoxGeometry(1.86, 1.20, 0.16), warmWinMat);
  displayPane.position.set(0.68, 1.08, 1.81);
  group.add(displayPane);

  // Sloped striped European canvas storefront awning + dusting of snow
  const awning = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.12, 0.82), awningMat);
  awning.position.set(0, 1.98, 2.14);
  awning.rotation.x = 0.28;
  awning.castShadow = true;
  group.add(awning);

  const awningSnow = new THREE.Mesh(new THREE.BoxGeometry(3.80, 0.07, 0.62), snowMat);
  awningSnow.position.set(0, 2.06, 2.10);
  awningSnow.rotation.x = 0.28;
  group.add(awningSnow);

  // 2. 2nd & 3rd Story Alpine Pastel Plaster Block (y = 2.1..5.35)
  const beltCourse = new THREE.Mesh(new THREE.BoxGeometry(4.36, 0.18, 3.74), stoneMat);
  beltCourse.position.set(0, 2.16, 0);
  group.add(beltCourse);

  const upperBody = new THREE.Mesh(new THREE.BoxGeometry(4.12, 3.16, 3.52), wallMat);
  upperBody.position.set(0, 3.80, 0);
  upperBody.castShadow = true;
  upperBody.receiveShadow = true;
  group.add(upperBody);

  // Corner stone quoins / trim strips
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const quoin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.18, 0.22), stoneMat);
      quoin.position.set(sx * 2.02, 3.80, sz * 1.72);
      group.add(quoin);
    }
  }

  // Helper to place upper mullioned windows with shutters & snowy sills
  const addUpperWin = (x: number, y: number, z: number, ry: number) => {
    const wg = new THREE.Group();
    wg.position.set(x, y, z);
    wg.rotation.y = ry;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.94, 0.10), timberMat);
    wg.add(frame);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.80, 0.12), warmWinMat);
    wg.add(pane);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.05, 0.14), timberMat);
    wg.add(crossH);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.84, 0.14), timberMat);
    wg.add(crossV);

    for (const s of [-1, 1]) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.92, 0.06), shutterMat);
      sh.position.set(s * 0.48, 0, 0.02);
      wg.add(sh);
    }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.11, 0.20), snowMat);
    sill.position.set(0, -0.49, 0.08);
    wg.add(sill);

    group.add(wg);
  };

  // Front (+Z) 2nd & 3rd floor windows
  addUpperWin(-1.12, 3.05, 1.76, 0);
  addUpperWin(1.12, 3.05, 1.76, 0);
  addUpperWin(-1.12, 4.52, 1.76, 0);
  addUpperWin(1.12, 4.52, 1.76, 0);
  // Side windows so town blocks look richly detailed from isometric angle
  addUpperWin(2.06, 3.05, 0, Math.PI / 2);
  addUpperWin(2.06, 4.52, 0, Math.PI / 2);
  addUpperWin(-2.06, 3.05, 0, -Math.PI / 2);
  addUpperWin(-2.06, 4.52, 0, -Math.PI / 2);

  // Wrought-iron Juliet Balcony centered on 2nd floor front
  const balcFloor = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.12, 0.56), stoneMat);
  balcFloor.position.set(0, 2.52, 1.98);
  group.add(balcFloor);
  const balcRail = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.06, 0.06), ironMat);
  balcRail.position.set(0, 3.04, 2.22);
  group.add(balcRail);
  for (let bx = -0.56; bx <= 0.57; bx += 0.28) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.50, 0.05), ironMat);
    bar.position.set(bx, 2.78, 2.22);
    group.add(bar);
  }
  const balcDoor = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.12, 0.12), warmWinMat);
  balcDoor.position.set(0, 3.12, 1.77);
  group.add(balcDoor);

  // 3. Steep European Gable Roof + Thick Snow Blanket + Cozy Attic Dormer
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-2.36, 0);
  roofShape.lineTo(2.36, 0);
  roofShape.lineTo(0, 1.92);
  roofShape.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 3.96, bevelEnabled: false });
  roofGeo.translate(0, 0, -1.98);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 5.36, 0);
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  const snowShape = new THREE.Shape();
  snowShape.moveTo(-2.46, 0.04);
  snowShape.lineTo(0, 2.08);
  snowShape.lineTo(2.46, 0.04);
  snowShape.lineTo(2.26, -0.08);
  snowShape.lineTo(0, 1.85);
  snowShape.lineTo(-2.26, -0.08);
  snowShape.closePath();

  const snowRoofGeo = new THREE.ExtrudeGeometry(snowShape, {
    depth: 4.08,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.07,
    bevelThickness: 0.07,
  });
  snowRoofGeo.translate(0, 0, -2.04);
  const snowRoof = new THREE.Mesh(snowRoofGeo, snowMat);
  snowRoof.position.set(0, 5.40, 0);
  snowRoof.castShadow = true;
  group.add(snowRoof);

  // Attic Dormer Window jutting out on the +X roof slope (facing the isometric camera)
  const dormerBody = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.82, 0.96), wallMat);
  dormerBody.position.set(1.18, 6.08, 0);
  group.add(dormerBody);
  const dormerPane = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.56, 0.56), warmWinMat);
  dormerPane.position.set(1.62, 6.08, 0);
  group.add(dormerPane);
  const dormerCap = new THREE.Mesh(new THREE.ConeGeometry(0.76, 0.55, 4), snowMat);
  dormerCap.rotation.y = Math.PI / 4;
  dormerCap.position.set(1.18, 6.72, 0);
  group.add(dormerCap);

  // Tall brick chimney + snow cap
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.55, 0.56), brickMat);
  chimney.position.set(-1.12, 6.82, -0.78);
  chimney.castShadow = true;
  group.add(chimney);
  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.14, 0.70), snowMat);
  chimneyCap.position.set(-1.12, 7.62, -0.78);
  group.add(chimneyCap);

  // Contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 4.9),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.014, 0);
  group.add(shadow);

  return {
    group,
    chimneyWorldOffset: new THREE.Vector3(-1.12, 7.78, -0.78),
  };
}

/**
 * Cozy 2-Story Corner Bakery & Hot-Cocoa Café with Wraparound Striped Awning & "BAKERY & CAFÉ" Sign
 */
export function createCornerShopCafe(textures: ProceduralTextures): {
  group: THREE.Group;
  chimneyWorldOffset: THREE.Vector3;
} {
  const group = new THREE.Group();

  const brickLowerMat = new THREE.MeshStandardMaterial({ color: 0x7a4438, roughness: 0.86 });
  const creamUpperMat = new THREE.MeshStandardMaterial({ color: 0xf4ead7, roughness: 0.82 });
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x452b1c,
    roughness: 0.78,
    bumpMap: textures.woodBump,
    bumpScale: 0.02,
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2c4740, roughness: 0.68, metalness: 0.08 });
  const awningMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.awningMaps[0],
    roughness: 0.70,
  });
  const signMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.cafeSignMap,
    roughness: 0.36,
  });
  const warmGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffdfa0,
    emissive: 0xffa62b,
    emissiveIntensity: 2.55,
    roughness: 0.14,
  });
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf4f8fc,
    map: textures.snowAlbedoMap,
    normalMap: textures.snowNormalMap,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughnessMap: textures.snowRoughnessMap,
    roughness: 0.94,
    metalness: 0.04,
    envMapIntensity: 0.45,
  });

  // Ground-floor warm brick café base
  const lower = new THREE.Mesh(new THREE.BoxGeometry(4.25, 2.05, 3.65), brickLowerMat);
  lower.position.set(0, 1.025, 0);
  lower.castShadow = true;
  lower.receiveShadow = true;
  group.add(lower);

  // Upper cozy cream timbered floor
  const upper = new THREE.Mesh(new THREE.BoxGeometry(4.15, 1.75, 3.55), creamUpperMat);
  upper.position.set(0, 2.92, 0);
  upper.castShadow = true;
  upper.receiveShadow = true;
  group.add(upper);

  const trimBand = new THREE.Mesh(new THREE.BoxGeometry(4.36, 0.16, 3.76), timberMat);
  trimBand.position.set(0, 2.06, 0);
  group.add(trimBand);

  // Large warm pastry display windows on front (+Z) and side (+X)
  const frontWin = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.24, 0.14), warmGlowMat);
  frontWin.position.set(0.45, 1.02, 1.82);
  group.add(frontWin);

  const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.24, 2.15), warmGlowMat);
  sideWin.position.set(2.12, 1.02, 0.12);
  group.add(sideWin);

  const cafeDoor = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.60, 0.14), timberMat);
  cafeDoor.position.set(-1.32, 0.84, 1.82);
  group.add(cafeDoor);

  // Wraparound burgundy-and-cream striped awnings
  const frontAwning = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 0.86), awningMat);
  frontAwning.position.set(0.05, 1.88, 2.18);
  frontAwning.rotation.x = 0.28;
  group.add(frontAwning);

  const sideAwning = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.12, 3.55), awningMat);
  sideAwning.position.set(2.48, 1.88, 0.05);
  sideAwning.rotation.z = -0.28;
  group.add(sideAwning);

  // Painted "BAKERY & CAFÉ" Signboard above front awning
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.56, 0.12), signMat);
  sign.position.set(0, 2.38, 1.88);
  group.add(sign);

  // Upper cozy shuttered windows
  for (const wx of [-1.18, 1.18]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.82, 0.10), timberMat);
    frame.position.set(wx, 3.10, 1.78);
    group.add(frame);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.68, 0.12), warmGlowMat);
    pane.position.set(wx, 3.10, 1.79);
    group.add(pane);
  }

  // Pitched alpine roof + thick snow layer
  const gShape = new THREE.Shape();
  gShape.moveTo(-2.42, 0);
  gShape.lineTo(2.42, 0);
  gShape.lineTo(0, 1.65);
  gShape.closePath();

  const roofGeo = new THREE.ExtrudeGeometry(gShape, { depth: 4.02, bevelEnabled: false });
  roofGeo.translate(0, 0, -2.01);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 3.78, 0);
  roof.castShadow = true;
  group.add(roof);

  const snowGeo = new THREE.ExtrudeGeometry(gShape, {
    depth: 4.14,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.08,
    bevelThickness: 0.08,
  });
  snowGeo.translate(0, 0, -2.07);
  const snowRoof = new THREE.Mesh(snowGeo, snowMat);
  snowRoof.position.set(0, 3.88, 0);
  snowRoof.scale.set(1.03, 0.96, 1.0);
  group.add(snowRoof);

  // Brick bakery oven chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.48, 0.62), brickLowerMat);
  chimney.position.set(-1.18, 5.10, -0.58);
  chimney.castShadow = true;
  group.add(chimney);
  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.14, 0.74), snowMat);
  chimneyCap.position.set(-1.18, 5.86, -0.58);
  group.add(chimneyCap);

  // Warm café window glow spilling onto the snowy sidewalk
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 4.8),
    new THREE.MeshBasicMaterial({
      map: textures.lampGlowMap,
      transparent: true,
      opacity: 0.30,
      depthWrite: false,
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(0.3, 0.017, 1.4);
  group.add(glow);

  return {
    group,
    chimneyWorldOffset: new THREE.Vector3(-1.18, 6.02, -0.58),
  };
}

/**
 * Stylized Vintage Winter Parked Car with Rounded Snow Pillows on Roof & Hood
 * Grounded at y = 0, faces +Z locally. Fits cleanly within halfW = 0.72, halfD = 1.32.
 */
export function createSnowDustedCar(style: number, textures: ProceduralTextures): THREE.Group {
  const group = new THREE.Group();

  const carPalette = [0x2a4563, 0x2f5b47, 0xc98b2c, 0x7c2d3a];
  const bodyMat = new THREE.MeshStandardMaterial({
    color: carPalette[style % carPalette.length],
    roughness: 0.32,
    metalness: 0.24,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1c2b3d,
    roughness: 0.12,
    metalness: 0.55,
  });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd9e1eb, roughness: 0.20, metalness: 0.85 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1b2026, roughness: 0.90 });
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf4f9fd,
    map: textures.snowAlbedoMap,
    normalMap: textures.snowNormalMap,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughness: 0.92,
    metalness: 0.04,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfff3c4,
    emissive: 0xffd166,
    emissiveIntensity: 1.0,
    roughness: 0.18,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.7,
    roughness: 0.22,
  });

  // Lower car chassis body
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.50, 2.38), bodyMat);
  chassis.position.set(0, 0.50, 0);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  // Cabin upper greenhouse
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.44, 1.24), bodyMat);
  cabin.position.set(0, 0.94, -0.08);
  cabin.castShadow = true;
  group.add(cabin);

  const windows = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.30, 1.02), glassMat);
  windows.position.set(0, 0.94, -0.08);
  group.add(windows);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.30, 1.28), glassMat);
  windshield.position.set(0, 0.94, -0.08);
  group.add(windshield);

  // Chrome bumpers
  for (const bz of [-1.22, 1.22]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.12, 0.12), chromeMat);
    bumper.position.set(0, 0.34, bz);
    group.add(bumper);
  }

  // Soft glowing parking headlights & taillights
  for (const side of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.06), headMat);
    hl.position.set(side * 0.42, 0.56, 1.20);
    group.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.06), tailMat);
    tl.position.set(side * 0.42, 0.56, -1.20);
    group.add(tl);
  }

  // 4 chunky winter wheels
  const wheelGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.18, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const wx of [-0.62, 0.62]) {
    for (const wz of [-0.74, 0.74]) {
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.position.set(wx, 0.24, wz);
      group.add(wheel);
    }
  }

  // Sculpted cozy snow pillows resting on roof, hood & trunk
  const roofSnow = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.16, 1.18), snowMat);
  roofSnow.position.set(0, 1.20, -0.08);
  group.add(roofSnow);

  const hoodSnow = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.12, 0.56), snowMat);
  hoodSnow.position.set(0, 0.78, 0.82);
  group.add(hoodSnow);

  const trunkSnow = new THREE.Mesh(new THREE.BoxGeometry(1.10, 0.11, 0.42), snowMat);
  trunkSnow.position.set(0, 0.78, -0.92);
  group.add(trunkSnow);

  // Soft contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.85, 3.05),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      opacity: 0.40,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.015, 0);
  group.add(shadow);

  return group;
}

/**
 * Festive Urban Evergreen Tree in Dressed-Stone Street Planter with Glowing Fairy Lights
 */
export function createCityPlazaTree(textures: ProceduralTextures): THREE.Group {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7c8491, roughness: 0.86 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b0, roughness: 0.78 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3c24, roughness: 0.90 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1f4f3c, roughness: 0.84 });
  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xf4f9fd,
    map: textures.snowAlbedoMap,
    roughness: 0.88,
  });
  const fairyMat = new THREE.MeshStandardMaterial({
    color: 0xfff3b0,
    emissive: 0xffb703,
    emissiveIntensity: 2.3,
    roughness: 0.15,
  });

  // Octagonal stone street planter box
  const planter = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.94, 0.44, 8), stoneMat);
  planter.position.y = 0.22;
  planter.castShadow = true;
  planter.receiveShadow = true;
  group.add(planter);

  const planterRim = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.92, 0.10, 8), rimMat);
  planterRim.position.y = 0.46;
  group.add(planterRim);

  const soilSnow = new THREE.Mesh(new THREE.CylinderGeometry(0.80, 0.80, 0.08, 8), snowMat);
  soilSnow.position.y = 0.48;
  group.add(soilSnow);

  // Trunk & 3 tiered evergreen spruce boughs
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.20, 0.95, 7), trunkMat);
  trunk.position.y = 0.92;
  group.add(trunk);

  const t1 = new THREE.Mesh(new THREE.ConeGeometry(1.06, 1.55, 8), foliageMat);
  t1.position.y = 1.85;
  t1.castShadow = true;
  group.add(t1);

  const t2 = new THREE.Mesh(new THREE.ConeGeometry(0.82, 1.35, 8), foliageMat);
  t2.position.y = 2.75;
  t2.castShadow = true;
  group.add(t2);

  const t3 = new THREE.Mesh(new THREE.ConeGeometry(0.56, 1.05, 8), foliageMat);
  t3.position.y = 3.55;
  t3.castShadow = true;
  group.add(t3);

  const snowCap = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.70, 8), snowMat);
  snowCap.position.y = 3.82;
  group.add(snowCap);

  // Warm glowing golden fairy-light ornaments tucked around branches
  const lightRings = [
    { y: 1.55, r: 0.92, count: 6 },
    { y: 2.45, r: 0.68, count: 5 },
    { y: 3.25, r: 0.42, count: 4 },
  ];
  const orbGeo = new THREE.SphereGeometry(0.065, 6, 6);
  for (const ring of lightRings) {
    for (let i = 0; i < ring.count; i++) {
      const a = (i / ring.count) * Math.PI * 2 + ring.y;
      const orb = new THREE.Mesh(orbGeo, fairyMat);
      orb.position.set(Math.cos(a) * ring.r, ring.y, Math.sin(a) * ring.r);
      group.add(orb);
    }
  }

  return group;
}

/**
 * European Boulevard Park Bench paired with Classic Red Alpine Pillar Postbox
 */
export function createCityBench(): THREE.Group {
  const group = new THREE.Group();
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x202733, roughness: 0.44, metalness: 0.72 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x8a5630, roughness: 0.80 });
  const postRedMat = new THREE.MeshStandardMaterial({ color: 0xc9352b, roughness: 0.36, metalness: 0.20 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf4f8fc, roughness: 0.78 });

  // Cast-iron bench legs
  for (const lx of [-0.56, 0.24]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 0.50), ironMat);
    leg.position.set(lx, 0.23, 0);
    group.add(leg);
  }
  // Timber seat & backrest
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.08, 0.44), timberMat);
  seat.position.set(-0.16, 0.48, 0.02);
  seat.castShadow = true;
  group.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.38, 0.07), timberMat);
  back.position.set(-0.16, 0.72, -0.18);
  back.rotation.x = -0.15;
  group.add(back);

  const seatSnow = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.06, 0.32), snowMat);
  seatSnow.position.set(-0.16, 0.54, 0.02);
  group.add(seatSnow);

  // Classic red European pillar postbox standing beside the bench
  const postBody = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.96, 10), postRedMat);
  postBody.position.set(0.56, 0.48, 0);
  postBody.castShadow = true;
  group.add(postBody);

  const postCap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), snowMat);
  postCap.scale.set(1, 0.55, 1);
  postCap.position.set(0.56, 0.98, 0);
  group.add(postCap);

  return group;
}

/**
 * Multi-tiered Snowy Alpine Pine Forest + Snow-Dusted Boulders + Dressed-Stone City Wall & Iron Balustrade
 * Opens cleanly around the South City Gate (|x| < 5.2, z = +edge) and clears the South Approach Highway corridor.
 */
export function createPineForestRing(arenaHalf: number): THREE.Group {
  const forestGroup = new THREE.Group();

  const placements: Array<{ x: number; z: number; scale: number; rot: number; tint: number }> = [];
  let seed = 918273;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Safe exclusion clearance: stone wall sits at arenaHalf + 0.55; exclude South Approach Highway corridor!
  const safeSquare = arenaHalf + 2.85;
  const minR = arenaHalf + 3.2;
  const maxR = arenaHalf + 34;
  for (let i = 0; i < 245; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = minR + Math.pow(rand(), 0.72) * (maxR - minR);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (Math.abs(x) < safeSquare && Math.abs(z) < safeSquare) continue;
    // Keep the South Approach Highway leading up to the City Gate completely free of trees
    if (Math.abs(x) < 7.6 && z > arenaHalf - 1.5) continue;

    let tooClose = false;
    for (let j = 0; j < placements.length; j++) {
      if (Math.hypot(placements[j].x - x, placements[j].z - z) < 2.2) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    placements.push({
      x,
      z,
      scale: 0.85 + rand() * 0.42,
      rot: rand() * Math.PI * 2,
      tint: rand(),
    });
  }

  const count = placements.length;
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 1.35, 7);
  trunkGeo.translate(0, 0.675, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3c24, roughness: 0.9 });

  const tier1Geo = new THREE.ConeGeometry(1.42, 2.2, 8);
  tier1Geo.translate(0, 2.0, 0);
  const tier2Geo = new THREE.ConeGeometry(1.10, 1.9, 8);
  tier2Geo.translate(0, 3.2, 0);
  const tier3Geo = new THREE.ConeGeometry(0.74, 1.5, 8);
  tier3Geo.translate(0, 4.25, 0);

  const foliageMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84, metalness: 0.02 });
  const snowCapGeo = new THREE.ConeGeometry(0.68, 1.0, 8);
  snowCapGeo.translate(0, 4.6, 0);
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf2f7fd, roughness: 0.74 });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  const tier1 = new THREE.InstancedMesh(tier1Geo, foliageMat, count);
  const tier2 = new THREE.InstancedMesh(tier2Geo, foliageMat, count);
  const tier3 = new THREE.InstancedMesh(tier3Geo, foliageMat, count);
  const caps = new THREE.InstancedMesh(snowCapGeo, snowMat, count);

  tier1.castShadow = true;
  tier2.castShadow = true;
  tier1.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const p = placements[i];
    dummy.position.set(p.x, 0, p.z);
    dummy.rotation.set(0, p.rot, 0);
    dummy.scale.setScalar(p.scale);
    dummy.updateMatrix();

    trunks.setMatrixAt(i, dummy.matrix);
    tier1.setMatrixAt(i, dummy.matrix);
    tier2.setMatrixAt(i, dummy.matrix);
    tier3.setMatrixAt(i, dummy.matrix);
    caps.setMatrixAt(i, dummy.matrix);

    color.setHSL(0.42 + p.tint * 0.04, 0.44 + p.tint * 0.12, 0.16 + p.tint * 0.06);
    tier1.setColorAt(i, color);
    color.offsetHSL(0, 0.02, 0.025);
    tier2.setColorAt(i, color);
    color.offsetHSL(0, 0.02, 0.03);
    tier3.setColorAt(i, color);
  }

  [trunks, tier1, tier2, tier3, caps].forEach((im) => {
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    forestGroup.add(im);
  });

  // Snow-dusted alpine boulders tucked safely outside the city wall (and clear of South Approach Highway)
  const rockGeo = new THREE.DodecahedronGeometry(0.75, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x647080, roughness: 0.9 });
  const rockCount = 38;
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  let rPlaced = 0;
  for (let attempt = 0; attempt < 180 && rPlaced < rockCount; attempt++) {
    const angle = rand() * Math.PI * 2;
    const dist = arenaHalf + 2.5 + rand() * 18;
    const rx = Math.cos(angle) * dist;
    const rz = Math.sin(angle) * dist;
    if (Math.abs(rx) < arenaHalf + 2.2 && Math.abs(rz) < arenaHalf + 2.2) continue;
    if (Math.abs(rx) < 7.2 && rz > arenaHalf - 1.5) continue;
    dummy.position.set(rx, 0.25, rz);
    dummy.rotation.set(rand(), rand(), rand());
    dummy.scale.set(0.8 + rand() * 0.8, 0.55 + rand() * 0.45, 0.8 + rand() * 0.8);
    dummy.updateMatrix();
    rocks.setMatrixAt(rPlaced, dummy.matrix);
    rPlaced++;
  }
  rocks.count = rPlaced;
  rocks.instanceMatrix.needsUpdate = true;
  rocks.computeBoundingSphere();
  forestGroup.add(rocks);

  // Instanced Dressed-Stone City Wall + Snow-Capped Stone Pillars + Wrought-Iron Balustrade
  // Leaves a clean 10.6m opening on the South wall (side === 1, |x| < 5.3) for the Arched Stone City Gate!
  const wallStoneMat = new THREE.MeshStandardMaterial({ color: 0x767f8d, roughness: 0.88, metalness: 0.05 });
  const ironRailMat = new THREE.MeshStandardMaterial({ color: 0x202733, roughness: 0.42, metalness: 0.74 });

  const edge = arenaHalf + 0.55;
  const totalLen = edge * 2;
  const segments = Math.round(totalLen / 3.2);
  const segLen = totalLen / segments;

  const wallGeo = new THREE.BoxGeometry(segLen, 0.72, 0.46);
  const wallSnowGeo = new THREE.BoxGeometry(segLen, 0.12, 0.50);
  const railGeo = new THREE.BoxGeometry(segLen, 0.07, 0.07);
  const pillarGeo = new THREE.BoxGeometry(0.62, 1.38, 0.62);
  const pillarCapGeo = new THREE.BoxGeometry(0.72, 0.14, 0.72);

  const maxSegs = segments * 4 + 8;
  const wallMesh = new THREE.InstancedMesh(wallGeo, wallStoneMat, maxSegs);
  const wallSnowMesh = new THREE.InstancedMesh(wallSnowGeo, snowMat, maxSegs);
  const railMesh = new THREE.InstancedMesh(railGeo, ironRailMat, maxSegs);
  const pillarMesh = new THREE.InstancedMesh(pillarGeo, wallStoneMat, maxSegs + 8);
  const pillarCapMesh = new THREE.InstancedMesh(pillarCapGeo, snowMat, maxSegs + 8);

  let wallIdx = 0;
  let pillarIdx = 0;

  for (let side = 0; side < 4; side++) {
    const rotY = side >= 2 ? Math.PI / 2 : 0;
    for (let s = 0; s < segments; s++) {
      const t = -edge + (s + 0.5) * segLen;
      const postT = -edge + s * segLen;

      // Skip the South City Gate opening cleanly so the City Gate sits flush with the wall
      const inGateWallGap = side === 1 && Math.abs(t) < 5.35;
      const inGatePillarGap = side === 1 && Math.abs(postT) < 5.6;

      if (!inGatePillarGap) {
        if (side === 0) dummy.position.set(postT, 0.69, -edge);
        else if (side === 1) dummy.position.set(postT, 0.69, edge);
        else if (side === 2) dummy.position.set(-edge, 0.69, postT);
        else dummy.position.set(edge, 0.69, postT);
        dummy.rotation.set(0, rotY, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        pillarMesh.setMatrixAt(pillarIdx, dummy.matrix);

        dummy.position.y = 1.44;
        dummy.updateMatrix();
        pillarCapMesh.setMatrixAt(pillarIdx, dummy.matrix);
        pillarIdx++;
      }

      if (!inGateWallGap) {
        if (side === 0) dummy.position.set(t, 0.36, -edge);
        else if (side === 1) dummy.position.set(t, 0.36, edge);
        else if (side === 2) dummy.position.set(-edge, 0.36, t);
        else dummy.position.set(edge, 0.36, t);
        dummy.rotation.set(0, rotY, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        wallMesh.setMatrixAt(wallIdx, dummy.matrix);

        dummy.position.y = 0.78;
        dummy.updateMatrix();
        wallSnowMesh.setMatrixAt(wallIdx, dummy.matrix);

        dummy.position.y = 1.18;
        dummy.updateMatrix();
        railMesh.setMatrixAt(wallIdx, dummy.matrix);
        wallIdx++;
      }
    }
  }

  // Exact 4 corner stone bastions so wall corners meet seamlessly
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      dummy.position.set(sx * edge, 0.80, sz * edge);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1.38, 1.16, 1.38);
      dummy.updateMatrix();
      pillarMesh.setMatrixAt(pillarIdx, dummy.matrix);

      dummy.position.y = 1.66;
      dummy.updateMatrix();
      pillarCapMesh.setMatrixAt(pillarIdx, dummy.matrix);
      pillarIdx++;
    }
  }

  wallMesh.count = wallIdx;
  wallSnowMesh.count = wallIdx;
  railMesh.count = wallIdx;
  pillarMesh.count = pillarIdx;
  pillarCapMesh.count = pillarIdx;

  [wallMesh, wallSnowMesh, railMesh, pillarMesh, pillarCapMesh].forEach((im) => {
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    forestGroup.add(im);
  });

  return forestGroup;
}

export interface PedestrianRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  headGroup: THREE.Group;
}

/**
 * Charming Low-Poly Animated Alpine Winter Pedestrian
 * Grounded at y = 0, faces +Z locally, height ~1.52m.
 * Features articulated legs & arms, winter parka coat, knitted scarf, hat variant,
 * mittens, optional bakery shopping bag, and soft contact shadow.
 */
export function createWinterPedestrian(
  style: number,
  hatVariant: number,
  hasBag: boolean,
  textures: ProceduralTextures
): PedestrianRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const coatPalette = [0xb8352e, 0x265e4b, 0xc98d28, 0x2a456b, 0x6f3959, 0x9c6e44];
  const scarfPalette = [0xf4e3b2, 0xd64531, 0x2a456b, 0xe8b03c, 0xdcebf7, 0x265e4b];
  const hatPalette = [0x263547, 0x8f2d27, 0x2d5444, 0x7c4a26, 0x3f2e4d, 0x455a64];
  const skinPalette = [0xf1c2a0, 0xe4ad86, 0xc88d67, 0xf5cfb2];

  const coatMat = new THREE.MeshStandardMaterial({
    color: coatPalette[style % coatPalette.length],
    roughness: 0.80,
    metalness: 0.04,
  });
  const scarfMat = new THREE.MeshStandardMaterial({
    color: scarfPalette[style % scarfPalette.length],
    roughness: 0.88,
  });
  const hatMat = new THREE.MeshStandardMaterial({
    color: hatPalette[(style + hatVariant) % hatPalette.length],
    roughness: 0.84,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xf4f8fc, roughness: 0.86 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x272e3a, roughness: 0.88 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.78 });
  const skinMat = new THREE.MeshStandardMaterial({
    color: skinPalette[style % skinPalette.length],
    roughness: 0.72,
  });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.4 });

  // Soft radial contact shadow on sidewalk/snow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.82, 0.82),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.016;
  root.add(shadow);

  // 1. Articulated Legs (hip pivot at y = 0.44)
  const makeLeg = (x: number): THREE.Group => {
    const legPivot = new THREE.Group();
    legPivot.position.set(x, 0.44, 0);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.060, 0.32, 6), pantsMat);
    upper.position.y = -0.16;
    legPivot.add(upper);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.14, 0.19), bootMat);
    boot.position.set(0, -0.37, 0.03);
    legPivot.add(boot);

    bodyGroup.add(legPivot);
    return legPivot;
  };
  const leftLeg = makeLeg(-0.105);
  const rightLeg = makeLeg(0.105);

  // 2. Low-Poly Winter Parka Torso + Cozy Fluffy Trim Hem
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.245, 0.58, 7), coatMat);
  torso.position.y = 0.72;
  torso.castShadow = true;
  bodyGroup.add(torso);

  const hemTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.248, 0.256, 0.08, 7), trimMat);
  hemTrim.position.y = 0.46;
  bodyGroup.add(hemTrim);

  // Knitted Scarf & Cute Dangling Scarf Tail
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.052, 6, 10), scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.03;
  bodyGroup.add(scarf);

  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.26, 0.045), scarfMat);
  scarfTail.position.set(0.09, 0.88, 0.16);
  scarfTail.rotation.z = -0.14;
  bodyGroup.add(scarfTail);

  // 3. Articulated Arms with Mittens (shoulder pivot at y = 0.96)
  const makeArm = (side: -1 | 1): THREE.Group => {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.23, 0.96, 0);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.052, 0.38, 6), coatMat);
    sleeve.position.y = -0.18;
    armPivot.add(sleeve);

    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.05, 6), trimMat);
    cuff.position.y = -0.35;
    armPivot.add(cuff);

    const mitten = new THREE.Mesh(new THREE.SphereGeometry(0.062, 6, 6), scarfMat);
    mitten.position.y = -0.41;
    armPivot.add(mitten);

    // Optional kraft-paper bakery shopping bag carried in left hand
    if (side === -1 && hasBag) {
      const bagMat = new THREE.MeshStandardMaterial({ color: 0xd6b07c, roughness: 0.88 });
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.22), bagMat);
      bag.position.set(-0.04, -0.54, 0.02);
      armPivot.add(bag);
    }

    bodyGroup.add(armPivot);
    return armPivot;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // 4. Head + Expressive Eyes + Winter Hat Variant (neck pivot at y = 1.07)
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.07;
  bodyGroup.add(headGroup);

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.165, 1), skinMat);
  head.position.y = 0.15;
  head.castShadow = true;
  headGroup.add(head);

  // Tiny readable eyes facing +Z
  for (const ex of [-0.055, 0.055]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 5, 5), eyeMat);
    eye.position.set(ex, 0.17, 0.145);
    headGroup.add(eye);
  }

  // Winter Hat Variant: 0 = Pom-pom Beanie, 1 = Trapper Earflap Hat, 2 = Alpine Wool Beret
  if (hatVariant === 0) {
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.178, 0.075, 8), trimMat);
    cuff.position.y = 0.25;
    headGroup.add(cuff);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.165, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.58), hatMat);
    dome.position.y = 0.26;
    headGroup.add(dome);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.062, 6, 6), trimMat);
    pom.position.y = 0.44;
    headGroup.add(pom);
  } else if (hatVariant === 1) {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.172, 0.18, 7), hatMat);
    crown.position.y = 0.30;
    headGroup.add(crown);
    const frontFur = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.11, 0.07), trimMat);
    frontFur.position.set(0, 0.28, 0.14);
    headGroup.add(frontFur);
    for (const s of [-1, 1]) {
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.10), hatMat);
      flap.position.set(s * 0.165, 0.18, 0.0);
      headGroup.add(flap);
    }
  } else {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 8), hatMat);
    brim.position.y = 0.26;
    brim.rotation.z = 0.08;
    headGroup.add(brim);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.11, 8), hatMat);
    top.position.y = 0.32;
    top.rotation.z = 0.08;
    headGroup.add(top);
  }

  return {
    root,
    bodyGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    headGroup,
  };
}

export interface BlackIceRig {
  group: THREE.Group;
  iceMat: THREE.MeshStandardMaterial;
  rimMat: THREE.MeshBasicMaterial;
}

/**
 * Glossy translucent blue-cyan Black Ice road hazard patch with frosted outer rim.
 * Uses polygonOffset to sit cleanly over asphalt with zero Z-fighting.
 */
export function createBlackIcePatchMesh(radius: number): BlackIceRig {
  const group = new THREE.Group();

  const iceMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.32,
    roughness: 0.08,
    metalness: 0.45,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const mainDisc = new THREE.Mesh(new THREE.CircleGeometry(radius, 18), iceMat);
  mainDisc.rotation.x = -Math.PI / 2;
  mainDisc.position.y = 0.032;
  group.add(mainDisc);

  const rimMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  const rim = new THREE.Mesh(new THREE.RingGeometry(radius * 0.86, radius * 1.02, 20), rimMat);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.036;
  group.add(rim);

  // Subtle crystalline specular glint facets
  const glintMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  for (let i = 0; i < 3; i++) {
    const ang = i * 2.1 + 0.4;
    const glint = new THREE.Mesh(new THREE.PlaneGeometry(radius * 0.55, 0.14), glintMat);
    glint.rotation.x = -Math.PI / 2;
    glint.rotation.z = ang;
    glint.position.set(Math.cos(ang) * radius * 0.28, 0.038, Math.sin(ang) * radius * 0.28);
    group.add(glint);
  }

  return { group, iceMat, rimMat };
}

export interface DispatchBeaconRig {
  root: THREE.Group;
  ringMesh: THREE.Mesh;
  diamondMesh: THREE.Mesh;
  hazardMat: THREE.MeshStandardMaterial | null;
}

/**
 * 3D World Beacon for active Municipal Dispatch Missions:
 * Glowing perimeter ring + floating rotating waypoint marker + optional composite snowed-in sedan with blinking hazards!
 */
export function createDispatchBeaconRig(
  radius: number,
  isRescueCar: boolean,
  textures: ProceduralTextures
): DispatchBeaconRig {
  const root = new THREE.Group();

  const accentHex = isRescueCar ? 0xf59e0b : 0x38bdf8;
  const ringMat = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const ringMesh = new THREE.Mesh(
    new THREE.RingGeometry(Math.max(1.2, radius - 0.32), Math.max(1.5, radius), 32),
    ringMat
  );
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.065;
  root.add(ringMesh);

  // Floating rotating diamond waypoint beacon high above the zone
  const diamondMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.45,
    roughness: 0.18,
    metalness: 0.25,
  });
  const diamondMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), diamondMat);
  diamondMesh.position.y = isRescueCar ? 3.2 : 2.9;
  root.add(diamondMesh);

  let hazardMat: THREE.MeshStandardMaterial | null = null;

  if (isRescueCar) {
    // Composite snow-buried alpine compact sedan with blinking amber hazard lights
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.36, metalness: 0.25 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.14, metalness: 0.6 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1b2028, roughness: 0.9 });
    const snowCapMat = new THREE.MeshStandardMaterial({
      color: 0xf4f9ff,
      map: textures.snowAlbedoMap,
      roughness: 0.92,
      metalness: 0.04,
    });
    hazardMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.2,
      roughness: 0.15,
    });

    const car = new THREE.Group();
    car.rotation.y = 0.45;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.56, 2.55), bodyMat);
    hull.position.y = 0.52;
    hull.castShadow = true;
    car.add(hull);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.48, 1.32), bodyMat);
    cabin.position.set(0, 0.98, -0.1);
    cabin.castShadow = true;
    car.add(cabin);

    const windows = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.32, 1.12), glassMat);
    windows.position.set(0, 0.99, -0.1);
    car.add(windows);

    const roofSnow = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.14, 1.24), snowCapMat);
    roofSnow.position.set(0, 1.26, -0.1);
    car.add(roofSnow);

    const hoodSnow = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.12, 0.72), snowCapMat);
    hoodSnow.position.set(0, 0.84, 0.85);
    car.add(hoodSnow);

    // 4 wheels partially buried in snowbank collar
    const wGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 12);
    wGeo.rotateZ(Math.PI / 2);
    for (const wx of [-0.7, 0.7]) {
      for (const wz of [-0.78, 0.78]) {
        const w = new THREE.Mesh(wGeo, tireMat);
        w.position.set(wx, 0.28, wz);
        car.add(w);
      }
    }

    // 4 corner blinking amber hazard lamps
    for (const hx of [-0.55, 0.55]) {
      for (const hz of [-1.29, 1.29]) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.08), hazardMat);
        lamp.position.set(hx, 0.62, hz);
        car.add(lamp);
      }
    }

    // Grounded snowbank mound collar hugging the stuck wheels
    const driftCollar = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.95, 0.34, 14), snowCapMat);
    driftCollar.position.y = 0.17;
    car.add(driftCollar);

    root.add(car);
  }

  return { root, ringMesh, diamondMesh, hazardMat };
}

export interface TrafficVehicleRig {
  root: THREE.Group;
  wheels: THREE.Mesh[];
}

/**
 * Composite 10-part Cruising City Vehicle (0 = Alpine Bakery Delivery Van, 1 = Cozy Mountain Taxi).
 * Grounded at y = 0, facing +Z in local space.
 */
export function createTrafficVehicleRig(
  style: number,
  textures: ProceduralTextures
): TrafficVehicleRig {
  const root = new THREE.Group();
  const isVan = style % 2 === 0;

  // Soft radial contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 3.3),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.022;
  root.add(shadow);

  const primaryMat = new THREE.MeshStandardMaterial({
    color: isVan ? 0xf5efe6 : 0xf2b705,
    roughness: 0.38,
    metalness: 0.18,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: isVan ? 0xc04a36 : 0x1e293b,
    roughness: 0.45,
    metalness: 0.22,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1d2d42,
    roughness: 0.12,
    metalness: 0.62,
  });
  const bumperMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.72,
    metalness: 0.35,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.92 });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xfff8cc,
    emissive: 0xffdf7a,
    emissiveIntensity: 1.9,
    roughness: 0.15,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.0,
    roughness: 0.2,
  });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.36, isVan ? 0.62 : 0.54, isVan ? 2.65 : 2.48),
    primaryMat
  );
  body.position.y = isVan ? 0.58 : 0.52;
  body.castShadow = true;
  root.add(body);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(1.40, 0.14, isVan ? 2.58 : 2.42),
    accentMat
  );
  stripe.position.y = 0.54;
  root.add(stripe);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.26, isVan ? 0.62 : 0.46, isVan ? 2.05 : 1.32),
    primaryMat
  );
  cabin.position.set(0, isVan ? 1.15 : 0.98, isVan ? -0.15 : -0.12);
  cabin.castShadow = true;
  root.add(cabin);

  const windows = new THREE.Mesh(
    new THREE.BoxGeometry(1.30, isVan ? 0.34 : 0.30, isVan ? 1.25 : 1.14),
    glassMat
  );
  windows.position.set(0, isVan ? 1.14 : 0.99, isVan ? 0.18 : -0.12);
  root.add(windows);

  if (isVan) {
    // Cozy timber roof rack on Bakery Van
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.12, 1.28), accentMat);
    rack.position.set(0, 1.52, -0.35);
    root.add(rack);
  } else {
    // Glowing TAXI rooftop sign
    const taxiSign = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.18, 0.24),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfacc15,
        emissiveIntensity: 1.5,
        roughness: 0.2,
      })
    );
    taxiSign.position.set(0, 1.30, -0.05);
    root.add(taxiSign);
  }

  // Front & rear bumpers + headlights/taillights
  const halfLen = isVan ? 1.34 : 1.25;
  const fBump = new THREE.Mesh(new THREE.BoxGeometry(1.40, 0.14, 0.12), bumperMat);
  fBump.position.set(0, 0.34, halfLen);
  root.add(fBump);
  const rBump = new THREE.Mesh(new THREE.BoxGeometry(1.40, 0.14, 0.12), bumperMat);
  rBump.position.set(0, 0.34, -halfLen);
  root.add(rBump);

  for (const lx of [-0.46, 0.46]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.06), headMat);
    hl.position.set(lx, 0.56, halfLen + 0.01);
    root.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.06), tailMat);
    tl.position.set(lx, 0.56, -halfLen - 0.01);
    root.add(tl);
  }

  // 4 rotating wheels
  const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels: THREE.Mesh[] = [];
  for (const wx of [-0.68, 0.68]) {
    for (const wz of [-0.78, 0.78]) {
      const w = new THREE.Mesh(wheelGeo, tireMat);
      w.position.set(wx, 0.28, wz);
      w.castShadow = true;
      root.add(w);
      wheels.push(w);
    }
  }

  return { root, wheels };
}

/**
 * Vehicle Factory: Builds one of 3 genuinely distinct 3D Snowplow Vehicles:
 * - 'ranger': Classic Alpine 4x4 Pickup Snowplow
 * - 'unimog': Titan Unimog 6x6 Heavy Municipal Freighter with V-Blade & Rear Salt Hopper Silo
 * - 'snocat': Glacier Tracked Rotary Sno-Cat with Rubber Caterpillar Treads & Spinning Rotary Snow-Augers
 */
export function createVehicleRig(vehicleId: VehicleId, textures: ProceduralTextures): TruckRig {
  if (vehicleId === 'unimog') return createUnimogTruck(textures);
  if (vehicleId === 'snocat') return createSnoCatTruck(textures);
  return createSnowplowTruck(textures);
}

function createUnimogTruck(textures: ProceduralTextures): TruckRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.9, 5.2),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, 0.016, 0.25);
  root.add(contactShadow);

  const paintPrimaryMat = new THREE.MeshStandardMaterial({ color: 0xd64531, roughness: 0.34, metalness: 0.16 });
  const paintTrimMat = new THREE.MeshStandardMaterial({ color: 0xf4ead8, roughness: 0.42, metalness: 0.08 });
  const bladeAccentMat = new THREE.MeshStandardMaterial({ color: 0xefb026, roughness: 0.32, metalness: 0.45 });
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x202731, roughness: 0.78, metalness: 0.34 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xdce4ee, roughness: 0.16, metalness: 0.88 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x162436, roughness: 0.10, metalness: 0.62 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.92 });
  const bladeStripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.bladeStripeMap, roughness: 0.38, metalness: 0.25 });
  const heatedCoilMat = new THREE.MeshStandardMaterial({ color: 0xd97706, emissive: 0xff5a1f, emissiveIntensity: 0, roughness: 0.24, metalness: 0.78 });
  const headlightGlowMat = new THREE.MeshStandardMaterial({ color: 0xfff8cc, emissive: 0xffdf7a, emissiveIntensity: 2.1, roughness: 0.12 });
  const headBeamMat = new THREE.MeshBasicMaterial({ map: textures.lampGlowMap, transparent: true, opacity: 0.38, depthWrite: false });

  const headBeam = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.4), headBeamMat);
  headBeam.rotation.x = -Math.PI / 2;
  headBeam.position.set(0, 0.026, 3.4);
  root.add(headBeam);

  // Heavy elevated 6x6 frame
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.34, 3.55), chassisMat);
  chassis.position.set(0, 0.56, -0.15);
  chassis.castShadow = true;
  bodyGroup.add(chassis);

  // Towering Cab-Over Unimog Cabin
  const cabLower = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.88, 1.38), paintPrimaryMat);
  cabLower.position.set(0, 1.18, 0.72);
  cabLower.castShadow = true;
  bodyGroup.add(cabLower);

  const cabStripe = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.12, 1.34), paintTrimMat);
  cabStripe.position.set(0, 1.04, 0.72);
  bodyGroup.add(cabStripe);

  const cabUpper = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.66, 1.24), paintPrimaryMat);
  cabUpper.position.set(0, 1.92, 0.66);
  cabUpper.castShadow = true;
  bodyGroup.add(cabUpper);

  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.14, 1.32), paintTrimMat);
  cabRoof.position.set(0, 2.28, 0.66);
  bodyGroup.add(cabRoof);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.48, 0.08), glassMat);
  windshield.position.set(0, 1.92, 1.27);
  windshield.rotation.x = -0.10;
  bodyGroup.add(windshield);

  const sideWin = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.44, 0.96), glassMat);
  sideWin.position.set(0, 1.92, 0.66);
  bodyGroup.add(sideWin);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.46, 0.10), chassisMat);
  grille.position.set(0, 1.08, 1.42);
  bodyGroup.add(grille);

  for (const side of [-1, 1]) {
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.08), headlightGlowMat);
    lens.position.set(side * 0.64, 1.02, 1.42);
    bodyGroup.add(lens);
  }

  // Twin Rooftop Municipal Amber Lightbar (spins!)
  const beaconGroup = new THREE.Group();
  beaconGroup.position.set(0, 2.46, 0.68);
  bodyGroup.add(beaconGroup);
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.9, roughness: 0.14 });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.16, 0.24), beaconMat);
  beaconGroup.add(bar);

  // Oversized Yellow Municipal Rock-Salt Hopper Silo in Rear Bed
  const hopperBase = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.26, 1.88), chassisMat);
  hopperBase.position.set(0, 0.86, -0.96);
  bodyGroup.add(hopperBase);

  const hopperSilo = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.62, 0.98, 4), bladeAccentMat);
  hopperSilo.rotation.y = Math.PI / 4;
  hopperSilo.scale.set(1.15, 1.0, 1.45);
  hopperSilo.position.set(0, 1.42, -0.96);
  hopperSilo.castShadow = true;
  bodyGroup.add(hopperSilo);

  const hopperTop = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.12, 1.72), bladeStripeMat);
  hopperTop.position.set(0, 1.92, -0.96);
  bodyGroup.add(hopperTop);

  // Rear Salt Spinner Disc
  const spinner = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.14, 12), chromeMat);
  spinner.position.set(0, 0.56, -1.96);
  bodyGroup.add(spinner);

  // Heavy Dual-Wing V-Plow Blade
  const bladePivot = new THREE.Group();
  bladePivot.position.set(0, 0.14, 1.56);
  bodyGroup.add(bladePivot);

  const bladeScaleGroup = new THREE.Group();
  bladeScaleGroup.position.set(0, 0, 0.44);
  bladePivot.add(bladeScaleGroup);

  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.92, 0.16), bladeAccentMat);
    wing.position.set(side * 0.74, 0.48, -0.14);
    wing.rotation.y = -side * 0.22;
    wing.castShadow = true;
    bladeScaleGroup.add(wing);
  }
  const hazardTrim = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.16, 0.14), bladeStripeMat);
  hazardTrim.position.set(0, 0.88, 0.02);
  bladeScaleGroup.add(hazardTrim);

  const scraperEdge = new THREE.Mesh(new THREE.BoxGeometry(3.04, 0.13, 0.15), heatedCoilMat);
  scraperEdge.position.set(0, 0.08, 0.08);
  bladeScaleGroup.add(scraperEdge);

  const blowerChutes = new THREE.Group();
  blowerChutes.visible = false;
  bladeScaleGroup.add(blowerChutes);
  for (const side of [-1, 1]) {
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 0.45, 10), chromeMat);
    ch.position.set(side * 1.52, 0.72, 0.0);
    ch.rotation.z = -side * 0.65;
    blowerChutes.add(ch);
  }

  // Rolling Snow Wave
  const snowWaveGroup = new THREE.Group();
  snowWaveGroup.position.set(0, 0.36, 0.42);
  snowWaveGroup.visible = false;
  bladeScaleGroup.add(snowWaveGroup);
  const waveGeo = new THREE.CylinderGeometry(0.38, 0.44, 3.1, 14, 6);
  waveGeo.rotateZ(Math.PI / 2);
  const snowWaveMesh = new THREE.Mesh(
    waveGeo,
    new THREE.MeshStandardMaterial({ color: 0xebf4fc, map: textures.snowAlbedoMap, roughness: 0.94 })
  );
  snowWaveGroup.add(snowWaveMesh);

  // 6 Giant Off-Road Wheels (3 Axles!)
  const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.36, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.38, 12);
  rimGeo.rotateZ(Math.PI / 2);

  const makeWheel = (x: number, z: number): THREE.Group => {
    const sg = new THREE.Group();
    sg.position.set(x, 0.46, z);
    const spin = new THREE.Group();
    sg.add(spin);
    const t = new THREE.Mesh(wheelGeo, tireMat);
    t.castShadow = true;
    spin.add(t);
    spin.add(new THREE.Mesh(rimGeo, chromeMat));
    sg.userData.spinGroup = spin;
    root.add(sg);
    return sg;
  };

  const frontWheels = [makeWheel(-0.92, 0.92), makeWheel(0.92, 0.92)];
  const rearWheels = [
    makeWheel(-0.92, -0.44),
    makeWheel(0.92, -0.44),
    makeWheel(-0.92, -1.42),
    makeWheel(0.92, -1.42),
  ];

  return {
    root,
    bodyGroup,
    bladePivot,
    bladeScaleGroup,
    blowerChutes,
    snowWaveGroup,
    snowWaveMesh,
    heatedCoilMat,
    beaconGroup,
    frontWheels,
    rearWheels,
    headlightGlowMat,
    headBeamMat,
    paintPrimaryMat,
    paintTrimMat,
    bladeAccentMat,
    exhaustTipLeft: new THREE.Vector3(-0.88, 2.2, 0.02),
    exhaustTipRight: new THREE.Vector3(0.88, 2.2, 0.02),
  };
}

function createSnoCatTruck(textures: ProceduralTextures): TruckRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 4.8),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, 0.016, 0.25);
  root.add(contactShadow);

  const paintPrimaryMat = new THREE.MeshStandardMaterial({ color: 0xd64531, roughness: 0.30, metalness: 0.22 });
  const paintTrimMat = new THREE.MeshStandardMaterial({ color: 0xf4ead8, roughness: 0.40, metalness: 0.12 });
  const bladeAccentMat = new THREE.MeshStandardMaterial({ color: 0xefb026, roughness: 0.28, metalness: 0.50 });
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1f2630, roughness: 0.80, metalness: 0.35 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.16, metalness: 0.88 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f2538, roughness: 0.08, metalness: 0.72 });
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x16191f, roughness: 0.94 });
  const heatedCoilMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xff5a1f, emissiveIntensity: 0.6, roughness: 0.22, metalness: 0.75 });
  const headlightGlowMat = new THREE.MeshStandardMaterial({ color: 0xfff8cc, emissive: 0xffe28a, emissiveIntensity: 2.3, roughness: 0.12 });
  const headBeamMat = new THREE.MeshBasicMaterial({ map: textures.lampGlowMap, transparent: true, opacity: 0.44, depthWrite: false });

  const headBeam = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 4.8), headBeamMat);
  headBeam.rotation.x = -Math.PI / 2;
  headBeam.position.set(0, 0.026, 3.6);
  root.add(headBeam);

  // Dual Wide Rubber Caterpillar Track Pods + Bogie Rollers
  const frontWheels: THREE.Group[] = [];
  const rearWheels: THREE.Group[] = [];
  const rollerGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.54, 12);
  rollerGeo.rotateZ(Math.PI / 2);

  for (const side of [-1, 1]) {
    const tread = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.54, 2.95), trackMat);
    tread.position.set(side * 1.02, 0.30, -0.10);
    tread.castShadow = true;
    bodyGroup.add(tread);

    // Metallic track cleats
    for (let z = -1.35; z <= 1.15; z += 0.36) {
      const cleat = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.08), chromeMat);
      cleat.position.set(side * 1.02, 0.58, z);
      bodyGroup.add(cleat);
    }

    // Road bogie rollers (spin with distance!)
    for (const rz of [-1.1, -0.35, 0.4, 1.05]) {
      const wg = new THREE.Group();
      wg.position.set(side * 1.02, 0.28, rz);
      const spin = new THREE.Group();
      wg.add(spin);
      spin.add(new THREE.Mesh(rollerGeo, paintPrimaryMat));
      wg.userData.spinGroup = spin;
      root.add(wg);
      rearWheels.push(wg);
    }
  }

  // Armored Sloped Arctic Expedition Cockpit
  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.62, 2.75), paintPrimaryMat);
  hull.position.set(0, 0.88, -0.10);
  hull.castShadow = true;
  bodyGroup.add(hull);

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.72, 1.48), paintTrimMat);
  canopy.position.set(0, 1.52, 0.26);
  canopy.castShadow = true;
  bodyGroup.add(canopy);

  const panoGlass = new THREE.Mesh(new THREE.BoxGeometry(1.60, 0.48, 1.38), glassMat);
  panoGlass.position.set(0, 1.54, 0.34);
  bodyGroup.add(panoGlass);

  // Rear Turbine Engine Cowling & Expedition Gear Rack
  const turbine = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.64, 1.08), chassisMat);
  turbine.position.set(0, 1.46, -0.96);
  turbine.castShadow = true;
  bodyGroup.add(turbine);

  for (const side of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.22, 12), headlightGlowMat);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(side * 0.56, 1.94, 0.86);
    bodyGroup.add(pod);
  }

  // Spinning Amber Expedition Beacon
  const beaconGroup = new THREE.Group();
  beaconGroup.position.set(0, 2.02, 0.24);
  bodyGroup.add(beaconGroup);
  const beaconMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 2.2, roughness: 0.12 });
  beaconGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.24, 12), beaconMat));

  // Front Twin-Drum Spinning Rotary Snow-Blower Auger Head!
  const bladePivot = new THREE.Group();
  bladePivot.position.set(0, 0.14, 1.44);
  bodyGroup.add(bladePivot);

  const bladeScaleGroup = new THREE.Group();
  bladeScaleGroup.position.set(0, 0, 0.42);
  bladePivot.add(bladeScaleGroup);

  const shroud = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.94, 0.55), bladeAccentMat);
  shroud.position.set(0, 0.50, -0.18);
  shroud.castShadow = true;
  bladeScaleGroup.add(shroud);

  // Spinning Spiral Auger Drum!
  const augerMesh = new THREE.Group();
  augerMesh.position.set(0, 0.44, 0.14);
  bladeScaleGroup.add(augerMesh);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 3.05, 10), chromeMat);
  shaft.rotation.z = Math.PI / 2;
  augerMesh.add(shaft);

  for (let i = -4; i <= 4; i++) {
    const fin = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 6, 12), chromeMat);
    fin.position.x = i * 0.34;
    fin.rotation.y = Math.PI / 2 + 0.32;
    augerMesh.add(fin);
  }

  const scraperEdge = new THREE.Mesh(new THREE.BoxGeometry(3.26, 0.12, 0.18), heatedCoilMat);
  scraperEdge.position.set(0, 0.07, 0.12);
  bladeScaleGroup.add(scraperEdge);

  // High-Output Overhead Snow Discharge Chutes
  const blowerChutes = new THREE.Group();
  blowerChutes.visible = true;
  bladeScaleGroup.add(blowerChutes);
  for (const side of [-1, 1]) {
    const chute = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.72, 10), paintPrimaryMat);
    chute.position.set(side * 0.85, 1.24, -0.12);
    chute.rotation.z = -side * 0.52;
    blowerChutes.add(chute);
  }

  const snowWaveGroup = new THREE.Group();
  snowWaveGroup.position.set(0, 0.36, 0.46);
  snowWaveGroup.visible = false;
  bladeScaleGroup.add(snowWaveGroup);
  const waveGeo = new THREE.CylinderGeometry(0.36, 0.42, 3.25, 14, 6);
  waveGeo.rotateZ(Math.PI / 2);
  const snowWaveMesh = new THREE.Mesh(
    waveGeo,
    new THREE.MeshStandardMaterial({ color: 0xebf4fc, map: textures.snowAlbedoMap, roughness: 0.94 })
  );
  snowWaveGroup.add(snowWaveMesh);

  return {
    root,
    bodyGroup,
    bladePivot,
    bladeScaleGroup,
    blowerChutes,
    snowWaveGroup,
    snowWaveMesh,
    heatedCoilMat,
    beaconGroup,
    frontWheels,
    rearWheels,
    headlightGlowMat,
    headBeamMat,
    paintPrimaryMat,
    paintTrimMat,
    bladeAccentMat,
    augerMesh,
    exhaustTipLeft: new THREE.Vector3(-0.62, 1.95, -1.1),
    exhaustTipRight: new THREE.Vector3(0.62, 1.95, -1.1),
  };
}

/**
 * Dramatic 3D Snow-Capped Alpine Mountain Range encircling the city valley
 * so 3D Chase Camera [V] and Isometric overview feel grounded in real high Alps!
 */
export function createAlpineMountains(arenaHalf: number, textures: ProceduralTextures): THREE.Group {
  const group = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x4b5b70,
    roughness: 0.92,
    metalness: 0.05,
    flatShading: true,
  });
  const snowCapMat = new THREE.MeshStandardMaterial({
    color: 0xf1f7ff,
    map: textures.snowAlbedoMap,
    roughness: 0.90,
    metalness: 0.04,
    flatShading: true,
  });

  const ringDist = arenaHalf + 48;
  const peakCount = 20;
  for (let i = 0; i < peakCount; i++) {
    const angle = (i / peakCount) * Math.PI * 2 + 0.14;
    // Leave clean opening around South Highway Corridor so approach highway feels open
    const px = Math.cos(angle) * (ringDist + (i % 3) * 10);
    const pz = Math.sin(angle) * (ringDist + ((i + 1) % 3) * 10);
    if (pz > arenaHalf + 18 && Math.abs(px) < 16) continue;

    const h = 24 + ((i * 19) % 22);
    const r = 17 + ((i * 11) % 12);

    const peak = new THREE.Group();
    peak.position.set(px, -0.5, pz);
    peak.rotation.y = i * 1.1;

    const base = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), rockMat);
    base.position.y = h * 0.5;
    peak.add(base);

    const capH = h * 0.48;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.49, capH, 7), snowCapMat);
    cap.position.y = h - capH * 0.49 + 0.12;
    peak.add(cap);

    group.add(peak);
  }
  return group;
}

export interface AmbulanceRig {
  root: THREE.Group;
  wheels: THREE.Mesh[];
  redLightMat: THREE.MeshStandardMaterial;
  blueLightMat: THREE.MeshStandardMaterial;
}

/**
 * Composite 12-Part Emergency Alpine Ambulance with Alternating Flashing Red/Blue LED Lightbars!
 */
export function createAmbulanceRig(textures: ProceduralTextures): AmbulanceRig {
  const root = new THREE.Group();

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 3.8),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.022;
  root.add(shadow);

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.34, metalness: 0.12 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.36, metalness: 0.18 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3e, roughness: 0.10, metalness: 0.65 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x161a20, roughness: 0.92 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff8cc, emissive: 0xffdf7a, emissiveIntensity: 2.2 });

  const redLightMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 2.8,
    roughness: 0.12,
  });
  const blueLightMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x2563eb,
    emissiveIntensity: 0.3,
    roughness: 0.12,
  });

  // Front cab & medical patient box
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.96, 1.15), whiteMat);
  cab.position.set(0, 0.78, 0.88);
  cab.castShadow = true;
  root.add(cab);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.42, 0.08), glassMat);
  windshield.position.set(0, 0.96, 1.44);
  root.add(windshield);

  const box = new THREE.Mesh(new THREE.BoxGeometry(1.62, 1.32, 2.02), whiteMat);
  box.position.set(0, 1.02, -0.58);
  box.castShadow = true;
  root.add(box);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.18, 2.04), redMat);
  stripe.position.set(0, 0.72, -0.58);
  root.add(stripe);

  // Iconic Medical Red Cross on Both Sides & Roof
  for (const side of [-1, 1]) {
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.46), redMat);
    hBar.position.set(side * 0.82, 1.24, -0.58);
    root.add(hBar);
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.14), redMat);
    vBar.position.set(side * 0.82, 1.24, -0.58);
    root.add(vBar);
  }
  const roofCross1 = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.05, 0.16), redMat);
  roofCross1.position.set(0, 1.70, -0.58);
  root.add(roofCross1);
  const roofCross2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.54), redMat);
  roofCross2.position.set(0, 1.70, -0.58);
  root.add(roofCross2);

  // Red & Blue Emergency LED Roof Lightbar
  const redBar = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.24), redLightMat);
  redBar.position.set(-0.32, 1.76, 0.34);
  root.add(redBar);
  const blueBar = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.24), blueLightMat);
  blueBar.position.set(0.32, 1.76, 0.34);
  root.add(blueBar);

  for (const lx of [-0.50, 0.50]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.06), headMat);
    hl.position.set(lx, 0.58, 1.48);
    root.add(hl);
  }

  const wGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.24, 12);
  wGeo.rotateZ(Math.PI / 2);
  const wheels: THREE.Mesh[] = [];
  for (const wx of [-0.74, 0.74]) {
    for (const wz of [-0.95, 0.86]) {
      const w = new THREE.Mesh(wGeo, tireMat);
      w.position.set(wx, 0.30, wz);
      w.castShadow = true;
      root.add(w);
      wheels.push(w);
    }
  }

  return { root, wheels, redLightMat, blueLightMat };
}

export interface WaypointArrowRig {
  root: THREE.Group;
  mat: THREE.MeshStandardMaterial;
}

/**
 * Diegetic 3D Floating Directional Compass Chevron orbiting the player's truck
 * so objectives (Ambulance / Fuel Depot / Active Dispatch) are ALWAYS readable at a glance!
 */
export function createWaypointArrowRig(): WaypointArrowRig {
  const root = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.62);
  shape.lineTo(0.46, -0.28);
  shape.lineTo(0, -0.06);
  shape.lineTo(-0.46, -0.28);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0.06, 0);

  const mat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.3,
  });

  const mesh = new THREE.Mesh(geo, mat);
  root.add(mesh);
  return { root, mat };
}

export interface PickupRig {
  root: THREE.Group;
  body: THREE.Group;
}

/**
 * Collectible Road Supply Crates (Fuel Jerrycan, Salt Crate, Hot Cocoa Turbo, Coin Crate)
 */
export function createPickupRig(kind: PickupKind): PickupRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 0.75;
  root.add(body);

  const palette: Record<PickupKind, { main: number; accent: number }> = {
    fuel: { main: 0xef4444, accent: 0xfacc15 },
    salt: { main: 0x38bdf8, accent: 0xe0f2fe },
    cocoa: { main: 0xf97316, accent: 0xfef08a },
    coins: { main: 0xf59e0b, accent: 0xfffbeb },
  };
  const col = palette[kind];

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.84, 20),
    new THREE.MeshBasicMaterial({
      color: col.main,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  root.add(ring);

  const mainMat = new THREE.MeshStandardMaterial({
    color: col.main,
    emissive: col.main,
    emissiveIntensity: 0.45,
    roughness: 0.28,
    metalness: 0.25,
  });
  const accMat = new THREE.MeshStandardMaterial({
    color: col.accent,
    emissive: col.accent,
    emissiveIntensity: 0.9,
    roughness: 0.22,
    metalness: 0.4,
  });

  if (kind === 'fuel') {
    const can = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.34), mainMat);
    body.add(can);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 0.22, 8), accMat);
    spout.position.set(0.14, 0.44, 0);
    body.add(spout);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.12), accMat);
    handle.position.set(-0.08, 0.42, 0);
    body.add(handle);
  } else if (kind === 'salt') {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.56, 0.68), mainMat);
    body.add(crate);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), accMat);
    crystal.position.y = 0.42;
    body.add(crystal);
  } else if (kind === 'cocoa') {
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.62, 12), mainMat);
    body.add(mug);
    const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.12, 12), accMat);
    foam.position.y = 0.34;
    body.add(foam);
  } else {
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 16), mainMat);
    coin.rotation.x = Math.PI / 2;
    body.add(coin);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), accMat);
    body.add(core);
  }

  return { root, body };
}

export interface AvalancheTelegraphRig {
  root: THREE.Group;
  innerDisc: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
}

export function createAvalancheTelegraphRig(radius: number): AvalancheTelegraphRig {
  const root = new THREE.Group();
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const outer = new THREE.Mesh(new THREE.RingGeometry(radius - 0.26, radius, 28), ringMat);
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = 0.08;
  root.add(outer);

  const innerDisc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 24),
    new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })
  );
  innerDisc.rotation.x = -Math.PI / 2;
  innerDisc.position.y = 0.07;
  innerDisc.scale.setScalar(0.1);
  root.add(innerDisc);

  return { root, innerDisc, ringMat };
}

export interface ThermalShockwaveRig {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
}

export function createThermalShockwaveRig(): ThermalShockwaveRig {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.RingGeometry(0.65, 1.0, 32), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.22;
  mesh.visible = false;
  return { mesh, mat };
}



