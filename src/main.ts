import {
  SolarSystemSceneController,
  type SolarSystemSceneControllerOptions,
} from './scene/SolarSystemSceneController';
import type { DistanceScaleMode, SizeScaleMode } from './types/astronomy';

export interface SolarSystemApplicationOptions
  extends Omit<SolarSystemSceneControllerOptions, 'container'> {
  readonly container?: HTMLElement;
  readonly autoStart?: boolean;
}

/** Stable bootstrap surface for the UI layer and browser entry point. */
export interface SolarSystemApplication {
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

export function createSolarSystemApplication(
  options: SolarSystemApplicationOptions = {},
): SolarSystemApplication {
  const container = options.container ?? resolveDefaultContainer();
  const controller = new SolarSystemSceneController({
    ...options,
    container,
  });
  const application: SolarSystemApplication = {
    controller,
    start: () => controller.start(),
    stop: () => controller.stop(),
    dispose: () => controller.dispose(),
    play: () => controller.play(),
    pause: () => controller.pause(),
    reset: () => controller.resetView(),
    setTimeScale: (daysPerSecond) => controller.setTimeScaleDaysPerSecond(daysPerSecond),
    setDistanceScale: (mode) => controller.setDistanceScaleMode(mode),
    setSizeScale: (mode) => controller.setSizeScaleMode(mode),
  };

  if (options.autoStart ?? true) {
    application.start();
  }
  return application;
}

/** Alias with an explicit name for consumers that prefer a bootstrap verb. */
export const bootstrapSolarSystem = createSolarSystemApplication;

/**
 * When src/main.ts is loaded as the Vite browser entry, create one application
 * for the scaffold's #app element. A UI entry module can import this value and
 * use the controller's documented methods without duplicating the render loop.
 */
export const solarSystemApp: SolarSystemApplication | undefined =
  typeof document !== 'undefined' && document.querySelector<HTMLElement>('#app')
    ? createSolarSystemApplication({
      container: document.querySelector<HTMLElement>('#app') ?? undefined,
      autoStart: true,
    })
    : undefined;

if (solarSystemApp && typeof window !== 'undefined') {
  const browserWindow = window as Window & {
    solarSystemApp?: SolarSystemApplication;
  };
  browserWindow.solarSystemApp = solarSystemApp;
}

function resolveDefaultContainer(): HTMLElement {
  if (typeof document === 'undefined') {
    throw new Error('createSolarSystemApplication requires a browser document or an explicit container');
  }
  const app = document.querySelector<HTMLElement>('#app');
  if (app) {
    return app;
  }
  if (!document.body) {
    throw new Error('Unable to find a mount container for the Solar System scene');
  }
  return document.body;
}
