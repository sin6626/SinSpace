// 后台填写的地址只放行 http(s)，避免 javascript: 等协议。
export const safeUrl = (value?: string) => value && /^https?:\/\//i.test(value) ? value : undefined;
