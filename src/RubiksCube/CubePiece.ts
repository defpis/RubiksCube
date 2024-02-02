import * as THREE from "three";
import { RoundedCubeGeometry, RoundedPlaneGeometry } from "./CubeGeometry";

export enum Face {
  L = "L",
  R = "R",
  D = "D",
  U = "U",
  B = "B",
  F = "F",
}

export const FACE_ROTATE_AXISES = {
  [Face.L]: new THREE.Vector3(-1, 0, 0),
  [Face.R]: new THREE.Vector3(1, 0, 0),
  [Face.D]: new THREE.Vector3(0, -1, 0),
  [Face.U]: new THREE.Vector3(0, 1, 0),
  [Face.B]: new THREE.Vector3(0, 0, -1),
  [Face.F]: new THREE.Vector3(0, 0, 1),
};

export const FACES = [Face.L, Face.R, Face.D, Face.U, Face.B, Face.F] as const;

export const FaceColors: Record<Face, string> = {
  [Face.L]: "#82ca38", // green
  [Face.R]: "#41aac8", // blue
  [Face.D]: "#ffef48", // yellow
  [Face.U]: "#fff7ff", // white
  [Face.B]: "#ff8c0a", // orange
  [Face.F]: "#ef3923", // red
};

export class CubePiece extends THREE.Object3D {
  faces: THREE.Mesh<
    RoundedPlaneGeometry,
    THREE.MeshLambertMaterial,
    THREE.Object3DEventMap
  >[] = [];

  constructor(size = 1, faces: Face[] = [...FACES]) {
    super();

    const mainMaterial = new THREE.MeshLambertMaterial();

    const cubeGeometry = new RoundedCubeGeometry(size, 0.12, 10);
    const faceGeometry = new RoundedPlaneGeometry(size, size * 0.01, 0.15, 10);

    const cubeMesh = new THREE.Mesh(cubeGeometry.clone(), mainMaterial.clone());
    cubeMesh.name = `CubeMesh`;
    cubeMesh.material.color.setStyle("#08101a"); // black
    this.add(cubeMesh);

    const halfSize = size / 2;
    const halfPI = Math.PI / 2;

    faces.forEach((face) => {
      const faceMesh = new THREE.Mesh(
        faceGeometry.clone(),
        mainMaterial.clone(),
      );
      faceMesh.name = `FaceMesh`;
      faceMesh.userData = { face };

      const idx = FACES.findIndex((item) => item === face);

      faceMesh.position.set(
        halfSize * [-1, 1, 0, 0, 0, 0][idx],
        halfSize * [0, 0, -1, 1, 0, 0][idx],
        halfSize * [0, 0, 0, 0, -1, 1][idx],
      );

      faceMesh.rotation.set(
        halfPI * [0, 0, 1, -1, 0, 0][idx],
        halfPI * [-1, 1, 0, 0, 2, 0][idx],
        0,
      );

      faceMesh.scale.set(0.85, 0.85, 0.85);
      faceMesh.material.color.setStyle(FaceColors[face]);

      this.add(faceMesh);
      this.faces.push(faceMesh);
    });
  }
}
