import { Vector3 } from 'three';
import type { CelestialBodyData } from '../types/astronomy';
import type { SolarSystemUIController } from './controllerAdapter';

interface LabelEntry {
  readonly body: CelestialBodyData;
  readonly element: HTMLDivElement;
}

/** Screen-aligned HTML labels that follow the scene's data-driven body nodes. */
export class CelestialLabels {
  private readonly controller: SolarSystemUIController;
  private readonly layer: HTMLDivElement;
  private readonly entries = new Map<string, LabelEntry>();
  private readonly projectedPosition = new Vector3();
  private visible = true;
  private disposed = false;

  constructor(controller: SolarSystemUIController, layer: HTMLDivElement) {
    this.controller = controller;
    this.layer = layer;
    this.layer.classList.add('solar-label-layer');

    for (const bodyId of controller.getBodyIds()) {
      const body = controller.getBodyData(bodyId);
      if (!body) {
        continue;
      }
      const element = document.createElement('div');
      element.className = `solar-label solar-label--${body.type}`;
      element.dataset.bodyId = body.id;
      element.setAttribute('aria-hidden', 'true');

      const primary = document.createElement('span');
      primary.className = 'solar-label__primary';
      primary.textContent = body.nameKo;
      const secondary = document.createElement('span');
      secondary.className = 'solar-label__secondary';
      secondary.textContent = body.nameEn;
      element.append(primary, secondary);
      this.layer.append(element);
      this.entries.set(body.id, { body, element });
    }
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.layer.hidden = !visible;
  }

  update(): void {
    if (this.disposed || !this.visible) {
      return;
    }

    const state = this.controller.getState();
    const selectedBody = state.selectedBodyId
      ? this.controller.getBodyData(state.selectedBodyId)
      : undefined;
    const selectedSystemId = selectedBody?.type === 'moon'
      ? selectedBody.parentId
      : selectedBody?.type === 'star'
        ? undefined
        : selectedBody?.id;
    const rect = this.controller.renderer.domElement.getBoundingClientRect();
    const width = rect.width || this.controller.renderer.domElement.clientWidth;
    const height = rect.height || this.controller.renderer.domElement.clientHeight;

    for (const entry of this.entries.values()) {
      const isMoon = entry.body.type === 'moon';
      const isSelectedSystemMoon = isMoon && entry.body.parentId === selectedSystemId;
      const shouldShow = !isMoon || isSelectedSystemMoon;
      if (!shouldShow || width <= 0 || height <= 0) {
        entry.element.hidden = true;
        continue;
      }

      const worldPosition = this.controller.getBodyWorldPosition(entry.body.id, this.projectedPosition);
      if (!worldPosition) {
        entry.element.hidden = true;
        continue;
      }
      this.projectedPosition.project(this.controller.camera);
      const x = (this.projectedPosition.x * 0.5 + 0.5) * width;
      const y = (-this.projectedPosition.y * 0.5 + 0.5) * height;
      const inFrontOfCamera = this.projectedPosition.z >= -1 && this.projectedPosition.z <= 1;
      const visibleInViewport = x >= -48 && x <= width + 48 && y >= -32 && y <= height + 32;
      if (!inFrontOfCamera || !visibleInViewport) {
        entry.element.hidden = true;
        continue;
      }

      entry.element.hidden = false;
      entry.element.classList.toggle('is-selected', entry.body.id === state.selectedBodyId);
      entry.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      entry.element.style.opacity = isSelectedSystemMoon ? '1' : '0.86';
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.entries.clear();
    this.layer.replaceChildren();
  }
}
