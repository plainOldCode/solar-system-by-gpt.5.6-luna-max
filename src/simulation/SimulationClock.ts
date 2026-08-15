export interface SimulationClockOptions {
  readonly initialTimeScaleDaysPerSecond?: number;
  readonly initialElapsedDays?: number;
  readonly initiallyPlaying?: boolean;
}

export interface SimulationClockState {
  readonly elapsedSimulationDays: number;
  readonly timeScaleDaysPerSecond: number;
  readonly isPlaying: boolean;
}

export type SimulationClockListener = (state: SimulationClockState) => void;

/**
 * Converts wall-clock seconds into simulation days without tying orbital motion
 * to the number of rendered frames. The scene can therefore be stepped in a
 * deterministic way in tests and remains stable when the frame rate changes.
 */
export class SimulationClock {
  static readonly DEFAULT_TIME_SCALE_DAYS_PER_SECOND = 365.25;

  private elapsedSimulationDays: number;
  private timeScaleDaysPerSecond: number;
  private isPlaying: boolean;
  private readonly listeners = new Set<SimulationClockListener>();

  constructor(options: SimulationClockOptions = {}) {
    this.elapsedSimulationDays = options.initialElapsedDays ?? 0;
    this.timeScaleDaysPerSecond = options.initialTimeScaleDaysPerSecond
      ?? SimulationClock.DEFAULT_TIME_SCALE_DAYS_PER_SECOND;
    this.isPlaying = options.initiallyPlaying ?? true;

    this.assertElapsedDays(this.elapsedSimulationDays);
    this.assertTimeScale(this.timeScaleDaysPerSecond);
  }

  advance(realDeltaSeconds: number): number {
    if (!Number.isFinite(realDeltaSeconds) || realDeltaSeconds < 0) {
      throw new RangeError('realDeltaSeconds must be a finite non-negative number');
    }

    if (!this.isPlaying || realDeltaSeconds === 0) {
      return 0;
    }

    // A suspended tab can report a very large delta after it resumes. Capping
    // one step avoids teleporting the camera or overflowing a browser tab while
    // still allowing normal frame-rate variation to pass through unchanged.
    const boundedDeltaSeconds = Math.min(realDeltaSeconds, 1);
    const deltaDays = boundedDeltaSeconds * this.timeScaleDaysPerSecond;
    this.elapsedSimulationDays += deltaDays;
    return deltaDays;
  }

  play(): void {
    if (this.isPlaying) {
      return;
    }
    this.isPlaying = true;
    this.notify();
  }

  pause(): void {
    if (!this.isPlaying) {
      return;
    }
    this.isPlaying = false;
    this.notify();
  }

  toggle(): boolean {
    this.isPlaying = !this.isPlaying;
    this.notify();
    return this.isPlaying;
  }

  reset(): void {
    this.elapsedSimulationDays = 0;
    this.notify();
  }

  setElapsedSimulationDays(elapsedSimulationDays: number): void {
    this.assertElapsedDays(elapsedSimulationDays);
    this.elapsedSimulationDays = elapsedSimulationDays;
    this.notify();
  }

  setTimeScaleDaysPerSecond(timeScaleDaysPerSecond: number): void {
    this.assertTimeScale(timeScaleDaysPerSecond);
    this.timeScaleDaysPerSecond = timeScaleDaysPerSecond;
    this.notify();
  }

  getElapsedSimulationDays(): number {
    return this.elapsedSimulationDays;
  }

  getTimeScaleDaysPerSecond(): number {
    return this.timeScaleDaysPerSecond;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getState(): SimulationClockState {
    return {
      elapsedSimulationDays: this.elapsedSimulationDays,
      timeScaleDaysPerSecond: this.timeScaleDaysPerSecond,
      isPlaying: this.isPlaying,
    };
  }

  subscribe(listener: SimulationClockListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  private assertElapsedDays(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError('initialElapsedDays must be a finite non-negative number');
    }
  }

  private assertTimeScale(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError('timeScaleDaysPerSecond must be a finite positive number');
    }
  }
}

export const SIMULATION_TIME_PRESETS = [
  { label: '1 day / second', daysPerSecond: 1 },
  { label: '10 days / second', daysPerSecond: 10 },
  { label: '100 days / second', daysPerSecond: 100 },
  { label: '1 year / second', daysPerSecond: 365.25 },
] as const;
