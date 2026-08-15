import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
} from 'three';

export interface StarFieldOptions {
  readonly count?: number;
  readonly innerRadius?: number;
  readonly outerRadius?: number;
  readonly size?: number;
}

/** Build a deterministic star field so every reload has the same composition. */
export function createStarField(options: StarFieldOptions = {}): Points<BufferGeometry, PointsMaterial> {
  const count = options.count ?? (isSmallViewport() ? 560 : 1_500);
  const innerRadius = options.innerRadius ?? 280;
  const outerRadius = options.outerRadius ?? 520;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  let state = 0x6d2b_79f5;

  for (let index = 0; index < count; index += 1) {
    state = nextSeed(state);
    const radius = innerRadius + (state / 0xffff_ffff) * (outerRadius - innerRadius);
    state = nextSeed(state);
    const theta = (state / 0xffff_ffff) * Math.PI * 2;
    state = nextSeed(state);
    const phi = Math.acos(2 * (state / 0xffff_ffff) - 1);
    const sinPhi = Math.sin(phi);
    positions[index * 3] = radius * sinPhi * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.cos(phi);
    positions[index * 3 + 2] = radius * sinPhi * Math.sin(theta);

    state = nextSeed(state);
    const tint = 0.72 + (state / 0xffff_ffff) * 0.28;
    const color = new Color().setHSL(
      index % 13 === 0 ? 0.58 : 0.1,
      index % 13 === 0 ? 0.22 : 0.08,
      tint,
    );
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const material = new PointsMaterial({
    size: options.size ?? (isSmallViewport() ? 0.72 : 0.58),
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.86,
    vertexColors: true,
    depthWrite: false,
  });
  const stars = new Points(geometry, material);
  stars.name = 'procedural-star-field';
  stars.frustumCulled = false;
  return stars;
}

function isSmallViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 720;
}

function nextSeed(seed: number): number {
  let next = seed;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  return next >>> 0;
}
