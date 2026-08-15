import {
  AmbientLight,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineLoop,
  Material,
  Mesh,
  Object3D,
  PerspectiveCamera,
  PointLight,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import {
  SOLAR_SYSTEM_DATA,
} from '../data/solarSystemData';
import type {
  CelestialBodyData,
  DistanceScaleMode,
  RenderedBodyMetrics,
  SizeScaleMode,
  SolarSystemDataset,
} from '../types/astronomy';
import {
  calculateOrbitalPosition,
  argumentOfPeriapsisFromId,
  ascendingNodeFromId,
  phaseFromId,
} from '../simulation/orbitalMechanics';
import { SimulationClock, type SimulationClockOptions } from '../simulation/SimulationClock';
import {
  createOrbitLine,
  createStarField,
  disposeMaterial,
  updateOrbitLine,
  RendererEnvironment,
  type CameraControlsAdapter,
} from '../rendering';
import { CelestialBodyNode } from './CelestialBodyNode';
import { SceneScaleManager } from './SceneScaleManager';

export interface SolarSystemSceneControllerOptions {
  readonly container: HTMLElement;
  readonly dataset?: SolarSystemDataset;
  readonly clock?: SimulationClock;
  readonly clockOptions?: SimulationClockOptions;
  readonly initialDistanceMode?: DistanceScaleMode;
  readonly initialSizeMode?: SizeScaleMode;
}

export interface SceneControllerState {
  readonly selectedBodyId: string | null;
  readonly distanceScaleMode: DistanceScaleMode;
  readonly sizeScaleMode: SizeScaleMode;
  readonly orbitVisibility: boolean;
  readonly moonVisibility: boolean;
  readonly moonOrbitVisibility: boolean;
  readonly starFieldVisibility: boolean;
  readonly elapsedSimulationDays: number;
  readonly timeScaleDaysPerSecond: number;
  readonly isPlaying: boolean;
}

export type SceneControllerListener = (state: SceneControllerState) => void;

interface OrbitEntry {
  readonly data: CelestialBodyData;
  readonly line: LineLoop<BufferGeometry, LineBasicMaterial>;
  readonly parentId: string | null;
  readonly satellite: boolean;
}

interface CameraFocusTransition {
  readonly fromPosition: Vector3;
  readonly fromTarget: Vector3;
  readonly toPosition: Vector3;
  readonly toTarget: Vector3;
  elapsedSeconds: number;
  readonly durationSeconds: number;
}

/**
 * Public scene/application core consumed by the later UI layer.
 *
 * It owns the data-driven hierarchy, render-space scale policies, simulation
 * stepping, selection targets, camera focus transitions, and resource cleanup.
 * UI code should use this class instead of reaching into private scene nodes.
 */
export class SolarSystemSceneController {
  readonly environment: RendererEnvironment;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  readonly clock: SimulationClock;

  private readonly dataset: SolarSystemDataset;
  private readonly bodyById: ReadonlyMap<string, CelestialBodyData>;
  private readonly scaleManager: SceneScaleManager;
  private readonly root = new Group();
  private readonly nodes = new Map<string, CelestialBodyNode>();
  private readonly orbitEntries = new Map<string, OrbitEntry>();
  private readonly selectionTargets: Mesh[] = [];
  private readonly listeners = new Set<SceneControllerListener>();
  private readonly globalCameraPosition = new Vector3(0, 148, 252);
  private readonly focusDirection = new Vector3(0.48, 0.34, 0.82).normalize();
  private readonly cameraTarget = new Vector3();
  private readonly lastFollowTarget = new Vector3();
  private readonly cameraScratchTarget = new Vector3();
  private readonly cameraScratchPosition = new Vector3();
  private readonly cameraScratchDelta = new Vector3();
  private readonly cameraScratchInterpolatedTarget = new Vector3();

  private starField: Object3D | undefined;
  private cameraControls: CameraControlsAdapter | undefined;
  private selectedBodyId: string | null = null;
  private orbitVisibility = true;
  private moonVisibility = true;
  private moonOrbitVisibility = false;
  private starFieldVisibility = true;
  private focusTransition: CameraFocusTransition | undefined;
  private animationFrameId: number | undefined;
  private lastAnimationTimestamp = 0;
  private disposed = false;

  constructor(options: SolarSystemSceneControllerOptions) {
    this.dataset = options.dataset ?? SOLAR_SYSTEM_DATA;
    this.bodyById = new Map(this.dataset.bodies.map((body) => [body.id, body]));
    this.scaleManager = new SceneScaleManager(
      this.dataset,
      options.initialDistanceMode ?? 'log',
      options.initialSizeMode ?? 'enhanced-visibility',
    );
    this.clock = options.clock ?? new SimulationClock(options.clockOptions);
    this.environment = new RendererEnvironment(options.container);
    this.scene = this.environment.scene;
    this.camera = this.environment.camera;
    this.renderer = this.environment.renderer;

    this.scene.background = new Color(0x02040c);
    this.scene.add(new AmbientLight(0x8097bd, 0.34));
    const sunlight = new PointLight(0xffedc4, 2_600, 0, 2);
    sunlight.position.set(0, 0, 0);
    sunlight.name = 'sun-light';
    this.scene.add(sunlight);
    this.root.name = 'solar-system-root';
    this.scene.add(this.root);

    this.starField = createStarField();
    this.starField.visible = this.starFieldVisibility;
    this.scene.add(this.starField);

    this.createBodyHierarchy();
    this.createOrbitLines();
    this.updateBodyPositions(0);
    this.updateOrbitPresentation();
  }

  start(): void {
    if (this.disposed || this.animationFrameId !== undefined) {
      return;
    }
    if (typeof window === 'undefined') {
      throw new Error('SolarSystemSceneController.start() requires a browser window');
    }
    this.lastAnimationTimestamp = performance.now();
    const frame = (timestamp: number): void => {
      if (this.disposed) {
        return;
      }
      const realDeltaSeconds = Math.max(0, (timestamp - this.lastAnimationTimestamp) / 1_000);
      this.lastAnimationTimestamp = timestamp;
      this.update(realDeltaSeconds);
      this.render();
      this.animationFrameId = window.requestAnimationFrame(frame);
    };
    this.animationFrameId = window.requestAnimationFrame(frame);
  }

  stop(): void {
    if (this.animationFrameId === undefined || typeof window === 'undefined') {
      return;
    }
    window.cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = undefined;
  }

  /** Advance the simulation using wall-clock seconds, then update the scene. */
  update(realDeltaSeconds: number): void {
    if (this.disposed) {
      return;
    }
    this.clock.advance(realDeltaSeconds);
    this.updateBodyPositions(realDeltaSeconds);
    this.updateCamera(realDeltaSeconds);
    this.updateOrbitPresentation();
  }

  render(): void {
    this.environment.render();
  }

  resize(): void {
    this.environment.resize();
  }

  play(): void {
    this.clock.play();
    this.emitState();
  }

  pause(): void {
    this.clock.pause();
    this.emitState();
  }

  resetSimulation(): void {
    this.clock.reset();
    this.updateBodyPositions(0);
    this.emitState();
  }

  setTimeScaleDaysPerSecond(daysPerSecond: number): void {
    this.clock.setTimeScaleDaysPerSecond(daysPerSecond);
    this.emitState();
  }

  setDistanceScaleMode(mode: DistanceScaleMode): void {
    this.scaleManager.setDistanceMode(mode);
    this.refreshOrbitGeometry();
    this.updateBodyPositions(0);
    this.updateOrbitPresentation();
    this.emitState();
  }

  setSizeScaleMode(mode: SizeScaleMode): void {
    this.scaleManager.setSizeMode(mode);
    for (const data of this.dataset.bodies) {
      this.nodes.get(data.id)?.setRenderedRadius(this.scaleManager.getRenderedBodyRadius(data));
    }
    this.refreshOrbitGeometry();
    this.updateBodyPositions(0);
    this.emitState();
  }

  setOrbitVisibility(visible: boolean): void {
    this.orbitVisibility = visible;
    this.updateOrbitPresentation();
    this.emitState();
  }

  setMoonVisibility(visible: boolean): void {
    this.moonVisibility = visible;
    for (const data of this.dataset.bodies) {
      if (data.type === 'moon') {
        const node = this.nodes.get(data.id);
        if (node) {
          node.group.visible = visible;
        }
      }
    }
    this.updateOrbitPresentation();
    this.emitState();
  }

  setMoonOrbitVisibility(visible: boolean): void {
    this.moonOrbitVisibility = visible;
    this.updateOrbitPresentation();
    this.emitState();
  }

  setStarFieldVisibility(visible: boolean): void {
    this.starFieldVisibility = visible;
    if (this.starField) {
      this.starField.visible = visible;
    }
    this.emitState();
  }

  /** Select and smoothly focus a body; returns false for an unknown id. */
  focusBody(bodyId: string): boolean {
    return this.selectBody(bodyId);
  }

  selectBody(bodyId: string): boolean {
    if (!this.bodyById.has(bodyId)) {
      return false;
    }
    this.selectedBodyId = bodyId;
    this.scaleManager.setFocusBodyId(bodyId);
    for (const [id, node] of this.nodes) {
      node.setSelected(id === bodyId);
    }
    this.refreshOrbitGeometry();
    this.updateBodyPositions(0);
    this.beginCameraFocus(bodyId);
    this.updateOrbitPresentation();
    this.emitState();
    return true;
  }

  clearSelection(): void {
    this.resetView();
  }

  resetView(): void {
    this.selectedBodyId = null;
    this.scaleManager.setFocusBodyId(null);
    for (const node of this.nodes.values()) {
      node.setSelected(false);
    }
    this.refreshOrbitGeometry();
    this.updateBodyPositions(0);
    this.beginCameraFocus(null);
    this.updateOrbitPresentation();
    this.emitState();
  }

  /** Attach OrbitControls or another compatible camera-control adapter. */
  setCameraControls(controls: CameraControlsAdapter): void {
    this.cameraControls = controls;
    controls.target.copy(this.cameraTarget);
    controls.update();
  }

  detachCameraControls(): void {
    this.cameraControls = undefined;
  }

  getState(): SceneControllerState {
    const clockState = this.clock.getState();
    return {
      selectedBodyId: this.selectedBodyId,
      distanceScaleMode: this.scaleManager.getDistanceMode(),
      sizeScaleMode: this.scaleManager.getSizeMode(),
      orbitVisibility: this.orbitVisibility,
      moonVisibility: this.moonVisibility,
      moonOrbitVisibility: this.moonOrbitVisibility,
      starFieldVisibility: this.starFieldVisibility,
      elapsedSimulationDays: clockState.elapsedSimulationDays,
      timeScaleDaysPerSecond: clockState.timeScaleDaysPerSecond,
      isPlaying: clockState.isPlaying,
    };
  }

  subscribe(listener: SceneControllerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getBodyData(bodyId: string): CelestialBodyData | undefined {
    return this.bodyById.get(bodyId);
  }

  getRenderedBodyMetrics(bodyId: string): RenderedBodyMetrics | undefined {
    const data = this.bodyById.get(bodyId);
    return data ? this.scaleManager.getRenderedMetrics(data) : undefined;
  }

  getSelectionTargets(): readonly Mesh[] {
    return this.selectionTargets;
  }

  getSelectionTarget(bodyId: string): Mesh | undefined {
    return this.nodes.get(bodyId)?.bodyMesh;
  }

  getBodyObject(bodyId: string): Object3D | undefined {
    return this.nodes.get(bodyId)?.group;
  }

  getBodyWorldPosition(bodyId: string, target = new Vector3()): Vector3 | undefined {
    const node = this.nodes.get(bodyId);
    if (!node) {
      return undefined;
    }
    return node.group.getWorldPosition(target);
  }

  getBodyIds(): readonly string[] {
    return this.dataset.bodies.map((body) => body.id);
  }

  getMoonIds(parentId: string): readonly string[] {
    return this.dataset.bodies
      .filter((body) => body.type === 'moon' && body.parentId === parentId)
      .map((body) => body.id);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.stop();
    this.disposed = true;
    this.disposeSceneResources();
    this.listeners.clear();
    this.environment.dispose();
    this.scene.clear();
    this.nodes.clear();
    this.orbitEntries.clear();
    this.selectionTargets.length = 0;
  }

  private createBodyHierarchy(): void {
    const pending = [...this.dataset.bodies];
    while (pending.length > 0) {
      let created = false;
      for (let index = pending.length - 1; index >= 0; index -= 1) {
        const data = pending[index];
        const parentGroup = data.parentId
          ? this.nodes.get(data.parentId)?.moonSystemGroup
          : this.root;
        if (!parentGroup) {
          continue;
        }
        const node = new CelestialBodyNode(data, this.scaleManager.getRenderedBodyRadius(data));
        parentGroup.add(node.group);
        this.nodes.set(data.id, node);
        this.selectionTargets.push(node.bodyMesh);
        pending.splice(index, 1);
        created = true;
      }
      if (!created) {
        const unresolved = pending.map((body) => body.id).join(', ');
        throw new Error(`Unable to resolve celestial body parents: ${unresolved}`);
      }
    }
  }

  private createOrbitLines(): void {
    for (const data of this.dataset.bodies) {
      if (data.semiMajorAxis === undefined || data.orbitalPeriodDays === undefined) {
        continue;
      }
      if (data.type === 'moon') {
        if (!data.parentId) {
          continue;
        }
        const parent = this.bodyById.get(data.parentId);
        const parentNode = this.nodes.get(data.parentId);
        if (!parent || !parentNode) {
          continue;
        }
        const line = createOrbitLine(
          data,
          this.scaleManager.getSatelliteOrbitRadius(parent, data),
          { opacity: 0.06 },
        );
        parentNode.moonSystemGroup.add(line);
        this.orbitEntries.set(data.id, {
          data,
          line,
          parentId: data.parentId,
          satellite: true,
        });
      } else if (data.type === 'planet' || data.type === 'dwarf-planet') {
        const line = createOrbitLine(
          data,
          this.scaleManager.getHeliocentricOrbitRadius(data),
          { opacity: 0.24 },
        );
        this.root.add(line);
        this.orbitEntries.set(data.id, {
          data,
          line,
          parentId: null,
          satellite: false,
        });
      }
    }
  }

  private updateBodyPositions(realDeltaSeconds: number): void {
    const elapsedDays = this.clock.getElapsedSimulationDays();
    for (const data of this.dataset.bodies) {
      const node = this.nodes.get(data.id);
      if (!node) {
        continue;
      }
      node.setRotationFromSimulationDays(elapsedDays);
      if (data.type === 'star') {
        node.group.position.set(0, 0, 0);
        continue;
      }

      const orbitalPeriodDays = data.orbitalPeriodDays ?? 1;
      const semiMajorAxis = data.type === 'moon' && data.parentId
        ? this.scaleManager.getSatelliteOrbitRadius(this.bodyById.get(data.parentId) ?? data, data)
        : this.scaleManager.getHeliocentricOrbitRadius(data);
      calculateOrbitalPosition({
        elapsedDays,
        semiMajorAxis: Math.max(0.001, semiMajorAxis),
        orbitalPeriodDays,
        eccentricity: data.eccentricity,
        inclinationDeg: data.inclinationDeg,
        orbitDirection: data.orbitDirection,
        phaseRadians: phaseFromId(data.id),
        argumentOfPeriapsisRadians: argumentOfPeriapsisFromId(data.id),
        ascendingNodeRadians: ascendingNodeFromId(data.id),
      }, node.group.position);
    }

    const detailSystemId = this.getSystemFocusId(this.selectedBodyId);
    const smoothing = realDeltaSeconds <= 0 ? 1 : 1 - Math.exp(-realDeltaSeconds * 7);
    for (const data of this.dataset.bodies) {
      if (data.type !== 'planet' && data.type !== 'dwarf-planet') {
        continue;
      }
      const node = this.nodes.get(data.id);
      if (!node) {
        continue;
      }
      const desiredScale = detailSystemId === data.id ? 1.42 : 1;
      const nextScale = node.moonSystemGroup.scale.x
        + (desiredScale - node.moonSystemGroup.scale.x) * smoothing;
      node.setMoonSystemScale(nextScale);
    }
  }

  private refreshOrbitGeometry(): void {
    for (const entry of this.orbitEntries.values()) {
      const renderedRadius = entry.satellite && entry.parentId
        ? this.scaleManager.getSatelliteOrbitRadius(
          this.bodyById.get(entry.parentId) ?? entry.data,
          entry.data,
        )
        : this.scaleManager.getHeliocentricOrbitRadius(entry.data);
      updateOrbitLine(entry.line, entry.data, renderedRadius);
    }
  }

  private updateOrbitPresentation(): void {
    const detailSystemId = this.getSystemFocusId(this.selectedBodyId);
    for (const entry of this.orbitEntries.values()) {
      const focusedSatellite = entry.satellite && entry.parentId === detailSystemId;
      entry.line.visible = this.orbitVisibility && (!entry.satellite
        || (this.moonVisibility && (this.moonOrbitVisibility || focusedSatellite)));
      entry.line.material.opacity = entry.satellite
        ? (focusedSatellite ? 0.42 : 0.055)
        : (entry.data.id === this.selectedBodyId ? 0.9 : 0.24);
      entry.line.material.color.set(entry.data.displayColor);
    }
  }

  private beginCameraFocus(bodyId: string | null): void {
    const fromPosition = this.camera.position.clone();
    const fromTarget = this.cameraTarget.clone();
    let toTarget = new Vector3();
    let toPosition = this.globalCameraPosition.clone();

    if (bodyId && bodyId !== 'sun') {
      const worldPosition = this.getBodyWorldPosition(bodyId);
      if (worldPosition) {
        toTarget = worldPosition.clone();
        const distance = this.getFocusDistance(bodyId);
        toPosition = worldPosition.clone().addScaledVector(this.focusDirection, distance);
      }
    }

    this.focusTransition = {
      fromPosition,
      fromTarget,
      toPosition,
      toTarget,
      elapsedSeconds: 0,
      durationSeconds: bodyId ? 0.95 : 0.8,
    };
    this.lastFollowTarget.copy(toTarget);
  }

  private updateCamera(realDeltaSeconds: number): void {
    if (this.focusTransition) {
      const transition = this.focusTransition;
      transition.elapsedSeconds += Math.max(0, realDeltaSeconds);
      const rawProgress = transition.elapsedSeconds / transition.durationSeconds;
      const progress = easeInOutCubic(Math.min(1, rawProgress));
      let target = transition.toTarget;
      let position = transition.toPosition;
      if (this.selectedBodyId && this.selectedBodyId !== 'sun') {
        const currentPosition = this.getBodyWorldPosition(
          this.selectedBodyId,
          this.cameraScratchTarget,
        );
        if (currentPosition) {
          target = currentPosition;
          position = this.cameraScratchPosition.copy(currentPosition).addScaledVector(
            this.focusDirection,
            this.getFocusDistance(this.selectedBodyId),
          );
        }
      }
      this.camera.position.lerpVectors(transition.fromPosition, position, progress);
      const interpolatedTarget = this.cameraScratchInterpolatedTarget.lerpVectors(
        transition.fromTarget,
        target,
        progress,
      );
      this.setCameraTarget(interpolatedTarget);
      if (rawProgress >= 1) {
        this.focusTransition = undefined;
        this.lastFollowTarget.copy(target);
      }
      return;
    }

    if (this.selectedBodyId && this.selectedBodyId !== 'sun') {
      const currentPosition = this.getBodyWorldPosition(
        this.selectedBodyId,
        this.cameraScratchTarget,
      );
      if (currentPosition) {
        const delta = this.cameraScratchDelta.copy(currentPosition).sub(this.lastFollowTarget);
        this.camera.position.add(delta);
        this.setCameraTarget(this.cameraScratchInterpolatedTarget.copy(this.cameraTarget).add(delta));
        this.lastFollowTarget.copy(currentPosition);
      }
    }
  }

  private setCameraTarget(target: Vector3): void {
    this.cameraTarget.copy(target);
    if (this.cameraControls) {
      this.cameraControls.target.copy(target);
      this.cameraControls.update();
    } else {
      this.camera.lookAt(target);
    }
  }

  private getFocusDistance(bodyId: string): number {
    const body = this.bodyById.get(bodyId);
    const systemId = this.getSystemFocusId(bodyId);
    if (!body || !systemId) {
      return 300;
    }
    const systemBody = this.bodyById.get(systemId);
    const systemRadius = systemBody
      ? this.scaleManager.getRenderedBodyRadius(systemBody)
      : this.scaleManager.getRenderedBodyRadius(body);
    let maxSatelliteRadius = systemRadius * 2.5;
    for (const data of this.dataset.bodies) {
      if (data.type === 'moon' && data.parentId === systemId) {
        maxSatelliteRadius = Math.max(
          maxSatelliteRadius,
          this.scaleManager.getSatelliteOrbitRadius(systemBody ?? body, data) * 1.18,
        );
      }
    }
    return Math.min(142, Math.max(18, maxSatelliteRadius * 2.65));
  }

  private getSystemFocusId(bodyId: string | null): string | null {
    if (!bodyId) {
      return null;
    }
    const body = this.bodyById.get(bodyId);
    if (!body || body.type === 'star') {
      return null;
    }
    return body.type === 'moon' ? body.parentId ?? null : body.id;
  }

  private emitState(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  private disposeSceneResources(): void {
    const disposedMaterials = new Set<Material>();
    this.scene.traverse((object: Object3D) => {
      const renderObject = object as Object3D & {
        geometry?: BufferGeometry;
        material?: Material | Material[];
      };
      renderObject.geometry?.dispose();
      const materials = renderObject.material
        ? Array.isArray(renderObject.material) ? renderObject.material : [renderObject.material]
        : [];
      for (const material of materials) {
        if (!disposedMaterials.has(material)) {
          disposedMaterials.add(material);
          disposeMaterial(material);
        }
      }
    });
  }
}

export { SolarSystemSceneController as SceneController };

function easeInOutCubic(value: number): number {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}
