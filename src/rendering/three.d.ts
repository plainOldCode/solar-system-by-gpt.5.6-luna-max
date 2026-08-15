declare module 'three' {
  export type ColorRepresentation = string | number | Color;

  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    copy(vector: Vector3): this;
    clone(): Vector3;
    setScalar(scalar: number): this;
    add(vector: Vector3): this;
    sub(vector: Vector3): this;
    addScaledVector(vector: Vector3, scalar: number): this;
    multiplyScalar(scalar: number): this;
    normalize(): this;
    lerpVectors(vectorA: Vector3, vectorB: Vector3, alpha: number): this;
    lengthSq(): number;
  }

  export class Color {
    r: number;
    g: number;
    b: number;
    constructor(color?: ColorRepresentation);
    set(color: ColorRepresentation): this;
    setHSL(h: number, s: number, l: number): this;
    getHSL(target: { h: number; s: number; l: number }): { h: number; s: number; l: number };
    getHex(): number;
    getHexString(): string;
  }

  export class Euler {
    x: number;
    y: number;
    z: number;
  }

  export class Object3D {
    name: string;
    visible: boolean;
    frustumCulled: boolean;
    renderOrder: number;
    position: Vector3;
    scale: Vector3;
    rotation: Euler;
    userData: Record<string, unknown>;
    children: Object3D[];
    add(...objects: Object3D[]): this;
    remove(...objects: Object3D[]): this;
    traverse(callback: (object: Object3D) => void): void;
    getWorldPosition(target: Vector3): Vector3;
  }

  export class Group extends Object3D {}

  export class Scene extends Object3D {
    background: Color | null;
    clear(): void;
  }

  export class Camera extends Object3D {}

  export class PerspectiveCamera extends Camera {
    aspect: number;
    constructor(fov?: number, aspect?: number, near?: number, far?: number);
    lookAt(target: Vector3 | number, y?: number, z?: number): void;
    updateProjectionMatrix(): void;
  }

  export interface WebGLRendererParameters {
    antialias?: boolean;
    alpha?: boolean;
  }

  export class WebGLRenderer {
    readonly domElement: HTMLCanvasElement;
    outputColorSpace: string;
    toneMapping: number;
    toneMappingExposure: number;
    constructor(parameters?: WebGLRendererParameters);
    setPixelRatio(value: number): void;
    setClearColor(color: ColorRepresentation, alpha?: number): void;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    render(scene: Scene, camera: Camera): void;
    dispose(): void;
    forceContextLoss(): void;
  }

  export class BufferAttribute {
    constructor(array: ArrayLike<number>, itemSize: number);
  }

  export class Float32BufferAttribute extends BufferAttribute {
    constructor(array: ArrayLike<number>, itemSize: number);
  }

  export class BufferGeometry {
    setAttribute(name: string, attribute: BufferAttribute): this;
    setFromPoints(points: Vector3[]): this;
    dispose(): void;
  }

  export class Material {
    transparent: boolean;
    opacity: number;
    depthWrite: boolean;
    side: number;
    wireframe: boolean;
    dispose(): void;
  }

  export interface MaterialParameters {
    color?: ColorRepresentation;
    map?: Texture | null;
    roughness?: number;
    metalness?: number;
    emissive?: ColorRepresentation;
    emissiveIntensity?: number;
    transparent?: boolean;
    opacity?: number;
    depthWrite?: boolean;
    side?: number;
    wireframe?: boolean;
    size?: number;
    sizeAttenuation?: boolean;
    vertexColors?: boolean;
  }

  export class MeshBasicMaterial extends Material {
    color: Color;
    constructor(parameters?: MaterialParameters);
  }

  export class MeshStandardMaterial extends Material {
    color: Color;
    map: Texture | null;
    constructor(parameters?: MaterialParameters);
  }

  export class LineBasicMaterial extends Material {
    color: Color;
    constructor(parameters?: MaterialParameters);
  }

  export class PointsMaterial extends Material {
    color: Color;
    size: number;
    constructor(parameters?: MaterialParameters);
  }

  export class Texture {
    colorSpace: string;
    wrapS: number;
    needsUpdate: boolean;
    dispose(): void;
  }

  export class CanvasTexture extends Texture {
    constructor(canvas: HTMLCanvasElement);
  }

  export class SphereGeometry extends BufferGeometry {
    constructor(radius?: number, widthSegments?: number, heightSegments?: number);
  }

  export class RingGeometry extends BufferGeometry {
    constructor(
      innerRadius?: number,
      outerRadius?: number,
      thetaSegments?: number,
      phiSegments?: number,
    );
  }

  export class Mesh<
    TGeometry extends BufferGeometry = BufferGeometry,
    TMaterial extends Material | Material[] = Material | Material[],
  > extends Object3D {
    geometry: TGeometry;
    material: TMaterial;
    castShadow: boolean;
    receiveShadow: boolean;
    constructor(geometry: TGeometry, material: TMaterial);
  }

  export class LineLoop<
    TGeometry extends BufferGeometry = BufferGeometry,
    TMaterial extends Material | Material[] = Material | Material[],
  > extends Object3D {
    geometry: TGeometry;
    material: TMaterial;
    constructor(geometry: TGeometry, material: TMaterial);
  }

  export class Points<
    TGeometry extends BufferGeometry = BufferGeometry,
    TMaterial extends Material | Material[] = Material | Material[],
  > extends Object3D {
    geometry: TGeometry;
    material: TMaterial;
    constructor(geometry: TGeometry, material: TMaterial);
  }

  export class AmbientLight extends Object3D {
    constructor(color?: ColorRepresentation, intensity?: number);
  }

  export class PointLight extends Object3D {
    decay: number;
    constructor(
      color?: ColorRepresentation,
      intensity?: number,
      distance?: number,
      decay?: number,
    );
  }

  export const ACESFilmicToneMapping: number;
  export const DoubleSide: number;
  export const RepeatWrapping: number;
  export const SRGBColorSpace: string;
}
