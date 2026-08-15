import type { Mesh, Object3D, PerspectiveCamera, Vector3, WebGLRenderer } from 'three';
import type { CameraControlsAdapter } from '../rendering';
import type {
  CelestialBodyData,
  DistanceScaleMode,
  RenderedBodyMetrics,
  SizeScaleMode,
} from '../types/astronomy';
import type {
  SceneControllerListener,
  SceneControllerState,
  SolarSystemSceneController,
} from '../scene/SolarSystemSceneController';

export type { SceneControllerListener, SceneControllerState };

/**
 * The scene capabilities exposed to UI modules.
 *
 * This intentionally mirrors only the scene controller's documented public
 * methods. Panels and controls can depend on this port without importing or
 * reaching into scene nodes, scale managers, or simulation internals.
 */
export interface SolarSystemUIController {
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;

  getState(): SceneControllerState;
  subscribe(listener: SceneControllerListener): () => void;

  getBodyData(bodyId: string): CelestialBodyData | undefined;
  getRenderedBodyMetrics(bodyId: string): RenderedBodyMetrics | undefined;
  getBodyIds(): readonly string[];
  getMoonIds(parentId: string): readonly string[];
  getSelectionTargets(): readonly Mesh[];
  getSelectionTarget(bodyId: string): Mesh | undefined;
  getBodyObject(bodyId: string): Object3D | undefined;
  getBodyWorldPosition(bodyId: string, target?: Vector3): Vector3 | undefined;

  focusBody(bodyId: string): boolean;
  selectBody(bodyId: string): boolean;
  clearSelection(): void;
  resetView(): void;

  play(): void;
  pause(): void;
  resetSimulation(): void;
  setTimeScaleDaysPerSecond(daysPerSecond: number): void;
  setDistanceScaleMode(mode: DistanceScaleMode): void;
  setSizeScaleMode(mode: SizeScaleMode): void;

  setOrbitVisibility(visible: boolean): void;
  setMoonVisibility(visible: boolean): void;
  setMoonOrbitVisibility(visible: boolean): void;
  setStarFieldVisibility(visible: boolean): void;

  setCameraControls(controls: CameraControlsAdapter): void;
  detachCameraControls(): void;
}

/**
 * Source shape exported by the scene bootstrap. Keeping this structural lets
 * the UI entry use the normal app or an embedding shell without coupling panel
 * code to the bootstrap module.
 */
export interface SolarSystemApplicationSource {
  readonly controller: SolarSystemSceneController;
  start(): void;
  stop(): void;
  dispose(): void;
  play(): void;
  pause(): void;
  reset(): void;
  setTimeScale(daysPerSecond: number): void;
  setDistanceScale(mode: DistanceScaleMode): void;
  setSizeScale(mode: SizeScaleMode): void;
}

/** Lifecycle and control surface consumed by the mounted UI. */
export interface SolarSystemUIApplication {
  readonly controller: SolarSystemUIController;
  start(): void;
  stop(): void;
  dispose(): void;
  play(): void;
  pause(): void;
  reset(): void;
  setTimeScale(daysPerSecond: number): void;
  setDistanceScale(mode: DistanceScaleMode): void;
  setSizeScale(mode: SizeScaleMode): void;
}

/**
 * Adapts the documented scene-controller API into the stable UI port.
 *
 * No scene state is copied: each method delegates to the live controller so
 * state subscriptions and render-space metrics remain authoritative.
 */
export class SolarSystemControllerAdapter implements SolarSystemUIController {
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;

  constructor(private readonly sceneController: SolarSystemSceneController) {
    this.camera = sceneController.camera;
    this.renderer = sceneController.renderer;
  }

  getState(): SceneControllerState {
    return this.sceneController.getState();
  }

  subscribe(listener: SceneControllerListener): () => void {
    return this.sceneController.subscribe(listener);
  }

  getBodyData(bodyId: string): CelestialBodyData | undefined {
    return this.sceneController.getBodyData(bodyId);
  }

  getRenderedBodyMetrics(bodyId: string): RenderedBodyMetrics | undefined {
    return this.sceneController.getRenderedBodyMetrics(bodyId);
  }

  getBodyIds(): readonly string[] {
    return this.sceneController.getBodyIds();
  }

  getMoonIds(parentId: string): readonly string[] {
    return this.sceneController.getMoonIds(parentId);
  }

  getSelectionTargets(): readonly Mesh[] {
    return this.sceneController.getSelectionTargets();
  }

  getSelectionTarget(bodyId: string): Mesh | undefined {
    return this.sceneController.getSelectionTarget(bodyId);
  }

  getBodyObject(bodyId: string): Object3D | undefined {
    return this.sceneController.getBodyObject(bodyId);
  }

  getBodyWorldPosition(bodyId: string, target?: Vector3): Vector3 | undefined {
    return this.sceneController.getBodyWorldPosition(bodyId, target);
  }

  focusBody(bodyId: string): boolean {
    return this.sceneController.focusBody(bodyId);
  }

  selectBody(bodyId: string): boolean {
    return this.sceneController.selectBody(bodyId);
  }

  clearSelection(): void {
    this.sceneController.clearSelection();
  }

  resetView(): void {
    this.sceneController.resetView();
  }

  play(): void {
    this.sceneController.play();
  }

  pause(): void {
    this.sceneController.pause();
  }

  resetSimulation(): void {
    this.sceneController.resetSimulation();
  }

  setTimeScaleDaysPerSecond(daysPerSecond: number): void {
    this.sceneController.setTimeScaleDaysPerSecond(daysPerSecond);
  }

  setDistanceScaleMode(mode: DistanceScaleMode): void {
    this.sceneController.setDistanceScaleMode(mode);
  }

  setSizeScaleMode(mode: SizeScaleMode): void {
    this.sceneController.setSizeScaleMode(mode);
  }

  setOrbitVisibility(visible: boolean): void {
    this.sceneController.setOrbitVisibility(visible);
  }

  setMoonVisibility(visible: boolean): void {
    this.sceneController.setMoonVisibility(visible);
  }

  setMoonOrbitVisibility(visible: boolean): void {
    this.sceneController.setMoonOrbitVisibility(visible);
  }

  setStarFieldVisibility(visible: boolean): void {
    this.sceneController.setStarFieldVisibility(visible);
  }

  setCameraControls(controls: CameraControlsAdapter): void {
    this.sceneController.setCameraControls(controls);
  }

  detachCameraControls(): void {
    this.sceneController.detachCameraControls();
  }
}

/**
 * Adapts the stable bootstrap application and creates one UI controller port.
 * The wrapper owns no scene resources; dispose is delegated to the source app.
 */
export class SolarSystemApplicationAdapter implements SolarSystemUIApplication {
  readonly controller: SolarSystemUIController;
  private readonly source: SolarSystemApplicationSource;

  constructor(source: SolarSystemApplicationSource) {
    this.source = source;
    this.controller = new SolarSystemControllerAdapter(source.controller);
  }

  start(): void {
    this.source.start();
  }

  stop(): void {
    this.source.stop();
  }

  dispose(): void {
    this.source.dispose();
  }

  play(): void {
    this.source.play();
  }

  pause(): void {
    this.source.pause();
  }

  reset(): void {
    this.source.reset();
  }

  setTimeScale(daysPerSecond: number): void {
    this.source.setTimeScale(daysPerSecond);
  }

  setDistanceScale(mode: DistanceScaleMode): void {
    this.source.setDistanceScale(mode);
  }

  setSizeScale(mode: SizeScaleMode): void {
    this.source.setSizeScale(mode);
  }
}

export function createSolarSystemControllerAdapter(
  controller: SolarSystemSceneController,
): SolarSystemUIController {
  return new SolarSystemControllerAdapter(controller);
}

export function createSolarSystemApplicationAdapter(
  application: SolarSystemApplicationSource,
): SolarSystemUIApplication {
  return new SolarSystemApplicationAdapter(application);
}
