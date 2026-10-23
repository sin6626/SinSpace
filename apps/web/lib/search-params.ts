// 读取地址栏里的文本参数（搜索词、标签、话题），去掉首尾空白并限制长度；数组或缺省视为空。
export function readText(value: string | string[] | undefined, maxLength = 50) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
