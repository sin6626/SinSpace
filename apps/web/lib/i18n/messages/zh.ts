// 界面文案的原文（中文）。en.ts、ja.ts 必须和这里结构完全一致（类型检查会报出缺的键）。
// 带参数的写成函数；后台录入的内容（站名、分类名、标签、碎碎念等）不在这里，原样显示。
const zh = {
  common: {
    skipToContent: "跳到主要内容",
  },
  locale: {
    menuLabel: "切换语言",
    groupLabel: "界面语言",
    hint: "会记住你的选择；文章有翻译时正文也跟着换",
    switched: (name: string) => `已切换到${name}`,
    switchedDetail: "界面文字已换成这种语言，文章有翻译时也会跟着换",
  },
  notFound: {
    title: "页面不存在",
    heading: "这里只有夜空",
    body: "这个地址没有对应的内容，可能已经被删除，或者地址写错了。",
    home: "回到首页",
    posts: "看看文章",
  },
};

export type Messages = typeof zh;
export default zh;
