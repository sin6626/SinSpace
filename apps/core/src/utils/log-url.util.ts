// 写日志、推送告警前隐藏地址里的敏感参数：加密手记的访问密码（GET /notes/nid/:nid?password=）、
// 邮件退订链接里的订阅者邮箱与退订令牌（GET /subscribe/unsubscribe?email=&cancelToken=）都在查询参数里。
export const redactUrl = (url: string) =>
  url.replace(/([?&](?:password|token|secret|cancelToken|email)=)[^&#]*/gi, '$1***')

// 写日志前隐藏 JSON 里的敏感字段值：后台改 OAuth、邮件、对象存储等配置时，Redis 事件会把整份配置（含 clientSecret、
// 密码、API Key）原样打进开发日志。字段名含 secret/password/pass/token/apikey 的字符串值一律换成 ***。
export const redactJson = (json: string) =>
  json.replace(
    /("[^"]*(?:secret|password|pass|token|api_?key)[^"]*"\s*:\s*)"(?:[^"\\]|\\.)*"/gi,
    '$1"***"',
  )
