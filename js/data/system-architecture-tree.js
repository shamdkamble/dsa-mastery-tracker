/**
 * Static system architecture map — human-readable labels, flows, and diagrams.
 * Live metrics are merged at render time from /api/auth/admin/system-architecture.
 */

export const ARCHITECTURE_DOMAINS = [
  {
    id: "platform",
    icon: "layers",
    accent: "accent",
    title: "Platform & Hosting",
    tag: "Infrastructure",
    summary: "Vercel serverless API, static PWA shell, MongoDB Atlas persistence",
    description:
      "DSAMantra ships as a installable Progressive Web App. The browser loads a hash-routed single-page application from Vercel's CDN. All authenticated data and AI calls go through a Node/Express API (serverless on Vercel, local Express in dev). Persistent state lives in MongoDB Atlas.",
    flow: [
      "User opens PWA → Service Worker precaches shell assets",
      "Client calls /api/* → Vercel rewrites to serverless handler",
      "API connects MongoDB Atlas → reads/writes domain collections",
      "AI requests stay server-side — API keys never reach the browser",
    ],
    diagram: `flowchart LR
  subgraph clientLane [Learner device]
    PWA[PWA shell and Service Worker]
    SPA[Hash router SPA]
  end
  subgraph vercelLane [Vercel edge]
    CDN[Static CDN]
    API[Express API layer]
    CRON[Cron trigger]
  end
  subgraph cloudLane [Managed services]
    MDB[(MongoDB Atlas)]
    GEM[Gemini API]
    GRQ[Groq API]
  end
  PWA --> CDN
  SPA --> API
  CRON --> API
  API --> MDB
  API --> GEM
  API --> GRQ`,
    children: [
      {
        id: "pwa-shell",
        icon: "download",
        accent: "info",
        title: "Offline-ready PWA shell",
        tag: "Client cache",
        summary: "Service worker precaches HTML, CSS, JS; push events handled in background",
        description:
          "The service worker version-bumps on each release (CACHE_VERSION). Static assets are cached; API responses are network-first. Push notifications are received even when the tab is closed.",
        flow: [
          "App install → register service worker",
          "Precache index, CSS bundles, icons, manifest",
          "push event → show notification + deep link into roadmap",
        ],
        diagram: `flowchart TB
  SW[Service Worker] --> PC[Precache static shell]
  SW --> PU[Push notification handler]
  PU --> DL[Deep link to roadmap topic]`,
      },
      {
        id: "vercel-deploy",
        icon: "zap",
        accent: "accent",
        title: "Vercel deployment",
        tag: "Hosting",
        summary: "Serverless API with 5-minute timeout for AI lesson generation",
        description:
          "Production runs as a Vercel serverless function. Static files are served from the CDN. Cron invokes the push-reminders endpoint with CRON_SECRET bearer auth.",
        flow: [
          "git push → Vercel build & deploy",
          "/api/* rewrite → api/index.js handler",
          "Cron schedule 03:30 UTC → hourly reminder + wisdom batch",
        ],
        diagram: `flowchart LR
  GIT[GitHub main branch] --> VER[Vercel deploy]
  VER --> CDN2[CDN static assets]
  VER --> FN[Serverless API handler]
  CRON2[Cron job daily] --> FN`,
      },
    ],
  },
  {
    id: "client-app",
    icon: "grid",
    accent: "info",
    title: "Client Application",
    tag: "SPA",
    summary: "Hash router, page modules, global shell, local IndexedDB mirror",
    description:
      "The front end is vanilla ES modules — no React. Each route maps to a page module (dashboard, roadmap, problems, etc.). Shared chrome includes sidebar, navbar with notification bell, and modals for problems, teach, and recommendations.",
    flow: [
      "main.js bootstraps theme, router, auth guard, PWA, push",
      "Route change → page.render() injects HTML into #page-content",
      "Page onMount() wires event handlers and fetches server data",
      "IndexedDB mirrors problems, settings, mission for fast UX + export",
    ],
    diagram: `flowchart TB
  MAIN["App bootstrap"] --> RTR["Hash router"]
  RTR --> PAGES["Page modules"]
  PAGES --> UI["Navbar · Sidebar · Modals"]
  MAIN --> IDB[("IndexedDB mirror")]
  MAIN --> APIc["Auth API client"]`,
    children: [
      {
        id: "routing",
        icon: "gitBranch",
        accent: "info",
        title: "Navigation & route guards",
        tag: "Access",
        summary: "Public, pending-user, learner, and admin-only routes",
        description:
          "Unauthenticated users see login/register. Pending accounts are limited to dashboard and settings until an admin approves. Admin routes (user management, push log, this architecture page) require role=admin.",
        flow: [
          "enforceRouteAccess() on every navigation",
          "PUBLIC: login, register",
          "PENDING: dashboard, settings only",
          "ADMIN: admin, admin-push-logs, admin-notifications",
        ],
        diagram: `flowchart TD
  NAV["Navigate #/path"] --> GUARD{"Auth guard"}
  GUARD -->|no session| LOGIN["#/login"]
  GUARD -->|pending| DASH["#/dashboard"]
  GUARD -->|non-admin + admin route| DASH
  GUARD -->|ok| PAGE["Render page module"]`,
      },
      {
        id: "learner-pages",
        icon: "dashboard",
        accent: "success",
        title: "Learner experience pages",
        tag: "Product",
        summary: "Dashboard, mission, problems, patterns, roadmap, analytics, calendar, search, settings",
        description:
          "Each page reads from local storage and optionally syncs with the server. Roadmap opens AI teach modals. Problems integrates LeetCode import and premium AI assists. Settings hosts profile, subscription, appearance, notification prefs, and data export.",
        flow: [
          "Dashboard — streak, activity preview, quick stats",
          "Roadmap — phased topic grid, teach modal, progress checkmarks",
          "Problems — solve tracking, pattern tags, spaced repetition hints",
          "Settings/notifications — push subscribe, preference toggles",
        ],
        diagram: `flowchart LR
  D["Dashboard"] --> M["Mission"]
  M --> P["Problems"]
  P --> RM["Roadmap"]
  RM --> AN["Analytics"]
  AN --> SET["Settings"]`,
      },
    ],
  },
  {
    id: "identity",
    icon: "shield",
    accent: "warning",
    title: "Identity & Access Control",
    tag: "Security",
    summary: "Registration, admin approval, JWT sessions, subscription tiers",
    description:
      "New sign-ups enter a pending state until an administrator approves, rejects, or suspends them. Approved users receive an access level (standard, trial, premium) that gates roadmap topics, AI lessons, and problem AI features.",
    flow: [
      "POST /api/auth/register → user status=pending",
      "Admin approves → access level + expiry set + access notification",
      "POST /api/auth/login → JWT stored client-side",
      "GET /api/auth/me → hydrates session on each app load",
    ],
    diagram: `flowchart TB
  REG["Register"] --> PEND["Pending queue"]
  PEND --> ADM{"Admin action"}
  ADM -->|approve| APP["Approved + tier"]
  ADM -->|reject/suspend| BLOCK["Blocked"]
  APP --> JWT["JWT session"]
  JWT --> GATE["Roadmap & AI gates"]`,
    children: [
      {
        id: "access-tiers",
        icon: "user",
        accent: "violet",
        title: "Subscription tiers & roadmap gates",
        tag: "Monetization",
        summary: "Standard free topics, trial Phase 1, premium full roadmap + problem AI",
        description:
          "Standard users get two free topics. Trial unlocks all Phase 1 lessons (simpler variant only through Step 2). Premium and admins get the full roadmap, simpler lessons everywhere, and AI pattern/complexity tools.",
        flow: [
          "canAccessTeachTopic() — server enforces on POST /api/teach",
          "canAccessCachedLessonById() — GET cached lessons",
          "canAccessProblemAi() — premium/admin only",
        ],
        diagram: `flowchart LR
  STD["Standard"] --> T2["2 free topics"]
  TRI["Trial"] --> P1["Phase 1 all topics"]
  PRE["Premium"] --> ALL["Full roadmap + AI"]
  ADM2["Admin"] --> ALL`,
      },
    ],
  },
  {
    id: "roadmap-ai",
    icon: "topics",
    accent: "violet",
    title: "Roadmap & AI Lessons",
    tag: "Learning",
    summary: "FAANG-style phased curriculum with cached Gemini/Groq-generated lessons",
    description:
      "Topics are defined in the roadmap catalog (phases, steps, difficulty). When a learner opens Teach, the server checks MongoDB for a complete cached lesson; otherwise it generates one via the AI provider layer, validates structure (four required sections + C++ code), and stores standard and optional simpler variants.",
    flow: [
      "Learner opens topic → POST /api/teach { topic, variant }",
      "Server checks access tier → lesson store lookup",
      "Cache miss → AI generates 4-section markdown lesson",
      "Saved to lessons collection → returned to teach modal",
      "POST /api/roadmap/progress/complete marks topic done",
    ],
    diagram: `flowchart TB
  TOPIC["Roadmap topic"] --> ACCESS{"Tier allowed?"}
  ACCESS -->|no| LOCK["403 locked"]
  ACCESS -->|yes| CACHE{"Cached lesson?"}
  CACHE -->|yes| SHOW["Return markdown"]
  CACHE -->|no| AI["AI provider: Gemini → Groq"]
  AI --> VAL["Validate 4 sections + C++"]
  VAL --> SAVE[("lessons collection")]
  SAVE --> SHOW`,
    children: [
      {
        id: "lesson-cache",
        icon: "database",
        accent: "violet",
        title: "Lesson cache & progress",
        tag: "Persistence",
        summary: "Per-topic standard/simpler variants; per-user completed topic IDs",
        description:
          "Lessons are shared across users (topic-keyed). Roadmap progress is per-user in roadmap_progress. Client mirrors progress for instant UI updates then syncs via API.",
        flow: [
          "getOrCreateStandardLesson(topic) — generate once, reuse",
          "getOrCreateSimplerLesson(topic) — rewrites standard in simpler words",
          "markTopicComplete(userId, topicId) — drives learning anchor",
        ],
        diagram: `flowchart LR
  L[("lessons")] -->|shared| TOP["All users"]
  RP[("roadmap_progress")] -->|per user| ANCHOR["Learning anchor"]`,
      },
    ],
  },
  {
    id: "ai-layer",
    icon: "zap",
    accent: "accent",
    title: "AI Provider Layer",
    tag: "Intelligence",
    summary: "Gemini-primary with Groq fallback; Groq-primary for Mantra hooks",
    description:
      "All API keys stay on the server. The AI provider router tries Gemini models in order for lessons and problem assists; on failure it falls back to Groq. Mantra Feed hook batching inverts that order (Groq first, Gemini on admin approval). Future notification copy will use Groq-primary routing.",
    flow: [
      "generateWithGeminiPrimary() — lessons, problem AI, generateContent",
      "generateWithGroqPrimary() — reserved for small/notification tasks",
      "Hook batch — Groq 18 topics/call, 15s cooldown, Gemini fallback prompt",
    ],
    diagram: `flowchart TB
  subgraph GeminiPrimary["Gemini-primary paths"]
    LSN["AI lessons"]
    PAT["Pattern detect"]
    CMP["Complexity analysis"]
  end
  subgraph GroqPrimary["Groq-primary paths"]
    HK["Mantra Feed hooks"]
    FUT["Future notification AI"]
  end
  LSN --> G1["Gemini models"]
  G1 -->|fail| GQ1["Groq fallback"]
  HK --> GQ2["Groq"]
  GQ2 -->|admin approves| G2["Gemini fallback"]`,
    children: [
      {
        id: "problem-ai",
        icon: "problems",
        accent: "success",
        title: "Problem intelligence (Premium)",
        tag: "DSA assist",
        summary: "Pattern detection from catalog + Big-O analysis from solution code",
        description:
          "Premium users can auto-detect the primary algorithmic pattern from a problem title/tags and analyze time/space complexity from submitted code. Responses are strict JSON validated server-side.",
        flow: [
          "POST /api/problem/detect-pattern",
          "POST /api/problem/analyze-complexity",
          "AI returns JSON → normalized pattern name from catalog",
        ],
        diagram: `flowchart LR
  PROB["Problem modal"] --> DET["Pattern detection"]
  PROB --> BIGO["Complexity analysis"]
  DET --> JSON1["JSON primary pattern"]
  BIGO --> JSON2["JSON time/space O()"]`,
      },
    ],
  },
  {
    id: "problems",
    icon: "problems",
    accent: "success",
    title: "Problem Tracker",
    tag: "Practice",
    summary: "MongoDB-backed problem log with LeetCode import and activity feed",
    description:
      "Users track solved problems with difficulty, pattern, notes, and review dates. Data syncs to the server per user. LeetCode URLs are resolved via a server proxy to avoid CORS. Local IndexedDB enables offline-first UX with migration upload.",
    flow: [
      "POST /api/problems — create/update user problem",
      "GET /api/leetcode/problem?slug= — metadata import",
      "POST /api/activities — log solve events for dashboard",
      "GET/PATCH /api/user-data — bulk sync from client export format",
    ],
    diagram: `flowchart TB
  MODAL["Problem modal"] --> APIp["Problems API"]
  APIp --> MONGO[("problems collection")]
  LC["LeetCode URL"] --> PROXY["Server LeetCode proxy"]
  PROXY --> MODAL
  ACT["Activity logger"] --> ACTdb[("activities")]`,
  },
  {
    id: "daily-wisdom",
    icon: "flame",
    accent: "violet",
    title: "Daily Wisdom & Mantra Feed",
    tag: "Engagement",
    summary: "Shared hook pool, per-user personalization, deduplicated delivery",
    description:
      "Mantra Feed stores 5 hook styles per roadmap topic (shared, no names). At send time the system picks the learner's next incomplete topic (learning anchor), selects an unseen hook, personalizes copy with name/streak/progress, and delivers via in-app notification + Web Push.",
    flow: [
      "Admin generates hooks — Groq batches of 18 topics",
      "Cron 9 AM user timezone — learning-wisdom-daily pipeline",
      "pickNextFactForUser → personalizeLearningFactMessage",
      "createUserNotification + sendPushToUser + recordUserFactDelivery",
    ],
    diagram: `flowchart TB
  MF[("Mantra Feed hooks")] --> ANCH["Learning anchor\nnext incomplete topic"]
  ANCH --> PICK["Pick unseen hook"]
  CTX["Wisdom context\nstreak · tone · progress"] --> PERS["Personalize copy"]
  PICK --> PERS
  PERS --> INAPP["In-app notification"]
  PERS --> PUSH["Web Push"]
  PERS --> DEDUP[("user_fact_deliveries")]`,
    children: [
      {
        id: "admin-wisdom",
        icon: "settings",
        accent: "accent",
        title: "Daily Wisdom admin console",
        tag: "Admin",
        summary: "Generate hooks, run cron manually, test delivery, audit logs",
        description:
          "The Push Log admin page embeds the Daily Wisdom console: pool coverage metrics, batch generation with progress UI, send test to self or a student, seed pilot data, and full push delivery log table.",
        flow: [
          "GET dashboard — pool %, 30-day delivery stats, activity",
          "POST generate-batch — Groq loops with cooldown",
          "POST cron/daily-wisdom — manual run",
          "POST deliver — test push to user",
        ],
        diagram: `flowchart LR
  ADM["Admin console"] --> GEN["Batch hook generation"]
  ADM --> CRONM["Manual cron"]
  ADM --> TEST["Test delivery"]
  ADM --> LOG["Push delivery log"]`,
      },
    ],
  },
  {
    id: "notifications",
    icon: "bell",
    accent: "info",
    title: "Notifications & Web Push",
    tag: "Delivery",
    summary: "In-app bell, VAPID push, preferences, full delivery audit trail",
    description:
      "Every notification creates an in-app record (navbar bell). Web Push uses VAPID keys and per-device subscriptions. Delivery attempts are logged with source tags: learning-fact, reminder, access, test, redelivery.",
    flow: [
      "Trigger fires → createUserNotification()",
      "sendPushToUser() if preferences allow + subscription exists",
      "createPushDeliveryLog() — sent / failed / skipped",
      "Client polls notifications + service worker handles push click",
    ],
    diagram: `flowchart TB
  subgraph Triggers
    CR["Cron schedules"]
    ACC["Access events"]
    ADM3["Admin test"]
    RED["Login redelivery"]
  end
  Triggers --> ORCH["Orchestration layer"]
  ORCH --> INAPP2[("user_notifications")]
  ORCH --> VAPID["VAPID Web Push"]
  VAPID --> LOGS[("push_delivery_logs")]
  INAPP2 --> BELL["Navbar bell UI"]`,
    children: [
      {
        id: "reminder-types",
        icon: "clock",
        accent: "warning",
        title: "Study reminder schedules",
        tag: "Cron",
        summary: "Mission, review-due, streak-risk, weekly summary — per user timezone",
        description:
          "The cron job evaluates each user's timezone. Reminders fire at 9 AM (mission + reviews), 8 PM (streak risk), and Sunday 6 PM (weekly summary). PushReminderLog prevents duplicate sends per day per type.",
        flow: [
          "runScheduledPushReminders() each cron tick",
          "computeStudySnapshot() — mission, reviews, streak",
          "Check notification_preferences + PushReminderLog dedup",
          "sendPushToUser(source: reminder)",
        ],
        diagram: `flowchart LR
  TZ["User timezone"] --> DUE{"Due now?"}
  DUE -->|9 AM| MIS["Daily mission"]
  DUE -->|9 AM| REV["Review due"]
  DUE -->|8 PM| STR["Streak risk"]
  DUE -->|Sun 6 PM| WK["Weekly summary"]`,
      },
      {
        id: "access-notify",
        icon: "shield",
        accent: "warning",
        title: "Access & redelivery notifications",
        tag: "Lifecycle",
        summary: "Approval/reject/suspend alerts with login catch-up push",
        description:
          "When an admin changes account status, an in-app notification is always created. Push sends immediately if subscribed; otherwise deliverUndeliveredAccessPushes retries on next login.",
        flow: [
          "adminUserAction → notifyAccess* helpers",
          "createUserNotification + deliverPushForNotification",
          "Login → POST /api/push/deliver-unread",
        ],
        diagram: `flowchart LR
  ADMIN["Admin action"] --> N1["In-app notify"]
  N1 --> P1["Push now?"]
  P1 -->|missed| LOGIN["Retry on login"]`,
      },
    ],
  },
  {
    id: "automation",
    icon: "repeat",
    accent: "warning",
    title: "Scheduled Automation",
    tag: "Cron",
    summary: "Single Vercel cron entry orchestrates reminders and Daily Wisdom",
    description:
      "Vercel cron hits /api/cron/push-reminders daily (configured 03:30 UTC). The handler runs study reminders and Daily Wisdom delivery in parallel, each respecting per-user timezones and preference gates.",
    flow: [
      "Authorization: Bearer CRON_SECRET",
      "runScheduledPushReminders() + runDailyWisdomDelivery()",
      "Returns per-job sent/checked/skipped counts",
      "Admin can manually trigger via Daily Wisdom console",
    ],
    diagram: `flowchart TB
  VC["Vercel Cron"] --> EP["/api/cron/push-reminders"]
  EP --> REM["Study reminders"]
  EP --> WIS["Daily Wisdom"]
  REM --> USERS["All approved users"]
  WIS --> USERS`,
  },
  {
    id: "data-layer",
    icon: "database",
    accent: "store",
    title: "Data Layer (MongoDB Atlas)",
    tag: "Storage",
    summary: "Eleven domain collections powering auth, learning, problems, and notifications",
    description:
      "MongoDB is the single source of truth for multi-device sync. Client IndexedDB is a performance cache and export source, migrated to the server via /api/user-data/migrate.",
    flow: [
      "connectDB() on every API request (except health/LeetCode)",
      "Mongoose models enforce schemas",
      "Admin stats aggregate across collections at render time",
    ],
    diagram: `flowchart TB
  API2["Express API"] --> MONGO2[("MongoDB Atlas")]
  subgraph Collections
    U["users"]
    L2["lessons"]
    PR["problems"]
    RP2["roadmap_progress"]
    UN["user_notifications"]
    PS["push_subscriptions"]
    PDL["push_delivery_logs"]
    NP["notification_preferences"]
    PRL["push_reminder_logs"]
    TLF["topic_learning_facts"]
    UFD["user_fact_deliveries"]
  end
  MONGO2 --> Collections`,
    children: [
      {
        id: "collections-detail",
        icon: "database",
        accent: "store",
        title: "Collection reference",
        tag: "Schema",
        summary: "What each collection stores",
        description: "Domain-prefixed names reflect bounded contexts. Push delivery logs are the audit source of truth for admin dashboards.",
        collections: [
          { name: "users", desc: "Accounts, roles, access levels, approval status, expiry" },
          { name: "lessons", desc: "AI-generated standard & simpler markdown per topicId" },
          { name: "roadmap_progress", desc: "completedTopicIds per user — drives learning anchor" },
          { name: "problems", desc: "Per-user solved problem records, patterns, review dates" },
          { name: "activities", desc: "Solve/event feed for dashboard recent activity" },
          { name: "user_notifications", desc: "In-app bell items with href deep links" },
          { name: "push_subscriptions", desc: "Web Push endpoints per device" },
          { name: "push_delivery_logs", desc: "Full push audit — status, source, error" },
          { name: "notification_preferences", desc: "dailyWisdom, reminders, timezone" },
          { name: "push_reminder_logs", desc: "Daily dedup for cron types incl. daily-wisdom" },
          { name: "topic_learning_facts", desc: "Mantra Feed — shared hooks per topic" },
          { name: "user_fact_deliveries", desc: "Which hooks each user already received" },
        ],
      },
    ],
  },
  {
    id: "admin",
    icon: "shield",
    accent: "accent",
    title: "Admin Control Center",
    tag: "Operations",
    summary: "User lifecycle, Daily Wisdom ops, push audit, this architecture map",
    description:
      "Administrators land on User Management by default. Quick cards link to the Push Log / Daily Wisdom console and this live architecture reference. All admin APIs require JWT with role=admin.",
    flow: [
      "#/admin — pending queue, approve/reject/suspend, tier patches",
      "#/admin-push-logs — wisdom console + delivery log table",
      "#/admin-notifications — system architecture (this page)",
    ],
    diagram: `flowchart LR
  ADMUI["Admin UI"] --> USR["User management API"]
  ADMUI --> DW["Daily Wisdom API"]
  ADMUI --> LOG2["Push logs API"]
  ADMUI --> ARCH["Architecture snapshot API"]`,
  },
];