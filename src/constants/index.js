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

// ── Content team ──────────────────────────────────────────────────────────────
export const OWNERS          = [
  "Deepankar Hemnani",
  "Sakshi Sharma",
  "Snigdha Banerjee",
  "Vanshika Atri",
  "Reet Suman",
  "Uday Jadoun",
  "Ananya Saril",
  "Saim",
];
export const BUSINESS_OWNERS = ["Deepankar Hemnani", "Anirudh Motwani"];

// ── Creative team ─────────────────────────────────────────────────────────────
export const CREATIVE_OWNERS = [
  "Ajay Kumar",
  "Ashutosh Kumar",
  "Sunil Dhyani",
  "Amit Chauhan",
  "Shervir",
  "Deepak Verma",
  "Amit Bhattacharjee",
  "Ashish Kumar Tiwari",
];
export const CREATIVE_BUSINESS_OWNERS = ["Ajay Kumar", "Anirudh Motwani"];

export const CREATIVE_PROPERTIES = [
  "GyFTR",
  "Kotak Instant Vouchers",
  "IRCTC",
  "SBI Yono",
  "HDFC - Instant Vouchers",
  "Nexus",
  "Axis Edge",
  "Indusind",
  "RBL Bank Offers",
  "HSBC Insta Benefits",
  "Amex Reward",
  "BFL",
  "Hello BPCL",
  "BPCL MAK",
  "Zillion",
  "Reward Program",
  "Shopplus",
  "SC-Insta",
  "Yescart",
  "Prism - Gold",
  "Prism - Aspire",
  "YesRewardz",
  "SBI Card",
  "Hp Pay",
  "Prism",
  "Wonder Cement",
  "AU Bank",
  "Visa",
  "DBS",
  "Bosch",
  "Prince Pipe",
  "Prism Anmol Rishtey",
  "Indus Moment",
  "IDFC",
  "Federal",
  "Hp Drive Track Plus",
  "SBI Simply Click",
  "Godrej One",
  "Ultratech",
  "Evolve",
  "Airtel",
  "Sintex",
  "Zomato",
  "Xtra Reward",
  "Luminous",
  "Money Control",
  "Pocket FM",
  "Common",
  "Cera Superstar",
];

export const CREATIVE_PROP_COLOR = {
  "GyFTR":                   "#7C3AED",
  "Kotak Instant Vouchers":  "#F59E0B",
  "IRCTC":                   "#DC2626",
  "SBI Yono":                "#059669",
  "HDFC - Instant Vouchers": "#0277BD",
  "Nexus":                   "#8B5CF6",
  "Axis Edge":               "#B91C1C",
  "Indusind":                "#E11D74",
  "RBL Bank Offers":         "#4338CA",
  "HSBC Insta Benefits":     "#991B1B",
  "Amex Reward":             "#283593",
  "BFL":                     "#EF4444",
  "Hello BPCL":              "#155E75",
  "BPCL MAK":                "#78350F",
  "Zillion":                 "#A855F7",
  "Reward Program":          "#831843",
  "Shopplus":                "#0EA5E9",
  "SC-Insta":                "#0891B2",
  "Yescart":                 "#84CC16",
  "Prism - Gold":            "#CA8A04",
  "Prism - Aspire":          "#EC4899",
  "YesRewardz":              "#9D174D",
  "SBI Card":                "#D97706",
  "Hp Pay":                  "#14532D",
  "Prism":                   "#F97316",
  "Wonder Cement":           "#4D7C0F",
  "AU Bank":                 "#0F766E",
  "Visa":                    "#3B82F6",
  "DBS":                     "#C2410C",
  "Bosch":                   "#9A3412",
  "Prince Pipe":             "#5B21B6",
  "Prism Anmol Rishtey":     "#EA580C",
  "Indus Moment":            "#DB2777",
  "IDFC":                    "#9333EA",
  "Federal":                 "#312E81",
  "Hp Drive Track Plus":     "#581C87",
  "SBI Simply Click":        "#134E4A",
  "Godrej One":              "#5E35B1",
  "Ultratech":               "#374151",
  "Evolve":                  "#10B981",
  "Airtel":                  "#E53935",
  "Sintex":                  "#1E3A8A",
  "Zomato":                  "#E23744",
  "Xtra Reward":             "#F43F5E",
  "Luminous":                "#EAB308",
  "Money Control":           "#16A34A",
  "Pocket FM":               "#6366F1",
  "Common":                  "#57534E",
  "Cera Superstar":          "#D946EF",
};

// ── Shared lookup maps ────────────────────────────────────────────────────────
export const TEAM_OF = {
  // Content
  "Deepankar Hemnani":   "Content",
  "Sakshi Sharma":       "Content",
  "Snigdha Banerjee":    "Content",
  "Vanshika Atri":       "Content",
  "Reet Suman":          "Content",
  "Uday Jadoun":         "Content",
  "Ananya Saril":        "Content",
  "Saim":                "Content",
  // Creative
  "Ajay Kumar":          "Creative",
  "Ashutosh Kumar":      "Creative",
  "Sunil Dhyani":        "Creative",
  "Amit Chauhan":        "Creative",
  "Shervir":             "Creative",
  "Deepak Verma":        "Creative",
  "Amit Bhattacharjee":  "Creative",
  "Ashish Kumar Tiwari": "Creative",
  // Super admin
  "Anirudh Motwani":     "Admin",
  "Yash Tahlyani":       "Admin",
};

export const CURRENT_USER = "Deepankar Hemnani";

export const USER_BY_EMAIL = {
  // Super admins
  "yash.tahlyani":   "Yash Tahlyani",
  "anirudh.motwani": "Anirudh Motwani",
  // Content team
  "deepankar.h":     "Deepankar Hemnani",
  "ananya.saril":    "Ananya Saril",
  "reet":            "Reet Suman",
  "uday.jadoun":     "Uday Jadoun",
  "vanshika.atri":   "Vanshika Atri",
  "sakshi.s1":       "Sakshi Sharma",
  "snigdha.b":       "Snigdha Banerjee",
  "priyanshu":       "Priyanshu",
  "harshita.m":      "Harshita M",
  "saim.k":          "Saim",
  // Creative team
  "ajay.k":               "Ajay Kumar",
  "ashutosh.j":           "Ashutosh Kumar",
  "sunil.d":              "Sunil Dhyani",
  "amit.c":               "Amit Chauhan",
  "shervir":              "Shervir",
  "deepak.verma":         "Deepak Verma",
  "amit.bhattacharjee":   "Amit Bhattacharjee",
  "ashish.t":             "Ashish Kumar Tiwari",
};

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
];

export const PEOPLE = {
  // Content team
  "Deepankar Hemnani":   { c:"#1F7A3D" },
  "Sakshi Sharma":       { c:"#C2185B" },
  "Snigdha Banerjee":    { c:"#0E6FA3" },
  "Vanshika Atri":       { c:"#8B5CF6" },
  "Reet Suman":          { c:"#0891B2" },
  "Uday Jadoun":         { c:"#15803D" },
  "Ananya Saril":        { c:"#B01457" },
  "Anirudh Motwani":     { c:"#6D4C99" },
  "Saim":                { c:"#0369A1" },
  // Creative team
  "Ajay Kumar":          { c:"#0B6FCB" },
  "Ashutosh Kumar":      { c:"#C84B31" },
  "Sunil Dhyani":        { c:"#2D6A4F" },
  "Amit Chauhan":        { c:"#7B2D8B" },
  "Shervir":             { c:"#B5451B" },
  "Deepak Verma":        { c:"#1A6B72" },
  "Amit Bhattacharjee":  { c:"#6B3A1F" },
  "Ashish Kumar Tiwari": { c:"#1B4F72" },
};

export const PROP_COLOR = {
  // Each property is assigned a hue zone no other nearby property shares.
  // Fixed: AU twins (teal vs rose), IOCL=Godrej duplicate, 9-blue cluster,
  // 8-red/pink cluster, LUMINOUS≈SBI Card, 10-green cluster.
  "Smartbuy (HDFC)":                       "#16A34A",  // green
  "HDFC Bank Millennia/Rewards":           "#0277BD",  // dark sky-blue
  "GyFTR":                                 "#7C3AED",  // violet
  "EDGE REWARDS (Axis)":                   "#B91C1C",  // dark red
  "Standard Chartered":                    "#0891B2",  // cyan (was blue — now clearly ≠ HDFC)
  "SBI Card":                              "#D97706",  // amber
  "YONO SBI":                              "#059669",  // emerald (was same teal as SimplyCLICK)
  "SBI SimplyCLICK":                       "#134E4A",  // very dark teal (clearly ≠ YONO SBI)
  "Indus Moments/IndusInd Insta Vouchers": "#E11D74",  // rose
  "IndusInd Shopplus/Xtrasmiles":          "#F97316",  // orange (was sky-blue — now clearly ≠ Indus siblings)
  "Indus Flash Sale / IndusIndOffer":      "#047857",  // dark emerald
  "Yescart":                               "#84CC16",  // bright lime (was same lime as Smartbuy)
  "Yesrewardz":                            "#9D174D",  // dark raspberry (clearly ≠ Indus Moments rose)
  "HP Pay":                                "#14532D",  // dark forest green (clearly ≠ Smartbuy)
  "IRCTC":                                 "#DC2626",  // red (was dark-pink #AD1457)
  "Prism Anmol Rishtey":                   "#EA580C",  // orange-red (clearly ≠ IRCTC red)
  "Prism Aspire":                          "#EC4899",  // hot pink
  "RBL":                                   "#4338CA",  // indigo (was lime — completely different)
  "RBL BANK MY SHOP":                      "#854D0E",  // warm brown (was olive — now brown)
  "BFL":                                   "#EF4444",  // bright red
  "Kotak":                                 "#F59E0B",  // amber-gold
  "DBS":                                   "#C2410C",  // brick orange (was same orange as Prism Anmol)
  "Federal":                               "#312E81",  // dark indigo-navy (clearly ≠ RBL indigo)
  "IDFC":                                  "#9333EA",  // purple (clearly ≠ GyFTR violet and Federal)
  "HSBC/Insta benefits":                   "#991B1B",  // dark crimson (clearly ≠ IRCTC, BFL, EDGE)
  "Timespoint":                            "#DB2777",  // deep pink
  "AU Rewardz":                            "#0F766E",  // dark teal
  "AU Click2Gift":                         "#F43F5E",  // vibrant coral-rose (was near-identical teal!)
  "Prince Pipe":                           "#5B21B6",  // deep violet (was blue — now ≠ blue cluster)
  "Airtel Ratna":                          "#E53935",  // Airtel red-orange (≠ IRCTC/BFL/EDGE)
  "Zillion":                               "#A855F7",  // lavender
  "BPCL Smartfleet":                       "#155E75",  // dark cyan-teal
  "BPCL MAK":                              "#78350F",  // dark amber-brown (was dark green — now ≠ greens)
  "HP Drive Track Plus":                   "#581C87",  // deep purple (clearly ≠ IDFC purple)
  "Creditlink":                            "#22C55E",  // bright green
  "Dell Loyalty program":                  "#6366F1",  // periwinkle (was pink #FB7185 — now a distinct blue-violet)
  "Postpe":                                "#0EA5E9",  // sky blue (clearly ≠ Standard Chartered cyan)
  "IOCL Xtra Rewards":                     "#92400E",  // dark ochre-brown (was #B45309 = Godrej duplicate)
  "Reward Program":                        "#831843",  // dark maroon
  "Nexus Bachat":                          "#C026D3",  // fuchsia (was same violet as GyFTR cluster)
  "Expressgifts":                          "#064E3B",  // very dark emerald (clearly ≠ HP Pay)
  "NFTERNR":                               "#164E63",  // dark steel-blue
  "Cera Superstar":                        "#D946EF",  // bright magenta (clearly ≠ IDFC, Nexus)
  "Wonder Cement":                         "#4D7C0F",  // dark olive
  "Bosch":                                 "#9A3412",  // deep brick
  "JK Paper":                              "#374151",  // slate grey
  "JK Cement":                             "#57534E",  // warm grey
  "Sintex":                                "#1E3A8A",  // navy blue (clearly ≠ violet cluster)
  "FINOLEX BANNER":                        "#CA8A04",  // golden yellow
  "Visa Offers":                           "#3B82F6",  // medium blue
  "Wedding Box":                           "#F472B6",  // light rose-pink (clearly ≠ other dark pinks)
  "Godrej Club One":                       "#5E35B1",  // indigo-violet (was #B45309 = exact IOCL duplicate!)
  "Amex":                                  "#283593",  // dark Amex-blue (clearly ≠ Visa, HDFC)
  "Himalya Sanjeevani":                    "#2E7D32",  // medium forest green (herbal/natural)
  "VARROC":                                "#E65100",  // deep orange
  "Spentro":                               "#0E4C5A",  // dark petrol-blue
  "Perfetti Van Melle":                    "#BE185D",  // raspberry
  "LUMINOUS":                              "#EAB308",  // bright yellow (was #F9A825 ≈ SBI Card amber!)
  "MuffinPay":                             "#4C1D95",  // very dark purple
  "Muffin Green Finance":                  "#10B981",  // medium emerald
  "LKP Finance Ltd":                       "#065F46",  // very dark green
  "HP Lubricant":                          "#6B3A1F",  // dark brown
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
