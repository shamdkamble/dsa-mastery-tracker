export const USER_PROFILE = {
  name: "Sham Kamble",
  experience: "3 Years Software Engineer",
  language: "C++",
  dreamCompanies: ["Google", "Microsoft", "Amazon", "Meta"] as const,
  dreamPackage: "₹20+ LPA",
  currentMission: "WIN AUGUST",
  currentGoal: "Become Google Software Engineer",
  targetSalary: "₹20 LPA+",
} as const;

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/mission", label: "Today's Mission", icon: "Target" },
  { href: "/roadmap", label: "Weekly Roadmap", icon: "Map" },
  { href: "/textbook", label: "Interactive Textbook", icon: "BookOpen" },
  { href: "/playground", label: "Visual Playground", icon: "Sparkles" },
  { href: "/problems", label: "Problem Solving", icon: "Code2" },
  { href: "/practice", label: "Practice", icon: "Dumbbell" },
  { href: "/revision", label: "Revision", icon: "RefreshCw" },
  { href: "/journal", label: "Journal", icon: "NotebookPen" },
  { href: "/mistakes", label: "Mistake Notebook", icon: "AlertTriangle" },
  { href: "/achievements", label: "Achievements", icon: "Trophy" },
  { href: "/settings", label: "Settings", icon: "Settings" },
] as const;
