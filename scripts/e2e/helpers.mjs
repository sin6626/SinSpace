// e2e 测试共用的小工具（在页面里执行的表达式字符串）。

// 点顶部导航里指向 href 的链接（真实的站内跳转），等地址变了再等页面渲染完
export const clickNav = (href, settle = 1500) => `(async () => {
  document.querySelector('.navigation-List a[href="${href}"]').click();
  for (let i = 0; i < 100 && location.pathname !== "${href}"; i++) await new Promise((r) => setTimeout(r, 50));
  await new Promise((r) => setTimeout(r, ${settle}));
  return location.pathname;
})()`;

// 点导航后立刻抓取视图过渡的动画（只取第一帧出现的那一批）：伪元素、动画名、时长、关键帧里的尺寸和位置
export const clickNavAndCaptureTransition = (href) => `(async () => {
  document.querySelector('.navigation-List a[href="${href}"]').click();
  for (let i = 0; i < 300; i++) {
    const list = document.getAnimations().filter((a) => a.effect?.pseudoElement?.startsWith("::view-transition"));
    if (list.length) return list.map((a) => ({
      pseudo: a.effect.pseudoElement,
      name: a.animationName,
      frames: a.effect.getKeyframes().map((k) => ({ width: k.width, transform: k.transform })),
    }));
    await new Promise((r) => requestAnimationFrame(r));
  }
  return [];
})()`;
