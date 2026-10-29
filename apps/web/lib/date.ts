const formatter = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai" });

export function formatDate(value: string | Date) {
  return formatter.format(new Date(value));
}

const timeFormatter = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Shanghai" });

// 时:分（东八区），评论悬浮窗里每条消息旁边用
export function formatTime(value: string | Date) {
  return timeFormatter.format(new Date(value));
}
