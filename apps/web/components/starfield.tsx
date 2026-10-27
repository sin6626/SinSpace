"use client";

import { useEffect, useRef } from "react";
import { moonPhase } from "../lib/moon";
import MoonTip from "./moon-tip";
import { useResolvedTheme } from "./use-resolved-theme";

// 首页第一屏的夜空：一张铺满的 WebGL 画布，片元着色器里画出天空渐变、像流体一样缓缓翻涌的星云（多层噪声互相扭曲）、
// 三层闪烁的星星、偶尔划过的流星，以及按访客当天真实月相照亮的月亮。鼠标划过时，附近的星云会被搅动成漩涡，停下后慢慢平复。
// 开灯时整片天空在 0.6 秒内过渡到黄昏。悬停月亮显示今晚的月相（moon-tip.tsx）。
// 场景离开视野或标签页隐藏时停止绘制；“减少动态效果”时只画一帧静止的夜空；浏览器不支持 WebGL 时退回 CSS 渐变。

const vertexSource = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

const fragmentSource = `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uLight;   // 0 夜里，1 黄昏
uniform float uPhase;   // 月相：0 新月，0.5 满月
uniform vec3 uMoon;     // 月亮圆心（像素）和半径（像素）
uniform vec3 uMouse;    // 鼠标位置（像素）和搅动强度（0–1）
uniform vec2 uFlow;     // 鼠标划过的速度（以画面高度为单位）

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

// 每层之间旋转一下，叠出来的云不会沿横竖方向出现条纹
const mat2 turn = mat2(0.8, 0.6, -0.6, 0.8);
float fbm(vec2 p, int octaves) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    v += a * noise(p);
    p = turn * p * 2.03;
    a *= 0.5;
  }
  return v;
}

// 一层星星：把画面切成格子，每格最多一颗，位置、亮度、颜色、闪烁节奏都由格子编号决定。
vec3 starLayer(vec2 p, float scale, float density, float size, float t) {
  vec2 g = p * scale;
  vec2 cell = floor(g);
  vec2 local = fract(g);
  float pick = hash(cell);
  if (pick > density) return vec3(0.0);
  vec2 pos = 0.15 + 0.7 * hash2(cell + 7.0);
  float d = length(local - pos);
  float twinkle = 0.55 + 0.45 * sin(t * (0.6 + 2.2 * hash(cell + 3.0)) + 6.2831 * hash(cell + 11.0));
  float core = smoothstep(size, 0.0, d);
  float halo = 0.25 * smoothstep(size * 5.0, 0.0, d);
  float tone = hash(cell + 19.0);
  vec3 tint = tone < 0.6 ? vec3(1.0, 0.97, 1.0) : tone < 0.82 ? vec3(0.78, 0.84, 1.0) : vec3(1.0, 0.82, 0.95);
  return tint * (core + halo) * twinkle * (0.5 + 0.5 * hash(cell + 5.0));
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uResolution;
  vec2 p = frag / uResolution.y;   // 以高度为单位，星星在宽屏上不会被拉伸
  float t = uTime;

  // 天空：夜里从紫黑到深紫，黄昏从淡紫到粉橘；地平线附近有一层暖光
  vec3 nightTop = vec3(0.016, 0.012, 0.043), nightLow = vec3(0.082, 0.055, 0.16);
  vec3 duskTop = vec3(0.62, 0.55, 0.82), duskLow = vec3(1.0, 0.8, 0.78);
  vec3 sky = mix(mix(nightLow, nightTop, pow(uv.y, 0.8)), mix(duskLow, duskTop, pow(uv.y, 0.9)), uLight);
  sky += mix(vec3(0.12, 0.05, 0.16), vec3(0.18, 0.08, 0.04), uLight) * pow(1.0 - uv.y, 3.0);

  // 鼠标搅动：离鼠标越近，坐标绕鼠标转得越多，并顺着划过的方向被推开一点
  vec2 mp = uMouse.xy / uResolution.y;
  vec2 dm = p - mp;
  float swirl = exp(-dot(dm, dm) * 14.0) * uMouse.z;
  float ang = swirl * 2.2;
  vec2 w = mp + mat2(cos(ang), sin(ang), -sin(ang), cos(ang)) * dm - uFlow * swirl * 0.6;

  // 星云：三层噪声互相扭曲（domain warping），每层用不同的速度流动，看起来像缓慢翻涌的液体；
  // 主要集中在一条斜着的银河上，银河外也留一层很淡的薄雾
  vec2 q0 = w * 1.4;
  float slow = t * 0.035;
  vec2 q = vec2(fbm(q0 + vec2(0.0, slow), 4), fbm(q0 + vec2(5.2, 1.3) - vec2(slow * 0.7, 0.0), 4));
  vec2 warp = vec2(fbm(q0 + 3.2 * q + vec2(1.7, 9.2) + slow * 0.6, 4), fbm(q0 + 3.2 * q + vec2(8.3, 2.8) - slow * 0.5, 4));
  float cloud = fbm(q0 + 3.6 * warp, 5);
  float band = exp(-pow((uv.y - 0.45 - (uv.x - 0.5) * 0.55 + (q.x - 0.5) * 0.35) * 2.4, 2.0));
  vec3 deep = vec3(0.10, 0.08, 0.32), violet = vec3(0.42, 0.24, 0.66), rose = vec3(0.86, 0.48, 0.78), ice = vec3(0.55, 0.68, 0.98);
  vec3 tone = mix(deep, violet, smoothstep(0.2, 0.7, cloud));
  tone = mix(tone, rose, smoothstep(0.45, 0.9, warp.x) * 0.75);
  tone = mix(tone, ice, smoothstep(0.55, 0.95, q.y) * 0.35);
  float density = pow(smoothstep(0.25, 0.95, cloud), 1.6);
  vec3 nebula = tone * density * (0.12 + band * 0.55) + tone * swirl * density * 0.25;
  sky += nebula * (1.0 - uLight * 0.75);

  // 三层星星：远处的小而密，近处的大而疏；银河里星星更多
  float starAmount = 1.0 - uLight * 0.85;
  vec3 stars = starLayer(p, 140.0, 0.10 + band * 0.22, 0.06, t) * 0.8
             + starLayer(p + 3.1, 70.0, 0.08 + band * 0.12, 0.07, t * 0.8)
             + starLayer(p + 7.7, 26.0, 0.07, 0.06, t * 0.6) * 1.5;
  sky += stars * starAmount;

  // 流星：每 23 秒一颗，划过约 1 秒，起点和方向每次不同
  float period = 23.0;
  float k = floor(t / period);
  float life = fract(t / period) * period;
  if (life < 1.1 && uLight < 0.5) {
    vec2 start = vec2(0.2 + 0.6 * hash(vec2(k, 1.0)), 0.75 + 0.2 * hash(vec2(k, 2.0))) * vec2(uResolution.x / uResolution.y, 1.0);
    vec2 dir = normalize(vec2(-0.85 - 0.3 * hash(vec2(k, 3.0)), -0.45));
    vec2 head = start + dir * life * 0.55;
    vec2 rel = p - head;
    float along = dot(rel, -dir);
    float across = length(rel + dir * along);
    float tail = smoothstep(0.22, 0.0, along) * step(0.0, along);
    float fade = smoothstep(0.0, 0.15, life) * smoothstep(1.1, 0.7, life);
    sky += vec3(0.95, 0.9, 1.0) * tail * smoothstep(0.0025, 0.0, across) * fade * 1.4;
  }

  // 月亮：圆盘按月相分出亮面和暗面，亮面带一点噪声做的月海，周围一圈光晕
  vec2 m = (frag - uMoon.xy) / uMoon.z;
  float r = length(m);
  float lit = (1.0 - cos(6.2831 * uPhase)) * 0.5;
  // 光晕从月面中心一直延伸出去，月亮边缘和光晕之间不会出现一圈暗缝
  float glow = exp(-max(r - 0.9, 0.0) * 2.4) * (0.18 + 0.5 * lit) * (1.0 - smoothstep(0.0, 1.0, max(r - 1.0, 0.0) / 6.0));
  sky += mix(vec3(0.95, 0.85, 1.0), vec3(1.0, 0.95, 0.9), uLight) * glow * mix(0.55, 0.35, uLight);
  if (r < 1.02) {
    float edge = smoothstep(1.0, 1.0 - 2.0 / uMoon.z, r);
    float s = sqrt(max(1.0 - m.y * m.y, 0.0));
    float c = cos(6.2831 * uPhase);
    float side = uPhase < 0.5 ? m.x - c * s : -c * s - m.x;
    float bright = smoothstep(-0.04, 0.04, side);
    float maria = 0.82 + 0.18 * fbm(m * 2.6 + 4.0, 5);
    vec3 moonLit = vec3(1.0, 0.96, 0.88) * maria;
    vec3 moonDark = mix(sky, vec3(0.14, 0.12, 0.2), 0.6);
    sky = mix(sky, mix(moonDark, moonLit, bright), edge);
  }

  // 一点颗粒，避免渐变出现色带
  sky += (hash(frag + fract(t)) - 0.5) / 255.0;
  gl_FragColor = vec4(sky, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moonRef = useRef<HTMLButtonElement>(null);
  const theme = useResolvedTheme();
  // 目标天色交给绘制循环读取（开灯 1，熄灯 0），循环里再慢慢过渡过去。
  const lightTarget = useRef(theme === "light" ? 1 : 0);
  useEffect(() => {
    lightTarget.current = theme === "light" ? 1 : 0;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!canvas || !gl) {
      canvas?.setAttribute("data-fallback", "");
      return;
    }
    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) {
      canvas.setAttribute("data-fallback", "");
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniforms = {
      resolution: gl.getUniformLocation(program, "uResolution"),
      time: gl.getUniformLocation(program, "uTime"),
      light: gl.getUniformLocation(program, "uLight"),
      phase: gl.getUniformLocation(program, "uPhase"),
      moon: gl.getUniformLocation(program, "uMoon"),
      mouse: gl.getUniformLocation(program, "uMouse"),
      flow: gl.getUniformLocation(program, "uFlow"),
    };
    gl.uniform1f(uniforms.phase, moonPhase(Date.now()));

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let light = lightTarget.current;
    let visible = true;
    let frame = 0;
    let last = performance.now();
    const start = last;
    let ratio = 1;
    // 鼠标：目标位置跟着指针走，画面里的位置平滑追上去；每次移动把搅动强度拉满，停下后约 1.5 秒平复
    const pointer = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, vx: 0, vy: 0, strength: 0, moved: false };
    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.tx = (event.clientX - rect.left) * ratio;
      pointer.ty = (rect.bottom - event.clientY) * ratio;
      if (pointer.x < -1e3) {
        pointer.x = pointer.tx;
        pointer.y = pointer.ty;
      }
      pointer.moved = true;
    };

    // 画布尺寸跟着元素走，像素比最多 1.5，全屏着色器在高分屏上也不会太费电。
    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 1.25);
      const width = Math.round(canvas.clientWidth * ratio);
      const height = Math.round(canvas.clientHeight * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uniforms.resolution, width, height);
      // 月亮放在右上方；竖屏（手机）时缩小，放在导航栏和标题之间的右上角，不压住文字
      const portrait = height > width;
      const radius = portrait ? width * 0.045 : Math.min(width, height) * 0.055;
      const moonX = width * (portrait ? 0.84 : 0.86);
      const moonY = portrait ? height - radius * 4.2 : height * 0.8;
      gl.uniform3f(uniforms.moon, moonX, moonY, radius);
      // 悬停热区跟着月亮走（CSS 像素，左上角为原点）
      const tip = moonRef.current;
      if (tip) {
        tip.style.left = `${moonX / ratio}px`;
        tip.style.top = `${(height - moonY) / ratio}px`;
        tip.style.setProperty("--moon-size", `${(radius * 2.4) / ratio}px`);
      }
    };

    const draw = (now: number) => {
      const step = Math.min((now - last) / 1000, 0.1);
      last = now;
      // 开灯 / 熄灯：0.6 秒内过渡到目标天色
      light += Math.sign(lightTarget.current - light) * Math.min(Math.abs(lightTarget.current - light), step / 0.6);
      gl.uniform1f(uniforms.light, light);
      const ease = 1 - Math.exp(-step * 6);
      const px = pointer.x, py = pointer.y;
      pointer.x += (pointer.tx - pointer.x) * ease;
      pointer.y += (pointer.ty - pointer.y) * ease;
      // 速度换算成“画面高度 / 秒”的小量，再平滑一下，避免一帧一跳
      const height = canvas.height || 1;
      pointer.vx += ((pointer.x - px) / height / Math.max(step, 0.001) * 0.05 - pointer.vx) * ease;
      pointer.vy += ((pointer.y - py) / height / Math.max(step, 0.001) * 0.05 - pointer.vy) * ease;
      pointer.strength = pointer.moved ? Math.min(1, pointer.strength + step * 4) : Math.max(0, pointer.strength - step / 1.5);
      pointer.moved = false;
      gl.uniform3f(uniforms.mouse, pointer.x, pointer.y, pointer.strength);
      gl.uniform2f(uniforms.flow, pointer.vx, pointer.vy);
      gl.uniform1f(uniforms.time, reduceMotion ? 8 : (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (now: number) => {
      draw(now);
      frame = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const wake = () => {
      if (!frame && visible && !document.hidden) {
        last = performance.now();
        frame = requestAnimationFrame(reduceMotion ? (now) => { light = lightTarget.current; draw(now); frame = 0; } : loop);
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake();
    });
    observer.observe(canvas);
    const resizeObserver = new ResizeObserver(() => {
      resize();
      wake();
    });
    resizeObserver.observe(canvas);
    document.addEventListener("visibilitychange", wake);
    if (!reduceMotion) window.addEventListener("pointermove", onPointer, { passive: true });
    // 减少动态效果时没有循环，主题变化要主动重画一帧
    const themeObserver = new MutationObserver(() => requestAnimationFrame(wake));
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    resize();
    wake();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("pointermove", onPointer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="starfield" aria-hidden="true" />
      <MoonTip ref={moonRef} />
    </>
  );
}
