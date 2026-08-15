import { SIMULATION_TIME_PRESETS } from '../simulation/SimulationClock';
import type {
  DistanceScaleMode,
  SizeScaleMode,
} from '../types/astronomy';
import type { SceneControllerState } from './controllerAdapter';

const SIMULATION_DAYS_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export interface ControlPanelCallbacks {
  readonly onPlay: () => void;
  readonly onPause: () => void;
  readonly onResetSimulation: () => void;
  readonly onResetView: () => void;
  readonly onTimeScale: (daysPerSecond: number) => void;
  readonly onDistanceScale: (mode: DistanceScaleMode) => void;
  readonly onSizeScale: (mode: SizeScaleMode) => void;
  readonly onOrbitVisibility: (visible: boolean) => void;
  readonly onLabelsVisibility: (visible: boolean) => void;
  readonly onMoonVisibility: (visible: boolean) => void;
  readonly onMoonOrbitVisibility: (visible: boolean) => void;
  readonly onStarFieldVisibility: (visible: boolean) => void;
}

/** Compact simulation and display controls for the scene overlay. */
export class ControlPanel {
  readonly element: HTMLElement;

  private readonly callbacks: ControlPanelCallbacks;
  private readonly playButton: HTMLButtonElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly elapsedElement: HTMLElement;
  private readonly timeScaleSelect: HTMLSelectElement;
  private readonly distanceScaleSelect: HTMLSelectElement;
  private readonly sizeScaleSelect: HTMLSelectElement;
  private readonly orbitToggle: HTMLInputElement;
  private readonly labelToggle: HTMLInputElement;
  private readonly moonToggle: HTMLInputElement;
  private readonly moonOrbitToggle: HTMLInputElement;
  private readonly starToggle: HTMLInputElement;
  private disposed = false;

  constructor(callbacks: ControlPanelCallbacks) {
    this.callbacks = callbacks;
    this.element = document.createElement('section');
    this.element.className = 'control-panel panel-surface';
    this.element.setAttribute('aria-labelledby', 'control-panel-title');

    const heading = document.createElement('div');
    heading.className = 'panel-heading panel-heading--compact';
    const headingText = document.createElement('div');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'panel-eyebrow';
    eyebrow.textContent = 'NAVIGATION + SIMULATION';
    const title = document.createElement('h2');
    title.id = 'control-panel-title';
    title.className = 'panel-title';
    title.textContent = 'Control panel';
    headingText.append(eyebrow, title);
    heading.append(headingText);

    const viewActions = document.createElement('div');
    viewActions.className = 'control-group control-group--actions';
    viewActions.append(
      this.createButton('Complete view', 'secondary-button', callbacks.onResetView),
      this.createButton('Reset time', 'secondary-button', callbacks.onResetSimulation),
    );

    const playback = document.createElement('div');
    playback.className = 'control-group control-group--playback';
    this.playButton = this.createButton('Play', 'primary-button', callbacks.onPlay);
    this.pauseButton = this.createButton('Pause', 'secondary-button', callbacks.onPause);
    this.elapsedElement = document.createElement('output');
    this.elapsedElement.className = 'simulation-readout';
    this.elapsedElement.setAttribute('aria-live', 'polite');
    playback.append(this.playButton, this.pauseButton, this.elapsedElement);

    this.timeScaleSelect = this.createSelect('Time scale', SIMULATION_TIME_PRESETS.map((preset) => ({
      value: String(preset.daysPerSecond),
      label: preset.label,
    })), (value) => callbacks.onTimeScale(Number(value)));
    this.distanceScaleSelect = this.createSelect('Distance scale', [
      { value: 'log', label: 'Log Scale (default)' },
      { value: 'linear', label: 'Linear Scale' },
      { value: 'focus', label: 'Focus Scale' },
    ], (value) => callbacks.onDistanceScale(value as DistanceScaleMode));
    this.sizeScaleSelect = this.createSelect('Body size', [
      { value: 'enhanced-visibility', label: 'Enhanced Visibility (default)' },
      { value: 'relative-size', label: 'Relative Size' },
      { value: 'uniform-markers', label: 'Uniform Markers' },
    ], (value) => callbacks.onSizeScale(value as SizeScaleMode));

    const toggles = document.createElement('div');
    toggles.className = 'control-group control-group--toggles';
    this.orbitToggle = this.createToggle('Orbit lines', true, callbacks.onOrbitVisibility);
    this.labelToggle = this.createToggle('Labels', true, callbacks.onLabelsVisibility);
    this.moonToggle = this.createToggle('Moons', true, callbacks.onMoonVisibility);
    this.moonOrbitToggle = this.createToggle('Moon orbits', false, callbacks.onMoonOrbitVisibility);
    this.starToggle = this.createToggle('Star field', true, callbacks.onStarFieldVisibility);
    toggles.append(
      this.orbitToggle.parentElement!,
      this.labelToggle.parentElement!,
      this.moonToggle.parentElement!,
      this.moonOrbitToggle.parentElement!,
      this.starToggle.parentElement!,
    );

    this.element.append(
      heading,
      viewActions,
      playback,
      this.createFieldset('Simulation speed', this.timeScaleSelect),
      this.createFieldset('Distance representation', this.distanceScaleSelect),
      this.createFieldset('Body-size representation', this.sizeScaleSelect),
      toggles,
    );
  }

  update(state: SceneControllerState, labelsVisible: boolean): void {
    if (this.disposed) {
      return;
    }
    this.updateSimulation(state);
    this.distanceScaleSelect.value = state.distanceScaleMode;
    this.sizeScaleSelect.value = state.sizeScaleMode;
    this.orbitToggle.checked = state.orbitVisibility;
    this.labelToggle.checked = labelsVisible;
    this.moonToggle.checked = state.moonVisibility;
    this.moonOrbitToggle.checked = state.moonOrbitVisibility;
    this.starToggle.checked = state.starFieldVisibility;
  }

  /** Keep time readouts live even though the scene controller emits on commands, not every frame. */
  updateSimulation(state: SceneControllerState): void {
    if (this.disposed) {
      return;
    }
    this.playButton.classList.toggle('is-active', state.isPlaying);
    this.pauseButton.classList.toggle('is-active', !state.isPlaying);
    this.playButton.setAttribute('aria-pressed', String(state.isPlaying));
    this.pauseButton.setAttribute('aria-pressed', String(!state.isPlaying));
    this.elapsedElement.textContent = `${SIMULATION_DAYS_FORMATTER.format(state.elapsedSimulationDays)} simulation days`;
    selectValue(this.timeScaleSelect, String(state.timeScaleDaysPerSecond));
  }

  dispose(): void {
    this.disposed = true;
    this.element.remove();
  }

  private createButton(
    label: string,
    className: string,
    onClick: () => void,
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  private createFieldset(label: string, control: HTMLSelectElement): HTMLElement {
    const fieldset = document.createElement('label');
    fieldset.className = 'control-field';
    const labelElement = document.createElement('span');
    labelElement.textContent = label;
    fieldset.append(labelElement, control);
    return fieldset;
  }

  private createSelect(
    label: string,
    options: readonly { value: string; label: string }[],
    onChange: (value: string) => void,
  ): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'control-select';
    select.setAttribute('aria-label', label);
    for (const option of options) {
      const element = document.createElement('option');
      element.value = option.value;
      element.textContent = option.label;
      select.append(element);
    }
    select.addEventListener('change', () => onChange(select.value));
    return select;
  }

  private createToggle(
    label: string,
    checked: boolean,
    onChange: (visible: boolean) => void,
  ): HTMLInputElement {
    const wrapper = document.createElement('label');
    wrapper.className = 'toggle-control';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));
    const text = document.createElement('span');
    text.textContent = label;
    wrapper.append(input, text);
    return input;
  }
}

function selectValue(select: HTMLSelectElement, value: string): void {
  const option = Array.from(select.options).find((candidate) => candidate.value === value);
  if (option) {
    select.value = value;
  }
}
