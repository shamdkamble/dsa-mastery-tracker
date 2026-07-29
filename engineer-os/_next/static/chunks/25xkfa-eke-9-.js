(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,97322,e=>{"use strict";let t=[{id:"w1-c01",slug:"introduction",number:1,title:"Introduction",subtitle:"Welcome to EngineerOS — your single system for Google-level preparation",estimatedMinutes:25,day:1,introduction:`Welcome to EngineerOS.

This is not a course catalog. This is not a pile of notes. This is not a random LeetCode grind.

EngineerOS is your **Engineering Operating System** — a deliberate, day-by-day system designed for one purpose: to take you from solid C++ fundamentals and beginner DSA to the level required to clear software engineering interviews at Google, Microsoft, Amazon, and Meta.

Your name is Sham Kamble. You already have three years of software engineering experience. That is a strength — you understand production code, debugging, and shipping. What you are building now is the **interview-grade problem-solving muscle** that top companies test under pressure.

Your mission is fixed: **WIN AUGUST**. Your target is **₹20+ LPA**. Your dream companies are Google, Microsoft, Amazon, and Meta.

Every page you open inside this system exists only to move that mission forward.`,realWorldProblem:`Imagine this: It is 9:00 AM on a Tuesday. You open your laptop and feel a familiar tension — *What should I study today?*

You check YouTube. Ten “Google interview prep” videos. You open LeetCode. 2,800 problems. You open Notion. Half-finished notes from three different roadmaps. You open ChatGPT. A new plan that contradicts yesterday’s plan.

Two hours later, you have reorganized your todo list, switched topics twice, and solved zero problems with full understanding.

This is **decision fatigue**. It is the silent killer of interview preparation. The problem is not lack of content. The problem is lack of a single operating system that tells you exactly what to do next — and nothing else.`,whyExists:`EngineerOS exists because preparation fails when the brain spends energy on *planning* instead of *learning*.

Elite athletes do not wake up and invent their workout. The program is already written. They execute.

Elite interview candidates need the same thing: a fixed Week 1 roadmap, today’s mission pre-decided, textbook-quality explanations, visual intuition, deliberate practice, and reflection — without advertisements, social feeds, or “suggested for you” noise.

This chapter exists so you internalize the contract: **open EngineerOS → do today’s mission → close the laptop knowing you moved closer to Google.**`,historicalBackground:`Software engineering interviews at large tech companies evolved over decades.

In the 1990s and early 2000s, interviews often focused on r\xe9sum\xe9 walkthroughs and language trivia. As companies scaled hiring, they needed a **fair, comparable signal** across thousands of candidates. Data structures and algorithms (DSA) became that signal — not because Google engineers rewrite binary search every day, but because DSA problems compress several traits into 45 minutes:

- Can you model a problem?
- Can you reason about correctness?
- Can you analyze trade-offs (time vs space)?
- Can you communicate under pressure?
- Can you write clean, bug-resistant code?

Meanwhile, self-study tools fragmented: textbooks (CLRS), online judges (LeetCode, HackerRank), video platforms, and AI chatbots. Fragmentation increased *options* and decreased *focus*. EngineerOS is a deliberate counter-move: one system, one mission, one day at a time.`,visualIntuition:`Picture preparation as a **mission control dashboard**, not a library.

A library has infinite shelves. Mission control has **today’s flight plan**.

Your Week 1 flight plan is fixed:
1. Mindset & interview reality  
2. Complexity thinking  
3. Arrays & Vectors in C++  
4. A repeatable problem-solving framework  
5. How to use LeetCode as a training tool (not a casino)

Each day builds the next. You do not skip ahead. You do not redesign the roadmap.`,animationType:"framework",simpleExplanation:`**EngineerOS in one sentence:** Every time you open this app, it tells you exactly what to study today — and trains your thinking like a premium engineering textbook, not a slide deck.

You will learn concepts gradually. One idea per screen when possible. Animations for memory and algorithms. Quizzes to force retrieval. Practice problems that hide the optimal solution until you have thought. A journal for reflection. A mistake notebook for permanent lessons. Spaced revision so knowledge sticks.

Your only job is execution.`,realLifeAnalogy:`Think of a commercial pilot’s pre-flight checklist.

The pilot does not invent a new sequence every morning. The checklist exists so that under stress, nothing critical is forgotten and no energy is wasted on deciding the order of operations.

EngineerOS is your pre-flight checklist for becoming a Google software engineer. Today’s mission is the checklist. Complete it. Log reflection. Come back tomorrow.`,stepByStep:["Accept the fixed Week 1 roadmap — no redesigning.","Start each day from Today's Mission (not random browsing).","Read textbook chapters slowly — one section at a time.","Run every animation until the intuition feels obvious.","Attempt practice with hints before revealing solutions.","Complete the mini-quiz without looking back first.","Write journal answers honestly (confidence included).","Log mistakes the same day you make them.","Mark checklist items only when truly done.","Protect streak: consistency beats intensity."],dryRun:{input:"Monday morning, Sham opens EngineerOS at 0% mission progress",steps:["Landing page shows mission status: Week 1, Day 1, 0%.","Sham clicks START TODAY'S MISSION.","Daily Mission opens: Day 1 objective + time breakdown.","Sham completes Introduction + How Google Interviews Work chapters.","Quiz scores saved; checklist items checked; journal written.","Progress: Day 1 complete, streak = 1, confidence increases."],output:"Decision fatigue eliminated; one clear day of progress logged"},code:[{language:"text",title:"Your Daily Execution Loop (pseudo)",content:`function day(mission):
  open(mission.objective)
  for chapter in mission.chapters:
    read(chapter)           // textbook depth
    watch(animations)
    attempt(practice)       // think first
    take(quiz)
  write(journal)
  log(mistakes)
  mark(complete)
  return rest()             // recovery is part of the system`,explanation:"This is not code to compile — it is the operating procedure. Treat it like production runbooks: follow it under pressure."}],mermaidDiagrams:[{title:"EngineerOS Daily Flow",code:`flowchart TD
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
  J --> K[Return Tomorrow]`}],flowchartSteps:[{id:"1",label:"Open EngineerOS",type:"start"},{id:"2",label:"Read Today's Mission",type:"process"},{id:"3",label:"Study Chapter",type:"process"},{id:"4",label:"Practice + Quiz",type:"process"},{id:"5",label:"Reflect",type:"process"},{id:"6",label:"Mission Complete",type:"end"}],memoryDiagram:`Mission State (in your mind + LocalStorage)
┌─────────────────────────────────────┐
│ currentWeek: 1                      │
│ currentDay: 1..7                    │
│ streak, hours, quizScores           │
│ chaptersCompleted[]                 │
│ mistakes[], journal[], revisions[]  │
└─────────────────────────────────────┘
All progress persists offline after first load.`,complexityAnalysis:{time:"O(1) decision cost per day (mission is precomputed)",space:"O(W) where W is fixed Week-1 content",best:"Follow mission → maximum learning per hour",average:"Occasional re-reads; still on path",worst:"Ignore system → decision fatigue returns O(n) thrash",explanation:"The system optimizes the meta-problem: minimizing planning overhead so learning throughput stays high."},interviewPerspective:`Interviewers at Google will not ask “Did you use EngineerOS?” They will ask problems that reveal whether you built **durable thinking skills**.

This system is how you build those skills without burning out. In interviews you will:
- Clarify constraints
- Propose brute force
- Optimize with structure
- Code cleanly in C++
- Analyze complexity
- Test edge cases

Week 1 installs the foundation for all of that.`,commonMistakes:[{mistake:"Redesigning the roadmap every weekend",fix:"Roadmap is fixed. Channel energy into execution and mistake logging."},{mistake:"Consuming 10 resources for the same topic",fix:"Use EngineerOS textbook first. Add one secondary source only if stuck."},{mistake:"Skipping reflection because it feels soft",fix:"Reflection converts activity into learning. Write it every day."},{mistake:"Measuring only problems solved",fix:"Measure understanding, quiz scores, revision completion, and confidence honesty."}],miniQuiz:[{id:"c01-q1",type:"mcq",question:"What is the primary enemy EngineerOS is designed to eliminate?",options:["Lack of coding tutorials","Decision fatigue about what to study","Need for a backend server","Learning multiple programming languages"],answer:1,explanation:"EngineerOS pre-decides the daily mission so energy goes into learning, not planning."},{id:"c01-q2",type:"truefalse",question:"You should redesign the Week 1 roadmap if you feel behind.",answer:!1,explanation:"The roadmap is fixed. Catch up by completing missions; do not invent a new plan."},{id:"c01-q3",type:"mcq",question:"What is your current mission code?",options:["LEARN FAST","WIN AUGUST","GRIND LEETCODE","SHIP FEATURES"],answer:1,explanation:"Current Mission: WIN AUGUST."}],summary:["EngineerOS is an operating system for interview prep, not a content dump.","Your profile, companies, and package target are fixed context.","Decision fatigue is removed by today's mission.","Week 1 builds mindset, complexity, arrays/vectors, framework, and LeetCode method.","Progress is tracked locally; consistency is the KPI."],revisionNotes:["Open app → do mission → reflect → stop.","One idea at a time; never dump.","Think before solutions.","WIN AUGUST · ₹20+ LPA · Google/Microsoft/Amazon/Meta"],practiceProblems:[{id:"c01-p1",title:"Personal Mission Contract",difficulty:"Easy",statement:"Write a 6-line personal contract: daily minimum study block, no-roadmap-change rule, journal rule, mistake-log rule, streak rule, and reward rule.",observation:"Systems beat motivation. A written contract reduces negotiation with yourself.",thinkingQuestions:["What time of day is your highest focus window?","What will you do when you miss a day?"],hints:["Keep rules binary and observable.","Avoid vague goals like 'study more'."],bruteForce:"Rely on motivation each morning.",optimization:"Precommit rules + environment design (same desk, phone away).",dryRun:"Simulate a low-energy day: which rule still keeps you on track?",complexity:"O(1) daily decision after contract exists",reflection:"Which rule will be hardest for you to keep?",solution:`Contract example:
1) 90 focused minutes before leisure apps
2) No roadmap edits in August
3) Journal 4 prompts daily
4) Log every mistaken problem same day
5) Miss day → restart streak without shame, no double punishment
6) Weekly debrief on Sunday night`,language:"cpp"}],reflectionQuestions:["What usually causes you to lose study focus?","How will EngineerOS change your first 10 minutes of study?","On a scale of 1–10, how committed are you to WIN AUGUST today?"]},{id:"w1-c02",slug:"how-google-interviews-work",number:2,title:"How Google Interviews Work",subtitle:"What is actually tested in 45 minutes",estimatedMinutes:35,day:1,introduction:`Google interviews are often mythologized. People imagine trick questions, obscure puzzles, or “only geniuses pass.”

Reality is more structured — and more trainable.

A typical Google software engineering interview loop evaluates whether you can **solve ambiguous technical problems while communicating like a colleague**. DSA is the medium. Collaboration quality is the signal.`,realWorldProblem:`You are in a virtual interview. The prompt is:

“Given a stream of integers, design a structure to return the median in efficient time.”

You panic, jump into code, write a messy vector sort on every query, run out of time, and never discuss trade-offs.

A stronger candidate clarifies stream size expectations, discusses two-heap design, codes cleanly, tests edge cases, and narrates complexity. Same problem. Different process. Different outcome.`,whyExists:`This chapter exists so you stop studying “random problems” and start training the **interview skill stack**:

1. Clarify  
2. Examples  
3. Brute force  
4. Optimize  
5. Code  
6. Test  
7. Complexity  

Google’s process is designed to compare candidates fairly. Understanding the format removes fear and focuses practice.`,historicalBackground:`Google popularized a rigorous interview culture emphasizing algorithmic thinking and GCA (General Cognitive Ability), along with role-related knowledge and leadership attributes (in Google’s language: “Googleyness” / leadership for higher levels).

Over time, the industry standardized around:
- Phone / virtual technical screens
- Onsite (or virtual onsite) loops: multiple coding rounds, sometimes system design (level-dependent), behavioral
- Hiring committee review (at Google, interviewers do not make the final call alone)

For L3/L4-style SWE roles, **coding interviews dominate**. System design weight increases with level. Your current mission prioritizes coding + DSA foundations first.`,visualIntuition:`Think of an interview as a **shared whiteboard session with a future teammate**, not an exam proctor watching you fail.

The interviewer is collecting evidence:
- Problem understanding
- Structured thinking
- Code quality
- Debugging skill
- Communication
- Independence vs hints needed

Your practice must produce evidence in all six — not only “got the right answer eventually.”`,animationType:"framework",simpleExplanation:`**What Google coding interviews optimize for:**

- Correctness under constraints  
- Efficient enough algorithms  
- Clean C++ (or your language) implementation  
- Clear communication  
- Handling follow-ups  

**What they are not:**
- A trivia contest about API names  
- A pure IQ test  
- A requirement to invent novel algorithms from research papers  

Most problems are variants of patterns: arrays, hashing, two pointers, sliding window, trees, graphs, DP, heaps, intervals, etc. Week 1 starts the foundation patterns.`,realLifeAnalogy:"A cooking show challenge: you get ingredients (problem constraints) and 45 minutes. Judges score taste (correctness), technique (algorithm), plating (code quality), and calm narration (communication). Burning the dish while staying silent fails even if you “almost” had a recipe.",stepByStep:["Listen fully; do not interrupt the prompt.","Restate the problem in your own words.","Ask about constraints: size, duplicates, sorted?, mutability, memory limits.","Build 2–3 examples including edge cases.","State a correct brute force and its complexity.","Identify bottleneck; propose optimized approach.","Confirm approach with interviewer before coding.","Code in small, named steps; narrate.","Trace with an example; fix bugs calmly.","State final time/space complexity; discuss follow-ups."],dryRun:{input:"Problem: Two Sum — array of ints + target, return indices",steps:["Clarify: one solution? duplicates? same element twice?","Example: [2,7,11,15], target 9 → [0,1]","Brute: nested loops O(n²)","Optimize: hash map value→index, one pass O(n)","Code clean C++ with unordered_map","Test: empty, no pair, negatives, duplicates"],output:"Structured interview performance, not lucky guess"},code:[{language:"cpp",title:"Two Sum — interview-style C++",content:`#include <vector>
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
}`,explanation:"This is the kind of clean, hash-based solution interviewers expect after you explain brute force and trade-offs."}],mermaidDiagrams:[{title:"Interview Loop Structure",code:`flowchart LR
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
  H -->|No Hire| J[Feedback / Retry later]`}],flowchartSteps:[{id:"1",label:"Clarify Problem",type:"start"},{id:"2",label:"Examples + Edges",type:"process"},{id:"3",label:"Brute Force",type:"process"},{id:"4",label:"Optimize?",type:"decision"},{id:"5",label:"Code + Test",type:"process"},{id:"6",label:"Complexity + Wrap",type:"end"}],complexityAnalysis:{time:"Interview: ~45 minutes wall-clock",space:"One shared editor + your working memory",best:"Clear structure, optimal-enough solution, clean code",average:"Right idea, minor bugs fixed with tests",worst:"Silent coding, no examples, stuck in bugs",explanation:"Your preparation should rehearse the full 45-minute performance, not only final algorithms."},interviewPerspective:`At Google-level interviews, **how you think is visible**. Talking through trade-offs can salvage a partially incomplete solution. Silence while thrashing rarely does.

Practice out loud. Timebox. Record yourself weekly.`,commonMistakes:[{mistake:"Coding immediately",fix:"Spend first 5–8 minutes on clarifying + approach."},{mistake:"Ignoring edge cases",fix:"Always list empty, single element, duplicates, overflow, sorted/unsorted."},{mistake:"Pretending to know when stuck",fix:"State what you know, what you are testing next; ask for a small hint if needed."},{mistake:"Only practicing alone silently",fix:"Do mock interviews; communication is scored."}],miniQuiz:[{id:"c02-q1",type:"mcq",question:"What should you do before writing code in a coding interview?",options:["Memorize the solution silently","Clarify, examples, brute force, then optimized plan","Ask for a different problem","Start typing the first idea instantly"],answer:1,explanation:"Structure first. Code second."},{id:"c02-q2",type:"mcq",question:"Why do companies use DSA interviews?",options:["Because engineers only write sorting algorithms daily","As a compressed signal for problem-solving under constraints","To test graphic design skills","To replace system design entirely at all levels"],answer:1,explanation:"DSA compresses modeling, correctness, and trade-off reasoning into a short session."}],summary:["Google interviews evaluate structured problem-solving + communication.","Format is learnable; myths are unhelpful.","Always: clarify → examples → brute → optimize → code → test.","Hiring decisions consider multiple signals, not one lucky problem."],revisionNotes:["45 minutes = performance + correctness","Narrate trade-offs","Edge cases are free points","Mocks > silent grinding alone"],practiceProblems:[{id:"c02-p1",title:"Interview Script Drill",difficulty:"Easy",statement:"Pick Two Sum. Perform a full out-loud mock in 20 minutes using the 7-step interview process. Record yourself.",observation:"The skill is the process under time pressure.",thinkingQuestions:["Where did you waste time?","Did you state complexity without being asked?"],hints:["Use a timer visible on screen.","Do not open solutions mid-mock."],bruteForce:"Nested loops explanation first",optimization:"Hash map one-pass",dryRun:"Trace [3,2,4], target 6",complexity:"Time O(n), Space O(n)",reflection:"What phrase will you use next time when stuck?",solution:"Use the step list from this chapter as a checklist beside your editor. After mock, note 3 process improvements — not only algorithm mistakes.",language:"cpp"}],reflectionQuestions:["Which interview step do you currently skip most often?","How will you practice communication this week?","What fear about Google interviews can you reframe now?"]},{id:"w1-c03",slug:"why-dsa-still-matters",number:3,title:"Why DSA Still Matters",subtitle:"In a world of frameworks, AI, and cloud abstractions",estimatedMinutes:30,day:2,introduction:`If you ship product features with React, Spring, or internal tools, it is fair to ask: why do interviews still obsess over arrays, trees, and Big-O?

Because **DSA is not about memorizing 300 tricks**. It is about predictable reasoning when performance, correctness, and scale collide.`,realWorldProblem:`A service that worked for 10k users times out at 1M users. The API handler does O(n\xb2) work per request on a growing list. Nobody “felt” the complexity at small n. Production felt it on a Saturday night.

DSA literacy is how you see that cost **before** production does.`,whyExists:"This chapter anchors motivation. Without believing DSA matters, grind becomes empty. With the right belief, every animation and dry run has purpose: you are training a production-relevant mental model, packaged in interview-sized problems.",historicalBackground:`From Knuth’s analysis of algorithms to modern distributed systems, computing progress repeatedly returns to the same truths: data layout matters, asymptotic growth matters, and clever structure beats raw hardware eventually.

Even with AI writing boilerplate, someone must specify constraints, validate complexity, and debug pathological inputs. That someone is the engineer who understands DSA.`,visualIntuition:`Plot n on the x-axis and operations on the y-axis:

- O(1) stays flat  
- O(log n) rises slowly  
- O(n) diagonal  
- O(n log n) steeper  
- O(n\xb2) explodes  

At n=100, many look fine. At n=10⁷, only the left side of that chart survives. Interviews test whether you can **see the chart in your head** while coding.`,animationType:"complexity",simpleExplanation:`**DSA still matters because:**

1. **Interviews use it as a standard signal**  
2. **Performance bugs are complexity bugs in disguise**  
3. **Good abstractions leak under load** — knowing foundations helps you choose structures  
4. **AI accelerates typing, not ownership** — you still must verify  
5. **It trains transferable thinking**: invariants, edge cases, proofs by example  

You are not studying DSA instead of engineering. You are studying the reasoning layer underneath engineering.`,realLifeAnalogy:"A race car driver still learns physics of grip and braking even though the car has launch control and ABS. When conditions go weird, fundamentals save the race. DSA is grip theory for software under constraints.",stepByStep:["Separate 'I don't use heaps daily' from 'I never need heap thinking'.","Map each DSA topic to a real failure mode (timeouts, memory, wrong answers).","Practice explaining why an approach fails at scale.","Use complexity as a design tool, not only post-hoc labeling.","Keep language skills (C++) sharp enough to express ideas cleanly."],dryRun:{input:"Feature: show 'people you may know' from friend lists",steps:["Naive: for each user, scan all users O(U²)","At U=10^6, impossible","Better: graph adjacency + smarter ranking pipeline","Interview version compresses this into graph/array problems"],output:"Respect for structure and complexity in both jobs and interviews"},code:[{language:"cpp",title:"Same goal, different complexity",content:`// Sum of 1..n — algorithm choice matters in general problems
long long sumNaive(int n) {
    long long s = 0;
    for (int i = 1; i <= n; i++) s += i; // O(n)
    return s;
}

long long sumClosedForm(long long n) {
    return n * (n + 1) / 2; // O(1)
}`,explanation:"Toy example, real lesson: closed form / better structure can change feasibility."}],mermaidDiagrams:[{title:"Why DSA Maps to Engineering",code:`flowchart TD
  A[Real System Problem] --> B[Model Data]
  B --> C[Choose Structure]
  C --> D[Algorithm + Complexity]
  D --> E[Implement]
  E --> F[Measure / Edge Cases]
  F --> G[Ship with Confidence]
  D -.->|Interview compresses this| H[45-min Coding Round]`}],flowchartSteps:[{id:"1",label:"Encounter Scale Pain",type:"start"},{id:"2",label:"Identify Costly Pattern",type:"process"},{id:"3",label:"Apply DSA Structure",type:"process"},{id:"4",label:"Verify Complexity",type:"process"},{id:"5",label:"Stable System",type:"end"}],complexityAnalysis:{time:"Bad algorithm: may be unusable at scale",space:"Wrong structure: memory blowups / cache thrash",best:"Right structure early",average:"Iterate with profiling",worst:"Ignore growth until outage",explanation:"DSA is preventive engineering for growth curves."},interviewPerspective:"When an interviewer asks for better than O(n²), they are testing whether you can **search the design space** — hashing, sorting + two pointers, precomputation, etc. That skill transfers to design docs and production incidents.",commonMistakes:[{mistake:"Believing frameworks replace algorithmic thinking",fix:"Frameworks implement patterns; you still choose and integrate them."},{mistake:"Memorizing solutions without complexity intuition",fix:"Always restate time/space and why."},{mistake:"Treating DSA as only for interviews",fix:"Log real work moments where structure choices mattered."}],miniQuiz:[{id:"c03-q1",type:"truefalse",question:"Because AI can generate code, DSA knowledge is obsolete for interviews.",answer:!1,explanation:"Interviews and production ownership still require understanding, verification, and complexity reasoning."},{id:"c03-q2",type:"mcq",question:"At large n, which growth is most dangerous among common ones?",options:["O(log n)","O(n)","O(n log n)","O(n²)"],answer:3,explanation:"Quadratic growth explodes quickly as n increases."}],summary:["DSA is a signal and a real engineering foundation.","Scale exposes complexity that small demos hide.","AI does not remove the need to understand.","Train patterns + reasoning, not trivia only."],revisionNotes:["Complexity is a design tool","Structure beats slog","Interview = compressed engineering reasoning"],practiceProblems:[{id:"c03-p1",title:"Find the Hidden O(n²)",difficulty:"Easy",statement:"Write a short note on a real or hypothetical feature that accidentally becomes O(n²). Propose a better structure.",observation:"Nested loops over growing collections are a classic footgun.",thinkingQuestions:["What is n in production?","What is the acceptable latency?"],hints:["Think about 'for each user, for each user' patterns."],bruteForce:"Double scan",optimization:"Hashing, indexing, preaggregation, graph cuts, etc.",dryRun:"Plug n=10, n=1e5 into both mental models",complexity:"Compare O(n²) vs O(n) or O(n log n)",reflection:"Where have you seen this at work?",solution:"Example: mutual friends via nested scans of adjacency lists without indexing → precompute counts or use better set intersections with constraints.",language:"cpp"}],reflectionQuestions:["Did you previously resist DSA? Why?","How does this chapter change your motivation for Week 1?","What production metric would break first if your algorithm were quadratic?"]},{id:"w1-c04",slug:"how-ai-changes-engineering",number:4,title:"How AI Changes Engineering",subtitle:"Use AI as leverage — never as a substitute for thinking",estimatedMinutes:25,day:2,introduction:`AI tools can autocomplete functions, explain errors, and draft boilerplate in seconds. That is real leverage.

They can also destroy interview preparation if you use them to skip struggle — because **struggle is the training**.`,realWorldProblem:"You paste a LeetCode problem into a chatbot, get a perfect solution, read it once, and mark it “done.” A week later in a mock interview, you cannot reconstruct the idea. The model remembers. You do not.",whyExists:`Week 1 must set an AI policy for EngineerOS:

- Allowed: explaining a concept you already attempted, generating extra examples, reviewing your code after you wrote it  
- Forbidden during training: asking for full solutions before your own brute force + optimized attempt  
- Interview reality: you will not have unconstrained AI in a timed coding round  

This chapter defines that policy clearly.`,historicalBackground:`Software engineering has always absorbed automation: compilers, IDEs, linters, Stack Overflow, and now LLMs. Each wave increased speed and raised the bar for taste, verification, and system thinking.

The engineers who win are not those who refuse tools, nor those who blindly trust them — but those who **own outcomes**.`,visualIntuition:`Training mode vs Delivery mode:

- **Training (EngineerOS):** weights on; AI spotter only after you try  
- **Delivery (job):** use AI heavily, but you still review complexity, security, and correctness  

Do not train in delivery mode. Your muscles will not grow.`,animationType:"none",simpleExplanation:`AI changes the **speed of producing code**, not the need for:

- Problem decomposition  
- Complexity judgment  
- Edge-case paranoia  
- Responsibility for failures  

For interviews, companies know AI exists. They still need humans who can think when the tool is wrong, incomplete, or unavailable.`,realLifeAnalogy:"GPS made paper maps rare — but if GPS dies in a remote area, the driver who understands navigation still gets home. AI is GPS for code. Fundamentals are navigation.",stepByStep:["Attempt problem for at least 15–20 minutes before any AI help.","When using AI, ask for hints, not full solutions first.","Re-implement any AI-shown idea from scratch without looking.","Ask AI to critique your complexity analysis after you write it.","Never log a problem as solved unless you can re-explain it cold."],dryRun:{input:"Stuck on binary search boundary condition",steps:["Write failing mental model","Ask AI: 'What are common off-by-one patterns in binary search?' not 'solve this'","Apply insight to your code","Re-derive on paper next day"],output:"AI used as tutor, not answer key"},code:[{language:"cpp",title:"Ownership checklist after AI suggestion",content:`// Before accepting any generated solution, verify:
// 1) Invariants
// 2) Edge cases
// 3) Time/space
// 4) You can rewrite from memory in 15 minutes
bool ownedSolution = canRewriteFromMemory && complexityUnderstood;`,explanation:"If you cannot rewrite it, you do not own it."}],mermaidDiagrams:[{title:"AI Policy for Interview Prep",code:`flowchart TD
  A[See Problem] --> B[Own Attempt]
  B --> C{Solved?}
  C -->|Yes| D[Write reflection + complexity]
  C -->|No after effort| E[Hint-level help]
  E --> F[Retry]
  F --> G{Still stuck?}
  G -->|Yes| H[Read solution]
  H --> I[Re-implement cold later]
  G -->|No| D
  I --> D`}],flowchartSteps:[{id:"1",label:"Attempt Alone",type:"start"},{id:"2",label:"Need Help?",type:"decision"},{id:"3",label:"Hint Only",type:"process"},{id:"4",label:"Full Solution Last",type:"process"},{id:"5",label:"Re-own by Rewrite",type:"end"}],complexityAnalysis:{time:"AI can reduce typing time drastically",space:"Your long-term memory still limited — train it",best:"AI + strong fundamentals",average:"AI for boilerplate, human for design",worst:"AI-only prep → interview collapse",explanation:"Optimize for retained skill, not short-term answer acquisition."},interviewPerspective:"Some companies experiment with AI-assisted interviews; many still run classic rounds. Prepare for the classic round. If AI is allowed later, your fundamentals make you faster and safer with it.",commonMistakes:[{mistake:"Paste-problem → paste-solution loop",fix:"Enforce attempt timer before any reveal."},{mistake:"Assuming generated code is correct",fix:"Trace examples; test edges; check complexity."},{mistake:"Using AI during timed mocks",fix:"Mocks must match real constraints."}],miniQuiz:[{id:"c04-q1",type:"mcq",question:"Best first use of AI when stuck on a practice problem?",options:["Ask for the full optimal code immediately","Ask for a hint or conceptual question after a real attempt","Ask it to take the interview for you","Ignore fundamentals forever"],answer:1,explanation:"Hints preserve training stimulus; full answers early destroy it."}],summary:["AI is leverage in delivery, risky as a crutch in training.","Own solutions by rewriting and explaining.","EngineerOS AI mentor is limited to Week 1 on purpose."],revisionNotes:["Attempt → hint → solution → rewrite","No ownership = not solved","Train without AI; deliver with judgment"],practiceProblems:[{id:"c04-p1",title:"AI-Free Timer Drill",difficulty:"Easy",statement:"Solve one Easy array problem in 25 minutes with AI completely off. Afterward, optionally ask AI to review your code quality only.",observation:"Timer + constraints recreate interview friction.",thinkingQuestions:["Where did you want to peek?","What did struggle teach you?"],hints:["Pick a problem you haven't solved this month."],bruteForce:"Whatever you can justify first",optimization:"Only after brute force is clear",dryRun:"Use 2 examples minimum",complexity:"State it aloud",reflection:"Did you earn the solution?",solution:"Process > answer. If unsolved, read editorial, then re-solve after 24 hours cold.",language:"cpp"}],reflectionQuestions:["How have you used AI in learning so far — tutor or crutch?","What personal AI rule will you follow in August?","Where can AI legitimately speed up your non-interview engineering work?"]},{id:"w1-c05",slug:"growth-mindset",number:5,title:"Growth Mindset",subtitle:"Skill is built — struggle is data, not identity",estimatedMinutes:25,day:2,introduction:`A fixed mindset says: “I’m bad at DSA.”  
A growth mindset says: “My DSA skill is at level K; deliberate practice moves it to K+1.”

Interview prep is an identity stress test. Without growth mindset, every hard problem becomes a verdict. With it, every hard problem becomes a **training input**.`,realWorldProblem:"You fail a Medium problem after 40 minutes and feel shame. You avoid Medium problems for a week. Skill stagnates. The problem was never that single Medium — it was the story you told about yourself afterward.",whyExists:"Technical systems fail without psychological systems. This chapter installs the mental model that keeps you in the arena through August.",historicalBackground:`Carol Dweck’s research on growth vs fixed mindset influenced education and coaching worldwide. In engineering, the same pattern appears: people who treat ability as improvable seek feedback, attempt harder tasks, and recover faster from failure.

FAANG prep communities often under-teach this, then wonder why smart people quit.`,visualIntuition:`Skill over time is not a straight line. It is a staircase with flat plateaus and sudden jumps after consolidation.

Plateaus are not proof you are done growing. They are proof you are between jumps.`,animationType:"none",simpleExplanation:`**Growth mindset operating rules for EngineerOS:**

1. Rate effort quality, not ego  
2. Log mistakes as assets  
3. Prefer hard-earned understanding over easy watching  
4. Compare to yesterday’s Sham, not Twitter’s highlight reel  
5. After failure: extract one lesson, schedule one revision, move on  

Confidence in this app is a number you update honestly — not a performance for anyone else.`,realLifeAnalogy:"Gym: adding weight and failing a rep with good form is training. Avoiding the lift forever is not self-care; it is skill decay. DSA problems are progressive overload for the mind.",stepByStep:["When stuck, replace 'I can't' with 'I can't yet'.","Write the exact missing sub-skill (e.g., binary search bounds).","Train that sub-skill with smaller drills.","Return to the original problem later.","Record the win in your journal to reinforce identity as someone who improves."],dryRun:{input:"Failed mock interview",steps:["Feel the emotion for 10 minutes — don't deny it","List 3 process failures and 1 knowledge gap","Schedule drills for those only","Book next mock within 7 days"],output:"Failure converted into a plan"},code:[{language:"text",title:"Mindset patch",content:`identity = "engineer who trains daily"
onFailure(problem):
  lesson = extractLesson(problem)
  mistakeBook.add(lesson)
  revision.schedule(lesson)
  identity.unchanged()  // failure is event, not identity`,explanation:"Protect identity; update skills."}],mermaidDiagrams:[{title:"Failure Processing Loop",code:`flowchart TD
  A[Hard Problem / Fail] --> B[Emotion OK]
  B --> C[Extract Lesson]
  C --> D[Log Mistake]
  D --> E[Schedule Revision]
  E --> F[Deliberate Drill]
  F --> G[Retry Later]
  G --> H[Improved Skill]`}],flowchartSteps:[{id:"1",label:"Hit Difficulty",type:"start"},{id:"2",label:"Separate Ego",type:"process"},{id:"3",label:"Lesson + Drill",type:"process"},{id:"4",label:"Retry",type:"process"},{id:"5",label:"Growth",type:"end"}],complexityAnalysis:{time:"Short-term: growth path feels slower than passive video watching",space:"Long-term memory gains compound",best:"Daily deliberate practice",average:"Wobbly but upward",worst:"Fixed mindset avoidance",explanation:"Mindset changes the slope of your learning curve."},interviewPerspective:"Interviewers notice candidates who debug calmly and candidates who spiral. Growth mindset shows up as composure and structured recovery when the first approach fails.",commonMistakes:[{mistake:"Interpreting struggle as lack of talent",fix:"Interpret struggle as the price of new skill."},{mistake:"Only solving easy problems to protect ego",fix:"Keep a mix; use scaffolding, not avoidance."},{mistake:"Comparing streak to others online",fix:"Compare to your own Day 0 baseline."}],miniQuiz:[{id:"c05-q1",type:"mcq",question:"After failing a problem, what is the growth-minded next step?",options:["Decide you are bad at coding forever","Extract a lesson, log it, schedule revision, drill","Delete all progress and quit","Only watch motivational videos for a week"],answer:1,explanation:"Convert failure into a system update."}],summary:["Ability is improvable with deliberate practice.","Mistakes are data.","Protect identity; update skills.","Composure under failure is an interview skill."],revisionNotes:["Yet > never","Lesson → log → revise","Plateaus precede jumps"],practiceProblems:[{id:"c05-p1",title:"Mistake Alchemy",difficulty:"Easy",statement:"Take one recent problem you failed. Write Mistake, Correct Thinking, Lesson, and a revision date in the Mistake Notebook.",observation:"Externalizing mistakes reduces shame and improves recall.",thinkingQuestions:["What story did you tell yourself at the moment of failure?"],hints:["Be specific; 'I suck at DP' is not a lesson."],bruteForce:"Ignore the failure and move on randomly",optimization:"Structured mistake log + spaced revision",dryRun:"Read your lesson in 3 days without looking at solution",complexity:"O(1) daily logging cost, high compound return",reflection:"How did writing it down change the emotion?",solution:"Use EngineerOS Mistake Notebook fields exactly. Specificity is mandatory.",language:"cpp"}],reflectionQuestions:["What fixed-mindset phrase do you say to yourself most?","What growth phrase will replace it?","How confident are you today (0–100), honestly?"]},{id:"w1-c06",slug:"time-complexity",number:6,title:"Time Complexity",subtitle:"How running time grows as input grows",estimatedMinutes:40,day:3,introduction:`Time complexity answers a practical question: **if the input gets bigger, how much slower does my algorithm get?**

It is not about the exact milliseconds on your laptop. It is about **growth rate** — the shape of cost as n → large.`,realWorldProblem:"A feature works on a demo dataset of 100 rows. You ship it. Production has 2,000,000 rows. The request handler now takes 40 seconds. Users leave. The algorithm never “became wrong” — it became **too expensive as n grew**.",whyExists:"Without time complexity, you cannot compare approaches or know whether an idea can pass interview constraints (often n up to 10⁵ or 10⁶). This chapter builds gut feel before formal Big-O notation deep dive.",historicalBackground:"Algorithm analysis matured through the 20th century as machines ran larger problems. Donald Knuth and others formalized techniques to count operations independent of a particular CPU. Interviews inherited this language because it is portable across hardware and languages.",visualIntuition:`Imagine four stopwatches timing the same task at n=10, 100, 1000, 100000:

- Constant work: stopwatch barely moves  
- Linear: moves proportional to n  
- Quadratic: explodes  
- Logarithmic: barely notices huge n  

In the Visual Playground, you will animate linear search vs binary search across these sizes.`,animationType:"complexity",simpleExplanation:`**Count dominant operations** as a function of input size n.

Examples:
- One loop from 1..n → roughly c\xb7n operations → linear  
- Nested loops i=1..n, j=1..n → roughly c\xb7n\xb2 → quadratic  
- Halving search space each step → ~log₂(n) → logarithmic  

Ignore machine-specific constants in high-level comparison. Focus on how the formula behaves when n multiplies by 10.`,realLifeAnalogy:"Finding a name in an unsorted guest list of n people: you may check each name (linear). Finding a word in a dictionary using alphabetical order: you jump midpoints (logarithmic). Same “find item” goal; different growth.",stepByStep:["Identify the input size parameter n (and maybe m).","Find the code path that runs most as n grows.","Count loops, recursions, and repeated work.","Drop lower-order terms and constant factors for comparison.","Sanity-check: if n doubles, does time ~double? quadruple? barely change?","State best/average/worst when they differ."],dryRun:{input:"Linear search for x in array of size n",steps:["Check index 0,1,2,... until found or end","Worst case: x absent or at end → n comparisons","Best case: x at index 0 → 1 comparison","Average (random): ~n/2 comparisons"],output:"Worst-case linear time in n"},code:[{language:"cpp",title:"Counting operations mentally",content:`int linearSearch(const vector<int>& a, int x) {
    for (int i = 0; i < (int)a.size(); i++) { // up to n iterations
        if (a[i] == x) return i;              // O(1) work each
    }
    return -1;
}
// Worst-case time: O(n)`,explanation:"Loop bound depends on n; body is constant work → O(n)."},{language:"cpp",title:"Quadratic pattern",content:`bool hasDuplicateNested(const vector<int>& a) {
    int n = (int)a.size();
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
            if (a[i] == a[j]) return true;
    return false;
}
// Worst-case time: O(n\xb2)`,explanation:"Nested loops over n produce quadratic growth."}],mermaidDiagrams:[{title:"Growth Comparison",code:`flowchart LR
  A[n grows] --> B[O1 flat]
  A --> C[Ologn slow]
  A --> D[On linear]
  A --> E[Onlogn]
  A --> F[On2 steep]
  F --> G[Often too slow at 1e5+]`}],flowchartSteps:[{id:"1",label:"Identify n",type:"start"},{id:"2",label:"Find hot loops",type:"process"},{id:"3",label:"Estimate growth",type:"process"},{id:"4",label:"Check constraints",type:"decision"},{id:"5",label:"Accept or redesign",type:"end"}],memoryDiagram:`CPU does not "feel" Big-O — it executes instructions.
Analysis abstracts instruction counts into growth classes
so humans can compare algorithms before coding all of them.`,complexityAnalysis:{time:"The subject of this chapter",space:"Related but separate (extra memory growth)",best:"Minimum work over inputs of size n",average:"Expected work under an input distribution",worst:"Maximum work — interview default unless stated",explanation:"Interviews usually want worst-case unless average is specified (e.g., hash tables)."},interviewPerspective:"After coding, say: “Time complexity is O(n) because we scan once; space is O(1) extra.” If you optimized from O(n²) to O(n), narrate that journey — it scores points.",commonMistakes:[{mistake:"Confusing O(n) with 'fast on my machine'",fix:"Always relate to constraints (n ≤ ?)."},{mistake:"Counting only loops and missing expensive callees",fix:"If you call a O(n) function inside a O(n) loop, think O(n²)."},{mistake:"Saying O(n/2) as final class",fix:"O(n/2) is O(n). Drop constant factors."}],miniQuiz:[{id:"c06-q1",type:"complexity",question:"for i in 1..n: for j in 1..n: O(1) work. Time complexity?",options:["O(n)","O(n log n)","O(n²)","O(2ⁿ)"],answer:2,explanation:"n·n constant work = O(n²)."},{id:"c06-q2",type:"mcq",question:"If n doubles and runtime roughly doubles, the algorithm is likely:",options:["O(1)","O(log n)","O(n)","O(n²)"],answer:2,explanation:"Linear growth tracks n proportionally."},{id:"c06-q3",type:"predict",question:"Roughly how many steps does binary search need for n=1,000,000 (power of two-ish)?",options:["About 20","About 1,000,000","About 10^12","Exactly 2"],answer:0,explanation:"log₂(10^6) ≈ 20."}],summary:["Time complexity describes growth of running time with input size.","Focus on dominant terms; prefer worst-case in interviews.","Match algorithm class to constraints.","Nested loops and repeated linear scans are common killers."],revisionNotes:["n=1e5 → avoid O(n²) generally","n=1e8 → need near O(n) or better","Always state time and space"],practiceProblems:[{id:"c06-p1",title:"Estimate Before Coding",difficulty:"Easy",statement:"For n ≤ 1e5, which of these are typically acceptable: O(n), O(n log n), O(n²)? Explain with approximate operation counts.",observation:"1e5² = 1e10 — too large for typical 1e8 ops/sec rule of thumb.",thinkingQuestions:["What constant factors might still kill O(n log n)?"],hints:["Use 10^8 operations/sec as a rough mental budget."],bruteForce:"O(n²) nested compare",optimization:"Sort O(n log n) or hash O(n) depending on problem",dryRun:"Compute 1e5² vs 1e5·20",complexity:"Selection depends on constraints",reflection:"Will you check constraints first in every problem now?",solution:"Typically O(n) and O(n log n) OK; O(n²) often not for n=1e5. Always verify problem limits.",language:"cpp"}],reflectionQuestions:["Where have you seen a feature slow down as data grew?","How will you estimate complexity before coding tomorrow?","Confidence on time complexity (0–100)?"]},{id:"w1-c07",slug:"big-o",number:7,title:"Big O",subtitle:"The language of upper bounds — O, Θ, Ω in interview practice",estimatedMinutes:40,day:3,introduction:`Big-O is the standard vocabulary for expressing complexity. When you say “This is O(n log n),” every trained engineer shares a mental picture.

This chapter makes Big-O precise enough for interviews without turning into a pure math course.`,realWorldProblem:"Two candidates propose solutions. One says “it’s fast.” The other says “O(n) time, O(1) extra space, fails if we need stable order.” Only one sentence is useful in a hiring signal.",whyExists:"You need fluency: reading Big-O in editorials, writing it in interviews, and using it to reject impossible approaches early.",historicalBackground:"Big-O notation comes from mathematics (Bachmann–Landau notation) and was adopted in CS to describe asymptotic upper bounds. In industry slang, people often say “Big-O” when they mean the tight typical bound (more like Θ). Interviews accept this informal usage if your reasoning is sound.",visualIntuition:`f(n) = 3n\xb2 + 10n + 5 is O(n\xb2) because for large n, the n\xb2 term dominates. Graphically, a quadratic curve can be scaled to stay above f(n) for large n.

Remember: Big-O is an **upper bound**. O(n\xb2) is also O(n\xb3) mathematically — but interviews want the **tight, meaningful** bound.`,animationType:"complexity",simpleExplanation:`**Common classes (fast → slow for large n):**

| Class | Name | Example |
|-------|------|---------|
| O(1) | Constant | Hash map average lookup |
| O(log n) | Logarithmic | Binary search |
| O(n) | Linear | Single scan |
| O(n log n) | Linearithmic | Efficient sort |
| O(n\xb2) | Quadratic | Nested pair checks |
| O(2ⁿ) | Exponential | Naive subsets/recursion |

**Rules of thumb:**
- Drop constants: O(2n) → O(n)  
- Drop lower terms: O(n\xb2 + n) → O(n\xb2)  
- Different inputs: O(n + m) for two arrays  

**Ω** = lower bound, **Θ** = tight bound. Interviews mostly say O for the tight bound you believe.`,realLifeAnalogy:"Elevator capacity rating: “This elevator is O(10 people)” as an upper bound on safe load. You would not brag “O(1000 people)” as useful even if technically an upper bound — too loose. Prefer tight, honest bounds.",stepByStep:["Write a rough function T(n) counting steps.","Keep the fastest-growing term.","Remove constant coefficients.","Express as O(...).","Mention space separately: extra memory vs input storage.","If using hash tables, mention average vs worst if relevant."],dryRun:{input:"T(n) = 5n log n + 3n + 100",steps:["Dominant term: 5n log n","Drop coefficient 5 → n log n","Conclude O(n log n)"],output:"O(n log n)"},code:[{language:"cpp",title:"Binary search — O(log n)",content:`int binarySearch(const vector<int>& a, int x) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == x) return mid;
        if (a[mid] < x) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
// Requires sorted array. Time O(log n), Space O(1)`,explanation:"Each step halves the search window → logarithmic iterations."}],mermaidDiagrams:[{title:"Big-O Decision Cheatsheet",code:`flowchart TD
  A[Analyze code] --> B{Halves each step?}
  B -->|Yes| C[O log n]
  B -->|No| D{Single pass?}
  D -->|Yes| E[O n]
  D -->|No| F{Nested n by n?}
  F -->|Yes| G[O n2]
  F -->|No| H{Divide and conquer sort pattern?}
  H -->|Yes| I[O n log n]`}],flowchartSteps:[{id:"1",label:"Count operations",type:"start"},{id:"2",label:"Drop constants",type:"process"},{id:"3",label:"Drop lower terms",type:"process"},{id:"4",label:"Write Big-O",type:"end"}],complexityAnalysis:{time:"Expressed with Big-O",space:"Also expressed with Big-O",best:"Ω often used; interviews may say best-case O(...)",average:"Important for hashing",worst:"Default interview claim",explanation:"Be precise when best/worst differ significantly."},interviewPerspective:"Say bounds confidently but not arrogantly. If unsure, reason aloud: “Outer loop n, inner halves… actually O(n log n).” Interviewers reward reasoning.",commonMistakes:[{mistake:"Claiming O(1) for vector push_back always",fix:"Amortized O(1); worst single call can be O(n) on resize."},{mistake:"Forgetting extra space of recursion stack",fix:"Depth-d recursion → O(d) space."},{mistake:"Using Big-O for tiny n micro-optimizations only",fix:"Also consider constants when n is small — but still know asymptotics."}],miniQuiz:[{id:"c07-q1",type:"mcq",question:"3n² + 100n is best described for interviews as:",options:["O(n)","O(n²)","O(3n²)","O(100n)"],answer:1,explanation:"Drop constants and lower-order terms → O(n²)."},{id:"c07-q2",type:"truefalse",question:"If an algorithm is O(n²), it is automatically also O(n³).",answer:!0,explanation:"Mathematically O(n²) ⊆ O(n³) as upper bounds — but you should report the tight useful bound O(n²)."},{id:"c07-q3",type:"complexity",question:"Sorting with std::sort in C++ is typically:",options:["O(n)","O(n log n) average","O(1)","O(2ⁿ)"],answer:1,explanation:"Comparison sorts are O(n log n) typical; introsort used by many libstdc++ implementations."}],summary:["Big-O communicates asymptotic upper bounds.","Drop constants and lower-order terms.","Know the common complexity classes cold.","Report tight, honest bounds in interviews."],revisionNotes:["O(1), O(log n), O(n), O(n log n), O(n²)","Amortized vs worst-case matters for vectors/hashes","Time and space both required"],practiceProblems:[{id:"c07-p1",title:"Classify Five Snippets",difficulty:"Medium",statement:"Write five tiny C++ loop patterns and label each with Big-O. Include at least one log factor and one quadratic.",observation:"Creating examples cements recognition.",thinkingQuestions:["Which snippet is closest to real bugs you’ve seen?"],hints:["Vary nesting and loop multipliers."],bruteForce:"Guess without counting",optimization:"Count systematically",dryRun:"Pick n=8 and count actual iterations once",complexity:"Meta-exercise",reflection:"Which class confuses you still?",solution:"Examples: single loop O(n); nested O(n²); while n/=2 O(log n); sort + scan O(n log n); two independent loops O(n+m).",language:"cpp"}],reflectionQuestions:["Can you explain Big-O to a junior engineer in 2 minutes?","Which complexity class do you mis-identify most?","Confidence on Big-O (0–100)?"]},{id:"w1-c08",slug:"arrays",number:8,title:"Arrays",subtitle:"Contiguous memory, O(1) index access, shifting costs",estimatedMinutes:45,day:4,introduction:"The array is the most fundamental random-access structure. In C++, a raw array or `std::array` occupies **contiguous memory**. That single fact explains nearly all of its strengths and weaknesses.",realWorldProblem:"You store 1,000,000 sensor readings and need reading #543210 frequently. With an array, access is instant (index arithmetic). If you stored them in a linked list, you would walk hundreds of thousands of nodes. Layout changes everything.",whyExists:"Almost every advanced structure (heaps, hash tables, dynamic arrays, strings) builds on contiguous buffers. Interview problems constantly use arrays. You must see them as memory, not only as syntax.",historicalBackground:"Early computers exposed linear address spaces. Arrays mapped naturally to address = base + i * size. Languages from FORTRAN to C made arrays primitive. C++ keeps zero-cost abstractions over this model with `std::vector` and `std::array`.",visualIntuition:`Draw boxes side by side in RAM:

| a[0] | a[1] | a[2] | a[3] | a[4] |
indices: 0      1      2      3      4

Access a[3]: jump directly.  
Insert at index 1: shift 1..end right — expensive.  
Delete at index 1: shift left — expensive.

Cache-friendly traversal left→right is blazing fast because CPUs prefetch contiguous lines.`,animationType:"arrays",simpleExplanation:`**Array properties (static size raw array):**

- Access by index: **O(1)**  
- Search unsorted: **O(n)**  
- Search sorted: **O(log n)** with binary search  
- Insert/delete in middle: **O(n)** due to shifting  
- Contiguous layout → great spatial locality  

In interviews, “array problems” often mean: two pointers, prefix sums, sliding window, in-place transforms, sorting + scan.`,realLifeAnalogy:"A row of numbered lockers. Opening locker #50 is instant if you know the number. Inserting a new locker between #2 and #3 forces everyone after to move down the hall.",stepByStep:["See array as base pointer + index * element_size.","Prefer index math over unnecessary copies.","When inserting/deleting, account for shifts.","For algorithms, state whether you may mutate input.","Watch for overflow on mid = (lo+hi)/2 — use lo+(hi-lo)/2.","Practice dry runs with small arrays on paper."],dryRun:{input:"Insert 99 at index 2 in [10, 20, 30, 40]",steps:["Need space: result length 5","Shift 40 → index 4","Shift 30 → index 3","Write 99 at index 2","Result [10, 20, 99, 30, 40]"],output:"Shift cost proportional to elements after insertion point"},code:[{language:"cpp",title:"C-style array vs traversal",content:`#include <iostream>
using namespace std;

int main() {
    int a[5] = {4, 1, 3, 9, 7};
    // O(1) access
    cout << a[3] << "\\n"; // 9

    // O(n) traversal
    for (int i = 0; i < 5; i++) {
        cout << a[i] << " ";
    }
    return 0;
}`,explanation:"Fixed stack array; size known at compile time here."},{language:"cpp",title:"In-place reverse (two pointers)",content:`void reverseArray(vector<int>& a) {
    int i = 0, j = (int)a.size() - 1;
    while (i < j) {
        swap(a[i], a[j]);
        i++; j--;
    }
}
// Time O(n), Space O(1)`,explanation:"Classic array pattern: coordinate two indices with an invariant."}],mermaidDiagrams:[{title:"Array Memory Layout",code:`flowchart LR
  B[Base Address] --> C0[index 0]
  C0 --> C1[index 1]
  C1 --> C2[index 2]
  C2 --> C3[index 3]
  C3 --> C4[index 4]
  C0 -.->|plus 1*size| C1`}],flowchartSteps:[{id:"1",label:"Start at base",type:"start"},{id:"2",label:"Compute base+i*size",type:"process"},{id:"3",label:"Read/Write element",type:"process"},{id:"4",label:"Done O1",type:"end"}],memoryDiagram:`Address:  0x100  0x104  0x108  0x10C  0x110
Content:  [ 4 ]  [ 1 ]  [ 3 ]  [ 9 ]  [ 7 ]
Index:      0      1      2      3      4
Assuming 4-byte ints, contiguous.`,complexityAnalysis:{time:"Access O(1); scan O(n); insert mid O(n)",space:"O(n) to store n elements; no pointer overhead per element",best:"Access known index; sequential scan",average:"Search unsorted O(n)",worst:"Many inserts at front O(n²) total if repeated naively",explanation:"Contiguity trades flexible insert for fast access and cache performance."},interviewPerspective:"Array problems test whether you can maintain indices carefully, avoid off-by-one errors, and use patterns (two pointers, windows) without extra memory when required.",commonMistakes:[{mistake:"Off-by-one in loop bounds",fix:"Check empty, single-element, full ranges; use invariants."},{mistake:"Assuming arrays are always sorted",fix:"Binary search only after sort or problem guarantee."},{mistake:"Ignoring integer overflow in index math",fix:"mid = lo + (hi - lo) / 2; careful with long long sums."}],miniQuiz:[{id:"c08-q1",type:"mcq",question:"Random access time for array index i is:",options:["O(n)","O(log n)","O(1)","O(n²)"],answer:2,explanation:"Address arithmetic is constant time."},{id:"c08-q2",type:"mcq",question:"Inserting at the beginning of a dense array of n elements is:",options:["O(1)","O(log n)","O(n)","O(n log n)"],answer:2,explanation:"All elements must shift."},{id:"c08-q3",type:"dryrun",question:"After deleting index 1 from [5,6,7,8], what is the array?",options:["[5,7,8]","[5,6,8]","[6,7,8]","[5,6,7,8]"],answer:0,explanation:"Remove 6; shift 7 and 8 left → [5,7,8]."}],summary:["Arrays store elements contiguously.","O(1) index access; O(n) unstructured search; costly mid insert/delete.","Cache locality makes scans fast in practice.","Master index patterns for interviews."],revisionNotes:["base + i * size","shift = O(n)","two pointers / sliding window family"],practiceProblems:[{id:"c08-p1",title:"Remove Element In-Place",difficulty:"Easy",statement:"Given an array and a value val, remove all instances of val in-place and return the new length. Order of remaining elements may change only if you choose — classic LeetCode 27 style prefers stable relative approach with two pointers.",observation:"You can overwrite elements you no longer need.",thinkingQuestions:["Do you need a second array?","What invariant can two pointers maintain?"],hints:["Keep a write pointer for the next position to fill.","Scan read pointer across all elements."],bruteForce:"Build a new array of kept elements O(n) space",optimization:"Two pointers O(1) extra space",dryRun:"a=[3,2,2,3], val=3 → keep [2,2], length 2",complexity:"Time O(n), Space O(1)",reflection:"Did you try coding before reading solution?",solution:`int removeElement(vector<int>& a, int val) {
    int w = 0;
    for (int r = 0; r < (int)a.size(); r++) {
        if (a[r] != val) a[w++] = a[r];
    }
    return w;
}`,language:"cpp"},{id:"c08-p2",title:"Max Consecutive Ones",difficulty:"Easy",statement:"Given a binary array, return the maximum number of consecutive 1s.",observation:"Single scan; reset counter on zeros.",thinkingQuestions:["What state do you maintain while scanning?"],hints:["Track current run and best run."],bruteForce:"For each start, expand end while 1s",optimization:"One pass O(n)",dryRun:"[1,1,0,1,1,1] → 3",complexity:"O(n) time, O(1) space",reflection:"How is this a sliding window degenerate case?",solution:`int findMaxConsecutiveOnes(vector<int>& a) {
    int best = 0, cur = 0;
    for (int x : a) {
        if (x == 1) best = max(best, ++cur);
        else cur = 0;
    }
    return best;
}`,language:"cpp"}],reflectionQuestions:["Can you draw memory layout for an int array of size 6?","When would a linked list beat an array?","Confidence on arrays (0–100)?"]},{id:"w1-c09",slug:"vectors",number:9,title:"Vectors",subtitle:"std::vector — dynamic array with amortized growth",estimatedMinutes:50,day:5,introduction:"In modern C++, `std::vector<T>` is your default contiguous sequence. It is a **dynamic array**: it can grow, it still offers O(1) index access, and it manages memory for you.\n\nUnderstanding vector is non-negotiable for C++ interviews.",realWorldProblem:"You read an unknown number of integers from input. A fixed array size is painful. `vector` grows as you `push_back`. But if you ignore `reserve`, a large ingest may reallocate multiple times — still amortized O(1) per push, yet with real constant-factor cost and iterator invalidation subtleties.",whyExists:"Vectors appear in nearly every C++ solution. Interviewers may ask what `push_back` costs, what `capacity` vs `size` means, and when references invalidate.",historicalBackground:"Dynamic arrays predate STL. The C++ Standard Template Library standardized `vector` with complexity guarantees: `push_back` is amortized constant time. Growth strategies typically double capacity to achieve that amortization.",visualIntuition:`size = number of live elements  
capacity = allocated slots  

Example:
size=3, capacity=4: [10, 20, 30, _]  
push_back(40): [10, 20, 30, 40] size=4 capacity=4  
push_back(50): allocate capacity=8, move elements, then append → size=5 capacity=8  

Doubling means total copy cost across n pushes is ~O(n), so per push amortized O(1).`,animationType:"vectors",simpleExplanation:"**Critical vector APIs:**\n\n- `size()` / `capacity()` / `empty()`  \n- `push_back` / `pop_back`  \n- `operator[]` / `at` (bounds-checked)  \n- `insert` / `erase` (O(n) — shifts)  \n- `reserve(n)` — preallocate capacity  \n- `resize(n)` — change size (may construct defaults)  \n- `clear()` — size 0; capacity may remain  \n\n**Complexity:**\n- Random access: O(1)  \n- push_back: amortized O(1), worst O(n) when growing  \n- insert/erase middle: O(n)",realLifeAnalogy:"A resizable photo album. Pages are capacity. Photos are size. When full, you buy a bigger album (often double) and move photos over. Moving is costly, but rare if you double.",stepByStep:["Prefer vector over raw new[]/delete[] for sequences.","Use reserve when you know approximate final size.","Never hold pointers/references across unchecked reallocation.","Erase carefully; consider erase-remove idiom for value removal.","Pass vector<int>& to avoid copies; use const& when read-only.","Know when to use array/string vs vector for interviews."],dryRun:{input:"Empty vector, push 1,2,3,4,5 with doubling growth from 1",steps:["push 1: cap 1 size 1","push 2: grow to 2, move, size 2","push 3: grow to 4, size 3","push 4: size 4 cap 4","push 5: grow to 8, size 5"],output:"Few grows; total move cost linear in n"},code:[{language:"cpp",title:"size vs capacity + reserve",content:`#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> v;
    v.reserve(8); // capacity at least 8, size still 0
    for (int i = 0; i < 5; i++) v.push_back(i * 10);
    cout << "size=" << v.size() << " cap=" << v.capacity() << "\\n";
    v.erase(v.begin() + 2); // remove element at index 2 (shifts)
    for (int x : v) cout << x << " ";
}`,explanation:"reserve avoids early reallocations; erase shifts tail elements."},{language:"cpp",title:"Erase-remove idiom",content:`// Remove all 3s efficiently
void removeValue(vector<int>& v, int val) {
    v.erase(remove(v.begin(), v.end(), val), v.end());
}`,explanation:"remove shifts kept elements forward; erase shrinks size once."}],mermaidDiagrams:[{title:"Vector Growth",code:`flowchart TD
  A[push_back x] --> B{size less than capacity?}
  B -->|Yes| C[Write at v size]
  C --> D[size plus 1]
  B -->|No| E[Allocate larger capacity]
  E --> F[Move or copy old elements]
  F --> G[Deallocate old buffer]
  G --> C`}],flowchartSteps:[{id:"1",label:"push_back",type:"start"},{id:"2",label:"Capacity full?",type:"decision"},{id:"3",label:"Grow buffer",type:"process"},{id:"4",label:"Place element",type:"process"},{id:"5",label:"size++",type:"end"}],memoryDiagram:`Before grow: capacity=4 size=4
[ a | b | c | d ]

After push e with double:
New capacity=8 size=5
[ a | b | c | d | e | _ | _ | _ ]
Old buffer freed.`,complexityAnalysis:{time:"Access O(1); push_back amortized O(1); insert O(n)",space:"O(capacity) which is Θ(size) typically within factor 2",best:"push_back with spare capacity O(1) worst-case that call",average:"amortized O(1) push_back with geometric growth",worst:"single push_back causing grow O(n); insert at begin O(n)",explanation:"Amortization averages costly grows across many cheap pushes."},interviewPerspective:"You may be asked: “Why not always insert at front in vector?” Answer: O(n) per insert. For deque-like patterns, discuss `deque` or reverse thinking with `push_back`.",commonMistakes:[{mistake:"Using push_back in a loop without reserve for known size",fix:"reserve(n) when n known — fewer allocations."},{mistake:"Storing reference to v[i] then push_back more elements",fix:"Reallocation invalidates references; refetch or use indices."},{mistake:"Confusing resize with reserve",fix:"reserve changes capacity only; resize changes size and elements."}],miniQuiz:[{id:"c09-q1",type:"mcq",question:"Amortized time of push_back on vector is:",options:["O(n)","O(1)","O(log n)","O(n²)"],answer:1,explanation:"Geometric growth → amortized O(1)."},{id:"c09-q2",type:"mcq",question:"capacity() vs size():",options:["They are always equal","capacity is allocated storage; size is live elements","size is always greater than capacity","capacity counts only uninitialized memory on stack"],answer:1,explanation:"capacity ≥ size always for vector."},{id:"c09-q3",type:"truefalse",question:"v.reserve(100) sets size to 100.",answer:!1,explanation:"reserve affects capacity, not size."}],summary:["vector is a dynamic contiguous array.","size vs capacity is essential.","push_back amortized O(1) via growth (often doubling).","Mid insert/erase still O(n).","reserve when you know size; mind invalidation."],revisionNotes:["amortized push_back","reserve ≠ resize","erase shifts","invalidation on reallocate"],practiceProblems:[{id:"c09-p1",title:"Running Capacity Trace",difficulty:"Easy",statement:"Starting from empty vector, push_back 1..10. Assume capacity starts 0 and doubles when full (1,2,4,8,16...). List size and capacity after each push.",observation:"You will see grows at 1,2,4,8.",thinkingQuestions:["How many element moves total roughly?"],hints:["Simulate on paper."],bruteForce:"Run code with capacity prints",optimization:"Mental model of doubling",dryRun:"After 5 pushes: size 5 cap 8 in this model",complexity:"Total construction moves O(n)",reflection:"When would reserve(10) help?",solution:"Grows when size would exceed capacity; exact sequence depends on implementation, but doubling model is the interview standard explanation.",language:"cpp"},{id:"c09-p2",title:"Insert Interval-style Building",difficulty:"Medium",statement:"Build a vector of first n squares using reserve(n) and push_back. Then erase the element at index n/2 if n>0. State complexities.",observation:"Mix of growth API and erase shifting.",thinkingQuestions:["What is complexity of that erase?"],hints:["reserve then loop push_back."],bruteForce:"No reserve",optimization:"reserve(n)",dryRun:"n=5 → [0,1,4,9,16], erase index 2 → [0,1,9,16]",complexity:"Build O(n); erase O(n)",reflection:"Did you use indices safely?",solution:`vector<long long> squares; squares.reserve(n);
for (int i=0;i<n;i++) squares.push_back(1LL*i*i);
if(n>0) squares.erase(squares.begin()+n/2);`,language:"cpp"}],reflectionQuestions:["Explain amortized O(1) push_back to a rubber duck.","When do you choose list/deque over vector?","Confidence on vectors (0–100)?"]},{id:"w1-c10",slug:"problem-solving-framework",number:10,title:"Problem Solving Framework",subtitle:"A repeatable process for every coding problem",estimatedMinutes:45,day:6,introduction:`Talent is unreliable under pressure. **Process** is reliable.

This chapter installs the EngineerOS Problem Solving Framework — the same spine you will use on Day 6 practice and in every future mock interview.`,realWorldProblem:`Candidate A is “smart” but chaotic: jumps into code, deletes half, panics, fails easy-medium problems.

Candidate B uses a framework: clarifies, examples, brute force, optimize, code, test. Candidate B looks calmer and scores higher — even with similar raw ability.`,whyExists:"Without a framework, every problem feels new. With a framework, every problem is an instance of a known process. That is how you scale skill.",historicalBackground:"Polya’s “How to Solve It” taught structured mathematical problem solving decades ago: understand, plan, carry out, look back. Interview prep communities adapted this to coding rounds. EngineerOS hardens it into a checklist you can execute half-asleep.",visualIntuition:`Seven gates. You do not skip gates under stress:

1 Clarify → 2 Examples → 3 Brute → 4 Optimize → 5 Code → 6 Test → 7 Complexity/Reflect

Each gate has an exit criterion. Example gate exits only when edge cases are listed.`,animationType:"framework",simpleExplanation:`### The EngineerOS 7-Step Framework

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
Final time/space. What pattern was this? Log mistakes if any.`,realLifeAnalogy:"Emergency medicine triage protocols exist so doctors do not invent care order during chaos. Your framework is triage for algorithms.",stepByStep:["Print or memorize the 7 steps.","On each practice problem, write step headers in comments.","Do not write solution code before step 4 is solid.","If stuck in optimize >10 minutes, write brute force fully first.","After solving, name the pattern in one phrase.","Add to mistake book if you skipped a step and paid for it."],dryRun:{input:"Problem: best time to buy/sell stock once",steps:["Clarify: one transaction? prices non-empty?","Example: [7,1,5,3,6,4] → buy 1 sell 6 → profit 5","Brute: try all pairs i<j O(n²)","Optimize: track min so far, best profit O(n)","Code; test edge: decreasing array → 0","Time O(n) space O(1); pattern: running min/max"],output:"Structured solve with clear complexity"},code:[{language:"cpp",title:"Framework comments in solution file",content:`// 1 Clarify: one buy + one sell, max profit, or 0
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
// 7 O(n) time, O(1) space`,explanation:"The comments are training wheels — use them until automatic."}],mermaidDiagrams:[{title:"Problem Solving Process",code:`flowchart TD
  A[Clarify] --> B[Examples + Edges]
  B --> C[Brute Force]
  C --> D[Complexity OK for constraints?]
  D -->|Yes| E[Code]
  D -->|No| F[Optimize Structure]
  F --> G[Re-check Complexity]
  G --> E
  E --> H[Test + Fix]
  H --> I[State Complexity + Pattern]
  I --> J[Reflect / Log]`}],flowchartSteps:[{id:"1",label:"Clarify",type:"start"},{id:"2",label:"Examples",type:"process"},{id:"3",label:"Brute Force",type:"process"},{id:"4",label:"Optimize?",type:"decision"},{id:"5",label:"Code + Test",type:"process"},{id:"6",label:"Reflect",type:"end"}],complexityAnalysis:{time:"Framework adds 3–8 minutes upfront; saves disasters",space:"Working memory structured by steps",best:"Automatic under pressure",average:"Conscious checklist",worst:"Skip → thrash coding",explanation:"Meta-algorithm for solving algorithms."},interviewPerspective:"Interviewers often grade process as much as final code. Saying “I’ll start with a correct O(n²) approach, then improve” is professional and safe.",commonMistakes:[{mistake:"Optimizing a misunderstood problem",fix:"Clarify + examples before cleverness."},{mistake:"No brute force path when optimize fails",fix:"Always have a correct fallback to discuss/code."},{mistake:"Testing only the happy path",fix:"Force at least one edge case every time."}],miniQuiz:[{id:"c10-q1",type:"mcq",question:"Correct order start:",options:["Code → Test → Clarify","Clarify → Examples → Brute → Optimize → Code","Optimize → Clarify → Code","Memorize editorial → type"],answer:1,explanation:"Framework order prevents false starts."},{id:"c10-q2",type:"truefalse",question:"You should skip brute force if you think you see the optimal idea immediately.",answer:!1,explanation:"Still briefly validate brute force and constraints; many 'optimal ideas' are wrong."}],summary:["Process beats improvisation under pressure.","7 steps: clarify, examples, brute, optimize, code, test, reflect.","Name patterns after each solve.","Use comments as scaffolding until automatic."],revisionNotes:["Clarify constraints first","Brute before clever","Edges in examples","Pattern name at end"],practiceProblems:[{id:"c10-p1",title:"Two Sum with Full Framework",difficulty:"Easy",statement:"Solve Two Sum using written headers for all 7 steps. Do not open a solution. Hide your final code until you finish optimize notes.",observation:"Easy problems are perfect for process training.",thinkingQuestions:["What map stores?","Why one pass works?"],hints:["Value → index","Check complement before inserting current if required by constraints"],bruteForce:"Nested loops O(n²)",optimization:"Hash map O(n) average",dryRun:"[2,7,11,15], 9 → [0,1]",complexity:"Time O(n), Space O(n)",reflection:"Which step felt skippable — and was it really?",solution:`vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int,int> idx;
    for (int i = 0; i < (int)nums.size(); i++) {
        int need = target - nums[i];
        if (idx.count(need)) return {idx[need], i};
        idx[nums[i]] = i;
    }
    return {};
}`,language:"cpp"},{id:"c10-p2",title:"Contains Duplicate",difficulty:"Easy",statement:"Return true if any value appears at least twice. Apply full framework; compare sort vs hash approaches.",observation:"Multiple valid complexities — discuss trade-offs.",thinkingQuestions:["When is sorting better than hashing?"],hints:["unordered_set insert until collision","or sort adjacent"],bruteForce:"Nested O(n²)",optimization:"Hash O(n) avg space O(n); sort O(n log n) space O(1)/O(n)",dryRun:"[1,2,3,1] true; [1,2,3,4] false",complexity:"State both options",reflection:"Did you mention average vs worst for hashing?",solution:`bool containsDuplicate(vector<int>& a) {
    unordered_set<int> s;
    for (int x : a) if (!s.insert(x).second) return true;
    return false;
}`,language:"cpp"}],reflectionQuestions:["Which framework step do you rush?","How will you enforce the framework tomorrow?","Confidence on process (0–100)?"]},{id:"w1-c11",slug:"leetcode-guide",number:11,title:"LeetCode Guide",subtitle:"How to use LeetCode as a training system — not a dopamine slot machine",estimatedMinutes:40,day:7,introduction:`LeetCode is a powerful gym. It is also a trap.

If you chase acceptance green checks without understanding, you get **counterfeit progress**. This chapter teaches a professional protocol for using LeetCode inside EngineerOS / WIN AUGUST.`,realWorldProblem:"A candidate “solves” 400 problems by reading editorials in 5 minutes each. Their interview performance is weak. Another solves 120 problems with deep framework, spaced revision, and mistake logs — and outperforms. Volume without method is vanity.",whyExists:"You will use LeetCode (or equivalent) throughout prep. Week 1 must install hygiene: difficulty selection, timers, editorial rules, tagging, and revision — aligned with EngineerOS principles.",historicalBackground:"Online judges evolved from competitive programming platforms. LeetCode optimized for interview-style problems and company tags. Tags are useful hints **after** solving, not before — otherwise you spoil pattern recognition training.",visualIntuition:`Treat each problem as a training ticket:

Attempt → (optional hints) → Solve or Editorial → Re-own → Tag patterns → Schedule revision → Re-solve later cold

Green check is step 3 of 7 — not the finish line.`,animationType:"framework",simpleExplanation:`### EngineerOS LeetCode Protocol

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
- Not raw lifetime solved alone`,realLifeAnalogy:"Gym reps only count with good form. Cheating the weight with bad form inflates numbers and causes injury. Editorial-first grinding is bad form.",stepByStep:["Pick problem aligned to current mission topic.","Start timer; no tags spoiler if possible.","Run 7-step framework on paper/comments.","Code in C++; test custom cases.","On fail: one hint tier, then editorial if needed.","Re-implement clean version.","Log pattern + mistake book entry if needed.","Schedule revision in EngineerOS Revision page."],dryRun:{input:"Problem set: Two Sum, Contains Duplicate, Best Time to Buy/Sell Stock",steps:["Solve each with protocol same day as related chapters","Revise Two Sum after 1 day without notes","If fail cold re-solve, lower confidence and re-log"],output:"Durable skill, not inflated solve count"},code:[{language:"cpp",title:"Personal problem log schema (conceptual)",content:`struct ProblemLog {
    string name;
    string pattern;      // e.g. "hash map", "two pointers"
    string complexity;   // "O(n) time / O(n) space"
    int minutes;
    bool usedEditorial;
    string mistake;      // empty if clean
    string nextReview;   // ISO date
};`,explanation:"EngineerOS Mistake Notebook + Revision cover this — use them religiously."}],mermaidDiagrams:[{title:"LeetCode Training Loop",code:`flowchart TD
  A[Select Topic Problem] --> B[Timed Attempt]
  B --> C{Solved?}
  C -->|Yes| D[Explain + Tag]
  C -->|No| E[Hint then Editorial]
  E --> F[Re-implement Cold]
  F --> D
  D --> G[Mistake Log if needed]
  G --> H[Spaced Revision]
  H --> I[Cold Re-solve Later]`}],flowchartSteps:[{id:"1",label:"Select",type:"start"},{id:"2",label:"Timed Attempt",type:"process"},{id:"3",label:"Solved?",type:"decision"},{id:"4",label:"Editorial Path",type:"process"},{id:"5",label:"Own + Revise",type:"end"}],complexityAnalysis:{time:"Quality minutes > quantity hours of skimming",space:"Spaced repetition calendar is your second brain",best:"Topic-aligned deliberate practice",average:"Mixed with some editorial help",worst:"Tag-spoiled editorial copy-paste",explanation:"Protocol optimizes retention per hour."},interviewPerspective:"Company tags can guide later stage prep. Early on, patterns matter more than “Google tagged” labels. A clean Two Sum explanation beats a memorized hard problem you cannot re-derive.",commonMistakes:[{mistake:"Sorting problems by acceptance rate only",fix:"Sort by topic relevance to current mission."},{mistake:"Never re-solving",fix:"Spaced cold re-solves are mandatory."},{mistake:"Language hopping mid-prep",fix:"Stick to C++ for WIN AUGUST coding rounds."},{mistake:"Ignoring Medium forever",fix:"After Week 1 foundations, gradually introduce Medium with scaffolding."}],miniQuiz:[{id:"c11-q1",type:"mcq",question:"What is a vanity metric in LeetCode prep?",options:["Cold re-solve success rate","Lifetime solved count without retention","Mistake recurrence decreasing","Pattern ownership"],answer:1,explanation:"Raw solves without ownership inflate ego, not skill."},{id:"c11-q2",type:"mcq",question:"After reading an editorial, you should:",options:["Mark complete and never return","Re-implement from memory and schedule revision","Immediately open 10 related hard problems","Switch programming language"],answer:1,explanation:"Ownership requires rewrite + spaced return."}],summary:["LeetCode is a gym; protocol is form.","Timer, framework, editorial discipline, tags after, revision always.","Optimize for cold re-solves and pattern ownership.","Week 1 stays on Easy foundations aligned to topics."],revisionNotes:["No editorial first","Re-own every solution","1/3/7/14/30 revision","C++ consistency"],practiceProblems:[{id:"c11-p1",title:"Protocol Three-Pack",difficulty:"Easy",statement:"Complete Three problems under protocol: Two Sum, Contains Duplicate, Max Profit (Best Time to Buy and Sell Stock). Log each in journal with pattern names.",observation:"These encode hash maps, sets, and running min patterns.",thinkingQuestions:["Which problem tricked your edge cases?"],hints:["Stick to time boxes.","No AI during attempts."],bruteForce:"As applicable per problem",optimization:"As applicable per problem",dryRun:"Custom tests for each",complexity:"Write for each",reflection:"What will you change in protocol next week?",solution:`Standard optimal solutions:
Two Sum: hash map
Contains Duplicate: set or sort
Max Profit: running minimum
Do not copy without cold rewrite.`,language:"cpp"}],reflectionQuestions:["What bad LeetCode habit will you kill in August?","How many quality problems per day is sustainable for you?","End of Week 1 confidence overall (0–100)?"]}].sort((e,t)=>e.number-t.number),i=[{day:1,week:1,title:"Launch Sequence",objective:"Internalize EngineerOS as your only study system and understand how Google interviews actually work.",chapterIds:["w1-c01","w1-c02"],estimatedMinutes:60,readingMinutes:30,animationMinutes:5,practiceMinutes:15,quizMinutes:5,reflectionMinutes:5,checklist:[{id:"d1-read",label:"Read Introduction + Google Interviews chapters",type:"read"},{id:"d1-anim",label:"Watch framework flow animation",type:"animation"},{id:"d1-practice",label:"Complete Personal Mission Contract + Interview Script Drill",type:"practice"},{id:"d1-quiz",label:"Finish Day 1 mini quizzes",type:"quiz"},{id:"d1-reflect",label:"Write journal: learn / confuse / pattern / confidence",type:"reflection"}]},{day:2,week:1,title:"Mindset & Modern Reality",objective:"Build durable motivation: why DSA matters, how AI changes prep, and growth mindset under failure.",chapterIds:["w1-c03","w1-c04","w1-c05"],estimatedMinutes:75,readingMinutes:40,animationMinutes:5,practiceMinutes:15,quizMinutes:8,reflectionMinutes:7,checklist:[{id:"d2-read",label:"Read DSA, AI, Growth Mindset chapters",type:"read"},{id:"d2-anim",label:"Run complexity intuition visual",type:"animation"},{id:"d2-practice",label:"Mistake Alchemy + AI-Free Timer Drill",type:"practice"},{id:"d2-quiz",label:"Complete Day 2 quizzes",type:"quiz"},{id:"d2-reflect",label:"Journal with honest confidence score",type:"reflection"}]},{day:3,week:1,title:"Complexity Fluency",objective:"Gain fluency in time complexity and Big-O so you can estimate algorithms before coding.",chapterIds:["w1-c06","w1-c07"],estimatedMinutes:80,readingMinutes:35,animationMinutes:15,practiceMinutes:20,quizMinutes:5,reflectionMinutes:5,checklist:[{id:"d3-read",label:"Read Time Complexity + Big O chapters",type:"read"},{id:"d3-anim",label:"Animate linear vs binary search growth",type:"animation"},{id:"d3-practice",label:"Estimate Before Coding + Classify Five Snippets",type:"practice"},{id:"d3-quiz",label:"Complexity quizzes passed",type:"quiz"},{id:"d3-reflect",label:"Reflect on complexity confidence",type:"reflection"}]},{day:4,week:1,title:"Arrays Mastery",objective:"See arrays as contiguous memory. Master access, traversal, shifting, and classic index patterns.",chapterIds:["w1-c08"],estimatedMinutes:70,readingMinutes:25,animationMinutes:15,practiceMinutes:20,quizMinutes:5,reflectionMinutes:5,checklist:[{id:"d4-read",label:"Read Arrays textbook chapter fully",type:"read"},{id:"d4-anim",label:"Animate traversal, insert, delete, shift",type:"animation"},{id:"d4-practice",label:"Remove Element + Max Consecutive Ones",type:"practice"},{id:"d4-quiz",label:"Arrays mini quiz",type:"quiz"},{id:"d4-reflect",label:"Journal array insights",type:"reflection"}]},{day:5,week:1,title:"Vectors in C++",objective:"Master std::vector: size vs capacity, growth, push_back amortization, erase, reserve, resize.",chapterIds:["w1-c09"],estimatedMinutes:75,readingMinutes:25,animationMinutes:15,practiceMinutes:25,quizMinutes:5,reflectionMinutes:5,checklist:[{id:"d5-read",label:"Read Vectors chapter",type:"read"},{id:"d5-anim",label:"Animate capacity doubling and push_back",type:"animation"},{id:"d5-practice",label:"Capacity trace + squares/erase drill",type:"practice"},{id:"d5-quiz",label:"Vectors quiz",type:"quiz"},{id:"d5-reflect",label:"Explain amortized O(1) in journal",type:"reflection"}]},{day:6,week:1,title:"The Framework",objective:"Install the 7-step problem solving framework and apply it to classic Easy problems.",chapterIds:["w1-c10"],estimatedMinutes:80,readingMinutes:25,animationMinutes:5,practiceMinutes:35,quizMinutes:5,reflectionMinutes:10,checklist:[{id:"d6-read",label:"Read Problem Solving Framework",type:"read"},{id:"d6-anim",label:"Walk the framework flowchart",type:"animation"},{id:"d6-practice",label:"Two Sum + Contains Duplicate with full framework",type:"practice"},{id:"d6-quiz",label:"Framework quiz",type:"quiz"},{id:"d6-reflect",label:"Note which step you rush",type:"reflection"}]},{day:7,week:1,title:"LeetCode Protocol & Week Debrief",objective:"Lock the LeetCode training protocol, complete the three-pack, and finish Week 1 debrief.",chapterIds:["w1-c11"],estimatedMinutes:90,readingMinutes:25,animationMinutes:5,practiceMinutes:40,quizMinutes:5,reflectionMinutes:15,checklist:[{id:"d7-read",label:"Read LeetCode Guide",type:"read"},{id:"d7-anim",label:"Review weekly progress visuals",type:"animation"},{id:"d7-practice",label:"Protocol Three-Pack completed",type:"practice"},{id:"d7-quiz",label:"LeetCode guide quiz",type:"quiz"},{id:"d7-reflect",label:"Week 1 debrief journal",type:"reflection"},{id:"d7-revision",label:"Schedule revisions for all Week 1 chapters",type:"revision"}]}],n=t.flatMap(e=>e.practiceProblems.map(t=>({...t,chapterId:e.id,chapterTitle:e.title})));e.s(["ALL_PRACTICE_PROBLEMS",0,n,"WEEK1_CHAPTERS",0,t,"WEEK1_MISSIONS",0,i,"WEEK1_TITLE",0,"Building the Foundation of Problem Solving","getChapterById",0,function(e){return t.find(t=>t.id===e)},"getMissionForDay",0,function(e){return i.find(t=>t.day===e)}],97322)}]);