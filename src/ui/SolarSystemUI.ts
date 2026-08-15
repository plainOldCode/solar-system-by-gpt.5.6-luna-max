import { Raycaster, Vector2 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  bootstrapSolarSystem,
  solarSystemApp,
} from '../main';
import { createSolarSystemApplicationAdapter } from './controllerAdapter';
import type {
  SceneControllerState,
  SolarSystemApplicationSource,
  SolarSystemUIApplication,
  SolarSystemUIController,
} from './controllerAdapter';
import type { DistanceScaleMode, SizeScaleMode } from '../types/astronomy';
import { ControlPanel } from './ControlPanel';
import { InfoPanel } from './InfoPanel';
import { CelestialLabels } from './labels';
import '../styles/solar-system.css';

export interface SolarSystemUIOptions {
  /** Use an existing scene bootstrap application instead of creating one. */
  readonly application?: SolarSystemApplicationSource;
  /** Inject a pre-adapted application for an embedding shell or test harness. */
  readonly integration?: SolarSystemUIApplication;
  readonly root?: HTMLElement;
  readonly autoStart?: boolean;
}

/**
 * Browser-facing interaction layer for the data-driven scene controller.
 *
 * It owns DOM panels, OrbitControls, pointer raycasting, screen labels, and
 * responsive presentation. Scene and simulation internals remain behind the
 * controller's public API.
 *
 * Moon selection keeps the parent planet's local system in view: clicking a
 * moon focuses that moon, reveals its sibling moon labels, and the inspector
 * continues to list the major moons belonging to the same parent body.
 */
export class SolarSystemUI {
  readonly element: HTMLElement;
  readonly application: SolarSystemUIApplication;

  private readonly controller: SolarSystemUIController;
  private readonly canvas: HTMLCanvasElement;
  private readonly stage: HTMLDivElement;
  private readonly overlay: HTMLDivElement;
  private readonly labels: CelestialLabels;
  private readonly controls: OrbitControls;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly controlPanel: ControlPanel;
  private readonly infoPanel: InfoPanel;
  private readonly tooltip: HTMLDivElement;
  private readonly tooltipPrimary: HTMLSpanElement;
  private readonly tooltipSecondary: HTMLSpanElement;
  private readonly tooltipType: HTMLSpanElement;
  private readonly panelToggleButton: HTMLButtonElement;
  private readonly eventCleanups: Array<() => void> = [];
  private readonly ownsApplication: boolean;
  private labelsVisible = true;
  private panelsHidden = false;
  private animationFrameId: number | undefined;
  private unsubscribe?: () => void;
  private disposed = false;
  private pointerDown = false;
  private pointerMoved = false;
  private pointerDownX = 0;
  private pointerDownY = 0;

  constructor(options: SolarSystemUIOptions = {}) {
    const root = options.root ?? resolveRoot();
    this.element = root;
    if (options.application && options.integration) {
      throw new Error('SolarSystemUI accepts either application or integration, not both');
    }
    const sourceApplication = options.integration
      ? undefined
      : options.application
        ?? solarSystemApp
        ?? bootstrapSolarSystem({ container: root, autoStart: options.autoStart ?? true });
    const application = options.integration
      ?? (sourceApplication ? createSolarSystemApplicationAdapter(sourceApplication) : undefined);
    if (!application) {
      throw new Error('SolarSystemUI requires an application or integration adapter');
    }
    this.application = application;
    this.ownsApplication = !options.application && !solarSystemApp && !options.integration;
    this.controller = this.application.controller;
    this.canvas = this.controller.renderer.domElement;
    this.prepareRoot();

    this.stage = document.createElement('div');
    this.stage.className = 'solar-ui__stage';
    this.stage.append(this.canvas);
    this.element.append(this.stage);

    const labelsLayer = document.createElement('div');
    this.stage.append(labelsLayer);
    this.labels = new CelestialLabels(this.controller, labelsLayer);

    this.overlay = document.createElement('div');
    this.overlay.className = 'solar-ui__overlay';
    this.overlay.append(this.createHeader());
    this.panelToggleButton = this.createPanelToggle();
    this.overlay.append(this.panelToggleButton);

    this.controlPanel = new ControlPanel({
      onPlay: () => this.application.play(),
      onPause: () => this.application.pause(),
      onResetSimulation: () => this.controller.resetSimulation(),
      onResetView: () => this.controller.resetView(),
      onTimeScale: (daysPerSecond) => this.application.setTimeScale(daysPerSecond),
      onDistanceScale: (mode) => this.application.setDistanceScale(mode),
      onSizeScale: (mode) => this.application.setSizeScale(mode),
      onOrbitVisibility: (visible) => this.controller.setOrbitVisibility(visible),
      onLabelsVisibility: (visible) => this.setLabelsVisible(visible),
      onMoonVisibility: (visible) => this.controller.setMoonVisibility(visible),
      onMoonOrbitVisibility: (visible) => this.controller.setMoonOrbitVisibility(visible),
      onStarFieldVisibility: (visible) => this.controller.setStarFieldVisibility(visible),
    });
    this.overlay.append(this.controlPanel.element);

    this.infoPanel = new InfoPanel(this.controller, {
      onResetView: () => this.controller.resetView(),
    });
    this.overlay.append(this.infoPanel.element);
    this.overlay.append(this.createScaleDisclaimer());

    const tooltip = this.createTooltip();
    this.tooltip = tooltip.element;
    this.tooltipPrimary = tooltip.primary;
    this.tooltipSecondary = tooltip.secondary;
    this.tooltipType = tooltip.type;
    this.overlay.append(this.tooltip);
    this.element.append(this.overlay);

    this.controls = new OrbitControls(this.controller.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 850;
    this.controller.setCameraControls(this.controls);
    this.controls.addEventListener('change', () => this.labels.update());

    this.bindCanvasInteractions();
    this.bindKeyboardInteractions();
    this.unsubscribe = this.controller.subscribe((state) => this.handleStateChange(state));
    this.handleStateChange(this.controller.getState());
    this.startFrameLoop();

    if (typeof window !== 'undefined') {
      const browserWindow = window as Window & { solarSystemUI?: SolarSystemUI };
      browserWindow.solarSystemUI = this;
    }
  }

  start(): void {
    if (this.disposed) {
      return;
    }
    this.application.start();
    this.startFrameLoop();
  }

  stop(): void {
    this.application.stop();
    if (this.animationFrameId !== undefined && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.stop();
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    for (const cleanup of this.eventCleanups.splice(0)) {
      cleanup();
    }
    this.controls.dispose();
    this.controller.detachCameraControls();
    this.labels.dispose();
    this.controlPanel.dispose();
    this.infoPanel.dispose();
    this.overlay.remove();
    this.stage.remove();
    this.element.classList.remove('solar-ui');
    if (this.ownsApplication) {
      this.application.dispose();
    }
    if (typeof window !== 'undefined') {
      const browserWindow = window as Window & { solarSystemUI?: SolarSystemUI };
      if (browserWindow.solarSystemUI === this) {
        delete browserWindow.solarSystemUI;
      }
    }
  }

  private prepareRoot(): void {
    this.element.classList.add('solar-ui');
    this.element.setAttribute('data-solar-system-ui', 'mounted');
    this.element.setAttribute('aria-label', 'Interactive logarithmic Solar System');
    this.element.replaceChildren();
    this.canvas.classList.add('solar-system-canvas');
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('header');
    header.className = 'solar-header';
    const kicker = document.createElement('p');
    kicker.className = 'solar-header__kicker';
    kicker.textContent = 'REAL DATA · COMPRESSED VIEW';
    const title = document.createElement('h1');
    title.textContent = 'Logarithmic Solar System';
    const subtitle = document.createElement('p');
    subtitle.textContent = 'A visualization of real astronomical data compressed with logarithmic scaling.';
    header.append(kicker, title, subtitle);
    return header;
  }

  private createPanelToggle(): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'panel-toggle-button secondary-button';
    button.textContent = 'Hide panels';
    button.title = 'Hide Solar System panels';
    button.setAttribute('aria-label', 'Hide panels');
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => this.setPanelsHidden(!this.panelsHidden));
    return button;
  }

  private setPanelsHidden(hidden: boolean): void {
    this.panelsHidden = hidden;
    this.element.classList.toggle('solar-ui--panels-hidden', hidden);
    const label = hidden ? 'Show panels' : 'Hide panels';
    const title = hidden ? 'Show Solar System panels' : 'Hide Solar System panels';
    this.panelToggleButton.textContent = label;
    this.panelToggleButton.title = title;
    this.panelToggleButton.setAttribute('aria-label', label);
    this.panelToggleButton.setAttribute('aria-pressed', String(hidden));
  }

  private createScaleDisclaimer(): HTMLElement {
    const disclaimer = document.createElement('aside');
    disclaimer.className = 'scale-disclaimer';
    const title = document.createElement('strong');
    title.textContent = 'Display scale note';
    const body = document.createElement('span');
    body.textContent = 'This visualization uses real astronomical data. Orbital distances are compressed with a logarithmic scale and body sizes are visually enlarged so the complete Solar System can share one screen. Rendered body sizes and rendered orbital distances do not share one uniform physical scale.';
    disclaimer.append(title, body);
    return disclaimer;
  }

  private createTooltip(): {
    element: HTMLDivElement;
    primary: HTMLSpanElement;
    secondary: HTMLSpanElement;
    type: HTMLSpanElement;
  } {
    const element = document.createElement('div');
    element.className = 'hover-tooltip';
    element.hidden = true;
    const primary = document.createElement('span');
    primary.className = 'hover-tooltip__primary';
    const secondary = document.createElement('span');
    secondary.className = 'hover-tooltip__secondary';
    const type = document.createElement('span');
    type.className = 'hover-tooltip__type';
    element.append(primary, secondary, type);
    return { element, primary, secondary, type };
  }

  private bindCanvasInteractions(): void {
    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0) {
        return;
      }
      this.pointerDown = true;
      this.pointerMoved = false;
      this.pointerDownX = event.clientX;
      this.pointerDownY = event.clientY;
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (this.pointerDown) {
        const distance = Math.hypot(event.clientX - this.pointerDownX, event.clientY - this.pointerDownY);
        this.pointerMoved ||= distance > 6;
      }
      const bodyId = this.getBodyIdAt(event);
      this.canvas.style.cursor = bodyId ? 'pointer' : this.pointerDown ? 'grabbing' : 'grab';
      this.updateTooltip(bodyId, event);
    };
    const onPointerUp = (event: PointerEvent): void => {
      if (event.button === 0 && this.pointerDown && !this.pointerMoved) {
        const bodyId = this.getBodyIdAt(event);
        if (bodyId) {
          this.controller.focusBody(bodyId);
        }
      }
      this.pointerDown = false;
      this.pointerMoved = false;
    };
    const onPointerLeave = (): void => {
      this.pointerDown = false;
      this.pointerMoved = false;
      this.hideTooltip();
      this.canvas.style.cursor = 'grab';
    };
    const onDoubleClick = (event: MouseEvent): void => {
      if (!this.getBodyIdAt(event)) {
        this.controller.resetView();
        this.hideTooltip();
      }
    };
    const onContextMenu = (event: MouseEvent): void => event.preventDefault();

    this.canvas.addEventListener('pointerdown', onPointerDown);
    this.canvas.addEventListener('pointermove', onPointerMove);
    this.canvas.addEventListener('pointerup', onPointerUp);
    this.canvas.addEventListener('pointercancel', onPointerLeave);
    this.canvas.addEventListener('pointerleave', onPointerLeave);
    this.canvas.addEventListener('dblclick', onDoubleClick);
    this.canvas.addEventListener('contextmenu', onContextMenu);
    this.eventCleanups.push(
      () => this.canvas.removeEventListener('pointerdown', onPointerDown),
      () => this.canvas.removeEventListener('pointermove', onPointerMove),
      () => this.canvas.removeEventListener('pointerup', onPointerUp),
      () => this.canvas.removeEventListener('pointercancel', onPointerLeave),
      () => this.canvas.removeEventListener('pointerleave', onPointerLeave),
      () => this.canvas.removeEventListener('dblclick', onDoubleClick),
      () => this.canvas.removeEventListener('contextmenu', onContextMenu),
    );
  }

  private bindKeyboardInteractions(): void {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        this.controller.resetView();
        this.hideTooltip();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    this.eventCleanups.push(() => document.removeEventListener('keydown', onKeyDown));
  }

  private getBodyIdAt(event: Pick<MouseEvent, 'clientX' | 'clientY'>): string | null {
    const bounds = this.canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return null;
    }
    this.pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.controller.camera);
    const state = this.controller.getState();
    const targets = Array.from(this.controller.getSelectionTargets());
    const hit = this.raycaster.intersectObjects(targets, false).find((intersection) => intersection.object.visible);
    const bodyId = hit?.object.userData.celestialBodyId;
    if (typeof bodyId !== 'string') {
      return null;
    }
    const body = this.controller.getBodyData(bodyId);
    return body?.type === 'moon' && !state.moonVisibility ? null : bodyId;
  }

  private updateTooltip(bodyId: string | null, event: Pick<MouseEvent, 'clientX' | 'clientY'>): void {
    const body = bodyId ? this.controller.getBodyData(bodyId) : undefined;
    if (!body) {
      this.hideTooltip();
      return;
    }
    const rootBounds = this.element.getBoundingClientRect();
    this.tooltip.style.left = `${event.clientX - rootBounds.left}px`;
    this.tooltip.style.top = `${event.clientY - rootBounds.top}px`;
    this.tooltipPrimary.textContent = body.nameKo;
    this.tooltipSecondary.textContent = body.nameEn;
    this.tooltipType.textContent = bodyTypeLabel(body.type);
    this.tooltip.hidden = false;
  }

  private hideTooltip(): void {
    this.tooltip.hidden = true;
  }

  private setLabelsVisible(visible: boolean): void {
    this.labelsVisible = visible;
    this.labels.setVisible(visible);
    this.controlPanel.update(this.controller.getState(), visible);
  }

  private handleStateChange(state: SceneControllerState): void {
    this.controlPanel.update(state, this.labelsVisible);
    this.infoPanel.update(state);
    this.labels.update();
  }

  private startFrameLoop(): void {
    if (this.animationFrameId !== undefined || typeof window === 'undefined' || this.disposed) {
      return;
    }
    const frame = (): void => {
      if (this.disposed) {
        return;
      }
      this.controls.update();
      const state = this.controller.getState();
      this.controlPanel.updateSimulation(state);
      this.infoPanel.updateSimulation(state);
      this.labels.update();
      this.animationFrameId = window.requestAnimationFrame(frame);
    };
    this.animationFrameId = window.requestAnimationFrame(frame);
  }
}

export function mountSolarSystemUI(options: SolarSystemUIOptions = {}): SolarSystemUI {
  return new SolarSystemUI(options);
}

function resolveRoot(): HTMLElement {
  if (typeof document === 'undefined') {
    throw new Error('mountSolarSystemUI requires a browser document or an explicit root');
  }
  return document.querySelector<HTMLElement>('#app') ?? document.body;
}

function bodyTypeLabel(type: string): string {
  switch (type) {
    case 'star':
      return 'Star · 별';
    case 'planet':
      return 'Planet · 행성';
    case 'dwarf-planet':
      return 'Dwarf planet · 왜행성';
    case 'moon':
      return 'Moon · 위성';
    default:
      return type;
  }
}

export type { DistanceScaleMode, SizeScaleMode };
