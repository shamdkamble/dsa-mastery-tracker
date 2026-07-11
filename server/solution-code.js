/**
 * Detect and extract solution code from mixed text (prose + code).
 */

const CODE_SIGNALS = [
  /\bfunction\b/i,
  /\bdef\b/,
  /\bclass\b/,
  /\bpublic\b/,
  /\bprivate\b/,
  /\bprotected\b/,
  /\breturn\b/,
  /=>/,
  /\{|\}/,
  /;/,
  /\bint\b/,
  /\bvoid\b/,
  /\bvector\b/i,
  /\bstring\b/i,
  /\bfor\s*\(/,
  /\bwhile\s*\(/,
  /#include/,
  /\bvar\b/,
  /\blet\b/,
  /\bconst\b/,
  /\busing\s+namespace\b/,
  /\bstd::/,
];

function hasCodeSignals(text) {
  return CODE_SIGNALS.some((pattern) => pattern.test(text));
}

/** Reject empty shells like `{}`, `();`, or prose with only punctuation. */
export function isTrivialFakeCode(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return true;

  const withoutNoise = trimmed.replace(/[\s{}();[\].,]/g, "");
  if (withoutNoise.length < 6) return true;

  const lines = trimmed.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 1 && !hasCodeSignals(lines[0]) && /[{}();[\]]/.test(lines[0])) {
    return true;
  }

  return false;
}

export function looksLikeSolutionCode(text) {
  const { code } = extractSolutionCodeForAnalysis(text);
  return Boolean(code && code.length >= 8);
}

export function extractSolutionCodeForAnalysis(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return { code: "", stripped: false, reason: "empty" };
  }

  const fences = [...trimmed.matchAll(/```[\w+-]*\n?([\s\S]*?)```/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);

  if (fences.length) {
    const code = fences.join("\n\n");
    return {
      code,
      stripped: code.length < trimmed.length,
      reason: "fenced",
    };
  }

  if (hasCodeSignals(trimmed)) {
    return { code: trimmed, stripped: false, reason: "code" };
  }

  const codeLines = trimmed.split("\n").filter((line) => {
    const value = line.trim();
    if (!value) return false;
    return hasCodeSignals(value) || /[{}();=<>[\]]/.test(value);
  });

  if (codeLines.length >= 2) {
    const code = codeLines.join("\n");
    return { code, stripped: true, reason: "partial" };
  }

  if (codeLines.length === 1 && hasCodeSignals(codeLines[0])) {
    return { code: codeLines[0], stripped: true, reason: "partial" };
  }

  return { code: "", stripped: false, reason: "prose" };
}