/**
 * Phase 1 — C++ & DSA parallel curriculum (smart learning order)
 * Each step pairs one C++ concept with a reinforcing DSA topic.
 */

export const PHASE1_STEPS = [
  {
    step: 1,
    label: "Week 1",
    cpp: {
      id: "cpp-toolchain",
      title: "Toolchain & First Program",
      description: "Compiler setup, compilation model, iostream, cin/cout, and basic program structure.",
      learnUrl: "https://www.learncpp.com/cpp-tutorial/introduction-to-the-language/",
    },
    dsa: {
      id: "dsa-complexity",
      title: "Time & Space Complexity",
      description: "Big O notation, worst vs average case, and how to compare brute-force vs optimized approaches.",
      learnUrl: "https://neetcode.io/courses/dsa-for-beginners/0",
    },
  },
  {
    step: 2,
    label: "Week 1",
    cpp: {
      id: "cpp-types",
      title: "Variables, Types & Operators",
      description: "int, double, bool, char, arithmetic/logical operators, and implicit type conversion.",
      learnUrl: "https://www.learncpp.com/cpp-tutorial/introduction-to-objects-and-variables/",
    },
    dsa: {
      id: "dsa-arrays",
      title: "Arrays — Fundamentals",
      description: "Indexing, traversal, in-place updates, and passing arrays to functions.",
      learnUrl: "https://neetcode.io/courses/dsa-for-beginners/1",
    },
  },
  {
    step: 3,
    label: "Week 2",
    cpp: {
      id: "cpp-control-flow",
      title: "Conditionals & Branching",
      description: "if/else, else-if chains, switch statements, and short-circuit evaluation.",
      learnUrl: "https://www.learncpp.com/cpp-tutorial/if-statements/",
    },
    dsa: {
      id: "dsa-array-basics",
      title: "Array Building Blocks",
      description: "Find min/max, running totals, rotate/shift patterns, and boundary handling.",
      learnUrl: "https://neetcode.io/courses/dsa-for-beginners/2",
    },
  },
  {
    step: 4,
    label: "Week 2",
    cpp: {
      id: "cpp-loops",
      title: "Loops & Iteration",
      description: "for, while, do-while, nested loops, break/continue, and loop invariants.",
      learnUrl: "https://www.learncpp.com/cpp-tutorial/introduction-to-loops/",
    },
    dsa: {
      id: "dsa-two-pointers-intro",
      title: "Two Pointers — Introduction",
      description: "Opposite-end pointers on sorted arrays, moving toward a target sum.",
      learnUrl: "https://neetcode.io/courses/dsa-for-beginners/3",
    },
  },
  {
    step: 5,
    label: "Week 3",
    cpp: {
      id: "cpp-functions",
      title: "Functions & Scope",
      description: "Declarations, parameters, return values, local vs global scope, and stack frames.",
      learnUrl: "https://www.learncpp.com/cpp-tutorial/introduction-to-functions/",
    },
    dsa: {
      id: "dsa-two-pointers-pairs",
      title: "Two Pointers — Pairs & Dedup",
      description: "3Sum pattern, removing duplicates in-place, and partition-style scans.",
      learnUrl: "https://neetcode.io/courses/dsa-for-beginners/4",
    },
  },
  {
    step: 6,
    label: "Week 3",
    cpp: {
      id: "cpp-pointers",
      title: "Pointers & References",
      description: "Address-of, dereference, nullptr, references vs pointers, and pass-by-reference.",
      learnUrl: "https://www.learncpp.com/cpp-tutorial/introduction-to-pointers/",
    },
    dsa: {
      id: "dsa-strings-basics",
      title: "Strings — Fundamentals",
      description: "Immutable vs mutable strings, indexing, slicing logic, and character frequency.",
      learnUrl: "https://neetcode.io/courses/dsa-for-beginners/5",
    },
  },
  {
    step: 7,
    label: "Week 4",
    cpp: {
      id: "cpp-std-string",
      title: "std::string Deep Dive",
      description: "size, push_back, substr, find, compare, and common string idioms in C++.",
      learnUrl: "https://www.learncpp.com/cpp-tutorial/introduction-to-stdstring/",
    },
    dsa: {
      id: "dsa-string-patterns",
      title: "String Patterns",
      description: "Valid palindrome, anagram grouping, and two-pointer checks on strings.",
      learnUrl: "https://neetcode.io/courses/dsa-for-beginners/6",
    },
  },
  {
    step: 8,
    label: "Week 4",
    cpp: {
      id: "cpp-vector",
      title: "std::vector Mastery",
      description: "Dynamic sizing, push_back/pop_back, reserve, iteration, and erase patterns.",
      learnUrl: "https://www.learncpp.com/cpp-tutorial/an-introduction-to-stdvector/",
    },
    dsa: {
      id: "dsa-hashing-intro",
      title: "Hashing — Core Idea",
      description: "Key-value intuition, collision awareness, and when O(1) lookup changes everything.",
      learnUrl: "https://neetcode.io/courses/dsa-for-beginners/7",
    },
  },
  {
    step: 9,
    label: "Week 5",
    cpp: {
      id: "cpp-hash-containers",
      title: "unordered_map & unordered_set",
      description: "Insert, find, count, iterate, and choosing the right associative container.",
      learnUrl: "https://www.learncpp.com/cpp-tutorial/introduction-to-stdmap/",
    },
    dsa: {
      id: "dsa-hash-problems",
      title: "Hash Map Problems",
      description: "Two Sum, frequency maps, and grouping with hash keys.",
      learnUrl: "https://neetcode.io/courses/dsa-for-beginners/8",
    },
  },
  {
    step: 10,
    label: "Week 5",
    cpp: {
      id: "cpp-sorting",
      title: "Sorting & Comparators",
      description: "std::sort, stable_sort, custom comparators, and lambda expressions.",
      learnUrl: "https://en.cppreference.com/w/cpp/algorithm/sort",
    },
    dsa: {
      id: "dsa-sorting-apps",
      title: "Sorting Applications",
      description: "Sort + scan patterns, custom ordering, and interval merging prep.",
      learnUrl: "https://neetcode.io/courses/dsa-for-beginners/9",
    },
  },
  {
    step: 11,
    label: "Week 6",
    cpp: {
      id: "cpp-stack-queue",
      title: "stack & queue Containers",
      description: "LIFO/FIFO semantics, push/pop, front/back access, and adapter containers.",
      learnUrl: "https://en.cppreference.com/w/cpp/container/stack",
    },
    dsa: {
      id: "dsa-stack",
      title: "Stack Problems",
      description: "Valid parentheses, monotonic stack intuition, and undo-style simulations.",
      learnUrl: "https://neetcode.io/courses/dsa-for-beginners/10",
    },
  },
  {
    step: 12,
    label: "Week 6",
    cpp: {
      id: "cpp-pair-tuple",
      title: "pair, tuple & Structured Bindings",
      description: "Store heterogeneous data, return multiple values, and unpack with auto.",
      learnUrl: "https://en.cppreference.com/w/cpp/utility/pair",
    },
    dsa: {
      id: "dsa-sliding-window-fixed",
      title: "Sliding Window — Fixed Size",
      description: "Window sum, max in window, and template for k-sized subarrays.",
      learnUrl: "https://neetcode.io/courses/dsa-for-beginners/11",
    },
  },
  {
    step: 13,
    label: "Week 7",
    cpp: {
      id: "cpp-auto-const",
      title: "auto, const & Range-Based For",
      description: "Type inference, const correctness, and clean iteration over containers.",
      learnUrl: "https://www.learncpp.com/cpp-tutorial/the-auto-keyword/",
    },
    dsa: {
      id: "dsa-sliding-window-variable",
      title: "Sliding Window — Variable Size",
      description: "Longest substring without repeat, minimum window, and shrink/expand logic.",
      learnUrl: "https://neetcode.io/courses/dsa-for-beginners/12",
    },
  },
  {
    step: 14,
    label: "Week 7",
    cpp: {
      id: "cpp-structs-classes",
      title: "Structs & Class Basics",
      description: "Define custom types, member functions, constructors, and encapsulation intro.",
      learnUrl: "https://www.learncpp.com/cpp-tutorial/introduction-to-structs-members-and-member-selection/",
    },
    dsa: {
      id: "dsa-prefix-sum",
      title: "Prefix Sum & Difference Arrays",
      description: "Range queries in O(1), subarray sum patterns, and cumulative arrays.",
      learnUrl: "https://neetcode.io/courses/dsa-for-beginners/13",
    },
  },
  {
    step: 15,
    label: "Week 8",
    cpp: {
      id: "cpp-recursion",
      title: "Recursion in C++",
      description: "Base cases, recursive calls, call stack depth, and tail-recursion awareness.",
      learnUrl: "https://www.learncpp.com/cpp-tutorial/recursion/",
    },
    dsa: {
      id: "dsa-recursion",
      title: "Recursion Fundamentals",
      description: "Fibonacci, tree height, backtracking intro, and recursion vs iteration trade-offs.",
      learnUrl: "https://neetcode.io/courses/dsa-for-beginners/14",
    },
  },
  {
    step: 16,
    label: "Week 8",
    cpp: {
      id: "cpp-debugging",
      title: "Debugging & Competitive I/O",
      description: "GDB basics, assertions, fast I/O (sync_with_stdio), and common compile errors.",
      learnUrl: "https://www.learncpp.com/cpp-tutorial/introduction-to-programming-debugging/",
    },
    dsa: {
      id: "dsa-framework",
      title: "Problem-Solving Framework",
      description: "Parse constraints, choose pattern, code cleanly, test edge cases, and iterate.",
      learnUrl: "https://neetcode.io/courses/dsa-for-beginners/15",
    },
  },
];