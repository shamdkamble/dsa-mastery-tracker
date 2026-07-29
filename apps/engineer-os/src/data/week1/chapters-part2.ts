import type { Chapter } from "@/lib/types";

export const chaptersPart2: Chapter[] = [
  {
    id: "w1-c06",
    slug: "time-complexity",
    number: 6,
    title: "Time Complexity",
    subtitle: "How running time grows as input grows",
    estimatedMinutes: 40,
    day: 3,
    introduction: `Time complexity answers a practical question: **if the input gets bigger, how much slower does my algorithm get?**

It is not about the exact milliseconds on your laptop. It is about **growth rate** — the shape of cost as n → large.`,
    realWorldProblem: `A feature works on a demo dataset of 100 rows. You ship it. Production has 2,000,000 rows. The request handler now takes 40 seconds. Users leave. The algorithm never “became wrong” — it became **too expensive as n grew**.`,
    whyExists: `Without time complexity, you cannot compare approaches or know whether an idea can pass interview constraints (often n up to 10⁵ or 10⁶). This chapter builds gut feel before formal Big-O notation deep dive.`,
    historicalBackground: `Algorithm analysis matured through the 20th century as machines ran larger problems. Donald Knuth and others formalized techniques to count operations independent of a particular CPU. Interviews inherited this language because it is portable across hardware and languages.`,
    visualIntuition: `Imagine four stopwatches timing the same task at n=10, 100, 1000, 100000:

- Constant work: stopwatch barely moves  
- Linear: moves proportional to n  
- Quadratic: explodes  
- Logarithmic: barely notices huge n  

In the Visual Playground, you will animate linear search vs binary search across these sizes.`,
    animationType: "complexity",
    simpleExplanation: `**Count dominant operations** as a function of input size n.

Examples:
- One loop from 1..n → roughly c·n operations → linear  
- Nested loops i=1..n, j=1..n → roughly c·n² → quadratic  
- Halving search space each step → ~log₂(n) → logarithmic  

Ignore machine-specific constants in high-level comparison. Focus on how the formula behaves when n multiplies by 10.`,
    realLifeAnalogy: `Finding a name in an unsorted guest list of n people: you may check each name (linear). Finding a word in a dictionary using alphabetical order: you jump midpoints (logarithmic). Same “find item” goal; different growth.`,
    stepByStep: [
      "Identify the input size parameter n (and maybe m).",
      "Find the code path that runs most as n grows.",
      "Count loops, recursions, and repeated work.",
      "Drop lower-order terms and constant factors for comparison.",
      "Sanity-check: if n doubles, does time ~double? quadruple? barely change?",
      "State best/average/worst when they differ.",
    ],
    dryRun: {
      input: "Linear search for x in array of size n",
      steps: [
        "Check index 0,1,2,... until found or end",
        "Worst case: x absent or at end → n comparisons",
        "Best case: x at index 0 → 1 comparison",
        "Average (random): ~n/2 comparisons",
      ],
      output: "Worst-case linear time in n",
    },
    code: [
      {
        language: "cpp",
        title: "Counting operations mentally",
        content: `int linearSearch(const vector<int>& a, int x) {
    for (int i = 0; i < (int)a.size(); i++) { // up to n iterations
        if (a[i] == x) return i;              // O(1) work each
    }
    return -1;
}
// Worst-case time: O(n)`,
        explanation: "Loop bound depends on n; body is constant work → O(n).",
      },
      {
        language: "cpp",
        title: "Quadratic pattern",
        content: `bool hasDuplicateNested(const vector<int>& a) {
    int n = (int)a.size();
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
            if (a[i] == a[j]) return true;
    return false;
}
// Worst-case time: O(n²)`,
        explanation: "Nested loops over n produce quadratic growth.",
      },
    ],
    mermaidDiagrams: [
      {
        title: "Growth Comparison",
        code: `flowchart LR
  A[n grows] --> B[O1 flat]
  A --> C[Ologn slow]
  A --> D[On linear]
  A --> E[Onlogn]
  A --> F[On2 steep]
  F --> G[Often too slow at 1e5+]`,
      },
    ],
    flowchartSteps: [
      { id: "1", label: "Identify n", type: "start" },
      { id: "2", label: "Find hot loops", type: "process" },
      { id: "3", label: "Estimate growth", type: "process" },
      { id: "4", label: "Check constraints", type: "decision" },
      { id: "5", label: "Accept or redesign", type: "end" },
    ],
    memoryDiagram: `CPU does not "feel" Big-O — it executes instructions.
Analysis abstracts instruction counts into growth classes
so humans can compare algorithms before coding all of them.`,
    complexityAnalysis: {
      time: "The subject of this chapter",
      space: "Related but separate (extra memory growth)",
      best: "Minimum work over inputs of size n",
      average: "Expected work under an input distribution",
      worst: "Maximum work — interview default unless stated",
      explanation: "Interviews usually want worst-case unless average is specified (e.g., hash tables).",
    },
    interviewPerspective: `After coding, say: “Time complexity is O(n) because we scan once; space is O(1) extra.” If you optimized from O(n²) to O(n), narrate that journey — it scores points.`,
    commonMistakes: [
      {
        mistake: "Confusing O(n) with 'fast on my machine'",
        fix: "Always relate to constraints (n ≤ ?).",
      },
      {
        mistake: "Counting only loops and missing expensive callees",
        fix: "If you call a O(n) function inside a O(n) loop, think O(n²).",
      },
      {
        mistake: "Saying O(n/2) as final class",
        fix: "O(n/2) is O(n). Drop constant factors.",
      },
    ],
    miniQuiz: [
      {
        id: "c06-q1",
        type: "complexity",
        question: "for i in 1..n: for j in 1..n: O(1) work. Time complexity?",
        options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"],
        answer: 2,
        explanation: "n·n constant work = O(n²).",
      },
      {
        id: "c06-q2",
        type: "mcq",
        question: "If n doubles and runtime roughly doubles, the algorithm is likely:",
        options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
        answer: 2,
        explanation: "Linear growth tracks n proportionally.",
      },
      {
        id: "c06-q3",
        type: "predict",
        question: "Roughly how many steps does binary search need for n=1,000,000 (power of two-ish)?",
        options: ["About 20", "About 1,000,000", "About 10^12", "Exactly 2"],
        answer: 0,
        explanation: "log₂(10^6) ≈ 20.",
      },
    ],
    summary: [
      "Time complexity describes growth of running time with input size.",
      "Focus on dominant terms; prefer worst-case in interviews.",
      "Match algorithm class to constraints.",
      "Nested loops and repeated linear scans are common killers.",
    ],
    revisionNotes: [
      "n=1e5 → avoid O(n²) generally",
      "n=1e8 → need near O(n) or better",
      "Always state time and space",
    ],
    practiceProblems: [
      {
        id: "c06-p1",
        title: "Estimate Before Coding",
        difficulty: "Easy",
        statement:
          "For n ≤ 1e5, which of these are typically acceptable: O(n), O(n log n), O(n²)? Explain with approximate operation counts.",
        observation: "1e5² = 1e10 — too large for typical 1e8 ops/sec rule of thumb.",
        thinkingQuestions: ["What constant factors might still kill O(n log n)?"],
        hints: ["Use 10^8 operations/sec as a rough mental budget."],
        bruteForce: "O(n²) nested compare",
        optimization: "Sort O(n log n) or hash O(n) depending on problem",
        dryRun: "Compute 1e5² vs 1e5·20",
        complexity: "Selection depends on constraints",
        reflection: "Will you check constraints first in every problem now?",
        solution: `Typically O(n) and O(n log n) OK; O(n²) often not for n=1e5. Always verify problem limits.`,
        language: "cpp",
      },
    ],
    reflectionQuestions: [
      "Where have you seen a feature slow down as data grew?",
      "How will you estimate complexity before coding tomorrow?",
      "Confidence on time complexity (0–100)?",
    ],
  },
  {
    id: "w1-c07",
    slug: "big-o",
    number: 7,
    title: "Big O",
    subtitle: "The language of upper bounds — O, Θ, Ω in interview practice",
    estimatedMinutes: 40,
    day: 3,
    introduction: `Big-O is the standard vocabulary for expressing complexity. When you say “This is O(n log n),” every trained engineer shares a mental picture.

This chapter makes Big-O precise enough for interviews without turning into a pure math course.`,
    realWorldProblem: `Two candidates propose solutions. One says “it’s fast.” The other says “O(n) time, O(1) extra space, fails if we need stable order.” Only one sentence is useful in a hiring signal.`,
    whyExists: `You need fluency: reading Big-O in editorials, writing it in interviews, and using it to reject impossible approaches early.`,
    historicalBackground: `Big-O notation comes from mathematics (Bachmann–Landau notation) and was adopted in CS to describe asymptotic upper bounds. In industry slang, people often say “Big-O” when they mean the tight typical bound (more like Θ). Interviews accept this informal usage if your reasoning is sound.`,
    visualIntuition: `f(n) = 3n² + 10n + 5 is O(n²) because for large n, the n² term dominates. Graphically, a quadratic curve can be scaled to stay above f(n) for large n.

Remember: Big-O is an **upper bound**. O(n²) is also O(n³) mathematically — but interviews want the **tight, meaningful** bound.`,
    animationType: "complexity",
    simpleExplanation: `**Common classes (fast → slow for large n):**

| Class | Name | Example |
|-------|------|---------|
| O(1) | Constant | Hash map average lookup |
| O(log n) | Logarithmic | Binary search |
| O(n) | Linear | Single scan |
| O(n log n) | Linearithmic | Efficient sort |
| O(n²) | Quadratic | Nested pair checks |
| O(2ⁿ) | Exponential | Naive subsets/recursion |

**Rules of thumb:**
- Drop constants: O(2n) → O(n)  
- Drop lower terms: O(n² + n) → O(n²)  
- Different inputs: O(n + m) for two arrays  

**Ω** = lower bound, **Θ** = tight bound. Interviews mostly say O for the tight bound you believe.`,
    realLifeAnalogy: `Elevator capacity rating: “This elevator is O(10 people)” as an upper bound on safe load. You would not brag “O(1000 people)” as useful even if technically an upper bound — too loose. Prefer tight, honest bounds.`,
    stepByStep: [
      "Write a rough function T(n) counting steps.",
      "Keep the fastest-growing term.",
      "Remove constant coefficients.",
      "Express as O(...).",
      "Mention space separately: extra memory vs input storage.",
      "If using hash tables, mention average vs worst if relevant.",
    ],
    dryRun: {
      input: "T(n) = 5n log n + 3n + 100",
      steps: [
        "Dominant term: 5n log n",
        "Drop coefficient 5 → n log n",
        "Conclude O(n log n)",
      ],
      output: "O(n log n)",
    },
    code: [
      {
        language: "cpp",
        title: "Binary search — O(log n)",
        content: `int binarySearch(const vector<int>& a, int x) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == x) return mid;
        if (a[mid] < x) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
// Requires sorted array. Time O(log n), Space O(1)`,
        explanation: "Each step halves the search window → logarithmic iterations.",
      },
    ],
    mermaidDiagrams: [
      {
        title: "Big-O Decision Cheatsheet",
        code: `flowchart TD
  A[Analyze code] --> B{Halves each step?}
  B -->|Yes| C[O log n]
  B -->|No| D{Single pass?}
  D -->|Yes| E[O n]
  D -->|No| F{Nested n by n?}
  F -->|Yes| G[O n2]
  F -->|No| H{Divide and conquer sort pattern?}
  H -->|Yes| I[O n log n]`,
      },
    ],
    flowchartSteps: [
      { id: "1", label: "Count operations", type: "start" },
      { id: "2", label: "Drop constants", type: "process" },
      { id: "3", label: "Drop lower terms", type: "process" },
      { id: "4", label: "Write Big-O", type: "end" },
    ],
    complexityAnalysis: {
      time: "Expressed with Big-O",
      space: "Also expressed with Big-O",
      best: "Ω often used; interviews may say best-case O(...)",
      average: "Important for hashing",
      worst: "Default interview claim",
      explanation: "Be precise when best/worst differ significantly.",
    },
    interviewPerspective: `Say bounds confidently but not arrogantly. If unsure, reason aloud: “Outer loop n, inner halves… actually O(n log n).” Interviewers reward reasoning.`,
    commonMistakes: [
      {
        mistake: "Claiming O(1) for vector push_back always",
        fix: "Amortized O(1); worst single call can be O(n) on resize.",
      },
      {
        mistake: "Forgetting extra space of recursion stack",
        fix: "Depth-d recursion → O(d) space.",
      },
      {
        mistake: "Using Big-O for tiny n micro-optimizations only",
        fix: "Also consider constants when n is small — but still know asymptotics.",
      },
    ],
    miniQuiz: [
      {
        id: "c07-q1",
        type: "mcq",
        question: "3n² + 100n is best described for interviews as:",
        options: ["O(n)", "O(n²)", "O(3n²)", "O(100n)"],
        answer: 1,
        explanation: "Drop constants and lower-order terms → O(n²).",
      },
      {
        id: "c07-q2",
        type: "truefalse",
        question: "If an algorithm is O(n²), it is automatically also O(n³).",
        answer: true,
        explanation:
          "Mathematically O(n²) ⊆ O(n³) as upper bounds — but you should report the tight useful bound O(n²).",
      },
      {
        id: "c07-q3",
        type: "complexity",
        question: "Sorting with std::sort in C++ is typically:",
        options: ["O(n)", "O(n log n) average", "O(1)", "O(2ⁿ)"],
        answer: 1,
        explanation: "Comparison sorts are O(n log n) typical; introsort used by many libstdc++ implementations.",
      },
    ],
    summary: [
      "Big-O communicates asymptotic upper bounds.",
      "Drop constants and lower-order terms.",
      "Know the common complexity classes cold.",
      "Report tight, honest bounds in interviews.",
    ],
    revisionNotes: [
      "O(1), O(log n), O(n), O(n log n), O(n²)",
      "Amortized vs worst-case matters for vectors/hashes",
      "Time and space both required",
    ],
    practiceProblems: [
      {
        id: "c07-p1",
        title: "Classify Five Snippets",
        difficulty: "Medium",
        statement:
          "Write five tiny C++ loop patterns and label each with Big-O. Include at least one log factor and one quadratic.",
        observation: "Creating examples cements recognition.",
        thinkingQuestions: ["Which snippet is closest to real bugs you’ve seen?"],
        hints: ["Vary nesting and loop multipliers."],
        bruteForce: "Guess without counting",
        optimization: "Count systematically",
        dryRun: "Pick n=8 and count actual iterations once",
        complexity: "Meta-exercise",
        reflection: "Which class confuses you still?",
        solution: `Examples: single loop O(n); nested O(n²); while n/=2 O(log n); sort + scan O(n log n); two independent loops O(n+m).`,
        language: "cpp",
      },
    ],
    reflectionQuestions: [
      "Can you explain Big-O to a junior engineer in 2 minutes?",
      "Which complexity class do you mis-identify most?",
      "Confidence on Big-O (0–100)?",
    ],
  },
  {
    id: "w1-c08",
    slug: "arrays",
    number: 8,
    title: "Arrays",
    subtitle: "Contiguous memory, O(1) index access, shifting costs",
    estimatedMinutes: 45,
    day: 4,
    introduction: `The array is the most fundamental random-access structure. In C++, a raw array or ` + "`std::array`" + ` occupies **contiguous memory**. That single fact explains nearly all of its strengths and weaknesses.`,
    realWorldProblem: `You store 1,000,000 sensor readings and need reading #543210 frequently. With an array, access is instant (index arithmetic). If you stored them in a linked list, you would walk hundreds of thousands of nodes. Layout changes everything.`,
    whyExists: `Almost every advanced structure (heaps, hash tables, dynamic arrays, strings) builds on contiguous buffers. Interview problems constantly use arrays. You must see them as memory, not only as syntax.`,
    historicalBackground: `Early computers exposed linear address spaces. Arrays mapped naturally to address = base + i * size. Languages from FORTRAN to C made arrays primitive. C++ keeps zero-cost abstractions over this model with ` + "`std::vector`" + ` and ` + "`std::array`" + `.`,
    visualIntuition: `Draw boxes side by side in RAM:

| a[0] | a[1] | a[2] | a[3] | a[4] |
indices: 0      1      2      3      4

Access a[3]: jump directly.  
Insert at index 1: shift 1..end right — expensive.  
Delete at index 1: shift left — expensive.

Cache-friendly traversal left→right is blazing fast because CPUs prefetch contiguous lines.`,
    animationType: "arrays",
    simpleExplanation: `**Array properties (static size raw array):**

- Access by index: **O(1)**  
- Search unsorted: **O(n)**  
- Search sorted: **O(log n)** with binary search  
- Insert/delete in middle: **O(n)** due to shifting  
- Contiguous layout → great spatial locality  

In interviews, “array problems” often mean: two pointers, prefix sums, sliding window, in-place transforms, sorting + scan.`,
    realLifeAnalogy: `A row of numbered lockers. Opening locker #50 is instant if you know the number. Inserting a new locker between #2 and #3 forces everyone after to move down the hall.`,
    stepByStep: [
      "See array as base pointer + index * element_size.",
      "Prefer index math over unnecessary copies.",
      "When inserting/deleting, account for shifts.",
      "For algorithms, state whether you may mutate input.",
      "Watch for overflow on mid = (lo+hi)/2 — use lo+(hi-lo)/2.",
      "Practice dry runs with small arrays on paper.",
    ],
    dryRun: {
      input: "Insert 99 at index 2 in [10, 20, 30, 40]",
      steps: [
        "Need space: result length 5",
        "Shift 40 → index 4",
        "Shift 30 → index 3",
        "Write 99 at index 2",
        "Result [10, 20, 99, 30, 40]",
      ],
      output: "Shift cost proportional to elements after insertion point",
    },
    code: [
      {
        language: "cpp",
        title: "C-style array vs traversal",
        content: `#include <iostream>
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
}`,
        explanation: "Fixed stack array; size known at compile time here.",
      },
      {
        language: "cpp",
        title: "In-place reverse (two pointers)",
        content: `void reverseArray(vector<int>& a) {
    int i = 0, j = (int)a.size() - 1;
    while (i < j) {
        swap(a[i], a[j]);
        i++; j--;
    }
}
// Time O(n), Space O(1)`,
        explanation: "Classic array pattern: coordinate two indices with an invariant.",
      },
    ],
    mermaidDiagrams: [
      {
        title: "Array Memory Layout",
        code: `flowchart LR
  B[Base Address] --> C0[index 0]
  C0 --> C1[index 1]
  C1 --> C2[index 2]
  C2 --> C3[index 3]
  C3 --> C4[index 4]
  C0 -.->|plus 1*size| C1`,
      },
    ],
    flowchartSteps: [
      { id: "1", label: "Start at base", type: "start" },
      { id: "2", label: "Compute base+i*size", type: "process" },
      { id: "3", label: "Read/Write element", type: "process" },
      { id: "4", label: "Done O1", type: "end" },
    ],
    memoryDiagram: `Address:  0x100  0x104  0x108  0x10C  0x110
Content:  [ 4 ]  [ 1 ]  [ 3 ]  [ 9 ]  [ 7 ]
Index:      0      1      2      3      4
Assuming 4-byte ints, contiguous.`,
    complexityAnalysis: {
      time: "Access O(1); scan O(n); insert mid O(n)",
      space: "O(n) to store n elements; no pointer overhead per element",
      best: "Access known index; sequential scan",
      average: "Search unsorted O(n)",
      worst: "Many inserts at front O(n²) total if repeated naively",
      explanation: "Contiguity trades flexible insert for fast access and cache performance.",
    },
    interviewPerspective: `Array problems test whether you can maintain indices carefully, avoid off-by-one errors, and use patterns (two pointers, windows) without extra memory when required.`,
    commonMistakes: [
      {
        mistake: "Off-by-one in loop bounds",
        fix: "Check empty, single-element, full ranges; use invariants.",
      },
      {
        mistake: "Assuming arrays are always sorted",
        fix: "Binary search only after sort or problem guarantee.",
      },
      {
        mistake: "Ignoring integer overflow in index math",
        fix: "mid = lo + (hi - lo) / 2; careful with long long sums.",
      },
    ],
    miniQuiz: [
      {
        id: "c08-q1",
        type: "mcq",
        question: "Random access time for array index i is:",
        options: ["O(n)", "O(log n)", "O(1)", "O(n²)"],
        answer: 2,
        explanation: "Address arithmetic is constant time.",
      },
      {
        id: "c08-q2",
        type: "mcq",
        question: "Inserting at the beginning of a dense array of n elements is:",
        options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        answer: 2,
        explanation: "All elements must shift.",
      },
      {
        id: "c08-q3",
        type: "dryrun",
        question: "After deleting index 1 from [5,6,7,8], what is the array?",
        options: ["[5,7,8]", "[5,6,8]", "[6,7,8]", "[5,6,7,8]"],
        answer: 0,
        explanation: "Remove 6; shift 7 and 8 left → [5,7,8].",
      },
    ],
    summary: [
      "Arrays store elements contiguously.",
      "O(1) index access; O(n) unstructured search; costly mid insert/delete.",
      "Cache locality makes scans fast in practice.",
      "Master index patterns for interviews.",
    ],
    revisionNotes: [
      "base + i * size",
      "shift = O(n)",
      "two pointers / sliding window family",
    ],
    practiceProblems: [
      {
        id: "c08-p1",
        title: "Remove Element In-Place",
        difficulty: "Easy",
        statement:
          "Given an array and a value val, remove all instances of val in-place and return the new length. Order of remaining elements may change only if you choose — classic LeetCode 27 style prefers stable relative approach with two pointers.",
        observation: "You can overwrite elements you no longer need.",
        thinkingQuestions: [
          "Do you need a second array?",
          "What invariant can two pointers maintain?",
        ],
        hints: [
          "Keep a write pointer for the next position to fill.",
          "Scan read pointer across all elements.",
        ],
        bruteForce: "Build a new array of kept elements O(n) space",
        optimization: "Two pointers O(1) extra space",
        dryRun: "a=[3,2,2,3], val=3 → keep [2,2], length 2",
        complexity: "Time O(n), Space O(1)",
        reflection: "Did you try coding before reading solution?",
        solution: `int removeElement(vector<int>& a, int val) {
    int w = 0;
    for (int r = 0; r < (int)a.size(); r++) {
        if (a[r] != val) a[w++] = a[r];
    }
    return w;
}`,
        language: "cpp",
      },
      {
        id: "c08-p2",
        title: "Max Consecutive Ones",
        difficulty: "Easy",
        statement:
          "Given a binary array, return the maximum number of consecutive 1s.",
        observation: "Single scan; reset counter on zeros.",
        thinkingQuestions: ["What state do you maintain while scanning?"],
        hints: ["Track current run and best run."],
        bruteForce: "For each start, expand end while 1s",
        optimization: "One pass O(n)",
        dryRun: "[1,1,0,1,1,1] → 3",
        complexity: "O(n) time, O(1) space",
        reflection: "How is this a sliding window degenerate case?",
        solution: `int findMaxConsecutiveOnes(vector<int>& a) {
    int best = 0, cur = 0;
    for (int x : a) {
        if (x == 1) best = max(best, ++cur);
        else cur = 0;
    }
    return best;
}`,
        language: "cpp",
      },
    ],
    reflectionQuestions: [
      "Can you draw memory layout for an int array of size 6?",
      "When would a linked list beat an array?",
      "Confidence on arrays (0–100)?",
    ],
  },
  {
    id: "w1-c09",
    slug: "vectors",
    number: 9,
    title: "Vectors",
    subtitle: "std::vector — dynamic array with amortized growth",
    estimatedMinutes: 50,
    day: 5,
    introduction: `In modern C++, ` + "`std::vector<T>`" + ` is your default contiguous sequence. It is a **dynamic array**: it can grow, it still offers O(1) index access, and it manages memory for you.

Understanding vector is non-negotiable for C++ interviews.`,
    realWorldProblem: `You read an unknown number of integers from input. A fixed array size is painful. ` + "`vector`" + ` grows as you ` + "`push_back`" + `. But if you ignore ` + "`reserve`" + `, a large ingest may reallocate multiple times — still amortized O(1) per push, yet with real constant-factor cost and iterator invalidation subtleties.`,
    whyExists: `Vectors appear in nearly every C++ solution. Interviewers may ask what ` + "`push_back`" + ` costs, what ` + "`capacity`" + ` vs ` + "`size`" + ` means, and when references invalidate.`,
    historicalBackground: `Dynamic arrays predate STL. The C++ Standard Template Library standardized ` + "`vector`" + ` with complexity guarantees: ` + "`push_back`" + ` is amortized constant time. Growth strategies typically double capacity to achieve that amortization.`,
    visualIntuition: `size = number of live elements  
capacity = allocated slots  

Example:
size=3, capacity=4: [10, 20, 30, _]  
push_back(40): [10, 20, 30, 40] size=4 capacity=4  
push_back(50): allocate capacity=8, move elements, then append → size=5 capacity=8  

Doubling means total copy cost across n pushes is ~O(n), so per push amortized O(1).`,
    animationType: "vectors",
    simpleExplanation: `**Critical vector APIs:**

- ` + "`size()`" + ` / ` + "`capacity()`" + ` / ` + "`empty()`" + `  
- ` + "`push_back`" + ` / ` + "`pop_back`" + `  
- ` + "`operator[]`" + ` / ` + "`at`" + ` (bounds-checked)  
- ` + "`insert`" + ` / ` + "`erase`" + ` (O(n) — shifts)  
- ` + "`reserve(n)`" + ` — preallocate capacity  
- ` + "`resize(n)`" + ` — change size (may construct defaults)  
- ` + "`clear()`" + ` — size 0; capacity may remain  

**Complexity:**
- Random access: O(1)  
- push_back: amortized O(1), worst O(n) when growing  
- insert/erase middle: O(n)`,
    realLifeAnalogy: `A resizable photo album. Pages are capacity. Photos are size. When full, you buy a bigger album (often double) and move photos over. Moving is costly, but rare if you double.`,
    stepByStep: [
      "Prefer vector over raw new[]/delete[] for sequences.",
      "Use reserve when you know approximate final size.",
      "Never hold pointers/references across unchecked reallocation.",
      "Erase carefully; consider erase-remove idiom for value removal.",
      "Pass vector<int>& to avoid copies; use const& when read-only.",
      "Know when to use array/string vs vector for interviews.",
    ],
    dryRun: {
      input: "Empty vector, push 1,2,3,4,5 with doubling growth from 1",
      steps: [
        "push 1: cap 1 size 1",
        "push 2: grow to 2, move, size 2",
        "push 3: grow to 4, size 3",
        "push 4: size 4 cap 4",
        "push 5: grow to 8, size 5",
      ],
      output: "Few grows; total move cost linear in n",
    },
    code: [
      {
        language: "cpp",
        title: "size vs capacity + reserve",
        content: `#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> v;
    v.reserve(8); // capacity at least 8, size still 0
    for (int i = 0; i < 5; i++) v.push_back(i * 10);
    cout << "size=" << v.size() << " cap=" << v.capacity() << "\\n";
    v.erase(v.begin() + 2); // remove element at index 2 (shifts)
    for (int x : v) cout << x << " ";
}`,
        explanation: "reserve avoids early reallocations; erase shifts tail elements.",
      },
      {
        language: "cpp",
        title: "Erase-remove idiom",
        content: `// Remove all 3s efficiently
void removeValue(vector<int>& v, int val) {
    v.erase(remove(v.begin(), v.end(), val), v.end());
}`,
        explanation: "remove shifts kept elements forward; erase shrinks size once.",
      },
    ],
    mermaidDiagrams: [
      {
        title: "Vector Growth",
        code: `flowchart TD
  A[push_back x] --> B{size less than capacity?}
  B -->|Yes| C[Write at v size]
  C --> D[size plus 1]
  B -->|No| E[Allocate larger capacity]
  E --> F[Move or copy old elements]
  F --> G[Deallocate old buffer]
  G --> C`,
      },
    ],
    flowchartSteps: [
      { id: "1", label: "push_back", type: "start" },
      { id: "2", label: "Capacity full?", type: "decision" },
      { id: "3", label: "Grow buffer", type: "process" },
      { id: "4", label: "Place element", type: "process" },
      { id: "5", label: "size++", type: "end" },
    ],
    memoryDiagram: `Before grow: capacity=4 size=4
[ a | b | c | d ]

After push e with double:
New capacity=8 size=5
[ a | b | c | d | e | _ | _ | _ ]
Old buffer freed.`,
    complexityAnalysis: {
      time: "Access O(1); push_back amortized O(1); insert O(n)",
      space: "O(capacity) which is Θ(size) typically within factor 2",
      best: "push_back with spare capacity O(1) worst-case that call",
      average: "amortized O(1) push_back with geometric growth",
      worst: "single push_back causing grow O(n); insert at begin O(n)",
      explanation: "Amortization averages costly grows across many cheap pushes.",
    },
    interviewPerspective: `You may be asked: “Why not always insert at front in vector?” Answer: O(n) per insert. For deque-like patterns, discuss ` + "`deque`" + ` or reverse thinking with ` + "`push_back`" + `.`,
    commonMistakes: [
      {
        mistake: "Using push_back in a loop without reserve for known size",
        fix: "reserve(n) when n known — fewer allocations.",
      },
      {
        mistake: "Storing reference to v[i] then push_back more elements",
        fix: "Reallocation invalidates references; refetch or use indices.",
      },
      {
        mistake: "Confusing resize with reserve",
        fix: "reserve changes capacity only; resize changes size and elements.",
      },
    ],
    miniQuiz: [
      {
        id: "c09-q1",
        type: "mcq",
        question: "Amortized time of push_back on vector is:",
        options: ["O(n)", "O(1)", "O(log n)", "O(n²)"],
        answer: 1,
        explanation: "Geometric growth → amortized O(1).",
      },
      {
        id: "c09-q2",
        type: "mcq",
        question: "capacity() vs size():",
        options: [
          "They are always equal",
          "capacity is allocated storage; size is live elements",
          "size is always greater than capacity",
          "capacity counts only uninitialized memory on stack",
        ],
        answer: 1,
        explanation: "capacity ≥ size always for vector.",
      },
      {
        id: "c09-q3",
        type: "truefalse",
        question: "v.reserve(100) sets size to 100.",
        answer: false,
        explanation: "reserve affects capacity, not size.",
      },
    ],
    summary: [
      "vector is a dynamic contiguous array.",
      "size vs capacity is essential.",
      "push_back amortized O(1) via growth (often doubling).",
      "Mid insert/erase still O(n).",
      "reserve when you know size; mind invalidation.",
    ],
    revisionNotes: [
      "amortized push_back",
      "reserve ≠ resize",
      "erase shifts",
      "invalidation on reallocate",
    ],
    practiceProblems: [
      {
        id: "c09-p1",
        title: "Running Capacity Trace",
        difficulty: "Easy",
        statement:
          "Starting from empty vector, push_back 1..10. Assume capacity starts 0 and doubles when full (1,2,4,8,16...). List size and capacity after each push.",
        observation: "You will see grows at 1,2,4,8.",
        thinkingQuestions: ["How many element moves total roughly?"],
        hints: ["Simulate on paper."],
        bruteForce: "Run code with capacity prints",
        optimization: "Mental model of doubling",
        dryRun: "After 5 pushes: size 5 cap 8 in this model",
        complexity: "Total construction moves O(n)",
        reflection: "When would reserve(10) help?",
        solution: `Grows when size would exceed capacity; exact sequence depends on implementation, but doubling model is the interview standard explanation.`,
        language: "cpp",
      },
      {
        id: "c09-p2",
        title: "Insert Interval-style Building",
        difficulty: "Medium",
        statement:
          "Build a vector of first n squares using reserve(n) and push_back. Then erase the element at index n/2 if n>0. State complexities.",
        observation: "Mix of growth API and erase shifting.",
        thinkingQuestions: ["What is complexity of that erase?"],
        hints: ["reserve then loop push_back."],
        bruteForce: "No reserve",
        optimization: "reserve(n)",
        dryRun: "n=5 → [0,1,4,9,16], erase index 2 → [0,1,9,16]",
        complexity: "Build O(n); erase O(n)",
        reflection: "Did you use indices safely?",
        solution: `vector<long long> squares; squares.reserve(n);
for (int i=0;i<n;i++) squares.push_back(1LL*i*i);
if(n>0) squares.erase(squares.begin()+n/2);`,
        language: "cpp",
      },
    ],
    reflectionQuestions: [
      "Explain amortized O(1) push_back to a rubber duck.",
      "When do you choose list/deque over vector?",
      "Confidence on vectors (0–100)?",
    ],
  },
];
