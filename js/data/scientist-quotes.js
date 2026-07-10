/**
 * Daily motivational quotes from scientists and pioneers in STEM.
 */

export const SCIENTIST_QUOTES = [
  { text: "The important thing is not to stop questioning.", author: "Albert Einstein" },
  { text: "Nothing in life is to be feared, it is only to be understood.", author: "Marie Curie" },
  { text: "What I cannot create, I do not understand.", author: "Richard Feynman" },
  { text: "If I have seen further, it is by standing on the shoulders of giants.", author: "Isaac Newton" },
  { text: "The science of today is the technology of tomorrow.", author: "Edward Teller" },
  { text: "We are all capable of more than we think.", author: "Stephen Hawking" },
  { text: "Somewhere, something incredible is waiting to be known.", author: "Carl Sagan" },
  { text: "The only way to do great work is to love what you do.", author: "Richard Feynman" },
  { text: "I was taught that the way of progress was neither swift nor easy.", author: "Marie Curie" },
  { text: "Imagination is more important than knowledge.", author: "Albert Einstein" },
  { text: "The computer was born to solve problems that did not exist before.", author: "Grace Hopper" },
  { text: "Mathematics is the language with which God has written the universe.", author: "Galileo Galilei" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The most damaging phrase in the language is: We've always done it this way.", author: "Grace Hopper" },
  { text: "I am always doing that which I cannot do, in order that I may learn how to do it.", author: "Marie Curie" },
  { text: "The best way to predict the future is to invent it.", author: "Alan Turing" },
  { text: "We can only see a short distance ahead, but we can see plenty there that needs to be done.", author: "Alan Turing" },
  { text: "Study hard what interests you the most in the most undisciplined way.", author: "Richard Feynman" },
  { text: "The greatest enemy of knowledge is not ignorance, it is the illusion of knowledge.", author: "Stephen Hawking" },
  { text: "In science, the credit goes to the man who convinces the world, not to the man to whom the idea first occurs.", author: "Francis Darwin" },
  { text: "To invent, you need a good imagination and a pile of junk.", author: "Thomas Edison" },
  { text: "The noblest pleasure is the joy of understanding.", author: "Leonardo da Vinci" },
  { text: "Pure mathematics is, in its way, the poetry of logical ideas.", author: "Albert Einstein" },
  { text: "The science of operations, as derived from mathematics, is a science of itself.", author: "Ada Lovelace" },
  { text: "Hard work and dedication are the keys to success in any field.", author: "Katherine Johnson" },
  { text: "Be less curious about people and more curious about ideas.", author: "Marie Curie" },
  { text: "The first principle is that you must not fool yourself — and you are the easiest person to fool.", author: "Richard Feynman" },
  { text: "Equipped with his five senses, man explores the universe around him.", author: "Edwin Hubble" },
  { text: "The good thing about science is that it's true whether or not you believe in it.", author: "Neil deGrasse Tyson" },
  { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },
  { text: "Research is what I'm doing when I don't know what I'm doing.", author: "Wernher von Braun" },
  { text: "The universe is under no obligation to make sense to you.", author: "Neil deGrasse Tyson" },
  { text: "Logic will get you from A to B. Imagination will take you everywhere.", author: "Albert Einstein" },
  { text: "What we know is a drop; what we don't know is an ocean.", author: "Isaac Newton" },
  { text: "The more I learn, the more I realize how much I don't know.", author: "Albert Einstein" },
  { text: "Science is a way of thinking much more than it is a body of knowledge.", author: "Carl Sagan" },
  { text: "No problem can be solved from the same level of consciousness that created it.", author: "Albert Einstein" },
  { text: "The secret to creativity is knowing how to hide your sources.", author: "Albert Einstein" },
  { text: "One never notices what has been done; one can only see what remains to be done.", author: "Marie Curie" },
];

export function getDailyScientistQuote(date = new Date()) {
  const yearStart = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - yearStart) / 86_400_000);
  return SCIENTIST_QUOTES[dayOfYear % SCIENTIST_QUOTES.length];
}