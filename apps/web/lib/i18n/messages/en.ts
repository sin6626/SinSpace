import type { Messages } from "./zh";

const en: Messages = {
  common: {
    skipToContent: "Skip to main content",
  },
  locale: {
    menuLabel: "Change language",
    groupLabel: "Interface language",
    hint: "Your choice is remembered; posts switch too when translated",
    switched: (name: string) => `Switched to ${name}`,
    switchedDetail: "The interface now speaks this language, and posts follow when a translation exists",
  },
  notFound: {
    title: "Page not found",
    heading: "Only the night sky here",
    body: "Nothing lives at this address. It may have been removed, or the link has a typo.",
    home: "Back to home",
    posts: "Browse posts",
  },
};

export default en;
