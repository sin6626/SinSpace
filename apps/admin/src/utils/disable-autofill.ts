// SinPersonalSpace：后台除登录、初始化外的输入框都不需要浏览器记住或推荐账号、邮箱、地址。
// Naive UI 的输入框默认不写 autocomplete，Chrome 会按标签文字猜（例如“邮件服务”旁边弹出已保存的邮箱）。
// 这里给所有没有显式写 autocomplete 的 input/textarea 补上：普通输入框 off，密码框 new-password（不填入已保存的密码）。
// 需要浏览器记住的地方（登录页 current-password、初始化页 email/new-password）已显式声明，不受影响。
const apply = (element: Element) => {
  if (
    (element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement) &&
    !element.hasAttribute('autocomplete')
  ) {
    element.setAttribute(
      'autocomplete',
      element instanceof HTMLInputElement && element.type === 'password'
        ? 'new-password'
        : 'off',
    )
  }
}

export function disableBrowserAutofill(root: HTMLElement = document.body) {
  root.querySelectorAll('input, textarea').forEach(apply)
  new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue
        apply(node)
        node.querySelectorAll('input, textarea').forEach(apply)
      }
    }
  }).observe(root, { childList: true, subtree: true })
}
