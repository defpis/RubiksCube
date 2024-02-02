import * as THREE from "three";

export class RoundedCubeGeometry extends THREE.BufferGeometry {
  type = "RoundedCubeGeometry";

  constructor(size: number, radius: number, radiusSegments: number) {
    super();

    const halfSize = size / 2;
    const radiusSize = Math.min(radius * size, halfSize);
    const edgeHalfSize = halfSize - radiusSize;

    const rs1 = radiusSegments + 1;
    const totalVertexCount = (rs1 * radiusSegments + 1) << 3;

    const positions = new THREE.BufferAttribute(
      new Float32Array(totalVertexCount * 3),
      3,
    );
    const normals = new THREE.BufferAttribute(
      new Float32Array(totalVertexCount * 3),
      3,
    );

    const cornerVerts: THREE.Vector3[][] = [];
    const vertexPool: THREE.Vector3[] = [];

    const cornerNormals: THREE.Vector3[][] = [];
    const normalPool: THREE.Vector3[] = [];

    const vertex = new THREE.Vector3();
    const indices: number[] = [];
    const lastVertex = rs1 * radiusSegments;
    const cornerVertNumber = rs1 * radiusSegments + 1;

    const doVertices = () => {
      const halfPI = Math.PI / 2;

      const cornerLayout = [
        new THREE.Vector3(1, 1, 1),
        new THREE.Vector3(1, 1, -1),
        new THREE.Vector3(-1, 1, -1),
        new THREE.Vector3(-1, 1, 1),
        new THREE.Vector3(1, -1, 1),
        new THREE.Vector3(1, -1, -1),
        new THREE.Vector3(-1, -1, -1),
        new THREE.Vector3(-1, -1, 1),
      ];

      for (let j = 0; j < 8; j++) {
        cornerVerts.push([]);
        cornerNormals.push([]);
      }

      const cornerOffset = new THREE.Vector3(
        edgeHalfSize,
        edgeHalfSize,
        edgeHalfSize,
      );

      for (let y = 0; y <= radiusSegments; y++) {
        const v = y / radiusSegments;
        const va = v * halfPI;

        const cosVa = Math.cos(va);
        const sinVa = Math.sin(va);

        if (y == radiusSegments) {
          vertex.x = 0;
          vertex.y = 1;
          vertex.z = 0;

          const vert = vertex
            .clone()
            .multiplyScalar(radiusSize)
            .add(cornerOffset);
          cornerVerts[0].push(vert);
          vertexPool.push(vert);

          const norm = vertex.clone();
          cornerNormals[0].push(norm);
          normalPool.push(norm);

          continue;
        }

        for (let x = 0; x <= radiusSegments; x++) {
          const u = x / radiusSegments;
          const ha = u * halfPI;

          vertex.x = cosVa * Math.cos(ha);
          vertex.y = sinVa;
          vertex.z = cosVa * Math.sin(ha);

          const vert = vertex
            .clone()
            .multiplyScalar(radiusSize)
            .add(cornerOffset);
          cornerVerts[0].push(vert);
          vertexPool.push(vert);

          const norm = vertex.clone().normalize();
          cornerNormals[0].push(norm);
          normalPool.push(norm);
        }
      }

      for (let i = 1; i < 8; i++) {
        for (let j = 0; j < cornerVerts[0].length; j++) {
          const vert = cornerVerts[0][j].clone().multiply(cornerLayout[i]);
          cornerVerts[i].push(vert);
          vertexPool.push(vert);

          const norm = cornerNormals[0][j].clone().multiply(cornerLayout[i]);
          cornerNormals[i].push(norm);
          normalPool.push(norm);
        }
      }
    };

    const doCorners = () => {
      const flips = [true, false, true, false, false, true, false, true];
      const lastRowOffset = rs1 * (radiusSegments - 1);

      for (let i = 0; i < 8; i++) {
        const cornerOffset = cornerVertNumber * i;

        for (let v = 0; v < radiusSegments - 1; v++) {
          const r1 = v * rs1;
          const r2 = (v + 1) * rs1;

          for (let u = 0; u < radiusSegments; u++) {
            const u1 = u + 1;

            const a = cornerOffset + r1 + u;
            const b = cornerOffset + r1 + u1;
            const c = cornerOffset + r2 + u;
            const d = cornerOffset + r2 + u1;

            if (!flips[i]) {
              indices.push(a);
              indices.push(b);
              indices.push(c);

              indices.push(b);
              indices.push(d);
              indices.push(c);
            } else {
              indices.push(a);
              indices.push(c);
              indices.push(b);

              indices.push(b);
              indices.push(c);
              indices.push(d);
            }
          }
        }

        for (let u = 0; u < radiusSegments; u++) {
          const a = cornerOffset + lastRowOffset + u;
          const b = cornerOffset + lastRowOffset + u + 1;
          const c = cornerOffset + lastVertex;

          if (!flips[i]) {
            indices.push(a);
            indices.push(b);
            indices.push(c);
          } else {
            indices.push(a);
            indices.push(c);
            indices.push(b);
          }
        }
      }
    };

    const doFaces = () => {
      let a = lastVertex + cornerVertNumber * 0;
      let b = lastVertex + cornerVertNumber * 1;
      let c = lastVertex + cornerVertNumber * 2;
      let d = lastVertex + cornerVertNumber * 3;

      indices.push(a);
      indices.push(b);
      indices.push(c);
      indices.push(a);
      indices.push(c);
      indices.push(d);

      a = lastVertex + cornerVertNumber * 4;
      b = lastVertex + cornerVertNumber * 5;
      c = lastVertex + cornerVertNumber * 6;
      d = lastVertex + cornerVertNumber * 7;

      indices.push(a);
      indices.push(c);
      indices.push(b);
      indices.push(a);
      indices.push(d);
      indices.push(c);

      a = cornerVertNumber * 0;
      b = cornerVertNumber * 1;
      c = cornerVertNumber * 4;
      d = cornerVertNumber * 5;

      indices.push(a);
      indices.push(c);
      indices.push(b);
      indices.push(b);
      indices.push(c);
      indices.push(d);

      a = cornerVertNumber * 2;
      b = cornerVertNumber * 3;
      c = cornerVertNumber * 6;
      d = cornerVertNumber * 7;

      indices.push(a);
      indices.push(c);
      indices.push(b);
      indices.push(b);
      indices.push(c);
      indices.push(d);

      a = radiusSegments + cornerVertNumber * 0;
      b = radiusSegments + cornerVertNumber * 3;
      c = radiusSegments + cornerVertNumber * 4;
      d = radiusSegments + cornerVertNumber * 7;

      indices.push(a);
      indices.push(b);
      indices.push(c);
      indices.push(b);
      indices.push(d);
      indices.push(c);

      a = radiusSegments + cornerVertNumber * 1;
      b = radiusSegments + cornerVertNumber * 2;
      c = radiusSegments + cornerVertNumber * 5;
      d = radiusSegments + cornerVertNumber * 6;

      indices.push(a);
      indices.push(c);
      indices.push(b);
      indices.push(b);
      indices.push(c);
      indices.push(d);
    };

    const doWidthEdges = () => {
      const end = radiusSegments - 1;
      const cStarts = [0, 1, 4, 5];
      const cEnds = [3, 2, 7, 6];
      const needsFlip = [0, 1, 1, 0];

      for (let i = 0; i < 4; i++) {
        const cStart = cStarts[i] * cornerVertNumber;
        const cEnd = cEnds[i] * cornerVertNumber;

        for (let u = 0; u <= end; u++) {
          const a = cStart + radiusSegments + u * rs1;
          const b =
            cStart +
            (u !== end ? radiusSegments + (u + 1) * rs1 : cornerVertNumber - 1);
          const c = cEnd + radiusSegments + u * rs1;
          const d =
            cEnd +
            (u !== end ? radiusSegments + (u + 1) * rs1 : cornerVertNumber - 1);

          if (!needsFlip[i]) {
            indices.push(a);
            indices.push(b);
            indices.push(c);
            indices.push(b);
            indices.push(d);
            indices.push(c);
          } else {
            indices.push(a);
            indices.push(c);
            indices.push(b);
            indices.push(b);
            indices.push(c);
            indices.push(d);
          }
        }
      }
    };

    const doHeightEdges = () => {
      for (let i = 0; i < 4; i++) {
        const cOffset = i * cornerVertNumber;
        const cRowOffset = 4 * cornerVertNumber + cOffset;
        const needsFlip = i & 1;

        for (let u = 0; u < radiusSegments; u++) {
          const u1 = u + 1;
          const a = cOffset + u;
          const b = cOffset + u1;
          const c = cRowOffset + u;
          const d = cRowOffset + u1;

          if (!needsFlip) {
            indices.push(a);
            indices.push(b);
            indices.push(c);
            indices.push(b);
            indices.push(d);
            indices.push(c);
          } else {
            indices.push(a);
            indices.push(c);
            indices.push(b);
            indices.push(b);
            indices.push(c);
            indices.push(d);
          }
        }
      }
    };

    const doDepthEdges = () => {
      const cStarts = [0, 2, 4, 6];
      const cEnds = [1, 3, 5, 7];

      for (let i = 0; i < 4; i++) {
        const cStart = cornerVertNumber * cStarts[i];
        const cEnd = cornerVertNumber * cEnds[i];

        const needsFlip = 1 >= i;

        for (let u = 0; u < radiusSegments; u++) {
          const urs1 = u * rs1;
          const u1rs1 = (u + 1) * rs1;

          const a = cStart + urs1;
          const b = cStart + u1rs1;
          const c = cEnd + urs1;
          const d = cEnd + u1rs1;

          if (needsFlip) {
            indices.push(a);
            indices.push(c);
            indices.push(b);
            indices.push(b);
            indices.push(c);
            indices.push(d);
          } else {
            indices.push(a);
            indices.push(b);
            indices.push(c);
            indices.push(b);
            indices.push(d);
            indices.push(c);
          }
        }
      }
    };

    doVertices();
    doCorners();
    doFaces();
    doWidthEdges();
    doHeightEdges();
    doDepthEdges();

    let index = 0;
    for (let i = 0; i < vertexPool.length; i++) {
      positions.setXYZ(
        index,
        vertexPool[i].x,
        vertexPool[i].y,
        vertexPool[i].z,
      );
      normals.setXYZ(index, normalPool[i].x, normalPool[i].y, normalPool[i].z);
      index++;
    }

    this.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
    this.setAttribute("position", positions);
    this.setAttribute("normal", normals);
  }
}

export class RoundedPlaneGeometry extends THREE.ExtrudeGeometry {
  type = "RoundedPlaneGeometry";

  constructor(
    size: number,
    depth: number,
    radius: number,
    curveSegments: number,
  ) {
    const shape = new THREE.Shape();

    const x = -size / 2;
    const y = -size / 2;
    const width = size;
    const height = size;
    const radiusSize = size * radius;

    shape.moveTo(x, y + radiusSize);
    shape.lineTo(x, y + height - radiusSize);
    shape.quadraticCurveTo(x, y + height, x + radiusSize, y + height);
    shape.lineTo(x + width - radiusSize, y + height);
    shape.quadraticCurveTo(
      x + width,
      y + height,
      x + width,
      y + height - radiusSize,
    );
    shape.lineTo(x + width, y + radiusSize);
    shape.quadraticCurveTo(x + width, y, x + width - radiusSize, y);
    shape.lineTo(x + radiusSize, y);
    shape.quadraticCurveTo(x, y, x, y + radiusSize);

    super(shape, { depth, curveSegments, bevelEnabled: false });
  }
}
