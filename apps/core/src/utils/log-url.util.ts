// 写日志、推送告警前隐藏地址里的敏感参数：加密手记的访问密码是放在查询参数里传的（GET /notes/nid/:nid?password=）。
export const redactUrl = (url: string) =>
  url.replace(/([?&](?:password|token|secret)=)[^&#]*/gi, '$1***')
