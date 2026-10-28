// 首屏“丛雨抱着 Sin”的素材处理：把生图得到的品红底 PNG 抠成透明，三层按同一范围裁切、缩放后导出 WebP。
// 用法：node scripts/prepare-mascot.mjs <后层.png> <闭眼后层.png> <前层手臂.png> <带字的完整构图.png>
// 四张图画布尺寸、人物位置必须一致；输出到 apps/web/public/mascot/，并打印裁切后的尺寸供 CSS 对位。
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
// sharp 是 Next 自带的图片处理依赖，不单独安装
const sharp = createRequire(createRequire(join(root, "apps/web/package.json")).resolve("next/package.json"))("sharp");

const [backPath, blinkPath, frontPath, referencePath] = process.argv.slice(2);
if (!referencePath) throw new Error("需要四个参数：后层、闭眼后层、前层手臂、带字的完整构图");

const outDir = join(root, "apps/web/public/mascot");
const outWidth = 720;
const key = [255, 0, 255];
// 与品红的颜色距离小于 near 视为背景，大于 far 视为人物，中间是发丝等半透明边缘
const near = 70;
const far = 150;

async function keyOut(path) {
  const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let p = 0, q = 0; p < data.length; p += 3, q += 4) {
    const distance = Math.hypot(data[p] - key[0], data[p + 1] - key[1], data[p + 2] - key[2]);
    const alpha = Math.min(1, Math.max(0, (distance - near) / (far - near)));
    // 半透明边缘按 C = αF + (1-α)K 反推原色，去掉渗进来的品红
    for (let c = 0; c < 3; c++) {
      out[q + c] = alpha > 0 ? Math.min(255, Math.max(0, Math.round((data[p + c] - (1 - alpha) * key[c]) / alpha))) : 0;
    }
    out[q + 3] = Math.round(alpha * 255);
  }
  return { data: out, width: info.width, height: info.height };
}

function bounds({ data, width, height }) {
  let left = width, top = height, right = 0, bottom = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  return { left, top, right, bottom };
}

// 生图给的前层连整条袖子一起画了，但参考构图里袖子在字后面、只有手压在字上。
// 参考图里能看到字母（奶白色）的地方说明前面没东西挡，把前层这些像素扣掉，只留真正压住字的手
// 肤色、白袖子上有零星像素颜色接近奶白，所以只认“周围一圈大多也是奶白”的成片区域，再向外扩约 2px 盖住字母的抗锯齿边
async function clearVisibleLetters(front, path) {
  const { data } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = front;
  const cream = new Uint8Array(width * height);
  for (let i = 0; i < cream.length; i++) {
    const [r, g, b] = [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]];
    cream[i] = r > 235 && g > 226 && g - b > 12 && r - g < 16 ? 1 : 0;
  }
  // 方框内计数用积分图：sum(x0..x1, y0..y1)
  const integral = (mask) => {
    const s = new Uint32Array((width + 1) * (height + 1));
    for (let y = 0; y < height; y++) {
      for (let x = 0, row = 0; x < width; x++) {
        row += mask[y * width + x];
        s[(y + 1) * (width + 1) + x + 1] = s[y * (width + 1) + x + 1] + row;
      }
    }
    return (x0, y0, x1, y1) => {
      [x0, y0, x1, y1] = [Math.max(0, x0), Math.max(0, y0), Math.min(width - 1, x1), Math.min(height - 1, y1)];
      return s[(y1 + 1) * (width + 1) + x1 + 1] - s[y0 * (width + 1) + x1 + 1] - s[(y1 + 1) * (width + 1) + x0] + s[y0 * (width + 1) + x0];
    };
  };
  const creamSum = integral(cream);
  const solid = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) solid[y * width + x] = creamSum(x - 6, y - 6, x + 6, y + 6) > 169 * 0.8 ? 1 : 0;
  }
  const solidSum = integral(solid);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) if (solidSum(x - 4, y - 4, x + 4, y + 4) > 0) front.data[(y * width + x) * 4 + 3] = 0;
  }
  return front;
}

const layers = { back: await keyOut(backPath), blink: await keyOut(blinkPath), front: await clearVisibleLetters(await keyOut(frontPath), referencePath) };
const all = Object.values(layers).map(bounds);
const crop = {
  left: Math.min(...all.map((b) => b.left)),
  top: Math.min(...all.map((b) => b.top)),
  width: Math.max(...all.map((b) => b.right)) - Math.min(...all.map((b) => b.left)) + 1,
  height: Math.max(...all.map((b) => b.bottom)) - Math.min(...all.map((b) => b.top)) + 1,
};

mkdirSync(outDir, { recursive: true });
for (const [name, layer] of Object.entries(layers)) {
  const info = await sharp(layer.data, { raw: { width: layer.width, height: layer.height, channels: 4 } })
    .extract(crop)
    .resize({ width: outWidth })
    .webp({ quality: 86, alphaQuality: 90, effort: 6 })
    .toFile(join(outDir, `${name}.webp`));
  console.log(name, `${info.width}x${info.height}`, `${(info.size / 1024).toFixed(1)}KB`);
}
console.log("裁切范围（原图像素）", crop);
