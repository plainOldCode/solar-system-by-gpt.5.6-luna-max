export {
  SolarSystemUI,
  mountSolarSystemUI,
  type SolarSystemUIOptions,
} from './SolarSystemUI';
export { ControlPanel } from './ControlPanel';
export { InfoPanel } from './InfoPanel';
export { CelestialLabels } from './labels';
export type { ControlPanelCallbacks } from './ControlPanel';
export type { InfoPanelOptions } from './InfoPanel';
export {
  SolarSystemApplicationAdapter,
  SolarSystemControllerAdapter,
  createSolarSystemApplicationAdapter,
  createSolarSystemControllerAdapter,
} from './controllerAdapter';
export type {
  SceneControllerListener,
  SceneControllerState,
  SolarSystemApplicationSource,
  SolarSystemUIApplication,
  SolarSystemUIController,
} from './controllerAdapter';

import { mountSolarSystemUI, type SolarSystemUI } from './SolarSystemUI';

/**
 * Optional browser auto-entry. An integration shell can add
 * `data-solar-system-ui` to the module script and receive a fully mounted UI
 * without changing the scene/controller bootstrap.
 */
export function autoMountSolarSystemUI(): SolarSystemUI | undefined {
  if (typeof document === 'undefined' || !document.querySelector('script[data-solar-system-ui]')) {
    return undefined;
  }
  return mountSolarSystemUI();
}

export const solarSystemUI: SolarSystemUI | undefined = autoMountSolarSystemUI();
