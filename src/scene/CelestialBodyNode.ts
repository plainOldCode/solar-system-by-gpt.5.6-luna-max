import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  SphereGeometry,
} from 'three';
import type { CelestialBodyData } from '../types/astronomy';
import {
  createBodyMaterial,
  createRingMaterial,
  createSelectionMaterial,
} from '../rendering/proceduralMaterials';

/** The scene graph unit for one physical data record. */
export class CelestialBodyNode {
  readonly data: CelestialBodyData;
  readonly group = new Group();
  readonly visualGroup = new Group();
  readonly moonSystemGroup = new Group();
  readonly bodyMesh: Mesh<SphereGeometry, MeshStandardMaterial>;
  readonly selectionHalo: Mesh<SphereGeometry, MeshBasicMaterial>;

  private renderedRadius: number;

  constructor(data: CelestialBodyData, renderedRadius: number) {
    this.data = data;
    this.renderedRadius = renderedRadius;
    this.group.name = `${data.id}-body-group`;
    this.group.userData.celestialBodyId = data.id;
    this.visualGroup.name = `${data.id}-visual-group`;
    this.moonSystemGroup.name = `${data.id}-moon-system`;

    const bodyGeometry = new SphereGeometry(1, data.type === 'moon' ? 16 : 28, data.type === 'moon' ? 12 : 20);
    this.bodyMesh = new Mesh(bodyGeometry, createBodyMaterial(data));
    this.bodyMesh.name = `${data.id}-body-mesh`;
    this.bodyMesh.userData.celestialBodyId = data.id;
    this.bodyMesh.castShadow = false;
    this.bodyMesh.receiveShadow = false;
    this.visualGroup.add(this.bodyMesh);

    const haloGeometry = new SphereGeometry(1, 20, 12);
    this.selectionHalo = new Mesh(haloGeometry, createSelectionMaterial(new Color(data.displayColor).getHex()));
    this.selectionHalo.name = `${data.id}-selection-halo`;
    this.selectionHalo.visible = false;
    this.visualGroup.add(this.selectionHalo);

    if (data.nameEn === 'Saturn' || data.nameEn === 'Uranus') {
      const ringGeometry = data.nameEn === 'Saturn'
        ? new RingGeometry(1.34, 2.72, 96, 5)
        : new RingGeometry(1.34, 2.25, 80, 4);
      const ringMaterial = createRingMaterial(
        data.nameEn === 'Saturn' ? '#d9c28d' : '#7fa8b2',
        data.nameEn === 'Saturn' ? 0.74 : 0.34,
      );
      const rings = new Mesh(ringGeometry, ringMaterial);
      rings.name = `${data.id}-rings`;
      rings.rotation.x = Math.PI / 2;
      rings.rotation.z = data.nameEn === 'Uranus' ? Math.PI / 2.6 : 0.1;
      this.visualGroup.add(rings);
    }

    this.group.add(this.visualGroup, this.moonSystemGroup);
    this.setRenderedRadius(renderedRadius);
  }

  setRenderedRadius(renderedRadius: number): void {
    this.renderedRadius = renderedRadius;
    this.bodyMesh.scale.setScalar(renderedRadius);
    this.selectionHalo.scale.setScalar(renderedRadius * 1.28);
    for (const child of this.visualGroup.children) {
      if (child !== this.bodyMesh && child !== this.selectionHalo && child instanceof Mesh) {
        child.scale.setScalar(renderedRadius);
      }
    }
  }

  getRenderedRadius(): number {
    return this.renderedRadius;
  }

  setSelected(selected: boolean): void {
    this.selectionHalo.visible = selected;
  }

  setMoonSystemScale(scale: number): void {
    this.moonSystemGroup.scale.setScalar(scale);
  }

  setRotationFromSimulationDays(elapsedDays: number): void {
    if (!this.data.rotationPeriodHours || this.data.rotationPeriodHours <= 0) {
      return;
    }
    const direction = this.data.rotationDirection === 'retrograde' ? -1 : 1;
    this.bodyMesh.rotation.y = direction * (elapsedDays * 24 / this.data.rotationPeriodHours) * Math.PI * 2;
  }
}
