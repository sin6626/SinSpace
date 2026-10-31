// 个人资料“社交链接”里微信、QQ 这类没有网页主页的平台，值是对象 { id?, qr? }，qr 是后台上传到图床的二维码。
// 这些图片要登记为已引用（FileReferenceType.Owner），否则 Core 每小时会把上传超过 60 分钟、没人引用的图片删掉。
export function socialImageUrls(socialIds: unknown): string[] {
  if (!socialIds || typeof socialIds !== 'object') return []
  const urls = Object.values(socialIds as Record<string, unknown>).flatMap(
    (value) => {
      const qr =
        value && typeof value === 'object'
          ? (value as { qr?: unknown }).qr
          : undefined
      return typeof qr === 'string' && /^https?:\/\//i.test(qr) ? [qr] : []
    },
  )
  return [...new Set(urls)]
}
