"use client";

import { useEffect, useRef } from "react";
import { moonPhase } from "../lib/moon";
import MoonTip from "./moon-tip";
import { useResolvedTheme } from "./use-resolved-theme";

// 首页第一屏的夜空：一张铺满的 WebGL 画布，片元着色器里画出天空渐变、淡淡的星云、三层闪烁的星星、
// 偶尔划过的流星，以及按访客当天真实月相照亮的月亮。星星和银河绕北天极缓缓转动（像真的在看夜空）。开灯时整片天空在 0.6 秒内过渡到黄昏。悬停月亮显示今晚的月相（moon-tip.tsx）。
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
uniform float uSpin;    // 星空绕北天极转过的角度（弧度）

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
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

  // 周日运动：星星和银河一起绕画面左上方外面的北天极逆时针转（地球自转），离天极越远走得越快；
  // 天空渐变、地平线的光、流星和月亮不跟着转。下面的星云、星星都在转过的坐标 sp 里取样。
  float aspect = uResolution.x / uResolution.y;
  vec2 pole = vec2(0.3 * aspect, 1.08);
  vec2 sp = pole + mat2(cos(uSpin), -sin(uSpin), sin(uSpin), cos(uSpin)) * (p - pole);
  vec2 suv = sp / vec2(aspect, 1.0);

  // 星云：一条斜着的银河，噪声让它有云絮感
  vec2 q = sp * 1.6;
  float band = exp(-pow((suv.y - 0.45 - (suv.x - 0.5) * 0.55) * 3.2, 2.0));
  float cloud = fbm(q * 2.0 + fbm(q * 1.3));
  vec3 nebula = mix(vec3(0.36, 0.22, 0.58), vec3(0.8, 0.46, 0.76), cloud) * band * pow(cloud, 2.4) * 0.4;
  sky += nebula * (1.0 - uLight * 0.8);

  // 三层星星：远处的小而密，近处的大而疏；银河里星星更多
  float starAmount = 1.0 - uLight * 0.85;
  vec3 stars = starLayer(sp, 140.0, 0.10 + band * 0.22, 0.06, t) * 0.8
             + starLayer(sp + 3.1, 70.0, 0.08 + band * 0.12, 0.07, t * 0.8)
             + starLayer(sp + 7.7, 26.0, 0.07, 0.06, t * 0.6) * 1.5;
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
    float maria = 0.82 + 0.18 * fbm(m * 2.6 + 4.0);
    vec3 moonLit = vec3(1.0, 0.96, 0.88) * maria;
    vec3 moonDark = mix(sky, vec3(0.14, 0.12, 0.2), 0.6);
    sky = mix(sky, mix(moonDark, moonLit, bright), edge);
  }

  // 一点颗粒，避免渐变出现色带
  sky += (hash(frag + fract(t)) - 0.5) / 255.0;
  gl_FragColor = vec4(sky, 1.0);
}
`;

// 星空转一圈的时间。真实的地球自转一圈约 24 小时，肉眼看不出在动，这里加快到 30 分钟一圈；
// 角度按真实时钟算，刷新页面后星空接着上次的位置，不会跳回起点。
const skyTurnSeconds = 30 * 60;
function skyAngle(time: number) {
  return ((time / 1000) % skyTurnSeconds) / skyTurnSeconds * Math.PI * 2;
}

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
  const moonRef = useRef<HTMLDivElement>(null);
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
      spin: gl.getUniformLocation(program, "uSpin"),
    };
    gl.uniform1f(uniforms.phase, moonPhase(Date.now()));

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let light = lightTarget.current;
    let visible = true;
    let frame = 0;
    let last = performance.now();
    const start = last;

    // 画布尺寸跟着元素走，像素比最多 1.5，全屏着色器在高分屏上也不会太费电。
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
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
      // 月亮的悬停区域跟着画布里的月亮走（CSS 像素，左上角为原点）
      const tip = moonRef.current;
      if (tip) {
        tip.style.left = `${moonX / ratio}px`;
        tip.style.top = `${(height - moonY) / ratio}px`;
        tip.style.setProperty("--moon-size", `${(radius * 2) / ratio}px`);
      }
    };

    const draw = (now: number) => {
      const step = Math.min((now - last) / 1000, 0.1);
      last = now;
      // 开灯 / 熄灯：0.6 秒内过渡到目标天色
      light += Math.sign(lightTarget.current - light) * Math.min(Math.abs(lightTarget.current - light), step / 0.6);
      gl.uniform1f(uniforms.light, light);
      gl.uniform1f(uniforms.time, reduceMotion ? 8 : (now - start) / 1000);
      gl.uniform1f(uniforms.spin, skyAngle(Date.now()));
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
