import * as THREE from "three";
import { CubePiece, FACES, FACE_ROTATE_AXISES, Face } from "./CubePiece";
import { AxisName, changeParent, getMainAxisName, makeAxisUnit } from "./Utils";
import { RoundedPlaneGeometry } from "./CubeGeometry";

export class CubeStack extends THREE.Object3D {
  pieces: CubePiece[] = [];

  helper: THREE.Mesh<
    THREE.BoxGeometry,
    THREE.MeshBasicMaterial,
    THREE.Object3DEventMap
  >;

  size: number;
  order: number;
  mid: number;
  pieceSize: number;

  checkFaceIsOK(face: Face) {
    const axis = FACE_ROTATE_AXISES[face];
    const axisName = getMainAxisName(axis);
    const stepOnAxis = axis[axisName] > 0 ? this.order - 1 : 0;
    const pieces = this.getLayerPieces(axisName, stepOnAxis);
    const zAxis = makeAxisUnit(AxisName.Z);

    const faces: THREE.Mesh<
      RoundedPlaneGeometry,
      THREE.MeshLambertMaterial,
      THREE.Object3DEventMap
    >[] = [];

    pieces.forEach((p) => {
      const pieceAxis = axis.clone().applyEuler(p.rotation);
      p.faces.forEach((f) => {
        const faceAxis = pieceAxis.clone().applyEuler(f.rotation);
        const angle = faceAxis.angleTo(zAxis);
        if (angle % Math.PI === 0) faces.push(f);
      });
    });

    return faces.every((item) => item.userData.face === face);
  }

  checkIsOK() {
    return FACES.every((item) => this.checkFaceIsOK(item));
  }

  getLayerPieces(axisName: AxisName, stepOnAxis: number) {
    const offsetOnAxis = this.calcOffset(stepOnAxis);
    return this.pieces.filter((item) => {
      return (
        Math.abs(offsetOnAxis - item.position[axisName]) < this.pieceSize / 2
      );
    });
  }

  attachHelper(pieces?: CubePiece[]) {
    this.helper.rotation.set(0, 0, 0);
    pieces?.forEach((item) => changeParent(item, this, this.helper));
  }

  detachHelper(pieces?: CubePiece[]) {
    pieces?.forEach((item) => changeParent(item, this.helper, this));
    this.helper.rotation.set(0, 0, 0);
  }

  calcOffset(step: number) {
    return (step - this.mid) * this.pieceSize;
  }

  calcStep(offset: number) {
    return Math.round(offset / this.pieceSize + this.mid);
  }

  constructor(size = 1, order = 3) {
    super();

    this.size = size;
    this.order = order;
    this.pieceSize = size / order;

    const first = 0;
    const last = order - 1;

    this.mid = order % 2 === 0 ? (order - 1) / 2 : Math.floor(order / 2);

    for (let x = 0; x < order; x++) {
      // L -> R
      for (let y = 0; y < order; y++) {
        // D -> U
        for (let z = 0; z < order; z++) {
          // B -> F
          const pieceFaces: Face[] = [];

          if (x == first) pieceFaces.push(Face.L);
          if (x == last) pieceFaces.push(Face.R);
          if (y == first) pieceFaces.push(Face.D);
          if (y == last) pieceFaces.push(Face.U);
          if (z == first) pieceFaces.push(Face.B);
          if (z == last) pieceFaces.push(Face.F);

          const piece = new CubePiece(this.pieceSize, pieceFaces);
          piece.name = `CubePiece`;
          piece.userData = { faces: pieceFaces };

          const offset = new THREE.Vector3(
            x - this.mid,
            y - this.mid,
            z - this.mid,
          );
          offset.multiplyScalar(this.pieceSize);
          piece.position.set(offset.x, offset.y, offset.z);

          this.add(piece);
          this.pieces.push(piece);
        }
      }
    }

    this.helper = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
    );
    this.helper.name = `CubeHelper`;
    this.add(this.helper);
  }
}
