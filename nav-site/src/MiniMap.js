/**
 * MiniMap - 左上角3D俯视迷你地图
 * 纯 Three.js 实现，GPS 定位点 + 朝向指示
 */

import * as THREE from 'three';

export class MiniMap {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.init();
    this.setupResize();

    this.currentPosition = null;    // { x, z }  地图本地坐标
    this.heading = 0;                // 朝向角度（度）
    this.hasTarget = false;
    this.targetOffset = null;        // 相对当前位置的目标偏移
  }

  init() {
    // --- 场景 ---
    this.scene = new THREE.Scene();
    this.scene.background = null;   // 透明背景，依赖 CSS 背景色
    this.scene.fog = new THREE.Fog(0x000010, 20, 120);

    // --- 相机（俯视 45 度） ---
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
    this.camera.position.set(0, 35, 25);
    this.camera.lookAt(0, 0, 0);

    // --- 渲染器 ---
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);  // 透明
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.resize();

    // --- 灯光 ---
    const ambient = new THREE.AmbientLight(0x88ccff, 0.5);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0x00ffff, 0.7);
    dirLight.position.set(10, 30, 10);
    this.scene.add(dirLight);

    // --- 网格地面（发光网格） ---
    const gridSize = 200;
    const gridDivisions = 40;

    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions,
      0x00ffff,    // 主线颜色
      0x004466     // 次级颜色（更暗）
    );
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.25;
    this.scene.add(gridHelper);

    // --- 粗网格外圈（十字导航线） ---
    const crossLineMat = new THREE.LineBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.6
    });
    const crossGeo1 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-80, 0.02, 0),
      new THREE.Vector3(80, 0.02, 0)
    ]);
    const crossGeo2 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.02, -80),
      new THREE.Vector3(0, 0.02, 80)
    ]);
    this.scene.add(new THREE.Line(crossGeo1, crossLineMat));
    this.scene.add(new THREE.Line(crossGeo2, crossLineMat));

    // --- 中心圆盘（装饰） ---
    const ringGeo = new THREE.RingGeometry(1.5, 2.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    this.centerRing = new THREE.Mesh(ringGeo, ringMat);
    this.centerRing.rotation.x = -Math.PI / 2;
    this.centerRing.position.y = 0.05;
    this.scene.add(this.centerRing);

    // --- 当前位置点（发光圆点） ---
    const userGeo = new THREE.CircleGeometry(0.8, 24);
    const userMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    this.userDot = new THREE.Mesh(userGeo, userMat);
    this.userDot.rotation.x = -Math.PI / 2;
    this.userDot.position.set(0, 0.1, 0);
    this.scene.add(this.userDot);

    // 用户光晕
    const glowGeo = new THREE.RingGeometry(1.2, 2.0, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    this.userGlow = new THREE.Mesh(glowGeo, glowMat);
    this.userGlow.rotation.x = -Math.PI / 2;
    this.userGlow.position.set(0, 0.08, 0);
    this.scene.add(this.userGlow);

    // --- 方向箭头（三角形，指向朝向） ---
    // 指向 +Z 方向的三角形
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0, 3);
    arrowShape.lineTo(-1.5, -1.5);
    arrowShape.lineTo(0, -0.5);
    arrowShape.lineTo(1.5, -1.5);
    arrowShape.lineTo(0, 3);

    const arrowGeo = new THREE.ShapeGeometry(arrowShape);
    const arrowMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    this.headingArrow = new THREE.Mesh(arrowGeo, arrowMat);
    this.headingArrow.rotation.x = -Math.PI / 2;
    this.headingArrow.position.set(0, 0.12, 0);
    this.scene.add(this.headingArrow);

    // --- 目标点（如果设置了目的地） ---
    const targetGeo = new THREE.RingGeometry(0.6, 1.0, 20);
    const targetMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    this.targetDot = new THREE.Mesh(targetGeo, targetMat);
    this.targetDot.rotation.x = -Math.PI / 2;
    this.targetDot.position.y = 0.1;
    this.targetDot.visible = false;
    this.scene.add(this.targetDot);

    // 目标内实心点
    const targetInnerGeo = new THREE.CircleGeometry(0.5, 16);
    const targetInnerMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    this.targetInner = new THREE.Mesh(targetInnerGeo, targetInnerMat);
    this.targetInner.rotation.x = -Math.PI / 2;
    this.targetInner.position.y = 0.15;
    this.targetInner.visible = false;
    this.scene.add(this.targetInner);

    // --- 起点到目标的虚线轨迹 ---
    this.trackLine = null;

    // 启动动画循环
    this.clock = new THREE.Clock();
    this.animate();
  }

  resize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w <= 0 || h <= 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setupResize() {
    window.addEventListener('resize', () => this.resize());
    // 延迟一点再 resize（等待 CSS 布局稳定）
    setTimeout(() => this.resize(), 200);
    setTimeout(() => this.resize(), 1000);
  }

  /**
   * 设置当前用户位置（地图本地坐标）
   * x, z 为相对起点的米坐标（东/北）
   */
  setPosition(x, z) {
    if (!this.userDot) return;
    this.currentPosition = { x, z };
    this.userDot.position.set(x, 0.1, z);
    this.userGlow.position.set(x, 0.08, z);
    this.headingArrow.position.set(x, 0.12, z);
    this.centerRing.position.set(x, 0.05, z);
  }

  /**
   * 设置朝向角度（度）0=北, 顺时针增加
   */
  setHeading(headingDeg) {
    if (!this.headingArrow) return;
    this.heading = headingDeg;
    // Three.js 中 -Z 是北向；heading 顺时针
    // arrow 默认指向 +Z（我们绘制时 +Y 是顶点，旋转到地面后顶点在 +Z）
    const rad = THREE.MathUtils.degToRad(headingDeg);
    // 让 arrow 的顶点朝向 heading 的方向（绕 Y 轴旋转）
    this.headingArrow.rotation.z = -rad;
  }

  /**
   * 设置目标点，相对于当前位置的偏移（米）
   * dx: 东向偏移，dz: 北向偏移
   */
  setTarget(dx, dz) {
    this.hasTarget = true;
    this.targetOffset = { dx, dz };
    if (this.currentPosition) {
      const tx = this.currentPosition.x + dx;
      const tz = this.currentPosition.z + dz;
      this.targetDot.position.set(tx, 0.1, 0);
      this.targetDot.position.z = tz;
      this.targetDot.visible = true;
      this.targetInner.position.set(tx, 0.15, 0);
      this.targetInner.position.z = tz;
      this.targetInner.visible = true;

      // 画一条虚线从用户到目标
      this.updateTrackLine();
    }
  }

  updateTrackLine() {
    if (!this.currentPosition || !this.hasTarget) return;
    if (this.trackLine) {
      this.scene.remove(this.trackLine);
      this.trackLine.geometry.dispose();
      this.trackLine.material.dispose();
    }
    const start = new THREE.Vector3(this.currentPosition.x, 0.05, this.currentPosition.z);
    const end = new THREE.Vector3(
      this.currentPosition.x + this.targetOffset.dx,
      0.05,
      this.currentPosition.z + this.targetOffset.dz
    );
    const dist = start.distanceTo(end);
    // 根据距离生成中间虚线段（每 2 米一段）
    const segCount = Math.max(2, Math.floor(dist / 2));
    const points = [];
    for (let i = 0; i <= segCount; i++) {
      const t = i / segCount;
      const p = start.clone().lerp(end, t);
      points.push(p);
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: 0xffaa00,
      dashSize: 1.0,
      gapSize: 0.8,
      transparent: true,
      opacity: 0.8
    });
    this.trackLine = new THREE.Line(geo, mat);
    this.trackLine.computeLineDistances();
    this.scene.add(this.trackLine);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (!this.renderer || !this.scene || !this.camera) return;

    const t = this.clock.getElapsedTime();

    // 中心环缓慢旋转
    if (this.centerRing) {
      this.centerRing.rotation.z += 0.01;
    }
    // 光晕脉冲
    if (this.userGlow) {
      this.userGlow.scale.setScalar(1 + Math.sin(t * 3) * 0.1);
    }
    // 目标点闪烁
    if (this.targetDot && this.targetDot.visible) {
      this.targetDot.rotation.z += 0.03;
      this.targetInner.scale.setScalar(1 + Math.sin(t * 4) * 0.15);
    }

    // 相机微微俯视角并跟随用户位置
    if (this.currentPosition) {
      this.camera.position.x = this.currentPosition.x;
      this.camera.position.z = this.currentPosition.z + 25;
      this.camera.lookAt(this.currentPosition.x, 0, this.currentPosition.z);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
