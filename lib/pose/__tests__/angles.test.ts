import { describe, it, expect } from "vitest";
import { getAngle, Point } from "../angles";

describe("getAngle", () => {
  it("calculates a right angle (90 degrees) correctly", () => {
    const a: Point = { x: 0, y: 1 };
    const b: Point = { x: 0, y: 0 };
    const c: Point = { x: 1, y: 0 };
    expect(getAngle(a, b, c)).toBeCloseTo(90, 2);
  });

  it("calculates a straight line (180 degrees) correctly", () => {
    const a: Point = { x: -1, y: 0 };
    const b: Point = { x: 0, y: 0 };
    const c: Point = { x: 1, y: 0 };
    expect(getAngle(a, b, c)).toBeCloseTo(180, 2);
  });

  it("returns 0 if points are collinear in the same direction", () => {
    const a: Point = { x: 1, y: 1 };
    const b: Point = { x: 0, y: 0 };
    const c: Point = { x: 1, y: 1 };
    expect(getAngle(a, b, c)).toBeCloseTo(0, 2);
  });

  it("returns 0 if magnitude is 0 (points coincide)", () => {
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 0, y: 0 };
    const c: Point = { x: 1, y: 1 };
    expect(getAngle(a, b, c)).toBe(0);
  });

  it("is symmetric with respect to swapping the outer points a and c", () => {
    const a: Point = { x: 1, y: 2 };
    const b: Point = { x: 5, y: -3 };
    const c: Point = { x: -2, y: 4 };
    const angleABC = getAngle(a, b, c);
    const angleCBA = getAngle(c, b, a);
    expect(angleABC).toBeCloseTo(angleCBA, 6);
  });
});
