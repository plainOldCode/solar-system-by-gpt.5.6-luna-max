declare module 'three' {
  export class Vector2 {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    set(x: number, y: number): this;
  }

  export interface RaycasterIntersection<TObject extends Object3D = Object3D> {
    readonly distance: number;
    readonly object: TObject;
    readonly point: Vector3;
  }

  export class Raycaster {
    constructor(origin?: Vector3, direction?: Vector3, near?: number, far?: number);
    setFromCamera(coords: Vector2, camera: Camera): this;
    intersectObjects<TObject extends Object3D = Object3D>(
      objects: Object3D[],
      recursive?: boolean,
    ): RaycasterIntersection<TObject>[];
  }

  interface Vector3 {
    project(camera: Camera): this;
  }
}

declare module 'three/examples/jsm/controls/OrbitControls.js' {
  import type { Camera, Vector3 } from 'three';

  export class OrbitControls {
    readonly object: Camera;
    readonly domElement: HTMLElement;
    readonly target: Vector3;
    enableDamping: boolean;
    dampingFactor: number;
    enablePan: boolean;
    screenSpacePanning: boolean;
    minDistance: number;
    maxDistance: number;
    constructor(object: Camera, domElement?: HTMLElement);
    update(): boolean;
    dispose(): void;
    addEventListener(type: string, listener: () => void): void;
    removeEventListener(type: string, listener: () => void): void;
  }
}
