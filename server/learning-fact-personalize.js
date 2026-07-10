/**
 * Personalize shared fact hooks with the learner's name (at delivery time)
 */

export function firstNameFromUserName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}

/**
 * @param {{ body: string, title?: string }} fact
 * @param {{ userName: string, topicName: string }} context
 */
export function personalizeLearningFactMessage(fact, { userName, topicName }) {
  const first = firstNameFromUserName(userName);
  const topic = String(topicName || "your next lesson").trim();
  const hook = String(fact?.body || fact?.title || "").trim();

  return {
    title: `Hey ${first} 👋`,
    body: `${hook} Tap to learn ${topic} →`,
  };
}