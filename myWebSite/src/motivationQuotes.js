// 励志语录数据 - 包含中英日三语
const quotes = [
  {
    id: 1,
    quotes: {
      zh: "如果你每周锻炼3次并且不再乱吃，你的起点已经非常低了，最终你会感觉比认识的几乎所有人都要强。",
      en: "The bar is so insanely low that if you work out 3x a week and stop eating like a moron, you'll end up looking and feeling superior to almost everyone you know.",
      ja: "ベンチマークは非常に低いので，每周3回ワークアウトして馬鹿みたいな食事をやめれば，知っているほぼ全員よりも優れた外見と気分になれる。"
    },
    author: "Dangerously Dialed In"
  },
  {
    id: 2,
    quotes: {
      zh: "大多数人在奇迹发生之前就放弃了。不要成为大多数人。",
      en: "Most people quit right before the magic happens. Don't be most people.",
      ja: "ほとんどの人は奇迹が起ころうとする直前に諦める。大多数の 사람 되지 마라。"
    },
    author: "Unknown"
  },
  {
    id: 3,
    quotes: {
      zh: "你不会得到你想要的，你会得到你努力的。",
      en: "You don't get what you wish for, you get what you work for.",
      ja: "欲しいものは手に入らない。努力したものが手に入る。"
    },
    author: "Unknown"
  },
  {
    id: 4,
    quotes: {
      zh: "唯一糟糕的锻炼就是没有发生的锻炼。",
      en: "The only bad workout is the one that didn't happen.",
      ja: "唯一の悪いワークアウトは，起こらなかったものだ。"
    },
    author: "Unknown"
  },
  {
    id: 5,
    quotes: {
      zh: "汗水只是脂肪在哭泣。",
      en: "Sweat is just fat crying.",
      ja: "汗は脂肪が泣いているだけだ。"
    },
    author: "Unknown"
  },
  {
    id: 6,
    quotes: {
      zh: "带着决心醒来，带着满足感入睡。",
      en: "Wake up with determination. Go to bed with satisfaction.",
      ja: "决意を持って目覚め，满足感を持って眠る。"
    },
    author: "Unknown"
  },
  {
    id: 7,
    quotes: {
      zh: "你越努力，就越难放弃。",
      en: "The harder you work, the harder it is to surrender.",
      ja: "すればするほど，降伏更难くなる。"
    },
    author: "Vince Lombardi"
  },
  {
    id: 8,
    quotes: {
      zh: "成功并不总是关于伟大，而是关于坚持。持续的努力才能带来成功。",
      en: "Success isn't always about greatness. It's about consistency. Consistent hard work leads to success.",
      ja: "成功は常に伟大关于るわけではない。持续关于る 것이다。 일관된 노력이 성공으로 이끈다。"
    },
    author: "Dwayne Johnson"
  },
  {
    id: 9,
    quotes: {
      zh: "你的身体几乎可以承受任何东西。你需要说服的是你的心灵。",
      en: "Your body can stand almost anything. It's your mind that you have to convince.",
      ja: "体は約束ものと戦える。説得しなければならないのは自分自身の心だ。"
    },
    author: "Unknown"
  },
  {
    id: 10,
    quotes: {
      zh: "今天你感受到的痛苦将成为明天你拥有的力量。",
      en: "The pain you feel today will be the strength you feel tomorrow.",
      ja: "今日の痛みは，明日の強みになる。"
    },
    author: "Unknown"
  }
];

// 获取今日语录
export function getDailyQuote() {
  try {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    return quotes[dayOfYear % quotes.length];
  } catch (error) {
    console.error('Error getting daily quote:', error);
    return quotes[0];
  }
}

// 获取随机语录
export function getRandomQuote() {
  try {
    return quotes[Math.floor(Math.random() * quotes.length)];
  } catch (error) {
    console.error('Error getting random quote:', error);
    return quotes[0];
  }
}

// 获取特定语言的语录
export function getQuoteInLanguage(quote, lang) {
  if (!quote || !quote.quotes) return '';
  return quote.quotes[lang] || quote.quotes.zh || '';
}
