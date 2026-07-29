import type { Chapter } from "@/lib/types";

export const chaptersPart1: Chapter[] = [
  {
    id: "w1-c01",
    slug: "introduction",
    number: 1,
    title: "Introduction",
    subtitle: "Welcome to EngineerOS — your single system for Google-level preparation",
    estimatedMinutes: 25,
    day: 1,
    introduction: `Welcome to EngineerOS.

This is not a course catalog. This is not a pile of notes. This is not a random LeetCode grind.

EngineerOS is your **Engineering Operating System** — a deliberate, day-by-day system designed for one purpose: to take you from solid C++ fundamentals and beginner DSA to the level required to clear software engineering interviews at Google, Microsoft, Amazon, and Meta.

Your name is Sham Kamble. You already have three years of software engineering experience. That is a strength — you understand production code, debugging, and shipping. What you are building now is the **interview-grade problem-solving muscle** that top companies test under pressure.

Your mission is fixed: **WIN AUGUST**. Your target is **₹20+ LPA**. Your dream companies are Google, Microsoft, Amazon, and Meta.

Every page you open inside this system exists only to move that mission forward.`,
    realWorldProblem: `Imagine this: It is 9:00 AM on a Tuesday. You open your laptop and feel a familiar tension — *What should I study today?*

You check YouTube. Ten “Google interview prep” videos. You open LeetCode. 2,800 problems. You open Notion. Half-finished notes from three different roadmaps. You open ChatGPT. A new plan that contradicts yesterday’s plan.

Two hours later, you have reorganized your todo list, switched topics twice, and solved zero problems with full understanding.

This is **decision fatigue**. It is the silent killer of interview preparation. The problem is not lack of content. The problem is lack of a single operating system that tells you exactly what to do next — and nothing else.`,
    whyExists: `EngineerOS exists because preparation fails when the brain spends energy on *planning* instead of *learning*.

Elite athletes do not wake up and invent their workout. The program is already written. They execute.

Elite interview candidates need the same thing: a fixed Week 1 roadmap, today’s mission pre-decided, textbook-quality explanations, visual intuition, deliberate practice, and reflection — without advertisements, social feeds, or “suggested for you” noise.

This chapter exists so you internalize the contract: **open EngineerOS → do today’s mission → close the laptop knowing you moved closer to Google.**`,
    historicalBackground: `Software engineering interviews at large tech companies evolved over decades.

In the 1990s and early 2000s, interviews often focused on résumé walkthroughs and language trivia. As companies scaled hiring, they needed a **fair, comparable signal** across thousands of candidates. Data structures and algorithms (DSA) became that signal — not because Google engineers rewrite binary search every day, but because DSA problems compress several traits into 45 minutes:

- Can you model a problem?
- Can you reason about correctness?
- Can you analyze trade-offs (time vs space)?
- Can you communicate under pressure?
- Can you write clean, bug-resistant code?

Meanwhile, self-study tools fragmented: textbooks (CLRS), online judges (LeetCode, HackerRank), video platforms, and AI chatbots. Fragmentation increased *options* and decreased *focus*. EngineerOS is a deliberate counter-move: one system, one mission, one day at a time.`,
    visualIntuition: `Picture preparation as a **mission control dashboard**, not a library.

A library has infinite shelves. Mission control has **today’s flight plan**.

Your Week 1 flight plan is fixed:
1. Mindset & interview reality  
2. Complexity thinking  
3. Arrays & Vectors in C++  
4. A repeatable problem-solving framework  
5. How to use LeetCode as a training tool (not a casino)

Each day builds the next. You do not skip ahead. You do not redesign the roadmap.`,
    animationType: "framework",
    simpleExplanation: `**EngineerOS in one sentence:** Every time you open this app, it tells you exactly what to study today — and trains your thinking like a premium engineering textbook, not a slide deck.

You will learn concepts gradually. One idea per screen when possible. Animations for memory and algorithms. Quizzes to force retrieval. Practice problems that hide the optimal solution until you have thought. A journal for reflection. A mistake notebook for permanent lessons. Spaced revision so knowledge sticks.

Your only job is execution.`,
    realLifeAnalogy: `Think of a commercial pilot’s pre-flight checklist.

The pilot does not invent a new sequence every morning. The checklist exists so that under stress, nothing critical is forgotten and no energy is wasted on deciding the order of operations.

EngineerOS is your pre-flight checklist for becoming a Google software engineer. Today’s mission is the checklist. Complete it. Log reflection. Come back tomorrow.`,
    stepByStep: [
      "Accept the fixed Week 1 roadmap — no redesigning.",
      "Start each day from Today's Mission (not random browsing).",
      "Read textbook chapters slowly — one section at a time.",
      "Run every animation until the intuition feels obvious.",
      "Attempt practice with hints before revealing solutions.",
      "Complete the mini-quiz without looking back first.",
      "Write journal answers honestly (confidence included).",
      "Log mistakes the same day you make them.",
      "Mark checklist items only when truly done.",
      "Protect streak: consistency beats intensity.",
    ],
    dryRun: {
      input: "Monday morning, Sham opens EngineerOS at 0% mission progress",
      steps: [
        "Landing page shows mission status: Week 1, Day 1, 0%.",
        "Sham clicks START TODAY'S MISSION.",
        "Daily Mission opens: Day 1 objective + time breakdown.",
        "Sham completes Introduction + How Google Interviews Work chapters.",
        "Quiz scores saved; checklist items checked; journal written.",
        "Progress: Day 1 complete, streak = 1, confidence increases.",
      ],
      output: "Decision fatigue eliminated; one clear day of progress logged",
    },
    code: [
      {
        language: "text",
        title: "Your Daily Execution Loop (pseudo)",
        content: `function day(mission):
  open(mission.objective)
  for chapter in mission.chapters:
    read(chapter)           // textbook depth
    watch(animations)
    attempt(practice)       // think first
    take(quiz)
  write(journal)
  log(mistakes)
  mark(complete)
  return rest()             // recovery is part of the system`,
        explanation:
          "This is not code to compile — it is the operating procedure. Treat it like production runbooks: follow it under pressure.",
      },
    ],
    mermaidDiagrams: [
      {
        title: "EngineerOS Daily Flow",
        code: `flowchart TD
  A[Open EngineerOS] --> B[Today's Mission]
  B --> C[Learn Textbook Chapter]
  C --> D[Visual Animation]
  D --> E[Practice Thinking]
  E --> F[Quiz]
  F --> G[Reflection Journal]
  G --> H[Update Progress]
  H --> I{Day Complete?}
  I -->|Yes| J[Rest / Recover]
  I -->|No| C
  J --> K[Return Tomorrow]`,
      },
    ],
    flowchartSteps: [
      { id: "1", label: "Open EngineerOS", type: "start" },
      { id: "2", label: "Read Today's Mission", type: "process" },
      { id: "3", label: "Study Chapter", type: "process" },
      { id: "4", label: "Practice + Quiz", type: "process" },
      { id: "5", label: "Reflect", type: "process" },
      { id: "6", label: "Mission Complete", type: "end" },
    ],
    memoryDiagram: `Mission State (in your mind + LocalStorage)
┌─────────────────────────────────────┐
│ currentWeek: 1                      │
│ currentDay: 1..7                    │
│ streak, hours, quizScores           │
│ chaptersCompleted[]                 │
│ mistakes[], journal[], revisions[]  │
└─────────────────────────────────────┘
All progress persists offline after first load.`,
    complexityAnalysis: {
      time: "O(1) decision cost per day (mission is precomputed)",
      space: "O(W) where W is fixed Week-1 content",
      best: "Follow mission → maximum learning per hour",
      average: "Occasional re-reads; still on path",
      worst: "Ignore system → decision fatigue returns O(n) thrash",
      explanation:
        "The system optimizes the meta-problem: minimizing planning overhead so learning throughput stays high.",
    },
    interviewPerspective: `Interviewers at Google will not ask “Did you use EngineerOS?” They will ask problems that reveal whether you built **durable thinking skills**.

This system is how you build those skills without burning out. In interviews you will:
- Clarify constraints
- Propose brute force
- Optimize with structure
- Code cleanly in C++
- Analyze complexity
- Test edge cases

Week 1 installs the foundation for all of that.`,
    commonMistakes: [
      {
        mistake: "Redesigning the roadmap every weekend",
        fix: "Roadmap is fixed. Channel energy into execution and mistake logging.",
      },
      {
        mistake: "Consuming 10 resources for the same topic",
        fix: "Use EngineerOS textbook first. Add one secondary source only if stuck.",
      },
      {
        mistake: "Skipping reflection because it feels soft",
        fix: "Reflection converts activity into learning. Write it every day.",
      },
      {
        mistake: "Measuring only problems solved",
        fix: "Measure understanding, quiz scores, revision completion, and confidence honesty.",
      },
    ],
    miniQuiz: [
      {
        id: "c01-q1",
        type: "mcq",
        question: "What is the primary enemy EngineerOS is designed to eliminate?",
        options: [
          "Lack of coding tutorials",
          "Decision fatigue about what to study",
          "Need for a backend server",
          "Learning multiple programming languages",
        ],
        answer: 1,
        explanation:
          "EngineerOS pre-decides the daily mission so energy goes into learning, not planning.",
      },
      {
        id: "c01-q2",
        type: "truefalse",
        question: "You should redesign the Week 1 roadmap if you feel behind.",
        answer: false,
        explanation:
          "The roadmap is fixed. Catch up by completing missions; do not invent a new plan.",
      },
      {
        id: "c01-q3",
        type: "mcq",
        question: "What is your current mission code?",
        options: ["LEARN FAST", "WIN AUGUST", "GRIND LEETCODE", "SHIP FEATURES"],
        answer: 1,
        explanation: "Current Mission: WIN AUGUST.",
      },
    ],
    summary: [
      "EngineerOS is an operating system for interview prep, not a content dump.",
      "Your profile, companies, and package target are fixed context.",
      "Decision fatigue is removed by today's mission.",
      "Week 1 builds mindset, complexity, arrays/vectors, framework, and LeetCode method.",
      "Progress is tracked locally; consistency is the KPI.",
    ],
    revisionNotes: [
      "Open app → do mission → reflect → stop.",
      "One idea at a time; never dump.",
      "Think before solutions.",
      "WIN AUGUST · ₹20+ LPA · Google/Microsoft/Amazon/Meta",
    ],
    practiceProblems: [
      {
        id: "c01-p1",
        title: "Personal Mission Contract",
        difficulty: "Easy",
        statement:
          "Write a 6-line personal contract: daily minimum study block, no-roadmap-change rule, journal rule, mistake-log rule, streak rule, and reward rule.",
        observation:
          "Systems beat motivation. A written contract reduces negotiation with yourself.",
        thinkingQuestions: [
          "What time of day is your highest focus window?",
          "What will you do when you miss a day?",
        ],
        hints: [
          "Keep rules binary and observable.",
          "Avoid vague goals like 'study more'.",
        ],
        bruteForce: "Rely on motivation each morning.",
        optimization: "Precommit rules + environment design (same desk, phone away).",
        dryRun: "Simulate a low-energy day: which rule still keeps you on track?",
        complexity: "O(1) daily decision after contract exists",
        reflection: "Which rule will be hardest for you to keep?",
        solution: `Contract example:
1) 90 focused minutes before leisure apps
2) No roadmap edits in August
3) Journal 4 prompts daily
4) Log every mistaken problem same day
5) Miss day → restart streak without shame, no double punishment
6) Weekly debrief on Sunday night`,
        language: "cpp",
      },
    ],
    reflectionQuestions: [
      "What usually causes you to lose study focus?",
      "How will EngineerOS change your first 10 minutes of study?",
      "On a scale of 1–10, how committed are you to WIN AUGUST today?",
    ],
  },
  {
    id: "w1-c02",
    slug: "how-google-interviews-work",
    number: 2,
    title: "How Google Interviews Work",
    subtitle: "What is actually tested in 45 minutes",
    estimatedMinutes: 35,
    day: 1,
    introduction: `Google interviews are often mythologized. People imagine trick questions, obscure puzzles, or “only geniuses pass.”

Reality is more structured — and more trainable.

A typical Google software engineering interview loop evaluates whether you can **solve ambiguous technical problems while communicating like a colleague**. DSA is the medium. Collaboration quality is the signal.`,
    realWorldProblem: `You are in a virtual interview. The prompt is:

“Given a stream of integers, design a structure to return the median in efficient time.”

You panic, jump into code, write a messy vector sort on every query, run out of time, and never discuss trade-offs.

A stronger candidate clarifies stream size expectations, discusses two-heap design, codes cleanly, tests edge cases, and narrates complexity. Same problem. Different process. Different outcome.`,
    whyExists: `This chapter exists so you stop studying “random problems” and start training the **interview skill stack**:

1. Clarify  
2. Examples  
3. Brute force  
4. Optimize  
5. Code  
6. Test  
7. Complexity  

Google’s process is designed to compare candidates fairly. Understanding the format removes fear and focuses practice.`,
    historicalBackground: `Google popularized a rigorous interview culture emphasizing algorithmic thinking and GCA (General Cognitive Ability), along with role-related knowledge and leadership attributes (in Google’s language: “Googleyness” / leadership for higher levels).

Over time, the industry standardized around:
- Phone / virtual technical screens
- Onsite (or virtual onsite) loops: multiple coding rounds, sometimes system design (level-dependent), behavioral
- Hiring committee review (at Google, interviewers do not make the final call alone)

For L3/L4-style SWE roles, **coding interviews dominate**. System design weight increases with level. Your current mission prioritizes coding + DSA foundations first.`,
    visualIntuition: `Think of an interview as a **shared whiteboard session with a future teammate**, not an exam proctor watching you fail.

The interviewer is collecting evidence:
- Problem understanding
- Structured thinking
- Code quality
- Debugging skill
- Communication
- Independence vs hints needed

Your practice must produce evidence in all six — not only “got the right answer eventually.”`,
    animationType: "framework",
    simpleExplanation: `**What Google coding interviews optimize for:**

- Correctness under constraints  
- Efficient enough algorithms  
- Clean C++ (or your language) implementation  
- Clear communication  
- Handling follow-ups  

**What they are not:**
- A trivia contest about API names  
- A pure IQ test  
- A requirement to invent novel algorithms from research papers  

Most problems are variants of patterns: arrays, hashing, two pointers, sliding window, trees, graphs, DP, heaps, intervals, etc. Week 1 starts the foundation patterns.`,
    realLifeAnalogy: `A cooking show challenge: you get ingredients (problem constraints) and 45 minutes. Judges score taste (correctness), technique (algorithm), plating (code quality), and calm narration (communication). Burning the dish while staying silent fails even if you “almost” had a recipe.`,
    stepByStep: [
      "Listen fully; do not interrupt the prompt.",
      "Restate the problem in your own words.",
      "Ask about constraints: size, duplicates, sorted?, mutability, memory limits.",
      "Build 2–3 examples including edge cases.",
      "State a correct brute force and its complexity.",
      "Identify bottleneck; propose optimized approach.",
      "Confirm approach with interviewer before coding.",
      "Code in small, named steps; narrate.",
      "Trace with an example; fix bugs calmly.",
      "State final time/space complexity; discuss follow-ups.",
    ],
    dryRun: {
      input: "Problem: Two Sum — array of ints + target, return indices",
      steps: [
        "Clarify: one solution? duplicates? same element twice?",
        "Example: [2,7,11,15], target 9 → [0,1]",
        "Brute: nested loops O(n²)",
        "Optimize: hash map value→index, one pass O(n)",
        "Code clean C++ with unordered_map",
        "Test: empty, no pair, negatives, duplicates",
      ],
      output: "Structured interview performance, not lucky guess",
    },
    code: [
      {
        language: "cpp",
        title: "Two Sum — interview-style C++",
        content: `#include <vector>
#include <unordered_map>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> need; // value -> index
    for (int i = 0; i < (int)nums.size(); i++) {
        int b = target - nums[i];
        if (need.count(b)) return {need[b], i};
        need[nums[i]] = i;
    }
    return {}; // depending on guarantees
}`,
        explanation:
          "This is the kind of clean, hash-based solution interviewers expect after you explain brute force and trade-offs.",
      },
    ],
    mermaidDiagrams: [
      {
        title: "Interview Loop Structure",
        code: `flowchart LR
  A[Recruiter Screen] --> B[Technical Phone Screen]
  B --> C[Virtual Onsite Loop]
  C --> D[Coding x2-3]
  C --> E[Behavioral]
  C --> F[System Design optional]
  D --> G[Hiring Committee]
  E --> G
  F --> G
  G --> H{Decision}
  H -->|Hire| I[Team Matching / Offer]
  H -->|No Hire| J[Feedback / Retry later]`,
      },
    ],
    flowchartSteps: [
      { id: "1", label: "Clarify Problem", type: "start" },
      { id: "2", label: "Examples + Edges", type: "process" },
      { id: "3", label: "Brute Force", type: "process" },
      { id: "4", label: "Optimize?", type: "decision" },
      { id: "5", label: "Code + Test", type: "process" },
      { id: "6", label: "Complexity + Wrap", type: "end" },
    ],
    complexityAnalysis: {
      time: "Interview: ~45 minutes wall-clock",
      space: "One shared editor + your working memory",
      best: "Clear structure, optimal-enough solution, clean code",
      average: "Right idea, minor bugs fixed with tests",
      worst: "Silent coding, no examples, stuck in bugs",
      explanation:
        "Your preparation should rehearse the full 45-minute performance, not only final algorithms.",
    },
    interviewPerspective: `At Google-level interviews, **how you think is visible**. Talking through trade-offs can salvage a partially incomplete solution. Silence while thrashing rarely does.

Practice out loud. Timebox. Record yourself weekly.`,
    commonMistakes: [
      {
        mistake: "Coding immediately",
        fix: "Spend first 5–8 minutes on clarifying + approach.",
      },
      {
        mistake: "Ignoring edge cases",
        fix: "Always list empty, single element, duplicates, overflow, sorted/unsorted.",
      },
      {
        mistake: "Pretending to know when stuck",
        fix: "State what you know, what you are testing next; ask for a small hint if needed.",
      },
      {
        mistake: "Only practicing alone silently",
        fix: "Do mock interviews; communication is scored.",
      },
    ],
    miniQuiz: [
      {
        id: "c02-q1",
        type: "mcq",
        question: "What should you do before writing code in a coding interview?",
        options: [
          "Memorize the solution silently",
          "Clarify, examples, brute force, then optimized plan",
          "Ask for a different problem",
          "Start typing the first idea instantly",
        ],
        answer: 1,
        explanation: "Structure first. Code second.",
      },
      {
        id: "c02-q2",
        type: "mcq",
        question: "Why do companies use DSA interviews?",
        options: [
          "Because engineers only write sorting algorithms daily",
          "As a compressed signal for problem-solving under constraints",
          "To test graphic design skills",
          "To replace system design entirely at all levels",
        ],
        answer: 1,
        explanation: "DSA compresses modeling, correctness, and trade-off reasoning into a short session.",
      },
    ],
    summary: [
      "Google interviews evaluate structured problem-solving + communication.",
      "Format is learnable; myths are unhelpful.",
      "Always: clarify → examples → brute → optimize → code → test.",
      "Hiring decisions consider multiple signals, not one lucky problem.",
    ],
    revisionNotes: [
      "45 minutes = performance + correctness",
      "Narrate trade-offs",
      "Edge cases are free points",
      "Mocks > silent grinding alone",
    ],
    practiceProblems: [
      {
        id: "c02-p1",
        title: "Interview Script Drill",
        difficulty: "Easy",
        statement:
          "Pick Two Sum. Perform a full out-loud mock in 20 minutes using the 7-step interview process. Record yourself.",
        observation: "The skill is the process under time pressure.",
        thinkingQuestions: [
          "Where did you waste time?",
          "Did you state complexity without being asked?",
        ],
        hints: ["Use a timer visible on screen.", "Do not open solutions mid-mock."],
        bruteForce: "Nested loops explanation first",
        optimization: "Hash map one-pass",
        dryRun: "Trace [3,2,4], target 6",
        complexity: "Time O(n), Space O(n)",
        reflection: "What phrase will you use next time when stuck?",
        solution: `Use the step list from this chapter as a checklist beside your editor. After mock, note 3 process improvements — not only algorithm mistakes.`,
        language: "cpp",
      },
    ],
    reflectionQuestions: [
      "Which interview step do you currently skip most often?",
      "How will you practice communication this week?",
      "What fear about Google interviews can you reframe now?",
    ],
  },
  {
    id: "w1-c03",
    slug: "why-dsa-still-matters",
    number: 3,
    title: "Why DSA Still Matters",
    subtitle: "In a world of frameworks, AI, and cloud abstractions",
    estimatedMinutes: 30,
    day: 2,
    introduction: `If you ship product features with React, Spring, or internal tools, it is fair to ask: why do interviews still obsess over arrays, trees, and Big-O?

Because **DSA is not about memorizing 300 tricks**. It is about predictable reasoning when performance, correctness, and scale collide.`,
    realWorldProblem: `A service that worked for 10k users times out at 1M users. The API handler does O(n²) work per request on a growing list. Nobody “felt” the complexity at small n. Production felt it on a Saturday night.

DSA literacy is how you see that cost **before** production does.`,
    whyExists: `This chapter anchors motivation. Without believing DSA matters, grind becomes empty. With the right belief, every animation and dry run has purpose: you are training a production-relevant mental model, packaged in interview-sized problems.`,
    historicalBackground: `From Knuth’s analysis of algorithms to modern distributed systems, computing progress repeatedly returns to the same truths: data layout matters, asymptotic growth matters, and clever structure beats raw hardware eventually.

Even with AI writing boilerplate, someone must specify constraints, validate complexity, and debug pathological inputs. That someone is the engineer who understands DSA.`,
    visualIntuition: `Plot n on the x-axis and operations on the y-axis:

- O(1) stays flat  
- O(log n) rises slowly  
- O(n) diagonal  
- O(n log n) steeper  
- O(n²) explodes  

At n=100, many look fine. At n=10⁷, only the left side of that chart survives. Interviews test whether you can **see the chart in your head** while coding.`,
    animationType: "complexity",
    simpleExplanation: `**DSA still matters because:**

1. **Interviews use it as a standard signal**  
2. **Performance bugs are complexity bugs in disguise**  
3. **Good abstractions leak under load** — knowing foundations helps you choose structures  
4. **AI accelerates typing, not ownership** — you still must verify  
5. **It trains transferable thinking**: invariants, edge cases, proofs by example  

You are not studying DSA instead of engineering. You are studying the reasoning layer underneath engineering.`,
    realLifeAnalogy: `A race car driver still learns physics of grip and braking even though the car has launch control and ABS. When conditions go weird, fundamentals save the race. DSA is grip theory for software under constraints.`,
    stepByStep: [
      "Separate 'I don't use heaps daily' from 'I never need heap thinking'.",
      "Map each DSA topic to a real failure mode (timeouts, memory, wrong answers).",
      "Practice explaining why an approach fails at scale.",
      "Use complexity as a design tool, not only post-hoc labeling.",
      "Keep language skills (C++) sharp enough to express ideas cleanly.",
    ],
    dryRun: {
      input: "Feature: show 'people you may know' from friend lists",
      steps: [
        "Naive: for each user, scan all users O(U²)",
        "At U=10^6, impossible",
        "Better: graph adjacency + smarter ranking pipeline",
        "Interview version compresses this into graph/array problems",
      ],
      output: "Respect for structure and complexity in both jobs and interviews",
    },
    code: [
      {
        language: "cpp",
        title: "Same goal, different complexity",
        content: `// Sum of 1..n — algorithm choice matters in general problems
long long sumNaive(int n) {
    long long s = 0;
    for (int i = 1; i <= n; i++) s += i; // O(n)
    return s;
}

long long sumClosedForm(long long n) {
    return n * (n + 1) / 2; // O(1)
}`,
        explanation:
          "Toy example, real lesson: closed form / better structure can change feasibility.",
      },
    ],
    mermaidDiagrams: [
      {
        title: "Why DSA Maps to Engineering",
        code: `flowchart TD
  A[Real System Problem] --> B[Model Data]
  B --> C[Choose Structure]
  C --> D[Algorithm + Complexity]
  D --> E[Implement]
  E --> F[Measure / Edge Cases]
  F --> G[Ship with Confidence]
  D -.->|Interview compresses this| H[45-min Coding Round]`,
      },
    ],
    flowchartSteps: [
      { id: "1", label: "Encounter Scale Pain", type: "start" },
      { id: "2", label: "Identify Costly Pattern", type: "process" },
      { id: "3", label: "Apply DSA Structure", type: "process" },
      { id: "4", label: "Verify Complexity", type: "process" },
      { id: "5", label: "Stable System", type: "end" },
    ],
    complexityAnalysis: {
      time: "Bad algorithm: may be unusable at scale",
      space: "Wrong structure: memory blowups / cache thrash",
      best: "Right structure early",
      average: "Iterate with profiling",
      worst: "Ignore growth until outage",
      explanation: "DSA is preventive engineering for growth curves.",
    },
    interviewPerspective: `When an interviewer asks for better than O(n²), they are testing whether you can **search the design space** — hashing, sorting + two pointers, precomputation, etc. That skill transfers to design docs and production incidents.`,
    commonMistakes: [
      {
        mistake: "Believing frameworks replace algorithmic thinking",
        fix: "Frameworks implement patterns; you still choose and integrate them.",
      },
      {
        mistake: "Memorizing solutions without complexity intuition",
        fix: "Always restate time/space and why.",
      },
      {
        mistake: "Treating DSA as only for interviews",
        fix: "Log real work moments where structure choices mattered.",
      },
    ],
    miniQuiz: [
      {
        id: "c03-q1",
        type: "truefalse",
        question: "Because AI can generate code, DSA knowledge is obsolete for interviews.",
        answer: false,
        explanation:
          "Interviews and production ownership still require understanding, verification, and complexity reasoning.",
      },
      {
        id: "c03-q2",
        type: "mcq",
        question: "At large n, which growth is most dangerous among common ones?",
        options: ["O(log n)", "O(n)", "O(n log n)", "O(n²)"],
        answer: 3,
        explanation: "Quadratic growth explodes quickly as n increases.",
      },
    ],
    summary: [
      "DSA is a signal and a real engineering foundation.",
      "Scale exposes complexity that small demos hide.",
      "AI does not remove the need to understand.",
      "Train patterns + reasoning, not trivia only.",
    ],
    revisionNotes: [
      "Complexity is a design tool",
      "Structure beats slog",
      "Interview = compressed engineering reasoning",
    ],
    practiceProblems: [
      {
        id: "c03-p1",
        title: "Find the Hidden O(n²)",
        difficulty: "Easy",
        statement:
          "Write a short note on a real or hypothetical feature that accidentally becomes O(n²). Propose a better structure.",
        observation: "Nested loops over growing collections are a classic footgun.",
        thinkingQuestions: ["What is n in production?", "What is the acceptable latency?"],
        hints: ["Think about 'for each user, for each user' patterns."],
        bruteForce: "Double scan",
        optimization: "Hashing, indexing, preaggregation, graph cuts, etc.",
        dryRun: "Plug n=10, n=1e5 into both mental models",
        complexity: "Compare O(n²) vs O(n) or O(n log n)",
        reflection: "Where have you seen this at work?",
        solution: `Example: mutual friends via nested scans of adjacency lists without indexing → precompute counts or use better set intersections with constraints.`,
        language: "cpp",
      },
    ],
    reflectionQuestions: [
      "Did you previously resist DSA? Why?",
      "How does this chapter change your motivation for Week 1?",
      "What production metric would break first if your algorithm were quadratic?",
    ],
  },
  {
    id: "w1-c04",
    slug: "how-ai-changes-engineering",
    number: 4,
    title: "How AI Changes Engineering",
    subtitle: "Use AI as leverage — never as a substitute for thinking",
    estimatedMinutes: 25,
    day: 2,
    introduction: `AI tools can autocomplete functions, explain errors, and draft boilerplate in seconds. That is real leverage.

They can also destroy interview preparation if you use them to skip struggle — because **struggle is the training**.`,
    realWorldProblem: `You paste a LeetCode problem into a chatbot, get a perfect solution, read it once, and mark it “done.” A week later in a mock interview, you cannot reconstruct the idea. The model remembers. You do not.`,
    whyExists: `Week 1 must set an AI policy for EngineerOS:

- Allowed: explaining a concept you already attempted, generating extra examples, reviewing your code after you wrote it  
- Forbidden during training: asking for full solutions before your own brute force + optimized attempt  
- Interview reality: you will not have unconstrained AI in a timed coding round  

This chapter defines that policy clearly.`,
    historicalBackground: `Software engineering has always absorbed automation: compilers, IDEs, linters, Stack Overflow, and now LLMs. Each wave increased speed and raised the bar for taste, verification, and system thinking.

The engineers who win are not those who refuse tools, nor those who blindly trust them — but those who **own outcomes**.`,
    visualIntuition: `Training mode vs Delivery mode:

- **Training (EngineerOS):** weights on; AI spotter only after you try  
- **Delivery (job):** use AI heavily, but you still review complexity, security, and correctness  

Do not train in delivery mode. Your muscles will not grow.`,
    animationType: "none",
    simpleExplanation: `AI changes the **speed of producing code**, not the need for:

- Problem decomposition  
- Complexity judgment  
- Edge-case paranoia  
- Responsibility for failures  

For interviews, companies know AI exists. They still need humans who can think when the tool is wrong, incomplete, or unavailable.`,
    realLifeAnalogy: `GPS made paper maps rare — but if GPS dies in a remote area, the driver who understands navigation still gets home. AI is GPS for code. Fundamentals are navigation.`,
    stepByStep: [
      "Attempt problem for at least 15–20 minutes before any AI help.",
      "When using AI, ask for hints, not full solutions first.",
      "Re-implement any AI-shown idea from scratch without looking.",
      "Ask AI to critique your complexity analysis after you write it.",
      "Never log a problem as solved unless you can re-explain it cold.",
    ],
    dryRun: {
      input: "Stuck on binary search boundary condition",
      steps: [
        "Write failing mental model",
        "Ask AI: 'What are common off-by-one patterns in binary search?' not 'solve this'",
        "Apply insight to your code",
        "Re-derive on paper next day",
      ],
      output: "AI used as tutor, not answer key",
    },
    code: [
      {
        language: "cpp",
        title: "Ownership checklist after AI suggestion",
        content: `// Before accepting any generated solution, verify:
// 1) Invariants
// 2) Edge cases
// 3) Time/space
// 4) You can rewrite from memory in 15 minutes
bool ownedSolution = canRewriteFromMemory && complexityUnderstood;`,
        explanation: "If you cannot rewrite it, you do not own it.",
      },
    ],
    mermaidDiagrams: [
      {
        title: "AI Policy for Interview Prep",
        code: `flowchart TD
  A[See Problem] --> B[Own Attempt]
  B --> C{Solved?}
  C -->|Yes| D[Write reflection + complexity]
  C -->|No after effort| E[Hint-level help]
  E --> F[Retry]
  F --> G{Still stuck?}
  G -->|Yes| H[Read solution]
  H --> I[Re-implement cold later]
  G -->|No| D
  I --> D`,
      },
    ],
    flowchartSteps: [
      { id: "1", label: "Attempt Alone", type: "start" },
      { id: "2", label: "Need Help?", type: "decision" },
      { id: "3", label: "Hint Only", type: "process" },
      { id: "4", label: "Full Solution Last", type: "process" },
      { id: "5", label: "Re-own by Rewrite", type: "end" },
    ],
    complexityAnalysis: {
      time: "AI can reduce typing time drastically",
      space: "Your long-term memory still limited — train it",
      best: "AI + strong fundamentals",
      average: "AI for boilerplate, human for design",
      worst: "AI-only prep → interview collapse",
      explanation: "Optimize for retained skill, not short-term answer acquisition.",
    },
    interviewPerspective: `Some companies experiment with AI-assisted interviews; many still run classic rounds. Prepare for the classic round. If AI is allowed later, your fundamentals make you faster and safer with it.`,
    commonMistakes: [
      {
        mistake: "Paste-problem → paste-solution loop",
        fix: "Enforce attempt timer before any reveal.",
      },
      {
        mistake: "Assuming generated code is correct",
        fix: "Trace examples; test edges; check complexity.",
      },
      {
        mistake: "Using AI during timed mocks",
        fix: "Mocks must match real constraints.",
      },
    ],
    miniQuiz: [
      {
        id: "c04-q1",
        type: "mcq",
        question: "Best first use of AI when stuck on a practice problem?",
        options: [
          "Ask for the full optimal code immediately",
          "Ask for a hint or conceptual question after a real attempt",
          "Ask it to take the interview for you",
          "Ignore fundamentals forever",
        ],
        answer: 1,
        explanation: "Hints preserve training stimulus; full answers early destroy it.",
      },
    ],
    summary: [
      "AI is leverage in delivery, risky as a crutch in training.",
      "Own solutions by rewriting and explaining.",
      "EngineerOS AI mentor is limited to Week 1 on purpose.",
    ],
    revisionNotes: [
      "Attempt → hint → solution → rewrite",
      "No ownership = not solved",
      "Train without AI; deliver with judgment",
    ],
    practiceProblems: [
      {
        id: "c04-p1",
        title: "AI-Free Timer Drill",
        difficulty: "Easy",
        statement:
          "Solve one Easy array problem in 25 minutes with AI completely off. Afterward, optionally ask AI to review your code quality only.",
        observation: "Timer + constraints recreate interview friction.",
        thinkingQuestions: ["Where did you want to peek?", "What did struggle teach you?"],
        hints: ["Pick a problem you haven't solved this month."],
        bruteForce: "Whatever you can justify first",
        optimization: "Only after brute force is clear",
        dryRun: "Use 2 examples minimum",
        complexity: "State it aloud",
        reflection: "Did you earn the solution?",
        solution: `Process > answer. If unsolved, read editorial, then re-solve after 24 hours cold.`,
        language: "cpp",
      },
    ],
    reflectionQuestions: [
      "How have you used AI in learning so far — tutor or crutch?",
      "What personal AI rule will you follow in August?",
      "Where can AI legitimately speed up your non-interview engineering work?",
    ],
  },
  {
    id: "w1-c05",
    slug: "growth-mindset",
    number: 5,
    title: "Growth Mindset",
    subtitle: "Skill is built — struggle is data, not identity",
    estimatedMinutes: 25,
    day: 2,
    introduction: `A fixed mindset says: “I’m bad at DSA.”  
A growth mindset says: “My DSA skill is at level K; deliberate practice moves it to K+1.”

Interview prep is an identity stress test. Without growth mindset, every hard problem becomes a verdict. With it, every hard problem becomes a **training input**.`,
    realWorldProblem: `You fail a Medium problem after 40 minutes and feel shame. You avoid Medium problems for a week. Skill stagnates. The problem was never that single Medium — it was the story you told about yourself afterward.`,
    whyExists: `Technical systems fail without psychological systems. This chapter installs the mental model that keeps you in the arena through August.`,
    historicalBackground: `Carol Dweck’s research on growth vs fixed mindset influenced education and coaching worldwide. In engineering, the same pattern appears: people who treat ability as improvable seek feedback, attempt harder tasks, and recover faster from failure.

FAANG prep communities often under-teach this, then wonder why smart people quit.`,
    visualIntuition: `Skill over time is not a straight line. It is a staircase with flat plateaus and sudden jumps after consolidation.

Plateaus are not proof you are done growing. They are proof you are between jumps.`,
    animationType: "none",
    simpleExplanation: `**Growth mindset operating rules for EngineerOS:**

1. Rate effort quality, not ego  
2. Log mistakes as assets  
3. Prefer hard-earned understanding over easy watching  
4. Compare to yesterday’s Sham, not Twitter’s highlight reel  
5. After failure: extract one lesson, schedule one revision, move on  

Confidence in this app is a number you update honestly — not a performance for anyone else.`,
    realLifeAnalogy: `Gym: adding weight and failing a rep with good form is training. Avoiding the lift forever is not self-care; it is skill decay. DSA problems are progressive overload for the mind.`,
    stepByStep: [
      "When stuck, replace 'I can't' with 'I can't yet'.",
      "Write the exact missing sub-skill (e.g., binary search bounds).",
      "Train that sub-skill with smaller drills.",
      "Return to the original problem later.",
      "Record the win in your journal to reinforce identity as someone who improves.",
    ],
    dryRun: {
      input: "Failed mock interview",
      steps: [
        "Feel the emotion for 10 minutes — don't deny it",
        "List 3 process failures and 1 knowledge gap",
        "Schedule drills for those only",
        "Book next mock within 7 days",
      ],
      output: "Failure converted into a plan",
    },
    code: [
      {
        language: "text",
        title: "Mindset patch",
        content: `identity = "engineer who trains daily"
onFailure(problem):
  lesson = extractLesson(problem)
  mistakeBook.add(lesson)
  revision.schedule(lesson)
  identity.unchanged()  // failure is event, not identity`,
        explanation: "Protect identity; update skills.",
      },
    ],
    mermaidDiagrams: [
      {
        title: "Failure Processing Loop",
        code: `flowchart TD
  A[Hard Problem / Fail] --> B[Emotion OK]
  B --> C[Extract Lesson]
  C --> D[Log Mistake]
  D --> E[Schedule Revision]
  E --> F[Deliberate Drill]
  F --> G[Retry Later]
  G --> H[Improved Skill]`,
      },
    ],
    flowchartSteps: [
      { id: "1", label: "Hit Difficulty", type: "start" },
      { id: "2", label: "Separate Ego", type: "process" },
      { id: "3", label: "Lesson + Drill", type: "process" },
      { id: "4", label: "Retry", type: "process" },
      { id: "5", label: "Growth", type: "end" },
    ],
    complexityAnalysis: {
      time: "Short-term: growth path feels slower than passive video watching",
      space: "Long-term memory gains compound",
      best: "Daily deliberate practice",
      average: "Wobbly but upward",
      worst: "Fixed mindset avoidance",
      explanation: "Mindset changes the slope of your learning curve.",
    },
    interviewPerspective: `Interviewers notice candidates who debug calmly and candidates who spiral. Growth mindset shows up as composure and structured recovery when the first approach fails.`,
    commonMistakes: [
      {
        mistake: "Interpreting struggle as lack of talent",
        fix: "Interpret struggle as the price of new skill.",
      },
      {
        mistake: "Only solving easy problems to protect ego",
        fix: "Keep a mix; use scaffolding, not avoidance.",
      },
      {
        mistake: "Comparing streak to others online",
        fix: "Compare to your own Day 0 baseline.",
      },
    ],
    miniQuiz: [
      {
        id: "c05-q1",
        type: "mcq",
        question: "After failing a problem, what is the growth-minded next step?",
        options: [
          "Decide you are bad at coding forever",
          "Extract a lesson, log it, schedule revision, drill",
          "Delete all progress and quit",
          "Only watch motivational videos for a week",
        ],
        answer: 1,
        explanation: "Convert failure into a system update.",
      },
    ],
    summary: [
      "Ability is improvable with deliberate practice.",
      "Mistakes are data.",
      "Protect identity; update skills.",
      "Composure under failure is an interview skill.",
    ],
    revisionNotes: [
      "Yet > never",
      "Lesson → log → revise",
      "Plateaus precede jumps",
    ],
    practiceProblems: [
      {
        id: "c05-p1",
        title: "Mistake Alchemy",
        difficulty: "Easy",
        statement:
          "Take one recent problem you failed. Write Mistake, Correct Thinking, Lesson, and a revision date in the Mistake Notebook.",
        observation: "Externalizing mistakes reduces shame and improves recall.",
        thinkingQuestions: ["What story did you tell yourself at the moment of failure?"],
        hints: ["Be specific; 'I suck at DP' is not a lesson."],
        bruteForce: "Ignore the failure and move on randomly",
        optimization: "Structured mistake log + spaced revision",
        dryRun: "Read your lesson in 3 days without looking at solution",
        complexity: "O(1) daily logging cost, high compound return",
        reflection: "How did writing it down change the emotion?",
        solution: `Use EngineerOS Mistake Notebook fields exactly. Specificity is mandatory.`,
        language: "cpp",
      },
    ],
    reflectionQuestions: [
      "What fixed-mindset phrase do you say to yourself most?",
      "What growth phrase will replace it?",
      "How confident are you today (0–100), honestly?",
    ],
  },
];
