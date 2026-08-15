import {
  ACESFilmicToneMapping,
  Color,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';

export interface CameraControlsAdapter {
  readonly target: Vector3;
  update(): boolean | void;
}

export interface RendererEnvironmentOptions {
  readonly fieldOfViewDeg?: number;
  readonly nearClip?: number;
  readonly farClip?: number;
  readonly maxPixelRatio?: number;
  readonly initialCameraPosition?: Vector3;
}

/** Owns the browser renderer, camera, and resize lifecycle for a scene. */
export class RendererEnvironment {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  readonly canvas: HTMLCanvasElement;

  private readonly container: HTMLElement;
  private readonly maxPixelRatio: number;
  private readonly resizeObserver?: ResizeObserver;
  private readonly resizeListener?: () => void;
  private disposed = false;

  constructor(container: HTMLElement, options: RendererEnvironmentOptions = {}) {
    this.container = container;
    this.maxPixelRatio = options.maxPixelRatio ?? 2;
    if (container.clientHeight === 0 && !container.style.minHeight) {
      container.style.minHeight = '560px';
    }

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(
      options.fieldOfViewDeg ?? 42,
      1,
      options.nearClip ?? 0.1,
      options.farClip ?? 1_200,
    );
    this.camera.position.copy(options.initialCameraPosition ?? new Vector3(0, 148, 252));
    this.camera.lookAt(0, 0, 0);

    this.renderer = new WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(this.getPixelRatio());
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setClearColor(new Color(0x02040c), 1);
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'solar-system-canvas';
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.minHeight = '560px';
    this.canvas.style.touchAction = 'none';
    container.appendChild(this.canvas);

    this.resize();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(container);
    } else if (typeof window !== 'undefined') {
      this.resizeListener = () => this.resize();
      window.addEventListener('resize', this.resizeListener);
    }
  }

  resize(): void {
    if (this.disposed) {
      return;
    }
    const bounds = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width || this.container.clientWidth || 960));
    const height = Math.max(1, Math.round(bounds.height || this.container.clientHeight || 560));
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.getPixelRatio());
    this.renderer.setSize(width, height, false);
  }

  render(): void {
    if (!this.disposed) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.resizeObserver?.disconnect();
    if (this.resizeListener && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeListener);
    }
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }

  private getPixelRatio(): number {
    const devicePixelRatio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    return Math.min(devicePixelRatio, this.maxPixelRatio);
  }
}
