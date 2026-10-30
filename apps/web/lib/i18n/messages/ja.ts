import type { Messages } from "./zh";

const ja: Messages = {
  common: {
    skipToContent: "本文へスキップ",
  },
  locale: {
    menuLabel: "言語を切り替える",
    groupLabel: "表示言語",
    hint: "選んだ言語は記憶されます。翻訳のある記事は本文も切り替わります",
    switched: (name: string) => `${name}に切り替えました`,
    switchedDetail: "表示がこの言語になりました。翻訳のある記事も切り替わります",
  },
  notFound: {
    title: "ページが見つかりません",
    heading: "ここには夜空しかありません",
    body: "このアドレスには何もありません。削除されたか、アドレスが間違っているのかもしれません。",
    home: "ホームへ戻る",
    posts: "記事を見る",
  },
};

export default ja;
