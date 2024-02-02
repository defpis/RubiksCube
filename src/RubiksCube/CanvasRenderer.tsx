// @ts-ignore
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Config } from "./RubiksCube";
import { CubeStack } from "./CubeStack";
import { isArray, isUndefined } from "lodash";
import { CubePiece } from "./CubePiece";
import {
  AxisName,
  ROTATE_MINI_ANGLE,
  ROTATE_STEP_ANGLE,
  getMainAxisName,
  makeAxisUnit,
  toDegrees,
  toRadians,
} from "./Utils";
import { AnimationManager } from "./AnimationManager";

export type RotateAction = [AxisName, number, number];

export interface Callback {
  start?: (axisName: AxisName, stepOnAxis: number) => void;
  move?: (angle: number) => void;
  end?: () => void;
  action?: (action: RotateAction) => void;
}

class LightObject extends THREE.Object3D {
  constructor() {
    super();

    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    const front = new THREE.DirectionalLight(0xffffff, 1.0);
    const back = new THREE.DirectionalLight(0xffffff, 1.0);

    front.position.set(5, 10, 5);
    back.position.set(-5, -10, -5);

    this.add(front);
    this.add(back);
    this.add(ambient);
  }
}

export class CanvasRenderer {
  // 场景初始化
  renderer = new THREE.WebGLRenderer({ antialias: true });
  canvas = this.renderer.domElement;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();
  controls = new OrbitControls(this.camera, this.canvas);
  lightObject = new LightObject();
  raycaster = new THREE.Raycaster();

  // 魔方，在 render 时初始化
  cubeStack?: CubeStack;

  // 转动相关临时变量
  moveStart?: THREE.Vector2;
  piece?: CubePiece;
  normal?: THREE.Vector3;
  moveAxisName?: AxisName;
  rotateAxisName?: AxisName;
  stepOnRotateAxis?: number;
  pieces?: CubePiece[];
  currentAngle?: number;
  rotateStep?: number;

  callback?: Callback;

  manager = new AnimationManager<RotateAction>(
    ([rotateAxisName, stepOnRotateAxis, rotateStep]) => {
      this.rotateAxisName = rotateAxisName;
      this.stepOnRotateAxis = stepOnRotateAxis;

      if (!this.pieces) {
        this.pieces = this.cubeStack?.getLayerPieces(
          this.rotateAxisName,
          this.stepOnRotateAxis,
        );
        this.cubeStack?.attachHelper(this.pieces);

        this.callback?.start?.(this.rotateAxisName, this.stepOnRotateAxis);
      }

      if (!this.currentAngle) {
        this.currentAngle = 0;
      }

      const distAngle = rotateStep * ROTATE_STEP_ANGLE;
      const diffAngleOnStart = distAngle - this.currentAngle;

      const diffAngle = Math.abs(diffAngleOnStart);
      const diffSign = Math.sign(diffAngleOnStart);

      // 20帧完成动画
      const deltaAngle = Math.max(diffAngle / 20, ROTATE_MINI_ANGLE);

      return {
        tick: () => {
          if (
            !this.rotateAxisName ||
            isUndefined(this.currentAngle) ||
            this.currentAngle === distAngle
          ) {
            return false;
          }

          const diffAngle = Math.abs(distAngle - this.currentAngle);
          const rotateAngle = diffSign * Math.min(diffAngle, deltaAngle);

          this.currentAngle += rotateAngle;

          const rotateAxisUnit = makeAxisUnit(this.rotateAxisName);
          this.cubeStack?.helper.rotation.setFromQuaternion(
            new THREE.Quaternion().setFromAxisAngle(
              rotateAxisUnit,
              this.currentAngle,
            ),
          );

          this.callback?.move?.(this.currentAngle);

          return true;
        },
        finish: () => {
          this.reset();
          this.checkIsOK();
        },
      };
    },
  );

  checkIsOK() {
    // 动画完成后检查是否复原
    if (!this.manager.isEmpty && this.cubeStack?.checkIsOK()) {
      console.log("全部复原");
    }
  }

  constructor() {
    this.scene.background = new THREE.Color(0.9, 0.9, 0.9);
    this.scene.add(this.lightObject);

    this.camera.lookAt(this.scene.position);

    this.renderer.setAnimationLoop(() => {
      this.manager.runTask();
      this.renderer.render(this.scene, this.camera);
      this.controls.update();
    });
  }

  fromCanvasToNDC(x: number, y: number) {
    return new THREE.Vector2(
      (x / this.canvas.clientWidth) * 2 - 1,
      -(y / this.canvas.clientHeight) * 2 + 1,
    );
  }

  getFirstIntersection(
    event: PointerEvent,
    object: THREE.Object3D | THREE.Object3D[],
  ) {
    const { left, top } = this.canvas.getBoundingClientRect();
    const coords = this.fromCanvasToNDC(
      event.clientX - left,
      event.clientY - top,
    );

    this.raycaster.setFromCamera(coords, this.camera);

    const intersections = isArray(object)
      ? this.raycaster.intersectObjects(object)
      : this.raycaster.intersectObject(object);

    return intersections[0];
  }

  init(config: Config) {
    this.camera.position.set(2, 2, 2);

    this.cubeStack = new CubeStack(1, config.order);
    this.scene.add(this.cubeStack);

    return () => {
      this.cubeStack?.removeFromParent();
    };
  }

  setCallback(callback: Callback) {
    this.callback = callback;
  }

  resize(width: number, height: number, dpr: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height);
  }

  reset() {
    this.cubeStack?.detachHelper(this.pieces);

    this.moveStart = undefined;
    this.piece = undefined;
    this.normal = undefined;
    this.moveAxisName = undefined;
    this.rotateAxisName = undefined;
    this.stepOnRotateAxis = undefined;
    this.pieces = undefined;
    this.currentAngle = undefined;
    this.rotateStep = undefined;

    this.callback?.end?.();
  }

  down = (event: PointerEvent) => {
    if (!this.cubeStack || this.manager.isRunning) return;

    const pieceInt = this.getFirstIntersection(event, this.cubeStack.pieces);
    if (pieceInt?.object.parent?.name === "CubePiece") {
      this.piece = pieceInt.object.parent as CubePiece;
    }

    const helperInt = this.getFirstIntersection(event, this.cubeStack.helper);
    if (helperInt?.object.name === "CubeHelper" && helperInt?.face?.normal) {
      this.normal = helperInt.face.normal;
    }

    // 选中魔方
    if (this.piece && this.normal) {
      document.addEventListener("pointermove", this.move);
      document.addEventListener("pointerup", this.up);

      this.controls.enabled = false;

      // 记录起始位置
      const { left, top } = this.canvas.getBoundingClientRect();
      this.moveStart = new THREE.Vector2(
        event.clientX - left,
        event.clientY - top,
      );
    }
  };

  move = (event: PointerEvent) => {
    if (!this.cubeStack || !this.piece || !this.normal || !this.moveStart) {
      return;
    }

    const { left, top } = this.canvas.getBoundingClientRect();
    const moveEnd = new THREE.Vector2(
      event.clientX - left,
      event.clientY - top,
    );

    const moveVec = new THREE.Vector3(
      moveEnd.x - this.moveStart.x,
      -(moveEnd.y - this.moveStart.y),
      0,
    );

    const globalMoveVec = moveVec.applyEuler(this.camera.rotation);
    const localMoveVec = this.cubeStack.worldToLocal(globalMoveVec);
    const localCrossVec = localMoveVec.clone().cross(this.normal);

    if (!this.moveAxisName || !this.rotateAxisName) {
      const moveAxisName = getMainAxisName(localMoveVec);

      const vecOnMaxMoveAxis = new THREE.Vector3();
      vecOnMaxMoveAxis[moveAxisName] = localMoveVec[moveAxisName];

      const lenOnMaxMoveAxis = vecOnMaxMoveAxis.length();
      const angleOnMaxMoveAxis = vecOnMaxMoveAxis.angleTo(localMoveVec);

      // 沿某个轴至少移动10px且落在以最大位移轴构成的120度圆锥内，xyz刚好均分360度，能保证没有死区
      if (lenOnMaxMoveAxis < 10 || toDegrees(angleOnMaxMoveAxis) > 60) {
        return;
      }

      this.moveAxisName = moveAxisName;
      this.rotateAxisName = getMainAxisName(localCrossVec);

      const offsetOnRotateAxis = this.piece.position[this.rotateAxisName];
      this.stepOnRotateAxis = this.cubeStack.calcStep(offsetOnRotateAxis);

      this.pieces = this.cubeStack.getLayerPieces(
        this.rotateAxisName,
        this.stepOnRotateAxis,
      );
      this.cubeStack.attachHelper(this.pieces);

      this.callback?.start?.(this.rotateAxisName, this.stepOnRotateAxis);
    }

    const fov = this.camera.getEffectiveFOV();
    const distance = this.cubeStack.position
      .clone()
      .sub(this.camera.position)
      .length();

    const r1 = distance * Math.tan(toRadians(fov / 2)); // ndc坐标系半个屏幕高度
    const r2 = this.cubeStack.size / 2; // ndc坐标系半个魔方高度
    const r3 = this.canvas.clientHeight / 2; // canvas 坐标系半个屏幕高度

    // (canvas 坐标系半个魔方高度) / r3 == r2 / r1

    const rotateSpeedRatio = (1 / ((r2 / r1) * r3)) * 50; // 反比例相关，越小越灵敏

    const rotateDirection = -Math.sign(localCrossVec[this.rotateAxisName]);
    const rotateAngle = toRadians(Math.abs(localMoveVec[this.moveAxisName]));

    this.currentAngle = rotateDirection * rotateSpeedRatio * rotateAngle;
    this.rotateStep = Math.round(this.currentAngle / ROTATE_STEP_ANGLE);

    const rotateAxisUnit = makeAxisUnit(this.rotateAxisName);
    this.cubeStack.helper.rotation.setFromQuaternion(
      new THREE.Quaternion().setFromAxisAngle(
        rotateAxisUnit,
        this.currentAngle,
      ),
    );

    this.callback?.move?.(this.currentAngle);
  };

  up = () => {
    document.removeEventListener("pointermove", this.move);
    document.removeEventListener("pointerup", this.up);

    this.controls.enabled = true;

    // 执行后续动画
    if (
      this.rotateAxisName &&
      !isUndefined(this.stepOnRotateAxis) &&
      !isUndefined(this.rotateStep)
    ) {
      const action: RotateAction = [
        this.rotateAxisName,
        this.stepOnRotateAxis,
        this.rotateStep,
      ];
      this.manager.addAction(action);
      this.callback?.action?.(action);
    } else {
      this.reset();
    }
  };

  undo(action: RotateAction) {
    const newAction: RotateAction = [action[0], action[1], -action[2]];
    this.manager.addAction(newAction);
  }

  render(config: Config) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const container = ref.current;
      if (!container) return;
      container.appendChild(this.canvas);

      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          const { width, height } = container.getBoundingClientRect();
          this.resize(width, height, devicePixelRatio);
        });
      });
      resizeObserver.observe(container);

      let remove: () => void;
      const onPixelRatioChange = () => {
        remove?.();

        const query = `(resolution: ${devicePixelRatio}dppx)`;
        const media = matchMedia(query);

        media.addEventListener("change", onPixelRatioChange);
        remove = () => media.removeEventListener("change", onPixelRatioChange);

        const { width, height } = container.getBoundingClientRect();
        this.resize(width, height, devicePixelRatio);
      };
      onPixelRatioChange();

      this.canvas.addEventListener("pointerdown", this.down);
    }, []);

    useEffect(() => {
      return this.init(config);
    }, [config]);

    return <div className="full" ref={ref}></div>;
  }
}
