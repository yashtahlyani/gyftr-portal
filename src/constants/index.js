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

export const PROPERTIES = [
  "Smartbuy (HDFC)",
  "GyFTR",
  "SBI Card",
  "Indus Insta",
  "Indus Moments",
  "Expressgifts",
  "Airtel",
  "Ratna Zillion",
  "Indusind Shopplus / Xtrasmiles",
  "RBL Yescart",
  "BFL",
  "Kotak",
  "Standard Chartered",
  "Timespoint",
  "Hello BPCL",
  "AU Bank",
  "DBS",
  "Creditlink",
  "Federal Bank",
  "Dell Loyalty program",
  "Postpe",
  "IOCL Reward Program",
  "Nexus Bachat",
  "Indus Flash Sale / IndusOffer",
  "Prism Anmol Rishtey",
  "Prism Aspire",
  "Anmol Rishtey",
  "Prince Pipe",
  "Yesrewardz Flash Sale",
  "nfternr",
  "Insta benefits",
  "Indusoffer",
  "HP Pay",
  "Cera Superstar",
  "Visa Offers",
  "Wedding Box",
  "Xtra Rewards",
  "Godrej Club One",
  "Spentro",
  "Axis",
  "SimplyClick",
];

export const TEAMS           = ["Content"];
export const OWNERS          = [
  "Deepankar Hemnani",
  "Sakshi Sharma",
  "Snigdha Banerjee",
  "Vanshika Atri",
  "Bhavana Bhaskar",
  "Reet Suman",
  "Uday Jadoun",
  "Ananya Saril",
  "Saim",
];
export const BUSINESS_OWNERS = ["Deepankar Hemnani", "Anirudh Motwani"];

export const TEAM_OF = {
  "Deepankar Hemnani": "Content",
  "Sakshi Sharma":     "Content",
  "Snigdha Banerjee":  "Content",
  "Vanshika Atri":     "Content",
  "Bhavana Bhaskar":   "Content",
  "Reet Suman":        "Content",
  "Uday Jadoun":       "Content",
  "Ananya Saril":      "Content",
  "Anirudh Motwani":   "Content",
  "Saim":              "Content",
};

export const CURRENT_USER = "Deepankar Hemnani";

export const USER_BY_EMAIL = {
  "ananya.saril":    "Ananya Saril",
  "bhavana.bhaskar": "Bhavana Bhaskar",
  "reet":            "Reet Suman",
  "uday.jadoun":     "Uday Jadoun",
  "vanshika.atri":   "Vanshika Atri",
  "sakshi.s1":       "Sakshi Sharma",
  "snigdha.b":       "Snigdha Banerjee",
  "priyanshu":       "Priyanshu",
  "harshita.m":      "Harshita M",
  "saim.k":          "Saim",
};

export const TASK_TYPES = [
  "Discussion","Emailer","Sms","WhatsApp","BTF","ATF","T&C","Important Instructions",
  "Redemption Steps","Video Script","Category BTF","Homepage BTF","Occassion BTF","Banner",
  "Push Notification","Google Ads","Meta Ads","Blog","Website Content","Newsletter",
  "Pop Up","Event Content","Gamification",
];

export const PEOPLE = {
  "Deepankar Hemnani": { c:"#1F7A3D" },
  "Sakshi Sharma":     { c:"#C2185B" },
  "Snigdha Banerjee":  { c:"#0E6FA3" },
  "Vanshika Atri":     { c:"#8B5CF6" },
  "Bhavana Bhaskar":   { c:"#E05C00" },
  "Reet Suman":        { c:"#0891B2" },
  "Uday Jadoun":       { c:"#15803D" },
  "Ananya Saril":      { c:"#B01457" },
  "Anirudh Motwani":   { c:"#6D4C99" },
  "Saim":              { c:"#0369A1" },
};

export const PROP_COLOR = {
  "Smartbuy (HDFC)":   "#62A92A",
  "GyFTR":             "#2D7FF9",
  "SBI Card":          "#F5A623",
  "Indus Insta":       "#06B6D4",
  "Indus Moments":     "#E11D74",
  "Expressgifts":      "#15803D",
  "Airtel":            "#FF3B30",
  "Ratna Zillion":     "#A855F7",
  "Indusind Shopplus / Xtrasmiles": "#0EA5E9",
  "RBL Yescart":       "#84CC16",
  "BFL":               "#EF4444",
  "Kotak":             "#F59E0B",
  "Standard Chartered":"#3B82F6",
  "Timespoint":        "#EC4899",
  "Hello BPCL":        "#6366F1",
  "AU Bank":           "#14B8A6",
  "DBS":               "#F97316",
  "Creditlink":        "#22C55E",
  "Federal Bank":      "#A78BFA",
  "Dell Loyalty program": "#FB7185",
  "Postpe":            "#0891B2",
  "IOCL Reward Program":"#B45309",
  "Nexus Bachat":      "#7C3AED",
  "Indus Flash Sale / IndusOffer": "#059669",
  "Prism Anmol Rishtey": "#DC2626",
  "Prism Aspire":      "#F43F5E",
  "Anmol Rishtey":     "#D97706",
  "Prince Pipe":       "#2563EB",
  "Yesrewardz Flash Sale": "#DB2777",
  "nfternr":           "#0D9488",
  "Insta benefits":    "#EA580C",
  "Indusoffer":        "#4F46E5",
  "HP Pay":            "#16A34A",
  "Cera Superstar":    "#9333EA",
  "Visa Offers":       "#1D4ED8",
  "Wedding Box":       "#BE185D",
  "Xtra Rewards":      "#047857",
  "Godrej Club One":   "#B45309",
  "Spentro":           "#0F766E",
  "Axis":              "#B91C1C",
  "SimplyClick":       "#10B981",
};

export const TYPE_PALETTE = [
  "#62A92A","#2D7FF9","#8B5CF6","#F5A623","#06B6D4","#E11D74","#15803D","#FF8A4C",
  "#A855F7","#0EA5E9","#84CC16","#EF4444","#F59E0B","#10B981","#3B82F6","#EC4899",
  "#6366F1","#14B8A6","#F97316","#22C55E","#A78BFA","#FB7185","#0891B2",
];

export const RANGE_OPTS = [
  { k:"all", label:"All time",       days:null },
  { k:"1d",  label:"Today",          days:1    },
  { k:"1w",  label:"Last 1 week",    days:7    },
  { k:"1m",  label:"Last 1 month",   days:30   },
  { k:"3m",  label:"Last 3 months",  days:90   },
  { k:"6m",  label:"Last 6 months",  days:180  },
  { k:"1y",  label:"Last 1 year",    days:365  },
];

export const NAV = [
  { k:"dashboard", label:"Dashboard",   icon:"LayoutDashboard" },
  { k:"board",     label:"Work Board",  icon:"Table2"          },
  { k:"admin",     label:"Admin · PMO", icon:"Settings"        },
];
