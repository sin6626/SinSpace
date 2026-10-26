// 写日志、推送告警前隐藏地址里的敏感参数：加密手记的访问密码（GET /notes/nid/:nid?password=）、
// 邮件退订链接里的订阅者邮箱与退订令牌（GET /subscribe/unsubscribe?email=&cancelToken=）都在查询参数里。
export const redactUrl = (url: string) =>
  url.replace(/([?&](?:password|token|secret|cancelToken|email)=)[^&#]*/gi, '$1***')
