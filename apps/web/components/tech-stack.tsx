// 首页底部的技术栈：两行横向无限滚动（一行向左、一行向右），鼠标停上去暂停；
// “减少动态效果”时不滚动，改成可以手动横向拖动。内容先写死，以后再调整。
const rows = [
  ["Vue", "React", "TypeScript", "JavaScript", "Next.js", "Nuxt", "uni-app", "Tailwind CSS", "SCSS", "Vite"],
  ["Node.js", "NestJS", "Express", "MongoDB", "Redis", "GSAP", "Zod", "Git", "Linux", "C++"],
];

function Track({ items, reverse }: { items: string[]; reverse?: boolean }) {
  return (
    <div className="stack-marquee">
      <ul className="stack-track" data-reverse={reverse ? "" : undefined}>
        {[...items, ...items].map((item, index) => (
          // 第二份只为无缝衔接，读屏跳过
          <li key={`${item}-${index}`} aria-hidden={index >= items.length || undefined}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function TechStack() {
  return (
    <section className="home-section home-stack" aria-labelledby="home-stack-heading">
      <div className="home-section-heading">
        <h2 id="home-stack-heading">技术栈</h2>
        <p>平时在用、正在学的东西</p>
      </div>
      <Track items={rows[0]} />
      <Track items={rows[1]} reverse />
    </section>
  );
}
