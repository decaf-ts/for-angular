import { Component, ElementRef, OnDestroy, effect, inject, input, signal, viewChild } from "@angular/core";
import { GenuiAssetLoaderService } from "../../genui-asset-loader.service";
import { GenuiI18nService } from "../../i18n/genui-i18n";
import { GENUI_LIMITS } from "../../limits";
import type { GenuiMesh, GenuiNode } from "../../types";

interface ThreeApi {
  Scene: new () => {
    background: unknown;
    add(object: unknown): void;
  };
  PerspectiveCamera: new (fov: number, aspect: number, near: number, far: number) => {
    position: { z: number; set(x: number, y: number, z: number): void };
    lookAt(x: number, y: number, z: number): void;
  };
  WebGLRenderer: new (options: { antialias: boolean; alpha: boolean }) => {
    setSize(width: number, height: number): void;
    render(scene: unknown, camera: unknown): void;
    dispose(): void;
    domElement: HTMLCanvasElement;
  };
  Color: new (value: string | number) => unknown;
  AmbientLight: new (color: number, intensity: number) => unknown;
  DirectionalLight: new (color: number, intensity: number) => { position: { set(x: number, y: number, z: number): void } };
  BoxGeometry: new (w: number, h: number, d: number) => unknown;
  SphereGeometry: new (radius: number, width: number, height: number) => unknown;
  ConeGeometry: new (radius: number, height: number, segments: number) => unknown;
  CylinderGeometry: new (rt: number, rb: number, h: number, segments: number) => unknown;
  TorusGeometry: new (radius: number, tube: number, radial: number, tubular: number) => unknown;
  MeshStandardMaterial: new (options: { color: number }) => unknown;
  Mesh: new (geometry: unknown, material: unknown) => {
    position: { set(x: number, y: number, z: number): void };
    rotation: { set(x: number, y: number, z: number): void };
    scale: { set(x: number, y: number, z: number): void };
  };
}

/**
 * @description Renders a simple 3D scene through the lazily loaded Three.js engine
 * @summary Builds meshes, lights, and a camera from the node definition, capped
 * by {@link GENUI_LIMITS.maxMeshes}, renders one frame, and disposes the
 * renderer on destroy. Failures render a localized message.
 * @class GenuiScene3dComponent
 */
@Component({
  selector: "ngx-decaf-genui-scene3d",
  template: `
    @if (failed()) {
      <p class="genui-empty">{{ failureText }}</p>
    } @else {
      @if (title()) { <figcaption class="genui-scene__title">{{ title() }}</figcaption> }
      <div #host class="genui-scene" role="img" [attr.aria-label]="title() ?? '3D scene'"></div>
    }
  `,
  styles: [
    `
      .genui-scene { width: 100%; height: 280px; }
      .genui-scene canvas { width: 100%; height: 100%; display: block; }
    `,
  ],
  standalone: true,
})
export class GenuiScene3dComponent implements OnDestroy {
  private readonly assets = inject(GenuiAssetLoaderService);
  private readonly i18n = inject(GenuiI18nService);

  /** @description Scene node with meshes and lighting. */
  readonly node = input.required<GenuiNode>();
  /** @description Host element that receives the canvas. */
  readonly host = viewChild<ElementRef<HTMLDivElement>>("host");
  /** @description Whether the last render attempt failed. */
  readonly failed = signal(false);
  /** @description Localized failure message. */
  readonly failureText = this.i18n.t("scene3d.failed");

  private renderer: { dispose(): void } | null = null;

  readonly title = () => (this.node() as unknown as { title?: string }).title;

  constructor() {
    effect(() => {
      const element = this.host()?.nativeElement;
      const node = this.node();
      if (element === undefined) return;
      void this.render(element, node);
    });
  }

  private scaleTuple(value: number | [number, number, number] | undefined): [number, number, number] {
    if (value === undefined) return [1, 1, 1];
    return typeof value === "number" ? [value, value, value] : value;
  }

  private async render(element: HTMLElement, node: GenuiNode): Promise<void> {
    try {
      const three = (await this.assets.load("three")) as ThreeApi;
      const raw = node as unknown as { meshes?: GenuiMesh[]; ambient?: number; background?: string };
      const width = Math.max(1, element.clientWidth || 320);
      const height = Math.max(1, element.clientHeight || 280);
      const scene = new three.Scene();
      if (typeof raw.background === "string") {
        scene.background = new three.Color(raw.background);
      }
      const camera = new three.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 0, 6);
      camera.lookAt(0, 0, 0);
      const renderer = new three.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      element.replaceChildren(renderer.domElement);
      this.renderer = renderer;
      scene.add(new three.AmbientLight(0xffffff, Math.min(2, Math.max(0, raw.ambient ?? 0.8))));
      const light = new three.DirectionalLight(0xffffff, 1.1);
      light.position.set(3, 4, 6);
      scene.add(light);
      (raw.meshes ?? []).slice(0, GENUI_LIMITS.maxMeshes).forEach((mesh, index) => {
        const size = this.scaleTuple(mesh.size ?? 1);
        const geometry =
          mesh.shape === "sphere"
            ? new three.SphereGeometry(size[0], 24, 16)
            : mesh.shape === "cone"
              ? new three.ConeGeometry(size[0], size[1], 24)
              : mesh.shape === "cylinder"
                ? new three.CylinderGeometry(size[0], size[0], size[1], 24)
                : mesh.shape === "torus"
                  ? new three.TorusGeometry(size[0], Math.max(0.1, size[1] / 4), 16, 48)
                  : new three.BoxGeometry(size[0], size[1], size[2]);
        const material = new three.MeshStandardMaterial({ color: 0x6c8cff });
        const instance = new three.Mesh(geometry, material);
        const position = mesh.position ?? [index * 1.6 - ((raw.meshes?.length ?? 1) - 1) * 0.8, 0, 0];
        instance.position.set(position[0], position[1], position[2]);
        const rotation = mesh.rotation ?? [0, 0, 0];
        instance.rotation.set(rotation[0], rotation[1], rotation[2]);
        const scale = this.scaleTuple(mesh.scale ?? 1);
        instance.scale.set(scale[0], scale[1], scale[2]);
        scene.add(instance);
      });
      renderer.render(scene, camera);
      this.failed.set(false);
    } catch {
      this.failed.set(true);
    }
  }

  ngOnDestroy(): void {
    this.renderer?.dispose();
    this.renderer = null;
  }
}
