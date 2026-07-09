/**
 * FAANG Mastery Roadmap — topic catalog by phase
 * Explanations are generated dynamically via /api/teach (Gemini).
 */

/** @typedef {"Easy" | "Medium" | "Hard"} TopicDifficulty */

/**
 * @typedef {Object} RoadmapTopic
 * @property {string} id
 * @property {string} name
 * @property {number} phase
 * @property {TopicDifficulty} difficulty
 */

/**
 * @typedef {Object} RoadmapPhase
 * @property {number} id
 * @property {string} title
 * @property {RoadmapTopic[]} topics
 */

/** @type {RoadmapPhase[]} */
export const ROADMAP_PHASES = [
  {
    id: 1,
    title: "C++ + DSA Foundations",
    topics: [
      { id: "cpp-toolchain", name: "Toolchain & First Program", phase: 1, difficulty: "Easy" },
      { id: "dsa-complexity", name: "Time & Space Complexity", phase: 1, difficulty: "Easy" },
      { id: "cpp-types", name: "Variables, Types & Operators", phase: 1, difficulty: "Easy" },
      { id: "dsa-arrays", name: "Arrays — Fundamentals", phase: 1, difficulty: "Easy" },
      { id: "cpp-control-flow", name: "Conditionals & Branching", phase: 1, difficulty: "Easy" },
      { id: "dsa-array-basics", name: "Array Building Blocks", phase: 1, difficulty: "Easy" },
      { id: "cpp-loops", name: "Loops & Iteration", phase: 1, difficulty: "Easy" },
      { id: "dsa-two-pointers-intro", name: "Two Pointers — Introduction", phase: 1, difficulty: "Easy" },
      { id: "cpp-functions", name: "Functions & Scope", phase: 1, difficulty: "Easy" },
      { id: "dsa-two-pointers-pairs", name: "Two Pointers — Pairs & Dedup", phase: 1, difficulty: "Medium" },
      { id: "cpp-pointers", name: "Pointers & References", phase: 1, difficulty: "Medium" },
      { id: "dsa-strings-basics", name: "Strings — Fundamentals", phase: 1, difficulty: "Easy" },
      { id: "cpp-std-string", name: "std::string Deep Dive", phase: 1, difficulty: "Easy" },
      { id: "dsa-string-patterns", name: "String Patterns", phase: 1, difficulty: "Easy" },
      { id: "cpp-vector", name: "std::vector Mastery", phase: 1, difficulty: "Easy" },
      { id: "dsa-hashing-intro", name: "Hashing — Core Idea", phase: 1, difficulty: "Easy" },
      { id: "cpp-hash-containers", name: "unordered_map & unordered_set", phase: 1, difficulty: "Medium" },
      { id: "dsa-hash-problems", name: "Hash Map Problems", phase: 1, difficulty: "Easy" },
      { id: "cpp-sorting", name: "Sorting & Comparators", phase: 1, difficulty: "Medium" },
      { id: "dsa-sorting-apps", name: "Sorting Applications", phase: 1, difficulty: "Medium" },
      { id: "cpp-stack-queue", name: "stack & queue Containers", phase: 1, difficulty: "Easy" },
      { id: "dsa-stack", name: "Stack Problems", phase: 1, difficulty: "Easy" },
      { id: "cpp-pair-tuple", name: "pair, tuple & Structured Bindings", phase: 1, difficulty: "Easy" },
      { id: "dsa-sliding-window-fixed", name: "Sliding Window — Fixed Size", phase: 1, difficulty: "Medium" },
      { id: "cpp-auto-const", name: "auto, const & Range-Based For", phase: 1, difficulty: "Easy" },
      { id: "dsa-sliding-window-variable", name: "Sliding Window — Variable Size", phase: 1, difficulty: "Medium" },
      { id: "cpp-structs-classes", name: "Structs & Class Basics", phase: 1, difficulty: "Medium" },
      { id: "dsa-prefix-sum", name: "Prefix Sum & Difference Arrays", phase: 1, difficulty: "Medium" },
      { id: "cpp-recursion", name: "Recursion in C++", phase: 1, difficulty: "Medium" },
      { id: "dsa-recursion", name: "Recursion Fundamentals", phase: 1, difficulty: "Medium" },
      { id: "cpp-debugging", name: "Debugging & Competitive I/O", phase: 1, difficulty: "Medium" },
      { id: "dsa-framework", name: "Problem-Solving Framework", phase: 1, difficulty: "Easy" },
    ],
  },
  {
    id: 2,
    title: "Core DSA Patterns",
    topics: [
      { id: "two-pointers-advanced", name: "Two Pointers — Advanced Patterns", phase: 2, difficulty: "Medium" },
      { id: "fast-slow-pointers", name: "Fast & Slow Pointers", phase: 2, difficulty: "Medium" },
      { id: "sliding-window-max", name: "Sliding Window Maximum", phase: 2, difficulty: "Medium" },
      { id: "sliding-window-substring", name: "Longest Substring Patterns", phase: 2, difficulty: "Medium" },
      { id: "binary-search-basics", name: "Binary Search — Fundamentals", phase: 2, difficulty: "Easy" },
      { id: "binary-search-rotated", name: "Binary Search — Rotated Arrays", phase: 2, difficulty: "Medium" },
      { id: "binary-search-answer", name: "Binary Search on Answer", phase: 2, difficulty: "Medium" },
      { id: "bfs-level-order", name: "BFS — Level Order Traversal", phase: 2, difficulty: "Medium" },
      { id: "dfs-recursive", name: "DFS — Recursive Traversal", phase: 2, difficulty: "Medium" },
      { id: "dfs-iterative", name: "DFS — Iterative with Stack", phase: 2, difficulty: "Medium" },
      { id: "tree-paths", name: "Tree Path Problems", phase: 2, difficulty: "Medium" },
      { id: "graph-representation", name: "Graph Representation", phase: 2, difficulty: "Easy" },
      { id: "number-of-islands", name: "Connected Components — Islands", phase: 2, difficulty: "Medium" },
      { id: "topological-sort", name: "Topological Sort", phase: 2, difficulty: "Medium" },
      { id: "backtracking-subsets", name: "Backtracking — Subsets", phase: 2, difficulty: "Medium" },
      { id: "interval-merge", name: "Interval Merge & Overlap", phase: 2, difficulty: "Medium" },
    ],
  },
  {
    id: 3,
    title: "Advanced DSA",
    topics: [
      { id: "dp-1d-intro", name: "Dynamic Programming — 1D Intro", phase: 3, difficulty: "Medium" },
      { id: "dp-climbing-stairs", name: "DP — Climbing Stairs Pattern", phase: 3, difficulty: "Medium" },
      { id: "dp-house-robber", name: "DP — House Robber Pattern", phase: 3, difficulty: "Medium" },
      { id: "dp-2d-grid", name: "Dynamic Programming — 2D Grid", phase: 3, difficulty: "Medium" },
      { id: "dp-knapsack", name: "DP — 0/1 Knapsack", phase: 3, difficulty: "Hard" },
      { id: "dp-lcs", name: "DP — Longest Common Subsequence", phase: 3, difficulty: "Hard" },
      { id: "greedy-intervals", name: "Greedy — Interval Scheduling", phase: 3, difficulty: "Medium" },
      { id: "greedy-jump-game", name: "Greedy — Jump Game Pattern", phase: 3, difficulty: "Medium" },
      { id: "heap-k-largest", name: "Heap — K Largest Elements", phase: 3, difficulty: "Medium" },
      { id: "heap-merge-k", name: "Heap — Merge K Sorted Lists", phase: 3, difficulty: "Hard" },
      { id: "union-find", name: "Union-Find (Disjoint Set)", phase: 3, difficulty: "Medium" },
      { id: "trie-prefix", name: "Trie — Prefix Tree", phase: 3, difficulty: "Medium" },
      { id: "backtracking-permutations", name: "Backtracking — Permutations", phase: 3, difficulty: "Medium" },
      { id: "dijkstra", name: "Dijkstra's Shortest Path", phase: 3, difficulty: "Hard" },
      { id: "bellman-ford", name: "Bellman-Ford Algorithm", phase: 3, difficulty: "Hard" },
      { id: "graph-cycle-detection", name: "Graph Cycle Detection", phase: 3, difficulty: "Medium" },
    ],
  },
  {
    id: 4,
    title: "System Design",
    topics: [
      { id: "sd-requirements", name: "Requirements Gathering", phase: 4, difficulty: "Easy" },
      { id: "sd-estimation", name: "Back-of-Envelope Estimation", phase: 4, difficulty: "Medium" },
      { id: "sd-cap-theorem", name: "CAP Theorem & Consistency", phase: 4, difficulty: "Medium" },
      { id: "sd-load-balancing", name: "Load Balancing", phase: 4, difficulty: "Medium" },
      { id: "sd-caching", name: "Caching Strategies", phase: 4, difficulty: "Medium" },
      { id: "sd-cdn", name: "CDN & Static Content", phase: 4, difficulty: "Easy" },
      { id: "sd-sql-vs-nosql", name: "SQL vs NoSQL Trade-offs", phase: 4, difficulty: "Medium" },
      { id: "sd-sharding", name: "Database Sharding", phase: 4, difficulty: "Hard" },
      { id: "sd-api-design", name: "REST API Design", phase: 4, difficulty: "Medium" },
      { id: "sd-rate-limiter", name: "Rate Limiter Design", phase: 4, difficulty: "Medium" },
      { id: "sd-url-shortener", name: "Design URL Shortener", phase: 4, difficulty: "Medium" },
      { id: "sd-news-feed", name: "Design News Feed", phase: 4, difficulty: "Hard" },
      { id: "sd-chat-system", name: "Design Chat System", phase: 4, difficulty: "Hard" },
      { id: "sd-tradeoffs", name: "Trade-off Analysis Framework", phase: 4, difficulty: "Medium" },
    ],
  },
  {
    id: 5,
    title: "Projects & Behavioral",
    topics: [
      { id: "beh-star-method", name: "STAR Method Framework", phase: 5, difficulty: "Easy" },
      { id: "beh-leadership-amazon", name: "Amazon Leadership Principles", phase: 5, difficulty: "Medium" },
      { id: "beh-leadership-google", name: "Googleyness & Leadership", phase: 5, difficulty: "Medium" },
      { id: "beh-conflict-resolution", name: "Conflict Resolution Stories", phase: 5, difficulty: "Medium" },
      { id: "beh-failure-story", name: "Failure & Growth Stories", phase: 5, difficulty: "Medium" },
      { id: "proj-capstone-scope", name: "Capstone Project Scoping", phase: 5, difficulty: "Medium" },
      { id: "proj-resume", name: "Resume Optimization", phase: 5, difficulty: "Easy" },
      { id: "proj-github", name: "GitHub Portfolio Polish", phase: 5, difficulty: "Easy" },
      { id: "proj-code-review", name: "Code Review Best Practices", phase: 5, difficulty: "Medium" },
      { id: "beh-mock-prep", name: "Behavioral Mock Interview Prep", phase: 5, difficulty: "Medium" },
      { id: "beh-questions-bank", name: "Behavioral Question Bank", phase: 5, difficulty: "Easy" },
      { id: "beh-cross-functional", name: "Cross-Functional Collaboration", phase: 5, difficulty: "Medium" },
    ],
  },
  {
    id: 6,
    title: "Final Preparation",
    topics: [
      { id: "prep-mock-dsa", name: "Mock DSA Interviews", phase: 6, difficulty: "Hard" },
      { id: "prep-mock-sd", name: "Mock System Design Rounds", phase: 6, difficulty: "Hard" },
      { id: "prep-mock-behavioral", name: "Mock Behavioral Rounds", phase: 6, difficulty: "Medium" },
      { id: "prep-blind-75", name: "Blind 75 Review Sprint", phase: 6, difficulty: "Hard" },
      { id: "prep-neetcode-150", name: "NeetCode 150 Review", phase: 6, difficulty: "Hard" },
      { id: "prep-company-research", name: "Company-Specific Research", phase: 6, difficulty: "Easy" },
      { id: "prep-weak-areas", name: "Weak-Area Drills", phase: 6, difficulty: "Medium" },
      { id: "prep-timed-contests", name: "Timed Contest Practice", phase: 6, difficulty: "Hard" },
      { id: "prep-whiteboard", name: "Whiteboard Coding Practice", phase: 6, difficulty: "Hard" },
      { id: "prep-offer-negotiation", name: "Offer Negotiation", phase: 6, difficulty: "Medium" },
      { id: "prep-final-sprint", name: "Final Sprint Plan", phase: 6, difficulty: "Medium" },
      { id: "prep-rest-recovery", name: "Rest & Recovery Strategy", phase: 6, difficulty: "Easy" },
    ],
  },
];

/** Flat list of every topic across all phases */
export const ROADMAP_TOPICS = ROADMAP_PHASES.flatMap((p) => p.topics);

/**
 * @param {number} phase
 * @returns {RoadmapTopic[]}
 */
export function getTopicsByPhase(phase) {
  const entry = ROADMAP_PHASES.find((p) => p.id === phase);
  return entry?.topics ?? [];
}

/**
 * @param {string} id
 * @returns {RoadmapTopic | undefined}
 */
export function getTopicById(id) {
  return ROADMAP_TOPICS.find((t) => t.id === id);
}

/**
 * @param {number} phase
 * @returns {RoadmapPhase | undefined}
 */
export function getPhaseById(phase) {
  return ROADMAP_PHASES.find((p) => p.id === phase);
}

/**
 * Flat ordered topic list matching the roadmap UI (Phase 1 interleaved C++/DSA pairs).
 * @returns {Array<RoadmapTopic & { step?: number }>}
 */
export function getOrderedRoadmapTopics() {
  const ordered = [];

  for (const phase of ROADMAP_PHASES) {
    if (phase.id === 1) {
      for (let i = 0; i < phase.topics.length; i += 2) {
        const step = i / 2 + 1;
        if (phase.topics[i]) ordered.push({ ...phase.topics[i], step });
        if (phase.topics[i + 1]) ordered.push({ ...phase.topics[i + 1], step });
      }
    } else {
      for (const topic of phase.topics) {
        ordered.push({ ...topic });
      }
    }
  }

  return ordered;
}

/**
 * @param {string} topicId
 * @returns {(RoadmapTopic & { step?: number }) | null}
 */
export function getNextRoadmapTopic(topicId) {
  const ordered = getOrderedRoadmapTopics();
  const index = ordered.findIndex((t) => t.id === topicId);
  if (index < 0 || index >= ordered.length - 1) return null;
  return ordered[index + 1];
}

/**
 * @param {string} topicId
 * @returns {string}
 */
export function topicTrackFromId(topicId) {
  if (topicId?.startsWith("cpp-")) return "cpp";
  if (topicId?.startsWith("dsa-")) return "dsa";
  return "";
}