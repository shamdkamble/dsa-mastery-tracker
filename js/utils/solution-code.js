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

export function looksLikeSolutionCode(text) {
  const { code } = extractSolutionCodeForAnalysis(text);
  return Boolean(code && code.length >= 8);
}

/**
 * @param {string} text
 * @returns {{ code: string, stripped: boolean, reason: "empty" | "fenced" | "code" | "partial" | "prose" }}
 */
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

function hasCodeSignals(text) {
  return CODE_SIGNALS.some((pattern) => pattern.test(text));
}

function isCodeLikeLine(line) {
  const value = line.trim();
  if (!value) return false;
  return hasCodeSignals(value) || /[{}();=<>[\]]/.test(value);
}

/**
 * Split legacy single "solution" blobs into approach + code for the modal.
 * Display-only — persisted when the user saves the problem.
 *
 * @param {{ approach?: string, solution?: string }} problem
 * @returns {{ approach: string, solution: string }}
 */
export function splitLegacySolutionFields(problem = {}) {
  const existingApproach = (problem.approach || "").trim();
  const rawSolution = (problem.solution || "").trim();

  if (existingApproach || !rawSolution) {
    return { approach: existingApproach, solution: rawSolution };
  }

  const extracted = extractSolutionCodeForAnalysis(rawSolution);

  if (extracted.reason === "prose") {
    return { approach: rawSolution, solution: "" };
  }

  if (extracted.stripped && extracted.code) {
    const proseLines = rawSolution
      .split("\n")
      .filter((line) => !isCodeLikeLine(line));
    const approach = proseLines.join("\n").trim();
    return {
      approach,
      solution: extracted.code,
    };
  }

  return { approach: "", solution: rawSolution };
}