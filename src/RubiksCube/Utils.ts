import { flatten, isEqual, range, uniqWith } from "lodash";
import * as THREE from "three";

export const ROTATE_STEP_ANGLE = toRadians(90);
export const ROTATE_MINI_ANGLE = toRadians(1);

export function toDegrees(radians: number) {
  return radians * (180 / Math.PI);
}

export function toRadians(degrees: number) {
  return degrees * (Math.PI / 180);
}

export function repeat<T>(item: T | T[], times: number) {
  return flatten(range(times).map(() => item));
}

export enum AxisName {
  X = "x",
  Y = "y",
  Z = "z",
}

export const AxisNames = [AxisName.X, AxisName.Y, AxisName.Z] as const;

export function getMainAxisName(vector: THREE.Vector3, comparator = Math.max) {
  const xyz = AxisNames.map((item) => Math.abs(vector[item]));
  const val = comparator(...xyz);
  const idx = xyz.indexOf(val);
  return AxisNames[idx];
}

export function makeAxisUnit(axisName: AxisName, sign = 1) {
  const idx = AxisNames.indexOf(axisName);
  const xyz = [0, 0, 0];
  xyz[idx] = sign;
  return new THREE.Vector3(...xyz);
}

export function changeParent(
  obj: THREE.Object3D,
  from: THREE.Object3D,
  to: THREE.Object3D,
) {
  obj.applyMatrix4(from.matrixWorld);
  obj.applyMatrix4(to.matrixWorld.clone().invert());
  to.add(obj);
  from.remove(obj);
}

// https://math.stackexchange.com/questions/256100/how-can-i-find-the-points-at-which-two-circles-intersect
export function getCircleIntersections(
  c1: THREE.Vector2,
  r1: number,
  c2: THREE.Vector2,
  r2: number,
) {
  const d = c1.clone().sub(c2).length();

  if (r1 + r2 < d) return []; // 分离

  if (r1 === r2 && d === 0) return []; // 重合

  if (r1 + d < r2 || r2 + d < r1) return []; // 包含

  const v1 = c1
    .clone()
    .add(c2)
    .multiplyScalar(0.5)
    .add(
      c2
        .clone()
        .sub(c1)
        .multiplyScalar(
          (Math.pow(r1, 2) - Math.pow(r2, 2)) / (2 * Math.pow(d, 2)),
        ),
    );

  const v2 = new THREE.Vector2(c2.y - c1.y, c1.x - c2.x).multiplyScalar(
    Math.sqrt(
      (2 * (Math.pow(r1, 2) + Math.pow(r2, 2))) / Math.pow(d, 2) -
        Math.pow(Math.pow(r1, 2) - Math.pow(r2, 2), 2) / Math.pow(d, 4) -
        1,
    ) / 2,
  );

  return uniqWith([v1.clone().add(v2), v1.clone().sub(v2)], isEqual);
}

export function calcRotatePoint(
  center: THREE.Vector2,
  start: THREE.Vector2,
  angle: number,
) {
  const p = start.clone().sub(center);
  const x = center.x + p.x * Math.cos(angle) - p.y * Math.sin(angle);
  const y = center.y + p.x * Math.sin(angle) + p.y * Math.cos(angle);
  return new THREE.Vector2(x, y);
}

export function loopIdx(idx: number, length: number) {
  idx = idx % length;
  idx = idx < 0 ? idx + length : idx;
  return idx;
}

export function loopAngle(angle: number) {
  while (angle > 2 * Math.PI) {
    angle -= 2 * Math.PI;
  }

  while (angle < 0) {
    angle += 2 * Math.PI;
  }

  return angle;
}
