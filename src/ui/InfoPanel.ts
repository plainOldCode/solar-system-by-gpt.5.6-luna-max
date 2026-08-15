import type { CelestialBodyData, RenderedBodyMetrics } from '../types/astronomy';
import type { SceneControllerState, SolarSystemUIController } from './controllerAdapter';

export interface InfoPanelOptions {
  readonly onResetView: () => void;
}

/** Detail view that keeps physical data and render-space values visibly separate. */
export class InfoPanel {
  readonly element: HTMLElement;

  private readonly controller: SolarSystemUIController;
  private readonly onResetView: () => void;
  private readonly titleElement: HTMLElement;
  private readonly typeElement: HTMLElement;
  private readonly descriptionElement: HTMLElement;
  private readonly realValuesElement: HTMLElement;
  private readonly renderedValuesElement: HTMLElement;
  private readonly moonsElement: HTMLElement;
  private readonly emptyElement: HTMLElement;
  private readonly resetButton: HTMLButtonElement;
  private disposed = false;

  constructor(
    controller: SolarSystemUIController,
    options: InfoPanelOptions,
  ) {
    this.controller = controller;
    this.onResetView = options.onResetView;
    this.element = document.createElement('aside');
    this.element.className = 'info-panel panel-surface';
    this.element.setAttribute('aria-labelledby', 'info-panel-title');

    const heading = document.createElement('div');
    heading.className = 'panel-heading';
    const headingText = document.createElement('div');
    headingText.className = 'panel-heading__text';
    const eyebrow = document.createElement('p');
    eyebrow.className = 'panel-eyebrow';
    eyebrow.textContent = 'OBJECT INSPECTOR';
    this.titleElement = document.createElement('h2');
    this.titleElement.id = 'info-panel-title';
    this.titleElement.className = 'panel-title';
    this.typeElement = document.createElement('span');
    this.typeElement.className = 'object-type';
    headingText.append(eyebrow, this.titleElement, this.typeElement);
    this.resetButton = document.createElement('button');
    this.resetButton.className = 'icon-button';
    this.resetButton.type = 'button';
    this.resetButton.title = 'Return to the complete Solar System view';
    this.resetButton.setAttribute('aria-label', 'Return to the complete Solar System view');
    this.resetButton.textContent = '×';
    this.resetButton.addEventListener('click', () => this.onResetView());
    heading.append(headingText, this.resetButton);

    this.emptyElement = document.createElement('p');
    this.emptyElement.className = 'info-panel__empty';
    this.emptyElement.textContent = 'Select a celestial body to inspect its real data and rendered values.';

    this.descriptionElement = document.createElement('p');
    this.descriptionElement.className = 'info-panel__description';

    this.realValuesElement = this.createSection('REAL ASTRONOMICAL DATA', 'info-panel__real');
    this.renderedValuesElement = this.createSection('CURRENT RENDERED VIEW', 'info-panel__rendered');
    this.moonsElement = this.createSection('MAJOR MOONS IN THIS SYSTEM', 'info-panel__moons');

    this.element.append(
      heading,
      this.emptyElement,
      this.descriptionElement,
      this.realValuesElement,
      this.renderedValuesElement,
      this.moonsElement,
    );
    this.update(this.controller.getState());
  }

  update(state: SceneControllerState): void {
    if (this.disposed) {
      return;
    }
    const body = state.selectedBodyId
      ? this.controller.getBodyData(state.selectedBodyId)
      : undefined;
    if (!body) {
      this.element.classList.add('is-empty');
      this.emptyElement.hidden = false;
      this.titleElement.textContent = 'No body selected';
      this.typeElement.textContent = 'Click a planet, moon, or the Sun';
      this.descriptionElement.hidden = true;
      this.realValuesElement.hidden = true;
      this.renderedValuesElement.hidden = true;
      this.moonsElement.hidden = true;
      this.resetButton.hidden = true;
      return;
    }

    const metrics = this.controller.getRenderedBodyMetrics(body.id);
    if (!metrics) {
      return;
    }
    this.element.classList.remove('is-empty');
    this.emptyElement.hidden = true;
    this.titleElement.textContent = `${body.nameKo} · ${body.nameEn}`;
    this.typeElement.textContent = bodyTypeLabel(body);
    this.descriptionElement.hidden = false;
    this.descriptionElement.textContent = body.description;
    this.realValuesElement.hidden = false;
    this.renderedValuesElement.hidden = false;
    this.moonsElement.hidden = false;
    this.resetButton.hidden = false;

    this.replaceRows(this.realValuesElement, [
      ['Actual radius', `${formatNumber(body.radiusKm)} km`],
      ['Mean distance', formatActualDistance(this.controller, body)],
      ['Orbital period', formatOptionalDays(body.orbitalPeriodDays)],
      ['Rotation period', formatOptionalHours(body.rotationPeriodHours)],
      ['Orbital eccentricity', formatOptional(body.eccentricity, 4)],
      ['Orbital inclination', formatOptionalDegrees(body.inclinationDeg)],
    ]);
    this.replaceRows(this.renderedValuesElement, [
      ['Rendered orbital radius', formatRenderedDistance(metrics)],
      ['Distance representation', distanceScaleLabel(metrics.distanceMode)],
      ['Rendered body radius', `${formatNumber(metrics.bodyRadius, 2)} units`],
      ['Size representation', sizeScaleLabel(metrics.sizeMode)],
      ['Simulation elapsed', `${formatNumber(state.elapsedSimulationDays, 1)} days`],
    ]);

    const systemId = body.type === 'moon' ? body.parentId : body.id;
    const moonIds = systemId ? this.controller.getMoonIds(systemId) : [];
    this.replaceMoonList(this.moonsElement, moonIds, body);
  }

  dispose(): void {
    this.disposed = true;
    this.element.remove();
  }

  private createSection(title: string, className: string): HTMLElement {
    const section = document.createElement('section');
    section.className = `info-section ${className}`;
    const heading = document.createElement('h3');
    heading.textContent = title;
    section.append(heading);
    return section;
  }

  private replaceRows(section: HTMLElement, rows: readonly [string, string][]): void {
    const heading = section.querySelector('h3');
    section.replaceChildren(heading ?? document.createElement('h3'));
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.className = 'info-row';
      const labelElement = document.createElement('dt');
      labelElement.textContent = label;
      const valueElement = document.createElement('dd');
      valueElement.textContent = value;
      row.append(labelElement, valueElement);
      section.append(row);
    }
  }

  private replaceMoonList(section: HTMLElement, moonIds: readonly string[], selectedBody: CelestialBodyData): void {
    const heading = section.querySelector('h3');
    section.replaceChildren(heading ?? document.createElement('h3'));
    if (moonIds.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'info-section__muted';
      empty.textContent = selectedBody.type === 'moon' ? 'No moon list is defined for this parent system.' : 'No major moons in the bundled dataset.';
      section.append(empty);
      return;
    }
    const list = document.createElement('ul');
    list.className = 'moon-list';
    for (const moonId of moonIds) {
      const moon = this.controller.getBodyData(moonId);
      if (!moon) {
        continue;
      }
      const item = document.createElement('li');
      item.innerHTML = `<span>${moon.nameKo}</span><span>${moon.nameEn}</span>`;
      item.dataset.bodyId = moon.id;
      item.title = `Focus ${moon.nameEn}`;
      item.addEventListener('click', () => this.controller.focusBody(moon.id));
      list.append(item);
    }
    section.append(list);
  }
}

function bodyTypeLabel(body: CelestialBodyData): string {
  switch (body.type) {
    case 'star':
      return 'Star · 별';
    case 'planet':
      return 'Planet · 행성';
    case 'dwarf-planet':
      return 'Dwarf planet · 왜행성';
    case 'moon':
      return 'Moon · 위성';
    default:
      return body.type;
  }
}

function formatActualDistance(controller: SolarSystemUIController, body: CelestialBodyData): string {
  if (body.semiMajorAxis === undefined || body.semiMajorAxisUnit === undefined) {
    return 'Reference origin';
  }
  if (body.semiMajorAxisUnit === 'AU') {
    return `${formatNumber(body.semiMajorAxis, 3)} AU from the Sun`;
  }
  const parentName = body.parentId
    ? controller.getBodyData(body.parentId)?.nameEn ?? 'parent body'
    : 'parent body';
  return `${formatNumber(body.semiMajorAxis)} km from ${parentName}`;
}

function formatRenderedDistance(metrics: RenderedBodyMetrics): string {
  return metrics.orbitalRadius > 0
    ? `${formatNumber(metrics.orbitalRadius, 2)} units`
    : 'Reference origin';
}

function formatOptional(value: number | undefined, fractionDigits: number): string {
  return value === undefined ? 'Not available' : formatNumber(value, fractionDigits);
}

function formatOptionalDays(value: number | undefined): string {
  return value === undefined ? 'Not available' : `${formatNumber(value, 3)} days`;
}

function formatOptionalHours(value: number | undefined): string {
  return value === undefined ? 'Not available' : `${formatNumber(value, 3)} hours`;
}

function formatOptionalDegrees(value: number | undefined): string {
  return value === undefined ? 'Not available' : `${formatNumber(value, 3)}°`;
}

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

function distanceScaleLabel(mode: RenderedBodyMetrics['distanceMode']): string {
  switch (mode) {
    case 'log':
      return 'Log Scale · logarithmic';
    case 'linear':
      return 'Linear Scale · comparison';
    case 'focus':
      return 'Focus Scale · local system';
    default:
      return mode;
  }
}

function sizeScaleLabel(mode: RenderedBodyMetrics['sizeMode']): string {
  switch (mode) {
    case 'enhanced-visibility':
      return 'Enhanced Visibility';
    case 'relative-size':
      return 'Relative Size';
    case 'uniform-markers':
      return 'Uniform Markers';
    default:
      return mode;
  }
}
