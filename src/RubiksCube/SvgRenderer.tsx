import { useEffect, useRef, useState } from "react";
import * as D3 from "d3";
import { Config } from "./RubiksCube";
import {
  AxisName,
  calcRotatePoint,
  getCircleIntersections,
  loopAngle,
  loopIdx,
  repeat,
  toRadians,
} from "./Utils";
import * as THREE from "three";
import { flatten, isEqual, mapValues, range } from "lodash";
import { Face, FaceColors } from "./CubePiece";

interface Bead {
  // 当前坐标，更新渲染
  point: THREE.Vector2;
  // 起始坐标，在拖动中使用
  startPoint: THREE.Vector2;
  // 用来初始排序位置设置颜色
  angle: Record<AxisName, number>;
  // 填充颜色
  color: string;
  // 唯一标识，通过id选取对象
  id: string;
}

interface PointInfo {
  points: THREE.Vector2[];
  axisNames: AxisName[];
  angles: number[];
}

interface BeadInfo {
  beads: Bead[];
  axisNames: AxisName[];
  angles: number[];
  direction: number; // -1/1
}

export class SvgRenderer {
  svg: D3.Selection<SVGSVGElement, undefined, null, undefined>;
  g: D3.Selection<SVGGElement, undefined, null, undefined>;

  beadRadius = 5;

  beadID = 0;
  beadPool: Bead[] = [];
  rendering = false;

  order?: number;
  axisCenters?: Record<AxisName, THREE.Vector2>;
  faceMap?: Record<string, Face>;
  axisInfo?: Record<AxisName, PointInfo[]>;
  faceInfo?: Record<Face, PointInfo[]>;

  selectedAxisBeads?: BeadInfo;
  selectedFaceBeads?: BeadInfo[];
  needUpdateBeads?: Bead[];

  constructor() {
    this.svg = D3.create("svg");
    this.g = this.svg.append("g");
  }

  createBeads(points: THREE.Vector2[]) {
    return points.map((p) => {
      // 初始化时，所在位置相同认为是同一个，使用缓存对象
      let found = this.beadPool.find((b) => {
        return b.point.x === p.x && b.point.y === p.y;
      });

      // 如果没找到重新创建一个，设置默认值
      if (!found) {
        found = {
          point: p,
          startPoint: p,
          angle: { [AxisName.X]: 0, [AxisName.Y]: 0, [AxisName.Z]: 0 },
          color: "transparent",
          id: `bead-${this.beadID++}`,
        };
        this.beadPool.push(found);
      }

      return found;
    });
  }

  selectBeads(points: THREE.Vector2[]) {
    return points.map((p) => {
      const found = this.beadPool.find(
        (bead) => bead.point.clone().sub(p).length() < this.beadRadius / 2,
      );
      if (!found) {
        throw new Error("未知错误！");
      }
      return found;
    });
  }

  static setColor(beads: Bead[], colors: string) {
    beads.forEach((bead) => (bead.color = colors));
  }

  static calcRotateToNextPointAngle(beads: Bead[], axisName: AxisName) {
    return beads.map((_, idx) => {
      const nextIdx = loopIdx(idx + 1, beads.length);
      return loopAngle(
        beads[idx].angle[axisName] - beads[nextIdx].angle[axisName],
      );
    });
  }

  getSurroundingPoints(points: THREE.Vector2[]) {
    const maxStep = Math.floor(this.order! / 2);

    // 从外到内
    return range(maxStep).map((step) => {
      const span = this.order! - step * 2;
      const arr = range(span - 1);

      const indices = [
        ...arr.map((i) => i * span),
        ...arr.map((i) => span * (span - 1) + i),
        ...arr.map((i) => span * (span - i) - 1),
        ...arr.map((i) => span - i - 1),
      ];

      // 挑选出当前环绕于最外层的位置
      const result = indices.map((i) => {
        const found = points.find((_, idx) => idx === i);
        if (!found) {
          throw new Error("未知错误！");
        }
        return found;
      });

      points = points.filter((_, idx) => !indices.includes(idx)); // 过滤出剩下的

      return result;
    });
  }

  static SurroundingAxisNames = {
    [Face.U]: [AxisName.Z, AxisName.X],
    [Face.F]: [AxisName.X, AxisName.Y],
    [Face.R]: [AxisName.Y, AxisName.Z],
    [Face.B]: [AxisName.Y, AxisName.X],
    [Face.L]: [AxisName.Z, AxisName.Y],
    [Face.D]: [AxisName.X, AxisName.Z],
  };

  getSurroundingAxisNames(face: Face) {
    const maxStep = Math.floor(this.order! / 2);

    return range(maxStep).map((step) => {
      const span = this.order! - step * 2;
      const axisNames = SvgRenderer.SurroundingAxisNames[face];
      return repeat(
        flatten(axisNames.map((axisName) => repeat(axisName, span - 1))),
        2,
      );
    });
  }

  getSurroundingAngles(angles: number[][]) {
    const maxStep = Math.floor(this.order! / 2);

    return range(maxStep).map((step) => {
      const left = step;
      const right = this.order! - 1 - step;

      const span = this.order! - step * 2;
      const arr = range(span - 1);

      const a = arr.map((i) => angles[right][span - 2 - i + step]);
      const b = arr.map((i) => -angles[left][i + step]);

      return flatten([a, [...a].reverse(), b, [...b].reverse()]);
    });
  }

  rotateToNextPoint(
    startPoint: THREE.Vector2, // 起始位置
    pointIdx: number, // 所在的索引
    rotateAngle: number, // 旋转角度
    axisNames: AxisName[], // 每一步旋转使用的轴
    angles: number[], // 每一步旋转的角度
    rotateStep: number, // 旋转 90 度对应步长
  ) {
    let point = startPoint.clone();

    let angle = Math.abs(rotateAngle);
    let sign = Math.sign(rotateAngle);

    const stepAngle = toRadians(90 / rotateStep);

    let cursorIdx = pointIdx;

    while (angle) {
      const idx =
        sign > 0
          ? loopIdx(cursorIdx, angles.length)
          : loopIdx(cursorIdx + sign, angles.length);

      const k = angles[idx] / stepAngle;
      const deltaAngle = Math.min(angle, stepAngle);
      const rotateAngle = sign * (k * deltaAngle);

      point = calcRotatePoint(
        this.axisCenters![axisNames[idx]],
        point,
        rotateAngle,
      );

      angle -= deltaAngle;
      cursorIdx += sign;
    }

    return point;
  }

  sortBeads(beads: Bead[], axisName: AxisName, startPoint: THREE.Vector2) {
    return beads
      .map((bead) => {
        const local = bead.point.clone().sub(this.axisCenters![axisName]);
        bead.angle[axisName] =
          local.angleTo(startPoint) * Math.sign(local.cross(startPoint));
        return bead;
      })
      .sort((a, b) => b.angle[axisName] - a.angle[axisName]); // 顺时针
  }

  init(config: Config) {
    const center = { x: 0, y: 0 }; // 三个轨道所在的中心

    const radius = 150; // 中间轨道半径
    const offset = this.beadRadius * 2.5; // 同圆心轨道半径差值

    this.order = config.order < 1 ? 1 : config.order; // 魔方阶数
    const distance = radius / 2 + (offset * (this.order - 1)) / 2; // 三个轨道圆心离中心的距离

    const d1 = distance / 2;
    const d2 = d1 * Math.sqrt(3);

    this.axisCenters = {
      [AxisName.X]: new THREE.Vector2(center.x, center.y - distance),
      [AxisName.Y]: new THREE.Vector2(center.x - d2, center.y + d1),
      [AxisName.Z]: new THREE.Vector2(center.x + d2, center.y + d1),
    };

    const radiusList = range(this.order!).map(
      (idx) => radius + offset * (idx - 1),
    );

    // 绘制轨道
    const g1 = this.g.append("g");
    Object.values(this.axisCenters).forEach((center) => {
      radiusList.forEach((r) => {
        g1.append("circle")
          .attr("cx", center.x)
          .attr("cy", center.y)
          .attr("r", r)
          .attr("stroke", "black")
          .attr("fill", "transparent");
      });
    });

    // x1y1 x1y2 x1y3 x2y1 x2y2 x2y3...
    const xy = flatten(
      radiusList.map((r1) => {
        return radiusList.map((r2) => {
          return getCircleIntersections(
            this.axisCenters![AxisName.X],
            r1,
            this.axisCenters![AxisName.Y],
            r2,
          );
        });
      }),
    );

    // y1z1 y1z2 y1z3 y2z1 y2z2 y2z3...
    const yz = flatten(
      radiusList.map((r1) => {
        return radiusList.map((r2) => {
          return getCircleIntersections(
            this.axisCenters![AxisName.Y],
            r1,
            this.axisCenters![AxisName.Z],
            r2,
          );
        });
      }),
    );

    // z1x1 z1x2 z1x3 z2x1 z2x2 z2x3...
    const zx = flatten(
      radiusList.map((r1) => {
        return radiusList.map((r2) => {
          return getCircleIntersections(
            this.axisCenters![AxisName.Z],
            r1,
            this.axisCenters![AxisName.X],
            r2,
          );
        });
      }),
    );

    const x = radiusList.map((_, idx) => {
      // 0 => x1y1 x1y2 x1y3 z1x1 z2x1 z3x1
      // 1 => x2y1 x2y2 x2y3 z1x2 z2x2 z3x2
      return flatten([
        ...xy.filter(
          (_, i) => i >= idx * this.order! && i < (idx + 1) * this.order!,
        ),
        ...zx.filter((_, i) => i % this.order! === idx),
      ]);
    });
    const y = radiusList.map((_, idx) => {
      return flatten([
        ...yz.filter(
          (_, i) => i >= idx * this.order! && i < (idx + 1) * this.order!,
        ),
        ...xy.filter((_, i) => i % this.order! === idx),
      ]);
    });
    const z = radiusList.map((_, idx) => {
      return flatten([
        ...zx.filter(
          (_, i) => i >= idx * this.order! && i < (idx + 1) * this.order!,
        ),
        ...yz.filter((_, i) => i % this.order! === idx),
      ]);
    });

    const X = x.map((points) => {
      return this.sortBeads(
        this.createBeads(points),
        AxisName.X,
        new THREE.Vector2(0, 1),
      );
    });
    const Y = y.map((points) => {
      return this.sortBeads(
        this.createBeads(points),
        AxisName.Y,
        new THREE.Vector2(1, -Math.sqrt(3)),
      );
    });
    const Z = z.map((points) => {
      return this.sortBeads(
        this.createBeads(points),
        AxisName.Z,
        new THREE.Vector2(-1, -Math.sqrt(3)),
      );
    });

    const faceBeads: Record<Face, Bead[]> = {
      [Face.U]: flatten(X.map((beads) => beads.slice(0, this.order!))),
      [Face.F]: flatten(Y.map((beads) => beads.slice(0, this.order!))),
      [Face.R]: flatten(Z.map((beads) => beads.slice(0, this.order!))),
      [Face.B]: flatten(
        X.map((beads) => beads.slice(this.order!, this.order! * 2)),
      ),
      [Face.L]: flatten(
        Y.map((beads) => beads.slice(this.order!, this.order! * 2)),
      ),
      [Face.D]: flatten(
        Z.map((beads) => beads.slice(this.order!, this.order! * 2)),
      ),
    };

    // 设置每个面的颜色
    Object.entries(faceBeads).forEach(([face, beans]) => {
      SvgRenderer.setColor(beans, FaceColors[face as Face]);
    });

    // 绘制珠子
    const g2 = this.g.append("g");
    this.beadPool.forEach(({ point, color, id }) => {
      g2.append("circle")
        .attr("id", id)
        .attr("cx", point.x)
        .attr("cy", point.y)
        .attr("r", this.beadRadius)
        .attr("stroke", "black")
        .attr("fill", color);
    });

    // 从里到外每个位置移动一格所需角度
    const angles = X.map((beads) =>
      SvgRenderer.calcRotateToNextPointAngle(beads, AxisName.X),
    );

    // 绕同一圆心旋转的点
    this.axisInfo = {
      [AxisName.X]: X.map((beads, idx) => ({
        points: beads.map((bead) => bead.point.clone()),
        axisNames: repeat(AxisName.X, this.order! * 4),
        angles: angles[idx],
      })),
      [AxisName.Y]: Y.map((beads, idx) => ({
        points: beads.map((bead) => bead.point.clone()),
        axisNames: repeat(AxisName.Y, this.order! * 4),
        angles: angles[idx],
      })),
      [AxisName.Z]: Z.map((beads, idx) => ({
        points: beads.map((bead) => bead.point.clone()),
        axisNames: repeat(AxisName.Z, this.order! * 4),
        angles: angles[idx],
      })),
    };

    const sAngles = this.getSurroundingAngles(angles);

    // 旋转同一个面上的点
    this.faceInfo = mapValues(faceBeads, (beads, face) => {
      const points = beads.map((bead) => bead.point.clone());

      const sPoints = this.getSurroundingPoints(points);
      const sAxisNames = this.getSurroundingAxisNames(face as Face);

      const maxStep = Math.floor(this.order! / 2);

      return range(maxStep).map((step) => ({
        points: sPoints[step],
        axisNames: sAxisNames[step],
        angles: sAngles[step],
      }));
    });

    this.faceMap = {
      [AxisName.X + 0]: Face.L,
      [AxisName.X + (this.order! - 1)]: Face.R,
      [AxisName.Y + 0]: Face.D,
      [AxisName.Y + (this.order! - 1)]: Face.U,
      [AxisName.Z + 0]: Face.B,
      [AxisName.Z + (this.order! - 1)]: Face.F,
    };

    this.rendering = true;

    return () => {
      this.beadID = 0;
      this.beadPool = [];
      this.rendering = false;
      this.g.selectChildren().remove();
    };
  }

  update(beads?: Bead[]) {
    beads?.forEach(({ point, id }) => {
      this.g.select(`#${id}`).attr("cx", point.x).attr("cy", point.y);
    });
  }

  start(axisName: AxisName, stepOnAxis: number) {
    if (!this.rendering) return;

    const { points, axisNames, angles } = this.axisInfo![axisName][stepOnAxis];
    this.selectedAxisBeads = {
      beads: this.selectBeads(points),
      axisNames,
      angles,
      direction: -1, // 旋转角度刚好相反
    };

    const face = this.faceMap?.[axisName + stepOnAxis];

    if (face) {
      this.selectedFaceBeads = this.faceInfo![face].map(
        ({ points, axisNames, angles }) => ({
          beads: this.selectBeads(points),
          axisNames,
          angles,
          direction: stepOnAxis === 0 ? -1 : 1, // stepOnAxis 为 order-1 时反向
        }),
      );
    }

    this.needUpdateBeads = [
      ...this.selectedAxisBeads.beads,
      ...flatten(this.selectedFaceBeads?.map(({ beads }) => beads)),
    ];
  }

  move(angle: number) {
    if (!this.rendering) return;

    this.selectedAxisBeads!.beads.forEach((bead, idx) => {
      bead.point = this.rotateToNextPoint(
        bead.startPoint,
        idx,
        this.selectedAxisBeads!.direction * angle,
        this.selectedAxisBeads!.axisNames,
        this.selectedAxisBeads!.angles,
        this.order!,
      );
    });

    this.selectedFaceBeads?.forEach(
      ({ beads, axisNames, angles, direction }, step) => {
        beads.forEach((bead, idx) => {
          bead.point = this.rotateToNextPoint(
            bead.startPoint,
            idx,
            direction * angle,
            axisNames,
            angles,
            this.order! - 1 - step * 2,
          );
        });
      },
    );

    requestAnimationFrame(() => this.update(this.needUpdateBeads));
  }

  end() {
    if (!this.rendering) return;

    this.needUpdateBeads?.forEach((bead) => {
      bead.startPoint = bead.point.clone();
    });

    this.selectedAxisBeads = undefined;
    this.selectedFaceBeads = undefined;
    this.needUpdateBeads = undefined;
  }

  resize(width: number, height: number, dpr: number) {
    this.svg
      .attr("display", "block") // 避免出现滚动条
      .attr("width", width)
      .attr("height", height);
    this.g.attr("transform", `translate(${width / 2}, ${height / 2})`);
  }

  render(config: Config) {
    const ref = useRef<HTMLDivElement>(null);
    const [afterResize, setAfterResize] = useState(false);

    useEffect(() => {
      const container = ref.current;
      if (!container) return;
      container.appendChild(this.svg.node()!);

      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          const { width, height } = container.getBoundingClientRect();
          this.resize(width, height, devicePixelRatio);
          setAfterResize(true);
        });
      });
      resizeObserver.observe(container);
    }, []);

    useEffect(() => {
      if (!afterResize) return;
      return this.init(config);
    }, [config, afterResize]);

    return <div className="full" ref={ref}></div>;
  }
}
