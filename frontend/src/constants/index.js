/* ─── constants/index.js ─── */
export const STATUS = {
  "Discussion":          { bg:"#D6F4F7", fg:"#067A8C", dot:"#06B6D4", group:"active" },
  "Execution":           { bg:"#EFE7FF", fg:"#6A3BD1", dot:"#8B5CF6", group:"active" },
  "Review":              { bg:"#FFEFD6", fg:"#9A5B00", dot:"#F5A623", group:"active" },
  "Hold Due To Clarity": { bg:"#FBE0EC", fg:"#B01457", dot:"#E11D74", group:"hold"   },
  "Deferred":            { bg:"#ECEAE3", fg:"#605E55", dot:"#94918A", group:"hold"   },
  "Completed":           { bg:"#CDEBD6", fg:"#0F6B33", dot:"#15803D", group:"done"   },
};
export const STATUS_LIST         = Object.keys(STATUS);
export const EFFORT_STATUS_LIST  = STATUS_LIST;
export const PROJECT_STATUS_LIST = STATUS_LIST;

export const PRIORITY = {
  High:   { bg:"#EDE4FF", fg:"#5B21B6", dot:"#7C3AED", rank:3 },
  Medium: { bg:"#DBEAFE", fg:"#1D4ED8", dot:"#2563EB", rank:2 },
  Low:    { bg:"#E0F2FE", fg:"#0369A1", dot:"#38BDF8", rank:1 },
};
export const PRIORITY_LIST = ["High","Medium","Low"];


// People — team members, their team, role and avatar colour — are NOT defined
// here. They come from the `users` table via /api/users; see lib/directory.js.
// Use useDirectory() in components, or userByName()/colorOfName() elsewhere.



export const CREATIVE_TASK_TYPES = [
  "Emailer",
  "WhatsApp Creative",
  "Banner",
  "Social Post",
  "Brand Creative",
  "AV",
  "Blog Creative",
  "1 Page Website",
  "2 Page Website",
  "Full Website",
  "Website Page Creation",
  "Logo Resize",
  "Special Project",
  "App Journey UI",
  "Newsletter",
  "Push Notification",
  "Google Ad",
  "Google Merchant Center",
  "Figma Journey",
  "PN",
  "Gamification",
];

export const TASK_TYPES = [
  "Discussion","Emailer","Sms","WhatsApp","BTF","ATF","T&C","Important Instructions",
  "Redemption Steps","Video Script","Category BTF","Homepage BTF","Occassion BTF","Banner",
  "Push Notification","Google Ads","Meta Ads","Blog","Website Content","Newsletter",
  "Pop Up","Event Content","Gamification",
  "Creative/Design Task","Reel/Video Task","Vetting/Editing",
  "Research","Off-Page Posting","SEO Activity","Blog/BTF Structures",
];


export const TYPE_PALETTE = [
  "#62A92A","#2D7FF9","#8B5CF6","#F5A623","#06B6D4","#E11D74","#15803D","#FF8A4C",
  "#A855F7","#0EA5E9","#84CC16","#EF4444","#F59E0B","#10B981","#3B82F6","#EC4899",
  "#6366F1","#14B8A6","#F97316","#22C55E","#A78BFA","#FB7185","#0891B2",
  "#D81B60","#558B2F","#1A237E",
];

export const RANGE_OPTS = [
  { k:"all",       label:"All time",       days:null },
  { k:"yesterday", label:"Yesterday",      days:null },
  { k:"1d",        label:"Today",          days:1    },
  { k:"1w",        label:"Last 1 week",    days:7    },
  { k:"1m",        label:"Last 1 month",   days:30   },
  { k:"3m",        label:"Last 3 months",  days:90   },
  { k:"6m",        label:"Last 6 months",  days:180  },
  { k:"1y",        label:"Last 1 year",    days:365  },
  { k:"custom",    label:"Custom range…",  days:null },
];

export const NAV = [
  { k:"dashboard", label:"Dashboard",   icon:"LayoutDashboard" },
  { k:"board",     label:"Work Board",  icon:"Table2"          },
  { k:"admin",     label:"Admin · PMO", icon:"Settings"        },
];
