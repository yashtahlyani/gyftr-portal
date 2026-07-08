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

const _STATIC_PROPERTIES = [
  "Smartbuy (HDFC)",
  "HDFC Bank Millennia/Rewards",
  "GyFTR",
  "EDGE REWARDS (Axis)",
  "Standard Chartered",
  "SBI Card",
  "YONO SBI",
  "SBI SimplyCLICK",
  "Indus Moments/IndusInd Insta Vouchers",
  "IndusInd Shopplus/Xtrasmiles",
  "Indus Flash Sale / IndusIndOffer",
  "Yescart",
  "Yesrewardz",
  "HP Pay",
  "IRCTC",
  "Prism Anmol Rishtey",
  "Prism Aspire",
  "RBL",
  "RBL BANK MY SHOP",
  "BFL",
  "Kotak",
  "DBS",
  "Federal",
  "IDFC",
  "HSBC/Insta benefits",
  "Timespoint",
  "AU Rewardz",
  "AU Click2Gift",
  "Prince Pipe",
  "Airtel Ratna",
  "Zillion",
  "BPCL Smartfleet",
  "BPCL MAK",
  "HP Drive Track Plus",
  "Creditlink",
  "Dell Loyalty program",
  "Postpe",
  "IOCL Xtra Rewards",
  "Reward Program",
  "Nexus Bachat",
  "Expressgifts",
  "NFTERNR",
  "Cera Superstar",
  "Wonder Cement",
  "Bosch",
  "JK Paper",
  "JK Cement",
  "Sintex",
  "FINOLEX BANNER",
  "Visa Offers",
  "Wedding Box",
  "Godrej Club One",
  "Amex",
  "Himalya Sanjeevani",
  "VARROC",
  "Spentro",
  "Perfetti Van Melle",
  "LUMINOUS",
  "MuffinPay",
  "Muffin Green Finance",
  "LKP Finance Ltd",
  "HP Lubricant",
];

const _customProps = (() => {
  try { return JSON.parse(localStorage.getItem("gyftr_custom_props") || "[]"); }
  catch { return []; }
})();

export const PROPERTIES = [
  ..._STATIC_PROPERTIES,
  ..._customProps.filter(p => !_STATIC_PROPERTIES.includes(p)),
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
  "Creative/Design Task","Reel/Video Task","Vetting/Editing",
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
  "Smartbuy (HDFC)":                       "#62A92A",
  "HDFC Bank Millennia/Rewards":           "#0277BD",
  "GyFTR":                                 "#2D7FF9",
  "EDGE REWARDS (Axis)":                   "#B91C1C",
  "Standard Chartered":                    "#3B82F6",
  "SBI Card":                              "#F5A623",
  "YONO SBI":                              "#00838F",
  "SBI SimplyCLICK":                       "#00695C",
  "Indus Moments/IndusInd Insta Vouchers": "#E11D74",
  "IndusInd Shopplus/Xtrasmiles":          "#0EA5E9",
  "Indus Flash Sale / IndusIndOffer":      "#059669",
  "Yescart":                               "#65A30D",
  "Yesrewardz":                            "#DB2777",
  "HP Pay":                                "#16A34A",
  "IRCTC":                                 "#AD1457",
  "Prism Anmol Rishtey":                   "#DC2626",
  "Prism Aspire":                          "#F43F5E",
  "RBL":                                   "#84CC16",
  "RBL BANK MY SHOP":                      "#558B2F",
  "BFL":                                   "#EF4444",
  "Kotak":                                 "#F59E0B",
  "DBS":                                   "#F97316",
  "Federal":                               "#4527A0",
  "IDFC":                                  "#6D28D9",
  "HSBC/Insta benefits":                   "#CC0000",
  "Timespoint":                            "#EC4899",
  "AU Rewardz":                            "#14B8A6",
  "AU Click2Gift":                         "#20B2AA",
  "Prince Pipe":                           "#2563EB",
  "Airtel Ratna":                          "#FF3B30",
  "Zillion":                               "#A855F7",
  "BPCL Smartfleet":                       "#0D47A1",
  "BPCL MAK":                              "#1B5E20",
  "HP Drive Track Plus":                   "#4A148C",
  "Creditlink":                            "#22C55E",
  "Dell Loyalty program":                  "#FB7185",
  "Postpe":                                "#0891B2",
  "IOCL Xtra Rewards":                     "#B45309",
  "Reward Program":                        "#880E4F",
  "Nexus Bachat":                          "#7C3AED",
  "Expressgifts":                          "#15803D",
  "NFTERNR":                               "#006064",
  "Cera Superstar":                        "#9333EA",
  "Wonder Cement":                         "#33691E",
  "Bosch":                                 "#BF360C",
  "JK Paper":                              "#37474F",
  "JK Cement":                             "#795548",
  "Sintex":                                "#1A237E",
  "FINOLEX BANNER":                        "#F57F17",
  "Visa Offers":                           "#1D4ED8",
  "Wedding Box":                           "#BE185D",
  "Godrej Club One":                       "#B45309",
  "Amex":                                  "#283593",
  "Himalya Sanjeevani":                    "#2E7D32",
  "VARROC":                                "#E65100",
  "Spentro":                               "#0F766E",
  "Perfetti Van Melle":                    "#D81B60",
  "LUMINOUS":                              "#F9A825",
  "MuffinPay":                             "#6A1B9A",
  "Muffin Green Finance":                  "#27AE60",
  "LKP Finance Ltd":                       "#004D40",
  "HP Lubricant":                          "#8B4513",
};

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
