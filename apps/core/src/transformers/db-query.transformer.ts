export const addYearCondition = (year?: number) => {
  if (!year) {
    return {}
  }
  return {
    // JS 月份从 0 开始：取当年 1 月 1 日到次年 1 月 1 日（不含）。
    created: {
      $gte: new Date(year, 0, 1),
      $lt: new Date(year + 1, 0, 1),
    },
  }
}
