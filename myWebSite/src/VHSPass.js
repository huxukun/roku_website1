// VHS 复古电视后处理着色器
// 作用于场景层（Three.js 画布），实现：桶形弧面扭曲（四角形变）、扫描线、
// RGB 色差、噪点、暗角、偶发跟踪抖动，模拟老电视机画面。

export const VHSShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    resolution: { value: null },
    distortion: { value: 0.10 },       // 桶形扭曲强度（四角轻微形变）
    edgeFade: { value: 0.16 },         // 四角边缘淡出（模拟 CRT 弧面圆角）
    scanlineIntensity: { value: 0.10 },// 扫描线强度
    aberration: { value: 0.0022 },     // RGB 色差偏移
    noiseIntensity: { value: 0.045 },  // 颗粒噪点
    vignetteIntensity: { value: 0.35 },// 暗角
    glitchAmount: { value: 0.20 }      // 跟踪抖动强度
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform vec2 resolution;
    uniform float distortion;
    uniform float edgeFade;
    uniform float scanlineIntensity;
    uniform float aberration;
    uniform float noiseIntensity;
    uniform float vignetteIntensity;
    uniform float glitchAmount;
    varying vec2 vUv;

    // 伪随机
    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 centered = uv - 0.5;
      float dist2 = dot(centered, centered);

      // --- 桶形弧面扭曲：越靠边角拉伸越明显，模拟 CRT 玻璃弧面 ---
      uv = uv + centered * dist2 * distortion;

      // --- 偶发水平跟踪抖动（VHS 走带不稳）---
      float lineSeed = floor(uv.y * 40.0);
      float jitter = (rand(vec2(lineSeed, floor(time * 12.0))) - 0.5);
      float activeLine = step(0.90, rand(vec2(lineSeed, floor(time * 6.0))));
      uv.x += jitter * glitchAmount * activeLine * 0.02;

      // 轻微整屏高频抖动
      uv.x += sin(uv.y * 300.0 + time * 6.0) * 0.0006;

      // --- RGB 色差 ---
      float r = texture2D(tDiffuse, uv + vec2(aberration, 0.0)).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - vec2(aberration, 0.0)).b;
      vec3 color = vec3(r, g, b);

      // --- 扫描线（缓慢向下滚动）---
      float scan = sin((uv.y + time * 0.08) * resolution.y * 3.14159 * 0.5);
      scan = scan * 0.5 + 0.5;
      color *= 1.0 - scanlineIntensity * scan;

      // --- 移动的扫描亮带（VHS 磁头回扫）---
      float bandPos = fract(uv.y - time * 0.12);
      float band = smoothstep(0.0, 0.06, bandPos) * (1.0 - smoothstep(0.06, 0.12, bandPos));
      color += band * 0.05;

      // --- 颗粒噪点 ---
      float n = rand(uv * resolution + time * 60.0);
      color += (n - 0.5) * noiseIntensity;

      // --- 暗角 ---
      float vig = 1.0 - smoothstep(0.25, 0.85, dist2 * 2.2);
      color *= mix(1.0 - vignetteIntensity, 1.0, vig);

      // --- 四角边缘淡出：增强 CRT 弧面圆角观感 ---
      float len = length(centered);
      float edge = 1.0 - smoothstep(0.55, 0.95, len) * (1.0 - edgeFade) * 1.4;
      color *= clamp(edge, 0.0, 1.0);

      // --- 轻微冷暖偏移，模拟老电视荧光粉 ---
      color *= vec3(1.02, 1.0, 0.99);
      color = pow(color, vec3(1.03));

      gl_FragColor = vec4(color, 1.0);
    }
  `
}
