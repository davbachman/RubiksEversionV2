import { describe, expect, it } from "vitest";
import {
  ActiveFace,
  CubeState,
  MoveDirection,
  activeFaceToAxis,
  createSolvedCube,
  getVisibleFacelets,
  rotateActiveFace,
  rotateLayer,
  scrambleCube,
} from "./cube";

const faces: ActiveFace[] = ["right", "left", "top", "bottom", "front", "back"];

describe("cube state", () => {
  it("starts solved with 26 shell cubies and 54 visible stickers", () => {
    const cube = createSolvedCube();

    expect(cube.cubies).toHaveLength(26);
    expect(getVisibleFacelets(cube)).toHaveLength(54);
    expect(cube.moveCount).toBe(0);
    expect(cube.isSolved()).toBe(true);
  });

  it("returns to solved after a face turn and its inverse", () => {
    for (const face of faces) {
      const cube = createSolvedCube();

      rotateActiveFace(cube, face, "clockwise");
      expect(cube.isSolved()).toBe(false);
      rotateActiveFace(cube, face, "counterClockwise");

      expect(cube.isSolved()).toBe(true);
      expect(cube.moveCount).toBe(2);
    }
  });

  it("undo reverses the last player move and decrements move count", () => {
    const cube = createSolvedCube();

    rotateActiveFace(cube, "front", "clockwise");
    rotateActiveFace(cube, "right", "counterClockwise");
    expect(cube.moveCount).toBe(2);
    expect(cube.undo()).toBe(true);

    expect(cube.moveCount).toBe(1);
    rotateActiveFace(cube, "front", "counterClockwise");
    expect(cube.isSolved()).toBe(true);
  });

  it("scramble applies legal moves without counting player moves", () => {
    const cube = createSolvedCube();

    scrambleCube(cube, 12, () => 0.1);

    expect(cube.moveCount).toBe(0);
    expect(cube.isSolved()).toBe(false);
    expect(cube.history).toHaveLength(0);
    expect(getVisibleFacelets(cube)).toHaveLength(54);
  });

  it("maps active face clockwise to the correct layer rotation", () => {
    const cubeFromActiveFace = createSolvedCube();
    const cubeFromLayer = createSolvedCube();

    rotateActiveFace(cubeFromActiveFace, "front", "clockwise");
    rotateLayer(cubeFromLayer, activeFaceToAxis("front"), 1, MoveDirection.Negative, true);

    expect(cubeFromActiveFace.serialize()).toEqual(cubeFromLayer.serialize());
  });

  it("clockwise and counter-clockwise active face moves are inverses on every face", () => {
    for (const face of faces) {
      const clockwise = createSolvedCube();
      const counter = createSolvedCube();
      const axis = activeFaceToAxis(face);
      const expectedClockwise =
        axis.layer === 1 ? MoveDirection.Negative : MoveDirection.Positive;

      rotateActiveFace(clockwise, face, "clockwise");
      rotateLayer(counter, axis, axis.layer, expectedClockwise, true);

      expect(clockwise.serialize()).toEqual(counter.serialize());
      rotateActiveFace(clockwise, face, "counterClockwise");
      expect(clockwise.isSolved()).toBe(true);
    }
  });
});
