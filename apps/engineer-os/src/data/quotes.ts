export const MOTIVATIONAL_QUOTES = [
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "Dream big. Start small. Act now.", author: "Robin Sharma" },
  { text: "Consistency compounds. Show up every day.", author: "EngineerOS" },
  { text: "Your future self is watching. Make them proud.", author: "EngineerOS" },
  { text: "One problem at a time. One day at a time. One offer at a time.", author: "EngineerOS" },
  { text: "Google doesn't hire luck. They hire prepared minds.", author: "EngineerOS" },
  { text: "WIN AUGUST is not a wish — it is a daily system.", author: "EngineerOS" },
  { text: "Clarity comes from engagement, not thought.", author: "Marie Forleo" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Amateurs practice until they get it right. Professionals practice until they can't get it wrong.", author: "Unknown" },
  { text: "Your only competition is who you were yesterday.", author: "EngineerOS" },
  { text: "Think in patterns. Code with intention. Interview with calm.", author: "EngineerOS" },
  { text: "Every array you master is one step closer to ₹20+ LPA.", author: "EngineerOS" },
  { text: "Pressure is a privilege. Interviews are the arena.", author: "EngineerOS" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "Don't practice until you get it right. Practice until you can't get it wrong.", author: "Unknown" },
  { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
  { text: "Be so good they can't ignore you.", author: "Steve Martin" },
  { text: "Ship consistency, not perfection.", author: "EngineerOS" },
];

export function getQuoteForPage(seed: string): { text: string; author: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return MOTIVATIONAL_QUOTES[hash % MOTIVATIONAL_QUOTES.length];
}

export function getDailyQuote(): { text: string; author: string } {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
}
