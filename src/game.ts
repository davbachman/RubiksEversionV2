import {
  Color,
  DoubleSide,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { createElement, RefreshCcw, RotateCcw, RotateCw, Shuffle, Undo2 } from "lucide";
import {
  ActiveFace,
  CubeState,
  TurnDirection,
  activeFaceToAxis,
  createSolvedCube,
  getVisibleFacelets,
  rotateActiveFace,
  scrambleCube,
} from "./cube";
import {
  SnapOrientation,
  findNearestSnapOrientation,
  forwardAndUpFromQuaternion,
  getActiveFaceFromForward,
  quaternionFromForwardUp,
} from "./camera";
import { classifySwipeTurn, Point } from "./input";
import { computeInsideCubeFov } from "./viewport";

type IconNode = Parameters<typeof createElement>[0];

interface TurnAnimation {
  face: ActiveFace;
  direction: TurnDirection;
  elapsed: number;
  duration: number;
}

interface SnapAnimation {
  from: Quaternion;
  to: Quaternion;
  target: SnapOrientation;
  elapsed: number;
  duration: number;
}

interface StickerMesh {
  mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  color: string;
}

const FACE_DISTANCE = 1.58;
const STICKER_DISTANCE = 1.545;
const CELL_SPACING = 1;
const STICKER_SIZE = 0.86;
const WALL_SIZE = 3.22;
const SNAP_DELAY_MS = 140;
const SNAP_DURATION_MS = 260;
const TURN_DURATION_MS = 260;

const AXIS_VECTORS = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 1, 0),
  z: new Vector3(0, 0, 1),
} as const;

const FACE_LABELS: Record<ActiveFace, string> = {
  right: "Right",
  left: "Left",
  top: "Top",
  bottom: "Bottom",
  front: "Front",
  back: "Back",
};

function easeOutCubic(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return 1 - Math.pow(1 - clamped, 3);
}

function vectorFromGrid(position: { x: number; y: number; z: number }): Vector3 {
  return new Vector3(position.x, position.y, position.z);
}

function axisArray(vector: Vector3): [number, number, number] {
  return [Math.round(vector.x), Math.round(vector.y), Math.round(vector.z)];
}

function faceBasis(normal: Vector3): { right: Vector3; up: Vector3; quaternion: Quaternion } {
  const referenceUp = Math.abs(normal.y) > 0.9 ? new Vector3(0, 0, -normal.y) : new Vector3(0, 1, 0);
  const right = new Vector3().crossVectors(referenceUp, normal).normalize();
  const up = new Vector3().crossVectors(normal, right).normalize();
  const matrix = new Matrix4().makeBasis(right, up, normal);

  return {
    right,
    up,
    quaternion: new Quaternion().setFromRotationMatrix(matrix),
  };
}

function mountIcon(button: HTMLButtonElement, icon: IconNode): void {
  const svg = createElement(icon);
  svg.setAttribute("aria-hidden", "true");
  button.append(svg);
}

function button(label: string, action: string, icon: IconNode): HTMLButtonElement {
  const element = document.createElement("button");
  element.className = "tool-button";
  element.type = "button";
  element.dataset.action = action;
  element.title = label;
  element.setAttribute("aria-label", label);
  mountIcon(element, icon);
  return element;
}

export class RubiksEversionGame {
  private readonly root: HTMLElement;
  private readonly cube: CubeState;
  private readonly scene: Scene;
  private readonly camera: PerspectiveCamera;
  private readonly renderer: WebGLRenderer;
  private readonly canvas: HTMLCanvasElement;
  private readonly stickerGeometry: PlaneGeometry;
  private readonly stickerMeshes = new Map<string, StickerMesh>();
  private readonly moveCountElement: HTMLElement;
  private readonly faceElement: HTMLElement;
  private readonly buttons: HTMLButtonElement[] = [];
  private activeFace: ActiveFace = "front";
  private snapDelayRemaining = 0;
  private snapAnimation: SnapAnimation | null = null;
  private turnAnimation: TurnAnimation | null = null;
  private pointerStart: Point | null = null;
  private lastFrameTime = 0;
  private animationFrame = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    this.cube = createSolvedCube();
    this.scene = new Scene();
    this.scene.background = new Color("#111418");
    this.camera = new PerspectiveCamera(102, 1, 0.01, 50);
    this.camera.position.set(0, 0, 0);
    this.camera.quaternion.copy(
      quaternionFromForwardUp(new Vector3(0, 0, 1), new Vector3(0, 1, 0)),
    );

    const shell = document.createElement("div");
    shell.className = "app-shell";
    this.canvas = document.createElement("canvas");
    this.canvas.className = "game-canvas";
    this.canvas.setAttribute("aria-label", "Rubik's Eversion 3D play area");

    const topBar = document.createElement("header");
    topBar.className = "top-bar";
    topBar.innerHTML = `
      <div class="app-title">Rubik&rsquo;s Eversion</div>
      <div class="status-strip">
        <span class="status-face">Facing <strong data-face>Front</strong></span>
        <span class="status-moves"><strong data-moves>0</strong> moves</span>
      </div>
    `;

    const tools = document.createElement("nav");
    tools.className = "tool-strip";
    tools.setAttribute("aria-label", "Game controls");
    tools.append(
      button("Rotate viewed face counter-clockwise", "counterClockwise", RotateCcw),
      button("Rotate viewed face clockwise", "clockwise", RotateCw),
      button("Undo", "undo", Undo2),
      button("Scramble", "scramble", Shuffle),
      button("Reset", "reset", RefreshCcw),
    );
    this.buttons.push(...Array.from(tools.querySelectorAll("button")));
    topBar.append(tools);
    shell.append(this.canvas, topBar);
    this.root.replaceChildren(shell);

    const moves = topBar.querySelector<HTMLElement>("[data-moves]");
    const face = topBar.querySelector<HTMLElement>("[data-face]");
    if (!moves || !face) throw new Error("Game HUD failed to initialize");
    this.moveCountElement = moves;
    this.faceElement = face;

    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setClearColor("#111418", 1);
    this.stickerGeometry = new PlaneGeometry(STICKER_SIZE, STICKER_SIZE);

    this.createWalls();
    this.bindEvents();
    this.resize();
    this.render();
  }

  start(): void {
    this.lastFrameTime = performance.now();
    const tick = (timestamp: number) => {
      const delta = Math.min(50, timestamp - this.lastFrameTime);
      this.lastFrameTime = timestamp;
      this.update(delta);
      this.animationFrame = requestAnimationFrame(tick);
    };

    this.animationFrame = requestAnimationFrame(tick);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrame);
    this.renderer.dispose();
    this.stickerGeometry.dispose();
  }

  advanceTime(ms: number): void {
    const steps = Math.max(1, Math.ceil(ms / (1000 / 60)));
    const stepMs = ms / steps;

    for (let index = 0; index < steps; index += 1) {
      this.update(stepMs);
    }
  }

  renderGameToText(): string {
    const directions = forwardAndUpFromQuaternion(this.camera.quaternion);
    const cubies = this.cube.cubies.map((cubie) => ({
      id: cubie.id,
      p: [cubie.position.x, cubie.position.y, cubie.position.z],
      s: cubie.stickers.map((sticker) => [
        sticker.homeFace,
        sticker.normal.x,
        sticker.normal.y,
        sticker.normal.z,
      ]),
    }));

    return JSON.stringify({
      coordinateSystem:
        "Origin is the viewer at cube center. +X right, +Y top, +Z front. Camera forward points toward the viewed wall.",
      activeFace: this.activeFace,
      cameraForward: axisArray(directions.forward),
      cameraUp: axisArray(directions.up),
      moveCount: this.cube.moveCount,
      isAnimating: this.isAnimating(),
      lastMove: this.cube.lastMove,
      isSolved: this.cube.isSolved(),
      visibleFacelets: getVisibleFacelets(this.cube).length,
      cubies,
    });
  }

  private createWalls(): void {
    const wallGeometry = new PlaneGeometry(WALL_SIZE, WALL_SIZE);
    const wallMaterial = new MeshBasicMaterial({
      color: "#151515",
      side: DoubleSide,
    });
    const normals = [
      new Vector3(1, 0, 0),
      new Vector3(-1, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, -1, 0),
      new Vector3(0, 0, 1),
      new Vector3(0, 0, -1),
    ];

    for (const normal of normals) {
      const basis = faceBasis(normal);
      const wall = new Mesh(wallGeometry, wallMaterial);
      wall.position.copy(normal.clone().multiplyScalar(FACE_DISTANCE));
      wall.quaternion.copy(basis.quaternion);
      this.scene.add(wall);
    }
  }

  private bindEvents(): void {
    window.addEventListener("resize", () => this.resize());
    this.canvas.addEventListener("wheel", (event) => this.onWheel(event), { passive: false });
    this.canvas.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    this.canvas.addEventListener("pointerup", (event) => this.onPointerUp(event));
    this.canvas.addEventListener("pointercancel", () => {
      this.pointerStart = null;
    });

    this.root.addEventListener("click", (event) => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");
      if (!target) return;
      this.onAction(target.dataset.action ?? "");
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") this.startFaceTurn("clockwise");
      if (event.key === "ArrowLeft") this.startFaceTurn("counterClockwise");
      if (event.key.toLowerCase() === "z") this.undo();
      if (event.key.toLowerCase() === "s") this.scramble();
      if (event.key.toLowerCase() === "r") this.reset();
      if (event.key.toLowerCase() === "f") this.toggleFullscreen();
    });
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (this.turnAnimation) return;

    this.snapAnimation = null;
    this.snapDelayRemaining = SNAP_DELAY_MS;

    const sensitivity = 0.0024;
    const clampedX = Math.max(-80, Math.min(80, event.deltaX));
    const clampedY = Math.max(-80, Math.min(80, event.deltaY));
    const current = this.camera.quaternion.clone();
    const up = new Vector3(0, 1, 0).applyQuaternion(current).normalize();
    const right = new Vector3(1, 0, 0).applyQuaternion(current).normalize();
    const yaw = new Quaternion().setFromAxisAngle(up, -clampedX * sensitivity);
    const pitch = new Quaternion().setFromAxisAngle(right, -clampedY * sensitivity);

    this.camera.quaternion.premultiply(yaw).premultiply(pitch).normalize();
    this.activeFace = getActiveFaceFromForward(
      new Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion),
    );
    this.render();
  }

  private onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.pointerStart = { x: event.clientX, y: event.clientY };
    this.canvas.setPointerCapture(event.pointerId);
  }

  private onPointerUp(event: PointerEvent): void {
    if (!this.pointerStart) return;

    const direction = classifySwipeTurn(this.pointerStart, {
      x: event.clientX,
      y: event.clientY,
    });
    this.pointerStart = null;

    if (direction) this.startFaceTurn(direction);
  }

  private onAction(action: string): void {
    if (action === "clockwise") this.startFaceTurn("clockwise");
    if (action === "counterClockwise") this.startFaceTurn("counterClockwise");
    if (action === "undo") this.undo();
    if (action === "scramble") this.scramble();
    if (action === "reset") this.reset();
  }

  private startFaceTurn(direction: TurnDirection): void {
    if (this.isAnimating()) return;

    this.turnAnimation = {
      face: this.activeFace,
      direction,
      elapsed: 0,
      duration: TURN_DURATION_MS,
    };
    this.updateHud();
  }

  private undo(): void {
    if (this.isAnimating()) return;
    this.cube.undo();
    this.render();
  }

  private scramble(): void {
    if (this.isAnimating()) return;
    scrambleCube(this.cube, 24);
    this.render();
  }

  private reset(): void {
    if (this.isAnimating()) return;
    this.cube.reset();
    this.render();
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      void this.root.requestFullscreen();
      return;
    }

    void document.exitFullscreen();
  }

  private resize(): void {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = computeInsideCubeFov(this.camera.aspect);
    this.camera.updateProjectionMatrix();
    this.render();
  }

  private update(deltaMs: number): void {
    if (this.snapDelayRemaining > 0) {
      this.snapDelayRemaining -= deltaMs;
      if (this.snapDelayRemaining <= 0) this.startSnap();
    }

    if (this.snapAnimation) {
      this.snapAnimation.elapsed += deltaMs;
      const progress = easeOutCubic(this.snapAnimation.elapsed / this.snapAnimation.duration);
      this.camera.quaternion.slerpQuaternions(
        this.snapAnimation.from,
        this.snapAnimation.to,
        progress,
      );

      if (progress >= 1) {
        this.camera.quaternion.copy(this.snapAnimation.to);
        this.activeFace = this.snapAnimation.target.face;
        this.snapAnimation = null;
      }
    }

    if (this.turnAnimation) {
      this.turnAnimation.elapsed += deltaMs;
      if (this.turnAnimation.elapsed >= this.turnAnimation.duration) {
        const { face, direction } = this.turnAnimation;
        this.turnAnimation = null;
        rotateActiveFace(this.cube, face, direction);
      }
    }

    this.render();
  }

  private startSnap(): void {
    const target = findNearestSnapOrientation(this.camera.quaternion);
    this.snapAnimation = {
      from: this.camera.quaternion.clone(),
      to: target.quaternion.clone(),
      target,
      elapsed: 0,
      duration: SNAP_DURATION_MS,
    };
  }

  private render(): void {
    this.placeStickers();
    this.updateHud();
    this.renderer.render(this.scene, this.camera);
  }

  private placeStickers(): void {
    const visible = getVisibleFacelets(this.cube);
    const visibleIds = new Set<string>();

    for (const facelet of visible) {
      visibleIds.add(facelet.stickerId);
      let sticker = this.stickerMeshes.get(facelet.stickerId);

      if (!sticker) {
        sticker = {
          color: facelet.color,
          mesh: new Mesh(
            this.stickerGeometry,
            new MeshBasicMaterial({
              color: facelet.color,
              side: DoubleSide,
            }),
          ),
        };
        this.stickerMeshes.set(facelet.stickerId, sticker);
        this.scene.add(sticker.mesh);
      }

      const normal = vectorFromGrid(facelet.normal);
      const position = vectorFromGrid(facelet.position);
      const basis = faceBasis(normal);
      const horizontal = position.dot(basis.right);
      const vertical = position.dot(basis.up);
      const basePosition = normal
        .clone()
        .multiplyScalar(STICKER_DISTANCE)
        .add(basis.right.clone().multiplyScalar(horizontal * CELL_SPACING))
        .add(basis.up.clone().multiplyScalar(vertical * CELL_SPACING));
      const baseQuaternion = basis.quaternion.clone();
      const turnQuaternion = this.getTurnQuaternion(facelet.position);

      if (turnQuaternion) {
        sticker.mesh.position.copy(basePosition.applyQuaternion(turnQuaternion));
        sticker.mesh.quaternion.copy(turnQuaternion).multiply(baseQuaternion);
      } else {
        sticker.mesh.position.copy(basePosition);
        sticker.mesh.quaternion.copy(baseQuaternion);
      }
    }

    for (const [id, sticker] of this.stickerMeshes) {
      if (visibleIds.has(id)) continue;
      this.scene.remove(sticker.mesh);
      sticker.mesh.material.dispose();
      this.stickerMeshes.delete(id);
    }
  }

  private getTurnQuaternion(position: { x: number; y: number; z: number }): Quaternion | null {
    if (!this.turnAnimation) return null;

    const axis = activeFaceToAxis(this.turnAnimation.face);
    if (position[axis.axis] !== axis.layer) return null;

    const layerDirection = axis.layer === 1
      ? this.turnAnimation.direction === "clockwise" ? -1 : 1
      : this.turnAnimation.direction === "clockwise" ? 1 : -1;
    const progress = easeOutCubic(this.turnAnimation.elapsed / this.turnAnimation.duration);

    return new Quaternion().setFromAxisAngle(
      AXIS_VECTORS[axis.axis],
      layerDirection * progress * Math.PI * 0.5,
    );
  }

  private updateHud(): void {
    this.moveCountElement.textContent = String(this.cube.moveCount);
    this.faceElement.textContent = FACE_LABELS[this.activeFace];

    const disabled = this.isAnimating();
    for (const buttonElement of this.buttons) {
      buttonElement.disabled = disabled;
    }
  }

  private isAnimating(): boolean {
    return Boolean(this.turnAnimation || this.snapAnimation || this.snapDelayRemaining > 0);
  }
}

