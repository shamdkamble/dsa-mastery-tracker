/**
 * Curated LeetCode problems per roadmap topic (Phase 1 DSA topics).
 * C++-only topics have no entries — recommendations modal is skipped for those.
 */

/** @type {Record<string, string[]>} */
export const ROADMAP_TOPIC_PROBLEMS = {
  "dsa-complexity": ["climbing-stairs", "fibonacci-number"],
  "dsa-arrays": ["two-sum", "contains-duplicate", "best-time-to-buy-and-sell-stock"],
  "dsa-array-basics": ["maximum-subarray", "move-zeroes", "remove-duplicates-from-sorted-array"],
  "dsa-two-pointers-intro": ["valid-palindrome", "merge-sorted-array", "squares-of-a-sorted-array"],
  "dsa-two-pointers-pairs": ["two-sum-ii", "3sum", "container-with-most-water"],
  "dsa-strings-basics": ["reverse-string", "valid-anagram", "first-unique-character-in-a-string"],
  "dsa-string-patterns": ["longest-common-prefix", "implement-strstr"],
  "dsa-hashing-intro": ["two-sum", "contains-duplicate", "happy-number"],
  "dsa-hash-problems": ["group-anagrams", "top-k-frequent-elements", "valid-anagram"],
  "dsa-sorting-apps": ["merge-sorted-array", "sort-colors", "largest-number"],
  "dsa-stack": ["valid-parentheses", "min-stack", "daily-temperatures"],
  "dsa-sliding-window-fixed": ["maximum-average-subarray-i", "permutation-in-string"],
  "dsa-sliding-window-variable": ["longest-substring-without-repeating-characters", "max-consecutive-ones-iii", "fruit-into-baskets"],
  "dsa-prefix-sum": ["range-sum-query-immutable", "subarray-sum-equals-k", "find-pivot-index"],
  "dsa-recursion": ["climbing-stairs", "fibonacci-number", "pow-x-n"],
  "dsa-framework": ["two-sum", "valid-parentheses", "merge-two-sorted-lists"],
};

/**
 * @param {string} topicId
 * @returns {string[]}
 */
export function getRecommendedSlugsForTopic(topicId) {
  return ROADMAP_TOPIC_PROBLEMS[topicId] ? [...ROADMAP_TOPIC_PROBLEMS[topicId]] : [];
}

/**
 * @param {string} topicId
 * @returns {boolean}
 */
export function hasRoadmapRecommendations(topicId) {
  return getRecommendedSlugsForTopic(topicId).length > 0;
}