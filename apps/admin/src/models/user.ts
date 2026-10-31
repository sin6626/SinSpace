export interface UserModel {
  ok?: number
  id: string
  introduce?: string
  mail?: string
  url?: string
  name: string
  // 微信、QQ 这类“名片”平台存 { id, qr }（号码 + 二维码地址），见 constants/social.ts
  socialIds?: Record<string, string | number | { id?: string; qr?: string }>
  username: string
  role?: 'reader' | 'owner'
  email?: string
  image?: string
  handle?: string
  displayUsername?: string
  created?: string | Date
  modified?: string | Date
  v?: number
  lastLoginTime?: string
  lastLoginIp?: string
  avatar?: string
  postID?: string
}
