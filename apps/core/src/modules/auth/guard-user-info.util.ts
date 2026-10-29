// 取第三方用户资料的网络请求断了（本地直连 GitHub 不稳）时，Better Auth 不处理、直接 500，读者停在错误页，
// 再次请求回调又因登录状态已用掉而失败（state_mismatch）。这里把异常转成“没取到资料”（null），
// Better Auth 会按 unable_to_get_user_info 跳回发起登录时的失败地址（博客原页面）。检查：scripts/verify-core-auth-userinfo.mjs
type Provider = { id: string; getUserInfo: (token: any) => Promise<unknown> }

export function guardUserInfo(
  providers: Provider[],
  log: (message: string, error: unknown) => void,
) {
  for (const provider of providers) {
    const getUserInfo = provider.getUserInfo.bind(provider)
    provider.getUserInfo = async (token) => {
      try {
        return await getUserInfo(token)
      } catch (error) {
        log(`[${provider.id}] 获取第三方用户资料失败`, error)
        return null
      }
    }
  }
}
