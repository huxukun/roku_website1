// 设备性能配置：移动端自动降载，桌面端保持满画质。
// 目标：在不损失视觉效果的前提下降低移动端 GPU 填充率与耗电。

// 触屏/粗指针或窄屏都视为移动端
const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches
const smallScreen = Math.min(window.innerWidth, window.innerHeight) <= 820
export const isMobile = !!(coarsePointer || smallScreen)

// 渲染像素比上限：
//  - 移动端 1.5：高分屏上肉眼几乎无差别，但像素量相比 2 下降约 44%
//  - 桌面端 2：维持原有满画质
export const maxPixelRatio = isMobile ? 1.5 : 2

// Bloom 内部分辨率缩放：
//  - 移动端 0.5：Bloom 本身是低频模糊，半分辨率视觉几无差别，成本约降至 1/4
//  - 桌面端 1：维持原有
export const bloomScale = isMobile ? 0.5 : 1
