import {
  CanvasTexture,
  Color,
  DoubleSide,
  LineBasicMaterial,
  Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
} from 'three';
import type { CelestialBodyData } from '../types/astronomy';

const PROCEDURAL_TEXTURE_SIZE = 256;

/** Create a body material without any network or external image dependency. */
export function createBodyMaterial(data: CelestialBodyData): MeshStandardMaterial {
  const baseColor = new Color(data.displayColor);
  const texture = createProceduralBodyTexture(data);
  const isSun = data.type === 'star';
  const material = new MeshStandardMaterial({
    color: texture ? 0xffffff : baseColor,
    map: texture,
    roughness: isSun ? 0.72 : 0.86,
    metalness: 0,
    emissive: isSun ? baseColor : new Color(0x000000),
    emissiveIntensity: isSun ? 1.4 : 0,
  });

  if (texture) {
    texture.colorSpace = SRGBColorSpace;
  }
  return material;
}

export function createSelectionMaterial(color = 0xffffff): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.7,
    wireframe: true,
    depthWrite: false,
  });
}

export function createOrbitMaterial(color: string, opacity: number): LineBasicMaterial {
  return new LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
}

export function createRingMaterial(color: string, opacity: number): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    roughness: 0.9,
    metalness: 0.08,
    transparent: true,
    opacity,
    side: DoubleSide,
    depthWrite: false,
  });
}

/** Dispose a material and any texture maps owned by it. */
export function disposeMaterial(material: Material): void {
  const materialRecord = material as unknown as Record<string, unknown>;
  const textureKeys = [
    'alphaMap',
    'aoMap',
    'bumpMap',
    'displacementMap',
    'emissiveMap',
    'envMap',
    'lightMap',
    'map',
    'metalnessMap',
    'normalMap',
    'roughnessMap',
  ];
  for (const key of textureKeys) {
    const value = materialRecord[key];
    if (value instanceof Texture) {
      value.dispose();
    }
  }
  material.dispose();
}

function createProceduralBodyTexture(data: CelestialBodyData): CanvasTexture | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = PROCEDURAL_TEXTURE_SIZE;
  canvas.height = PROCEDURAL_TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  const baseColor = new Color(data.displayColor);
  context.fillStyle = `#${baseColor.getHexString()}`;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (data.nameEn === 'Jupiter' || data.nameEn === 'Saturn') {
    drawAtmosphericBands(context, data, baseColor);
  } else if (data.nameEn === 'Earth') {
    drawEarthContinents(context, baseColor);
  } else if (data.type !== 'moon' && data.type !== 'star') {
    drawSurfaceVariation(context, data, baseColor, 14);
  } else if (data.type === 'moon') {
    drawSurfaceVariation(context, data, baseColor, 8);
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function drawAtmosphericBands(
  context: CanvasRenderingContext2D,
  data: CelestialBodyData,
  baseColor: Color,
): void {
  const bandCount = data.nameEn === 'Jupiter' ? 18 : 12;
  const light = shiftColor(baseColor, 0.16);
  const dark = shiftColor(baseColor, -0.16);
  for (let index = 0; index < bandCount; index += 1) {
    const y = (index / bandCount) * PROCEDURAL_TEXTURE_SIZE;
    const height = PROCEDURAL_TEXTURE_SIZE / bandCount;
    context.fillStyle = index % 2 === 0
      ? `#${light.getHexString()}`
      : `#${dark.getHexString()}`;
    context.globalAlpha = 0.74;
    context.fillRect(0, y, PROCEDURAL_TEXTURE_SIZE, height);
    if (index % 3 === 0) {
      context.fillStyle = `#${shiftColor(baseColor, 0.28).getHexString()}`;
      context.globalAlpha = 0.32;
      context.fillRect(0, y + height * 0.35, PROCEDURAL_TEXTURE_SIZE, height * 0.12);
    }
  }
  context.globalAlpha = 1;
}

function drawEarthContinents(context: CanvasRenderingContext2D, baseColor: Color): void {
  const ocean = new Color(0x276da1);
  context.fillStyle = `#${ocean.getHexString()}`;
  context.fillRect(0, 0, PROCEDURAL_TEXTURE_SIZE, PROCEDURAL_TEXTURE_SIZE);
  context.fillStyle = `#${shiftColor(baseColor, 0.35).getHexString()}`;
  context.globalAlpha = 0.85;
  const shapes = [
    [24, 54, 42, 24],
    [74, 104, 50, 28],
    [152, 62, 34, 24],
    [184, 132, 46, 31],
    [104, 188, 40, 22],
  ];
  for (const [x, y, width, height] of shapes) {
    context.beginPath();
    context.ellipse(x, y, width, height, 0.3, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawSurfaceVariation(
  context: CanvasRenderingContext2D,
  data: CelestialBodyData,
  baseColor: Color,
  count: number,
): void {
  const lighter = shiftColor(baseColor, 0.2);
  const darker = shiftColor(baseColor, -0.2);
  let state = stableSeed(data.id);
  for (let index = 0; index < count; index += 1) {
    state = nextSeed(state);
    const x = (state / 0xffff_ffff) * PROCEDURAL_TEXTURE_SIZE;
    state = nextSeed(state);
    const y = (state / 0xffff_ffff) * PROCEDURAL_TEXTURE_SIZE;
    state = nextSeed(state);
    const radius = 5 + (state / 0xffff_ffff) * 28;
    context.fillStyle = index % 2 === 0
      ? `#${lighter.getHexString()}`
      : `#${darker.getHexString()}`;
    context.globalAlpha = 0.24;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function shiftColor(color: Color, amount: number): Color {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return new Color().setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amount)));
}

function stableSeed(value: string): number {
  let seed = 0x1234_5678;
  for (let index = 0; index < value.length; index += 1) {
    seed = Math.imul(seed ^ value.charCodeAt(index), 0x45d9f3b) >>> 0;
  }
  return seed;
}

function nextSeed(seed: number): number {
  let next = seed;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  return next >>> 0;
}