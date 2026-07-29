import type { Chapter } from "@/lib/types";

export const chaptersPart3: Chapter[] = [
  {
    id: "w1-c10",
    slug: "problem-solving-framework",
    number: 10,
    title: "Problem Solving Framework",
    subtitle: "A repeatable process for every coding problem",
    estimatedMinutes: 45,
    day: 6,
    introduction: `Talent is unreliable under pressure. **Process** is reliable.

This chapter installs the EngineerOS Problem Solving Framework — the same spine you will use on Day 6 practice and in every future mock interview.`,
    realWorldProblem: `Candidate A is “smart” but chaotic: jumps into code, deletes half, panics, fails easy-medium problems.

Candidate B uses a framework: clarifies, examples, brute force, optimize, code, test. Candidate B looks calmer and scores higher — even with similar raw ability.`,
    whyExists: `Without a framework, every problem feels new. With a framework, every problem is an instance of a known process. That is how you scale skill.`,
    historicalBackground: `Polya’s “How to Solve It” taught structured mathematical problem solving decades ago: understand, plan, carry out, look back. Interview prep communities adapted this to coding rounds. EngineerOS hardens it into a checklist you can execute half-asleep.`,
    visualIntuition: `Seven gates. You do not skip gates under stress:

1 Clarify → 2 Examples → 3 Brute → 4 Optimize → 5 Code → 6 Test → 7 Complexity/Reflect

Each gate has an exit criterion. Example gate exits only when edge cases are listed.`,
    animationType: "framework",
    simpleExplanation: `### The EngineerOS 7-Step Framework

**1. Clarify**  
Restate problem. Ask constraints (n, value ranges), input guarantees, output format, mutability, multiple answers?

**2. Examples**  
Normal case + edge cases (empty, single, duplicates, already sorted, negative, max n).

**3. Brute Force**  
Correct slow idea first. State complexity. This proves understanding.

**4. Optimize**  
Where is wasted work? Can sorting, hashing, two pointers, precomputation, or a better structure help? State new complexity.

**5. Code**  
Translate the plan. Use clear names. Keep functions small. Narrate in interviews.

**6. Test**  
Trace your examples. Fix bugs. Try one nasty edge.

**7. Complexity + Reflection**  
Final time/space. What pattern was this? Log mistakes if any.`,
    realLifeAnalogy: `Emergency medicine triage protocols exist so doctors do not invent care order during chaos. Your framework is triage for algorithms.`,
    stepByStep: [
      "Print or memorize the 7 steps.",
      "On each practice problem, write step headers in comments.",
      "Do not write solution code before step 4 is solid.",
      "If stuck in optimize >10 minutes, write brute force fully first.",
      "After solving, name the pattern in one phrase.",
      "Add to mistake book if you skipped a step and paid for it.",
    ],
    dryRun: {
      input: "Problem: best time to buy/sell stock once",
      steps: [
        "Clarify: one transaction? prices non-empty?",
        "Example: [7,1,5,3,6,4] → buy 1 sell 6 → profit 5",
        "Brute: try all pairs i<j O(n²)",
        "Optimize: track min so far, best profit O(n)",
        "Code; test edge: decreasing array → 0",
        "Time O(n) space O(1); pattern: running min/max",
      ],
      output: "Structured solve with clear complexity",
    },
    code: [
      {
        language: "cpp",
        title: "Framework comments in solution file",
        content: `// 1 Clarify: one buy + one sell, max profit, or 0
// 2 Examples: [7,1,5,3,6,4] -> 5; [7,6,4] -> 0
// 3 Brute: all pairs O(n^2)
// 4 Optimize: min_price so far; best = max(best, price - min)
// 5 Code:
int maxProfit(vector<int>& prices) {
    int minPrice = INT_MAX, best = 0;
    for (int p : prices) {
        minPrice = min(minPrice, p);
        best = max(best, p - minPrice);
    }
    return best;
}
// 6 Test mentally on examples
// 7 O(n) time, O(1) space`,
        explanation: "The comments are training wheels — use them until automatic.",
      },
    ],
    mermaidDiagrams: [
      {
        title: "Problem Solving Process",
        code: `flowchart TD
  A[Clarify] --> B[Examples + Edges]
  B --> C[Brute Force]
  C --> D[Complexity OK for constraints?]
  D -->|Yes| E[Code]
  D -->|No| F[Optimize Structure]
  F --> G[Re-check Complexity]
  G --> E
  E --> H[Test + Fix]
  H --> I[State Complexity + Pattern]
  I --> J[Reflect / Log]`,
      },
    ],
    flowchartSteps: [
      { id: "1", label: "Clarify", type: "start" },
      { id: "2", label: "Examples", type: "process" },
      { id: "3", label: "Brute Force", type: "process" },
      { id: "4", label: "Optimize?", type: "decision" },
      { id: "5", label: "Code + Test", type: "process" },
      { id: "6", label: "Reflect", type: "end" },
    ],
    complexityAnalysis: {
      time: "Framework adds 3–8 minutes upfront; saves disasters",
      space: "Working memory structured by steps",
      best: "Automatic under pressure",
      average: "Conscious checklist",
      worst: "Skip → thrash coding",
      explanation: "Meta-algorithm for solving algorithms.",
    },
    interviewPerspective: `Interviewers often grade process as much as final code. Saying “I’ll start with a correct O(n²) approach, then improve” is professional and safe.`,
    commonMistakes: [
      {
        mistake: "Optimizing a misunderstood problem",
        fix: "Clarify + examples before cleverness.",
      },
      {
        mistake: "No brute force path when optimize fails",
        fix: "Always have a correct fallback to discuss/code.",
      },
      {
        mistake: "Testing only the happy path",
        fix: "Force at least one edge case every time.",
      },
    ],
    miniQuiz: [
      {
        id: "c10-q1",
        type: "mcq",
        question: "Correct order start:",
        options: [
          "Code → Test → Clarify",
          "Clarify → Examples → Brute → Optimize → Code",
          "Optimize → Clarify → Code",
          "Memorize editorial → type",
        ],
        answer: 1,
        explanation: "Framework order prevents false starts.",
      },
      {
        id: "c10-q2",
        type: "truefalse",
        question: "You should skip brute force if you think you see the optimal idea immediately.",
        answer: false,
        explanation:
          "Still briefly validate brute force and constraints; many 'optimal ideas' are wrong.",
      },
    ],
    summary: [
      "Process beats improvisation under pressure.",
      "7 steps: clarify, examples, brute, optimize, code, test, reflect.",
      "Name patterns after each solve.",
      "Use comments as scaffolding until automatic.",
    ],
    revisionNotes: [
      "Clarify constraints first",
      "Brute before clever",
      "Edges in examples",
      "Pattern name at end",
    ],
    practiceProblems: [
      {
        id: "c10-p1",
        title: "Two Sum with Full Framework",
        difficulty: "Easy",
        statement:
          "Solve Two Sum using written headers for all 7 steps. Do not open a solution. Hide your final code until you finish optimize notes.",
        observation: "Easy problems are perfect for process training.",
        thinkingQuestions: [
          "What map stores?",
          "Why one pass works?",
        ],
        hints: [
          "Value → index",
          "Check complement before inserting current if required by constraints",
        ],
        bruteForce: "Nested loops O(n²)",
        optimization: "Hash map O(n) average",
        dryRun: "[2,7,11,15], 9 → [0,1]",
        complexity: "Time O(n), Space O(n)",
        reflection: "Which step felt skippable — and was it really?",
        solution: `vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int,int> idx;
    for (int i = 0; i < (int)nums.size(); i++) {
        int need = target - nums[i];
        if (idx.count(need)) return {idx[need], i};
        idx[nums[i]] = i;
    }
    return {};
}`,
        language: "cpp",
      },
      {
        id: "c10-p2",
        title: "Contains Duplicate",
        difficulty: "Easy",
        statement:
          "Return true if any value appears at least twice. Apply full framework; compare sort vs hash approaches.",
        observation: "Multiple valid complexities — discuss trade-offs.",
        thinkingQuestions: ["When is sorting better than hashing?"],
        hints: ["unordered_set insert until collision", "or sort adjacent"],
        bruteForce: "Nested O(n²)",
        optimization: "Hash O(n) avg space O(n); sort O(n log n) space O(1)/O(n)",
        dryRun: "[1,2,3,1] true; [1,2,3,4] false",
        complexity: "State both options",
        reflection: "Did you mention average vs worst for hashing?",
        solution: `bool containsDuplicate(vector<int>& a) {
    unordered_set<int> s;
    for (int x : a) if (!s.insert(x).second) return true;
    return false;
}`,
        language: "cpp",
      },
    ],
    reflectionQuestions: [
      "Which framework step do you rush?",
      "How will you enforce the framework tomorrow?",
      "Confidence on process (0–100)?",
    ],
  },
  {
    id: "w1-c11",
    slug: "leetcode-guide",
    number: 11,
    title: "LeetCode Guide",
    subtitle: "How to use LeetCode as a training system — not a dopamine slot machine",
    estimatedMinutes: 40,
    day: 7,
    introduction: `LeetCode is a powerful gym. It is also a trap.

If you chase acceptance green checks without understanding, you get **counterfeit progress**. This chapter teaches a professional protocol for using LeetCode inside EngineerOS / WIN AUGUST.`,
    realWorldProblem: `A candidate “solves” 400 problems by reading editorials in 5 minutes each. Their interview performance is weak. Another solves 120 problems with deep framework, spaced revision, and mistake logs — and outperforms. Volume without method is vanity.`,
    whyExists: `You will use LeetCode (or equivalent) throughout prep. Week 1 must install hygiene: difficulty selection, timers, editorial rules, tagging, and revision — aligned with EngineerOS principles.`,
    historicalBackground: `Online judges evolved from competitive programming platforms. LeetCode optimized for interview-style problems and company tags. Tags are useful hints **after** solving, not before — otherwise you spoil pattern recognition training.`,
    visualIntuition: `Treat each problem as a training ticket:

Attempt → (optional hints) → Solve or Editorial → Re-own → Tag patterns → Schedule revision → Re-solve later cold

Green check is step 3 of 7 — not the finish line.`,
    animationType: "framework",
    simpleExplanation: `### EngineerOS LeetCode Protocol

**Selection**
- Week 1: Easy + foundational array/hash problems  
- Match the day’s topic  
- Avoid random Hard problems for ego  

**Attempt rules**
- Timer visible (20–25 Easy, 30–40 Medium later)  
- AI off during attempt  
- Write framework notes  

**If stuck**
- Peek 1 hint or problem “approach” section carefully  
- Still no → read editorial  
- Close editorial; re-implement from memory after a break  

**After green**
- Explain aloud in 60 seconds  
- Record complexity  
- Tag 1–2 patterns  
- Add mistakes if any  
- Mark revision intervals (1,3,7,14,30 days)  

**Metrics that matter**
- Problems you can re-solve cold  
- Patterns owned  
- Mistake recurrence ↓  
- Not raw lifetime solved alone`,
    realLifeAnalogy: `Gym reps only count with good form. Cheating the weight with bad form inflates numbers and causes injury. Editorial-first grinding is bad form.`,
    stepByStep: [
      "Pick problem aligned to current mission topic.",
      "Start timer; no tags spoiler if possible.",
      "Run 7-step framework on paper/comments.",
      "Code in C++; test custom cases.",
      "On fail: one hint tier, then editorial if needed.",
      "Re-implement clean version.",
      "Log pattern + mistake book entry if needed.",
      "Schedule revision in EngineerOS Revision page.",
    ],
    dryRun: {
      input: "Problem set: Two Sum, Contains Duplicate, Best Time to Buy/Sell Stock",
      steps: [
        "Solve each with protocol same day as related chapters",
        "Revise Two Sum after 1 day without notes",
        "If fail cold re-solve, lower confidence and re-log",
      ],
      output: "Durable skill, not inflated solve count",
    },
    code: [
      {
        language: "cpp",
        title: "Personal problem log schema (conceptual)",
        content: `struct ProblemLog {
    string name;
    string pattern;      // e.g. "hash map", "two pointers"
    string complexity;   // "O(n) time / O(n) space"
    int minutes;
    bool usedEditorial;
    string mistake;      // empty if clean
    string nextReview;   // ISO date
};`,
        explanation: "EngineerOS Mistake Notebook + Revision cover this — use them religiously.",
      },
    ],
    mermaidDiagrams: [
      {
        title: "LeetCode Training Loop",
        code: `flowchart TD
  A[Select Topic Problem] --> B[Timed Attempt]
  B --> C{Solved?}
  C -->|Yes| D[Explain + Tag]
  C -->|No| E[Hint then Editorial]
  E --> F[Re-implement Cold]
  F --> D
  D --> G[Mistake Log if needed]
  G --> H[Spaced Revision]
  H --> I[Cold Re-solve Later]`,
      },
    ],
    flowchartSteps: [
      { id: "1", label: "Select", type: "start" },
      { id: "2", label: "Timed Attempt", type: "process" },
      { id: "3", label: "Solved?", type: "decision" },
      { id: "4", label: "Editorial Path", type: "process" },
      { id: "5", label: "Own + Revise", type: "end" },
    ],
    complexityAnalysis: {
      time: "Quality minutes > quantity hours of skimming",
      space: "Spaced repetition calendar is your second brain",
      best: "Topic-aligned deliberate practice",
      average: "Mixed with some editorial help",
      worst: "Tag-spoiled editorial copy-paste",
      explanation: "Protocol optimizes retention per hour.",
    },
    interviewPerspective: `Company tags can guide later stage prep. Early on, patterns matter more than “Google tagged” labels. A clean Two Sum explanation beats a memorized hard problem you cannot re-derive.`,
    commonMistakes: [
      {
        mistake: "Sorting problems by acceptance rate only",
        fix: "Sort by topic relevance to current mission.",
      },
      {
        mistake: "Never re-solving",
        fix: "Spaced cold re-solves are mandatory.",
      },
      {
        mistake: "Language hopping mid-prep",
        fix: "Stick to C++ for WIN AUGUST coding rounds.",
      },
      {
        mistake: "Ignoring Medium forever",
        fix: "After Week 1 foundations, gradually introduce Medium with scaffolding.",
      },
    ],
    miniQuiz: [
      {
        id: "c11-q1",
        type: "mcq",
        question: "What is a vanity metric in LeetCode prep?",
        options: [
          "Cold re-solve success rate",
          "Lifetime solved count without retention",
          "Mistake recurrence decreasing",
          "Pattern ownership",
        ],
        answer: 1,
        explanation: "Raw solves without ownership inflate ego, not skill.",
      },
      {
        id: "c11-q2",
        type: "mcq",
        question: "After reading an editorial, you should:",
        options: [
          "Mark complete and never return",
          "Re-implement from memory and schedule revision",
          "Immediately open 10 related hard problems",
          "Switch programming language",
        ],
        answer: 1,
        explanation: "Ownership requires rewrite + spaced return.",
      },
    ],
    summary: [
      "LeetCode is a gym; protocol is form.",
      "Timer, framework, editorial discipline, tags after, revision always.",
      "Optimize for cold re-solves and pattern ownership.",
      "Week 1 stays on Easy foundations aligned to topics.",
    ],
    revisionNotes: [
      "No editorial first",
      "Re-own every solution",
      "1/3/7/14/30 revision",
      "C++ consistency",
    ],
    practiceProblems: [
      {
        id: "c11-p1",
        title: "Protocol Three-Pack",
        difficulty: "Easy",
        statement:
          "Complete Three problems under protocol: Two Sum, Contains Duplicate, Max Profit (Best Time to Buy and Sell Stock). Log each in journal with pattern names.",
        observation: "These encode hash maps, sets, and running min patterns.",
        thinkingQuestions: ["Which problem tricked your edge cases?"],
        hints: ["Stick to time boxes.", "No AI during attempts."],
        bruteForce: "As applicable per problem",
        optimization: "As applicable per problem",
        dryRun: "Custom tests for each",
        complexity: "Write for each",
        reflection: "What will you change in protocol next week?",
        solution: `Standard optimal solutions:
Two Sum: hash map
Contains Duplicate: set or sort
Max Profit: running minimum
Do not copy without cold rewrite.`,
        language: "cpp",
      },
    ],
    reflectionQuestions: [
      "What bad LeetCode habit will you kill in August?",
      "How many quality problems per day is sustainable for you?",
      "End of Week 1 confidence overall (0–100)?",
    ],
  },
];
