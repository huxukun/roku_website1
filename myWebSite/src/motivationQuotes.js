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
  },
  {
    id: 11,
    quotes: {
      zh: "真正的失败是从未尝试。",
      en: "The only true failure is not trying at all.",
      ja: "本当の失敗は，まったく試みないことだ。"
    },
    author: "Unknown"
  },
  {
    id: 12,
    quotes: {
      zh: "每一次重复都让你变得更强大。",
      en: "Every rep makes you stronger than before.",
      ja: "すべての反復が，以前の自分より強くしてくれる。"
    },
    author: "Unknown"
  },
  {
    id: 13,
    quotes: {
      zh: "成功是由无数次的失败构成的。",
      en: "Success is built on a mountain of failures.",
      ja: "成功は失敗の山の上に築かれる。"
    },
    author: "Unknown"
  },
  {
    id: 14,
    quotes: {
      zh: "只有突破舒适区才能成长。",
      en: "Growth happens only outside your comfort zone.",
      ja: "成長はコンフォートゾーンの外でのみ起こる。"
    },
    author: "Unknown"
  },
  {
    id: 15,
    quotes: {
      zh: "最好的锻炼时机永远是现在。",
      en: "The best time to work out is always now.",
      ja: "ワークアウトする最適な時間は，いつでも今だ。"
    },
    author: "Unknown"
  },
  {
    id: 16,
    quotes: {
      zh: "痛苦会过去，但成就是永久的。",
      en: "Pain is temporary, but achievement is permanent.",
      ja: "痛みは一時的だが，達成感は永遠だ。"
    },
    author: "Unknown"
  },
  {
    id: 17,
    quotes: {
      zh: "身体的极限其实都是心理的障碍。",
      en: "Physical limits are mostly mental barriers.",
      ja: "身体的限界のほとんどは，心の壁だ。"
    },
    author: "Unknown"
  },
  {
    id: 18,
    quotes: {
      zh: "每天进步一点，一年后就完全不同了。",
      en: "Improve a little each day, and a year later you're completely different.",
      ja: "毎日少しずつ改善すれば，一年後は全然違う人になる。"
    },
    author: "Unknown"
  },
  {
    id: 19,
    quotes: {
      zh: "没有借口，只有结果。",
      en: "No excuses, only results.",
      ja: "言い訳はない。結果だけがある。"
    },
    author: "Unknown"
  },
  {
    id: 20,
    quotes: {
      zh: "你的对手是昨天的自己。",
      en: "Your only competition is who you were yesterday.",
      ja: "あなたの唯一の競争相手は，昨日の自分だ。"
    },
    author: "Unknown"
  },
  {
    id: 21,
    quotes: {
      zh: "每一个不曾起舞的日子，都是对生命的辜负。",
      en: "Every day not danced is a day wasted.",
      ja: "踊らなかった日は、人生の無駄遣いだ。"
    },
    author: "尼采"
  },
  {
    id: 22,
    quotes: {
      zh: "人生就像骑自行车，想保持平衡就得往前走。",
      en: "Life is like riding a bicycle, to keep your balance you must keep moving.",
      ja: "人生は自転車に乗るようなもの。バランスを保つには進み続けなければならない。"
    },
    author: "爱因斯坦"
  },
  {
    id: 23,
    quotes: {
      zh: "成功的秘诀在于永不放弃。",
      en: "The secret of success is to never give up.",
      ja: "成功の秘訣は、決して諦めないことだ。"
    },
    author: "丘吉尔"
  },
  {
    id: 24,
    quotes: {
      zh: "世界上唯一阻止你追梦的人，就是你自己。",
      en: "The only person who can stop you from chasing your dreams is you.",
      ja: "夢を追うのを止めることができる唯一の人は、あなた自身だ。"
    },
    author: "Unknown"
  },
  {
    id: 25,
    quotes: {
      zh: "每一个伟大的成就都始于一个小小的决定。",
      en: "Every great achievement starts with a small decision.",
      ja: "すべての偉大な業績は、小さな決断から始まる。"
    },
    author: "Unknown"
  },
  {
    id: 26,
    quotes: {
      zh: "相信自己，你比想象中更强大。",
      en: "Believe in yourself, you are stronger than you think.",
      ja: "自分を信じて、あなたは思っているよりも強い。"
    },
    author: "Unknown"
  },
  {
    id: 27,
    quotes: {
      zh: "行动是治愈恐惧的良药。",
      en: "Action is the antidote to fear.",
      ja: "行動は恐怖の解毒剤だ。"
    },
    author: "Unknown"
  },
  {
    id: 28,
    quotes: {
      zh: "不要等待完美的时机，时机是创造出来的。",
      en: "Don't wait for the perfect moment, create it.",
      ja: "完璧な瞬間を待つな。それを作り出すのだ。"
    },
    author: "Unknown"
  },
  {
    id: 29,
    quotes: {
      zh: "最大的风险就是不敢承担任何风险。",
      en: "The biggest risk is not taking any risk.",
      ja: "最大のリスクは、何のリスクも取らないことだ。"
    },
    author: "Unknown"
  },
  {
    id: 30,
    quotes: {
      zh: "你所做的每一件事，都会塑造未来的你。",
      en: "Everything you do shapes the person you will become.",
      ja: "あなたがするすべてのことが、未来のあなたを形作る。"
    },
    author: "Unknown"
  },
  {
    id: 31,
    quotes: {
      zh: "生活不是等待暴风雨过去，而是学会在雨中跳舞。",
      en: "Life is not about waiting for the storm to pass, it's about learning to dance in the rain.",
      ja: "人生は嵐が通り過ぎるのを待つのではなく、雨の中で踊ることを学ぶことだ。"
    },
    author: "Unknown"
  },
  {
    id: 32,
    quotes: {
      zh: "梦想不会逃跑，会逃跑的只有你自己。",
      en: "Dreams don't run away, only you do.",
      ja: "夢は逃げない。逃げるのはあなた自身だ。"
    },
    author: "Unknown"
  },
  {
    id: 33,
    quotes: {
      zh: "今天的努力是明天的收获。",
      en: "Today's effort is tomorrow's harvest.",
      ja: "今日の努力は明日の収穫だ。"
    },
    author: "Unknown"
  },
  {
    id: 34,
    quotes: {
      zh: "生命中最重要的事情不是我们身在何处，而是我们朝哪个方向前进。",
      en: "The most important thing in life is not where we are, but in which direction we are moving.",
      ja: "人生で最も重要なことは、どこにいるかではなく、どの方向に向かっているかだ。"
    },
    author: "Unknown"
  },
  {
    id: 35,
    quotes: {
      zh: "即使最慢的人，只要不失去目标，也比漫无目的的人走得快。",
      en: "Even the slowest person, as long as they don't lose their goal, walks faster than those without purpose.",
      ja: "最も遅い人でも、目標を失わなければ、目的のない人よりも速く進める。"
    },
    author: "Unknown"
  },
  {
    id: 36,
    quotes: {
      zh: "成功需要耐心，不是等待，而是持续的行动。",
      en: "Success requires patience, not waiting, but consistent action.",
      ja: "成功には忍耐力が必要だ。待つのではなく、一貫した行動だ。"
    },
    author: "Unknown"
  },
  {
    id: 37,
    quotes: {
      zh: "你不能改变过去，但可以改变未来。",
      en: "You can't change the past, but you can change the future.",
      ja: "過去は変えられないが、未来は変えられる。"
    },
    author: "Unknown"
  },
  {
    id: 38,
    quotes: {
      zh: "强者不是没有眼泪，而是含着眼泪奔跑的人。",
      en: "A strong person is not one without tears, but one who runs while holding back tears.",
      ja: "強い人は涙を持たない人ではなく、涙をこらえながら走る人だ。"
    },
    author: "Unknown"
  },
  {
    id: 39,
    quotes: {
      zh: "所有的成就都始于一个简单的开始。",
      en: "All achievements begin with a simple start.",
      ja: "すべての業績は、単純な始まりから始まる。"
    },
    author: "Unknown"
  },
  {
    id: 40,
    quotes: {
      zh: "人生的价值不在于长度，而在于深度。",
      en: "The value of life lies not in length, but in depth.",
      ja: "人生の価値は長さではなく、深さにある。"
    },
    author: "Unknown"
  }
];

// 本地存储额外语录的 key
const STORAGE_KEY = 'extraMotivationQuotes';

// 从本地存储获取额外语录
function getExtraQuotes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting extra quotes:', error);
    return [];
  }
}

// 保存额外语录到本地存储
function saveExtraQuotes(extraQuotes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(extraQuotes));
  } catch (error) {
    console.error('Error saving extra quotes:', error);
  }
}

// 获取所有语录（内置 + 额外）
function getAllQuotes() {
  const extraQuotes = getExtraQuotes();
  return [...quotes, ...extraQuotes];
}

// 获取今日语录
export function getDailyQuote() {
  try {
    const allQuotes = getAllQuotes();
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    return allQuotes[dayOfYear % allQuotes.length];
  } catch (error) {
    console.error('Error getting daily quote:', error);
    return quotes[0];
  }
}

// 获取随机语录
export function getRandomQuote() {
  try {
    const allQuotes = getAllQuotes();
    return allQuotes[Math.floor(Math.random() * allQuotes.length)];
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

// 从网络获取新的励志语录
export async function fetchNewQuoteFromWeb() {
  try {
    console.log('正在从网络获取新的励志语录...');
    
    // 尝试多个免费的 API
    const apis = [
      'https://type.fit/api/quotes',
      'https://zenquotes.io/api/random'
    ];
    
    let newQuote = null;
    
    for (const api of apis) {
      try {
        const response = await fetch(api, { method: 'GET' });
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (api.includes('type.fit') && Array.isArray(data)) {
          const randomIdx = Math.floor(Math.random() * data.length);
          const quoteData = data[randomIdx];
          if (quoteData && quoteData.text) {
            newQuote = {
              id: Date.now(),
              quotes: {
                zh: quoteData.text,
                en: quoteData.text,
                ja: quoteData.text
              },
              author: quoteData.author || 'Unknown'
            };
            break;
          }
        } else if (api.includes('zenquotes') && Array.isArray(data) && data[0]) {
          const quoteData = data[0];
          if (quoteData && quoteData.q) {
            newQuote = {
              id: Date.now(),
              quotes: {
                zh: quoteData.q,
                en: quoteData.q,
                ja: quoteData.q
              },
              author: quoteData.a || 'Unknown'
            };
            break;
          }
        }
      } catch (apiError) {
        console.log(`API ${api} failed, trying next...`);
        continue;
      }
    }
    
    // 如果 API 失败，从内置列表中选择一个新的（但在本地存储中添加随机变种）
    if (!newQuote) {
      const fallbackQuote = quotes[Math.floor(Math.random() * quotes.length)];
      newQuote = {
        id: Date.now(),
        quotes: { ...fallbackQuote.quotes },
        author: fallbackQuote.author
      };
    }
    
    // 保存到本地存储
    const extraQuotes = getExtraQuotes();
    extraQuotes.push(newQuote);
    saveExtraQuotes(extraQuotes);
    
    console.log('成功获取新语录:', newQuote);
    return newQuote;
  } catch (error) {
    console.error('Error fetching new quote from web:', error);
    return null;
  }
}

// 清除本地存储的额外语录
export function clearExtraQuotes() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('已清除额外语录');
  } catch (error) {
    console.error('Error clearing extra quotes:', error);
  }
}
