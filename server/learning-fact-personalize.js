/**
 * Personalize Mantra Feed hooks into Daily Wisdom push copy
 */

export function firstNameFromUserName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}

function formatHookLine(fact) {
  const hook = String(fact?.body || fact?.title || "").trim();
  const style = fact?.hookStyle || "insight";

  if (style === "mistake" && !/mistake|trap|avoid|watch out/i.test(hook)) {
    return `Common trap: ${hook}`;
  }
  if (style === "interview_tip" && !/interview/i.test(hook)) {
    return `Interview tip: ${hook}`;
  }
  if (style === "insight" && !/insight|key|secret|pro tip/i.test(hook)) {
    return hook;
  }
  return hook;
}

function buildTitle(context) {
  const first = context.firstName || "there";
  const last = context.lastCompleted?.topicName;
  const streak = context.streak || 0;
  const tone = context.tone || "balanced";

  if (last && context.anchor?.topicName) {
    return `Hey ${first} — next level unlocked 🚀`;
  }

  if (streak >= 2) {
    return `Hey ${first} 🔥 ${streak}-day streak`;
  }

  if (tone === "encouraging") {
    return `Hey ${first} — you've got this 💪`;
  }

  if (tone === "challenging") {
    return `${first}, ready for a challenge?`;
  }

  return `Hey ${first} 👋`;
}

function buildBody(fact, context) {
  const hook = formatHookLine(fact);
  const nextTopic = context.anchor?.topicName || "your next lesson";
  const last = context.lastCompleted?.topicName;
  const streak = context.streak || 0;

  if (last) {
    return `Since you finished ${last}, here's the next move: ${hook} Tap to learn ${nextTopic} →`;
  }

  if (streak >= 2) {
    return `You're on a ${streak}-day roll — ${hook} Tap to keep it going with ${nextTopic} →`;
  }

  if (context.tone === "encouraging") {
    return `${hook} One small win today on ${nextTopic} counts. Tap to learn →`;
  }

  if (context.tone === "challenging") {
    return `${hook} Level up with ${nextTopic} — tap when you're ready →`;
  }

  return `${hook} Tap to master ${nextTopic} →`;
}

/**
 * @param {{ body: string, title?: string, hookStyle?: string }} fact
 * @param {object} context — from getWisdomDeliveryContext
 */
export function personalizeLearningFactMessage(fact, context) {
  return {
    title: buildTitle(context),
    body: buildBody(fact, context),
  };
}