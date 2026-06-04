import { Vector3 } from "three";

export type ActiveFace = "right" | "left" | "top" | "bottom" | "front" | "back";
export type AxisName = "x" | "y" | "z";
export type TurnDirection = "clockwise" | "counterClockwise";

export enum MoveDirection {
  Negative = -1,
  Positive = 1,
}

export interface AxisSpec {
  face: ActiveFace;
  axis: AxisName;
  layer: -1 | 1;
}

export interface GridPosition {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
  z: -1 | 0 | 1;
}

export interface Sticker {
  id: string;
  homeFace: ActiveFace;
  color: string;
  normal: GridPosition;
}

export interface Cubie {
  id: string;
  homePosition: GridPosition;
  position: GridPosition;
  stickers: Sticker[];
}

export interface Facelet {
  cubieId: string;
  stickerId: string;
  color: string;
  homeFace: ActiveFace;
  position: GridPosition;
  normal: GridPosition;
}

export interface CubeMove {
  face: ActiveFace;
  direction: TurnDirection;
}

const FACE_COLORS: Record<ActiveFace, string> = {
  right: "#df2f2f",
  left: "#f5821f",
  top: "#ffffff",
  bottom: "#f3d232",
  front: "#1f8f43",
  back: "#2470d8",
};

const FACE_AXES: Record<ActiveFace, AxisSpec> = {
  right: { face: "right", axis: "x", layer: 1 },
  left: { face: "left", axis: "x", layer: -1 },
  top: { face: "top", axis: "y", layer: 1 },
  bottom: { face: "bottom", axis: "y", layer: -1 },
  front: { face: "front", axis: "z", layer: 1 },
  back: { face: "back", axis: "z", layer: -1 },
};

const FACE_NORMALS: Record<ActiveFace, GridPosition> = {
  right: { x: 1, y: 0, z: 0 },
  left: { x: -1, y: 0, z: 0 },
  top: { x: 0, y: 1, z: 0 },
  bottom: { x: 0, y: -1, z: 0 },
  front: { x: 0, y: 0, z: 1 },
  back: { x: 0, y: 0, z: -1 },
};

const FACE_ORDER: ActiveFace[] = ["right", "left", "top", "bottom", "front", "back"];

function coord(value: number): -1 | 0 | 1 {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

function clonePosition(position: GridPosition): GridPosition {
  return { x: position.x, y: position.y, z: position.z };
}

function rotatePosition(position: GridPosition, axis: AxisName, direction: MoveDirection): GridPosition {
  const { x, y, z } = position;

  if (axis === "x") {
    return direction === MoveDirection.Positive
      ? { x, y: coord(-z), z: coord(y) }
      : { x, y: coord(z), z: coord(-y) };
  }

  if (axis === "y") {
    return direction === MoveDirection.Positive
      ? { x: coord(z), y, z: coord(-x) }
      : { x: coord(-z), y, z: coord(x) };
  }

  return direction === MoveDirection.Positive
    ? { x: coord(-y), y: coord(x), z }
    : { x: coord(y), y: coord(-x), z };
}

function serializeCubies(cubies: Cubie[]): string {
  return JSON.stringify(
    cubies
      .map((cubie) => ({
        id: cubie.id,
        position: cubie.position,
        stickers: cubie.stickers
          .map((sticker) => ({
            id: sticker.id,
            normal: sticker.normal,
          }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
}

function createSolvedCubies(): Cubie[] {
  const cubies: Cubie[] = [];

  for (const x of [-1, 0, 1] as const) {
    for (const y of [-1, 0, 1] as const) {
      for (const z of [-1, 0, 1] as const) {
        if (x === 0 && y === 0 && z === 0) continue;

        const position: GridPosition = { x, y, z };
        const stickers = FACE_ORDER.filter((face) => {
          const axis = FACE_AXES[face];
          return position[axis.axis] === axis.layer;
        }).map((face) => ({
          id: `${x},${y},${z}:${face}`,
          homeFace: face,
          color: FACE_COLORS[face],
          normal: clonePosition(FACE_NORMALS[face]),
        }));

        cubies.push({
          id: `${x},${y},${z}`,
          homePosition: clonePosition(position),
          position: clonePosition(position),
          stickers,
        });
      }
    }
  }

  return cubies;
}

const SOLVED_SIGNATURE = serializeCubies(createSolvedCubies());

export class CubeState {
  cubies: Cubie[];
  history: CubeMove[];
  moveCount: number;
  lastMove: CubeMove | null;

  constructor(cubies = createSolvedCubies()) {
    this.cubies = cubies;
    this.history = [];
    this.moveCount = 0;
    this.lastMove = null;
  }

  serialize(): string {
    return serializeCubies(this.cubies);
  }

  isSolved(): boolean {
    return this.serialize() === SOLVED_SIGNATURE;
  }

  undo(): boolean {
    const move = this.history.pop();
    if (!move) return false;

    rotateActiveFace(this, move.face, inverseDirection(move.direction), false);
    this.moveCount = Math.max(0, this.moveCount - 1);
    this.lastMove = this.history[this.history.length - 1] ?? null;
    return true;
  }

  reset(): void {
    this.cubies = createSolvedCubies();
    this.history = [];
    this.moveCount = 0;
    this.lastMove = null;
  }
}

export function createSolvedCube(): CubeState {
  return new CubeState();
}

export function activeFaceToAxis(face: ActiveFace): AxisSpec {
  return FACE_AXES[face];
}

export function activeFaceToNormal(face: ActiveFace): Vector3 {
  const normal = FACE_NORMALS[face];
  return new Vector3(normal.x, normal.y, normal.z);
}

export function getFaceColor(face: ActiveFace): string {
  return FACE_COLORS[face];
}

export function getVisibleFacelets(cube: CubeState): Facelet[] {
  return cube.cubies.flatMap((cubie) =>
    cubie.stickers.map((sticker) => ({
      cubieId: cubie.id,
      stickerId: sticker.id,
      color: sticker.color,
      homeFace: sticker.homeFace,
      position: clonePosition(cubie.position),
      normal: clonePosition(sticker.normal),
    })),
  );
}

export function rotateLayer(
  cube: CubeState,
  axisSpec: AxisSpec,
  layer: -1 | 1,
  direction: MoveDirection,
  countMove = true,
): void {
  for (const cubie of cube.cubies) {
    if (cubie.position[axisSpec.axis] !== layer) continue;

    cubie.position = rotatePosition(cubie.position, axisSpec.axis, direction);
    cubie.stickers = cubie.stickers.map((sticker) => ({
      ...sticker,
      normal: rotatePosition(sticker.normal, axisSpec.axis, direction),
    }));
  }

  if (countMove) {
    cube.moveCount += 1;
    cube.lastMove = { face: axisSpec.face, direction: directionToTurn(axisSpec, direction) };
  }
}

export function rotateActiveFace(
  cube: CubeState,
  face: ActiveFace,
  direction: TurnDirection,
  countMove = true,
): void {
  const axis = activeFaceToAxis(face);
  const layerDirection = activeFaceTurnToLayerDirection(axis, direction);

  rotateLayer(cube, axis, axis.layer, layerDirection, false);

  if (countMove) {
    const move = { face, direction };
    cube.history.push(move);
    cube.moveCount += 1;
    cube.lastMove = move;
  }
}

export function scrambleCube(cube: CubeState, moves = 24, random = Math.random): void {
  cube.reset();

  for (let index = 0; index < moves; index += 1) {
    const faceIndex = (Math.floor(random() * FACE_ORDER.length) + index) % FACE_ORDER.length;
    const directionIndex = (Math.floor(random() * 2) + index) % 2;
    rotateActiveFace(
      cube,
      FACE_ORDER[faceIndex],
      directionIndex === 0 ? "clockwise" : "counterClockwise",
      false,
    );
  }

  cube.moveCount = 0;
  cube.history = [];
  cube.lastMove = null;
}

export function activeFaceTurnToLayerDirection(
  axis: AxisSpec,
  direction: TurnDirection,
): MoveDirection {
  const clockwiseDirection = axis.layer === 1 ? MoveDirection.Negative : MoveDirection.Positive;
  if (direction === "clockwise") return clockwiseDirection;
  return clockwiseDirection === MoveDirection.Positive
    ? MoveDirection.Negative
    : MoveDirection.Positive;
}

export function inverseDirection(direction: TurnDirection): TurnDirection {
  return direction === "clockwise" ? "counterClockwise" : "clockwise";
}

function directionToTurn(axis: AxisSpec, direction: MoveDirection): TurnDirection {
  return activeFaceTurnToLayerDirection(axis, "clockwise") === direction
    ? "clockwise"
    : "counterClockwise";
}

