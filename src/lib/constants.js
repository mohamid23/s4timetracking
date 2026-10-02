export const BRAND = {
  navy: "#1C243A",
  slate: "#4A566E",
  line: "#E2E6EE",
  wash: "#F5F7FA",
  teal: "#0E8F8F",
  amber: "#C8811F",
  red: "#B3402F",
  paper: "#FFFFFF",
};

// Reference categorical palette (dataviz skill), validated for CVD and contrast.
// Used for chart series only — UI chrome stays on BRAND above.
export const CHART_SERIES = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

export const CHART_STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

export const PREFIX = "s4tt:";
export const CONFIG_KEY = PREFIX + "config";
export const ME_KEY = PREFIX + "me";
export const entriesKey = (ym) => `${PREFIX}entries:${ym}`;
export const financeKey = (ym) => `${PREFIX}finance:${ym}`;

export const DEFAULT_SERVICES = [
  "COS-Client Website Creation",
  "COS-Client Website Maintenance",
  "COS-Direct Mail",
  "COS-Display",
  "COS-Event",
  "COS-General Management",
  "COS-Marketing Consulting",
  "COS-Merchandise",
  "COS-OOH",
  "COS-Photo/Video",
  "COS-PPC",
  "COS-Radio/Digital Audio",
  "Internal Admin",
  "Operations",
  "Tech",
  "Sales Support",
  "Research",
];

/* Groups service types into the capability lens leadership thinks in:
   which practice area is doing the work, regardless of client or channel mix. */
export const DEFAULT_CAPABILITY_MAP = {
  "COS-Client Website Creation": "Creative & Web",
  "COS-Client Website Maintenance": "Creative & Web",
  "COS-Direct Mail": "Direct & Print",
  "COS-Display": "Paid Media",
  "COS-Event": "Events",
  "COS-General Management": "Account Management",
  "COS-Marketing Consulting": "Strategy & Consulting",
  "COS-Merchandise": "Direct & Print",
  "COS-OOH": "Paid Media",
  "COS-Photo/Video": "Creative & Web",
  "COS-PPC": "Paid Media",
  "COS-Radio/Digital Audio": "Paid Media",
  "Internal Admin": "Internal",
  "Operations": "Internal",
  "Tech": "Internal",
  "Sales Support": "Internal",
  "Research": "Strategy & Consulting",
};

export const DEFAULT_INDUSTRIES = [
  "Automotive",
  "Home Services",
  "Industrial & Manufacturing",
  "Professional Services",
  "Real Estate & Construction",
  "Retail & Hospitality",
  "Healthcare",
  "Financial Services",
  "Nonprofit & Community",
  "Other",
];

/* Client wall from the S4 Connect site. Set anyone no longer active to hidden in Setup
   so the time entry dropdown stays short. Industry starts unset until assigned in Setup. */
export const DEFAULT_CLIENTS = [
  { id: "jet-s-pizza", name: "Jet's Pizza", active: true, industry: "Retail & Hospitality" },
  { id: "whenevergolf", name: "WheneverGolf", active: true, industry: "Retail & Hospitality" },
  { id: "schaeffler", name: "Schaeffler", active: true, industry: "Industrial & Manufacturing" },
  { id: "tailored-real-estate-solutions", name: "Tailored Real Estate Solutions", active: true, industry: "Real Estate & Construction" },
  { id: "ann-arbor-comedy-showcase", name: "Ann Arbor Comedy Showcase", active: true, industry: "Retail & Hospitality" },
  { id: "arcadia-lending", name: "Arcadia Lending", active: true, industry: "Financial Services" },
  { id: "cutting-edge-computers", name: "Cutting Edge Computers", active: true, industry: "Retail & Hospitality" },
  { id: "celebrity-catering", name: "Celebrity Catering", active: true, industry: "Retail & Hospitality" },
  { id: "cadillac", name: "Cadillac", active: true, industry: "Automotive" },
  { id: "cottage-inn-pizza", name: "Cottage Inn Pizza", active: true, industry: "Retail & Hospitality" },
  { id: "rocking-mobility", name: "Rocking Mobility", active: true, industry: "Healthcare" },
  { id: "custom-kitchen-solutions", name: "Custom Kitchen Solutions", active: true, industry: "Home Services" },
  { id: "golf-stream-group", name: "Golf Stream Group", active: true, industry: "Retail & Hospitality" },
  { id: "house-of-barbecue", name: "House of Barbecue", active: true, industry: "Retail & Hospitality" },
  { id: "jerry-buys-houses", name: "Jerry Buys Houses", active: true, industry: "Real Estate & Construction" },
  { id: "members-home-and-auto", name: "Members Home and Auto", active: true, industry: "Financial Services" },
  { id: "men-of-the-sacred-hearts", name: "Men of the Sacred Hearts", active: true, industry: "Nonprofit & Community" },
  { id: "saxon-incorporated", name: "Saxon Incorporated", active: true, industry: "Industrial & Manufacturing" },
  { id: "prestige-auto-body", name: "Prestige Auto Body", active: true, industry: "Automotive" },
  { id: "general-motors", name: "General Motors", active: true, industry: "Automotive" },
  { id: "office-express", name: "Office Express", active: true, industry: "Retail & Hospitality" },
  { id: "4-your-benefit", name: "4 Your Benefit", active: true, industry: "Professional Services" },
  { id: "wealth-management-institute", name: "Wealth Management Institute", active: true, industry: "Financial Services" },
  { id: "purple-power", name: "Purple Power", active: true, industry: "Retail & Hospitality" },
  { id: "hershey-insurance-agency", name: "Hershey Insurance Agency", active: true, industry: "Financial Services" },
  { id: "rock-harbor", name: "Rock Harbor", active: true, industry: "Nonprofit & Community" },
  { id: "victory-real-estate-investments", name: "Victory Real Estate Investments", active: true, industry: "Real Estate & Construction" },
  { id: "padilla-law-group", name: "Padilla Law Group", active: true, industry: "Professional Services" },
  { id: "c-e-gleeson-construction", name: "C.E. Gleeson Construction", active: true, industry: "Real Estate & Construction" },
  { id: "apex-laboratory-equipment", name: "APEX Laboratory Equipment", active: true, industry: "Industrial & Manufacturing" },
  { id: "fougnie-professional-lawn-maintenance", name: "Fougnie Professional Lawn Maintenance", active: true, industry: "Home Services" },
  { id: "champu-auto-spa", name: "Champu Auto Spa", active: true, industry: "Automotive" },
  { id: "air-wizards-hvac", name: "Air Wizards HVAC", active: true, industry: "Home Services" },
  { id: "north-american-industrial-supply", name: "North American Industrial Supply", active: true, industry: "Industrial & Manufacturing" },
  { id: "blessed-pest-solutions", name: "Blessed Pest Solutions", active: true, industry: "Home Services" },
  { id: "dentapup", name: "Dentapup", active: true, industry: "Healthcare" },
  { id: "rogow-property-management", name: "Rogow Property Management", active: true, industry: "Real Estate & Construction" },
  { id: "jmrh-group-dock-and-door", name: "JMRH Group Dock and Door", active: true, industry: "Home Services" },
  { id: "everyday-process-counseling-center", name: "Everyday Process Counseling Center", active: true, industry: "Healthcare" },
  { id: "a-a-pro-paint", name: "A&A Pro Paint", active: true, industry: "Home Services" },
  { id: "construction-clean", name: "Construction Clean", active: true, industry: "Home Services" },
  { id: "great-lakes-maintenance", name: "Great Lakes Maintenance", active: true, industry: "Home Services" },
  { id: "masonry-cleaning-solutions", name: "Masonry Cleaning Solutions", active: true, industry: "Home Services" },
  { id: "phoenix-contractors", name: "Phoenix Contractors", active: true, industry: "Real Estate & Construction" },
  { id: "concierge-flooring", name: "Concierge Flooring", active: true, industry: "Home Services" },
  { id: "certified-flooring-installation", name: "Certified Flooring Installation", active: true, industry: "Home Services" },
  { id: "roof-shampoo", name: "Roof Shampoo", active: true, industry: "Home Services" },
  { id: "perfecting-lifestyles", name: "Perfecting Lifestyles", active: true, industry: "Professional Services" },
];

export const ROLES = {
  CONTRIBUTOR: "contributor",
  ACCOUNT_MANAGER: "account_manager",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
};

export const ROLE_LABEL = {
  [ROLES.CONTRIBUTOR]: "Contributor",
  [ROLES.ACCOUNT_MANAGER]: "Account Manager",
  [ROLES.ADMIN]: "Admin",
  [ROLES.SUPER_ADMIN]: "Super Admin",
};

/* Team as listed on the S4 Connect site. Hourly cost starts at zero and has to be
   filled in under Setup before any labor or profitability number means anything.
   accessLevel drives what each person can see; managedClients scopes account managers. */
export const DEFAULT_EMPLOYEES = [
  { id: "lance-docken", name: "Lance Docken", role: "Co-founder, CEO", rate: 0, accessLevel: ROLES.ADMIN, managedClients: [], email: "" },
  { id: "dan-woodford", name: "Dan Woodford", role: "Co-founder, Chief Marketing Officer", rate: 0, accessLevel: ROLES.ADMIN, managedClients: [], email: "" },
  { id: "phil-foster", name: "Phil Foster", role: "Creative Director", rate: 0, accessLevel: ROLES.CONTRIBUTOR, managedClients: [], email: "" },
  { id: "tammy-migliore", name: "Tammy Migliore", role: "SVP, Information Technology", rate: 0, accessLevel: ROLES.CONTRIBUTOR, managedClients: [], email: "" },
  { id: "mo-hamid", name: "Mo Hamid", role: "Managing Director of Strategic Growth", rate: 0, accessLevel: ROLES.SUPER_ADMIN, managedClients: [], email: "mhamid@s4connectteam.com" },
  { id: "bella-crociata", name: "Bella Crociata", role: "Marketing Operations Manager", rate: 0, accessLevel: ROLES.ACCOUNT_MANAGER, managedClients: [], email: "" },
  { id: "dan-blondin", name: "Dan Blondin", role: "Business Development Manager", rate: 0, accessLevel: ROLES.CONTRIBUTOR, managedClients: [], email: "" },
  { id: "maria-eusebio", name: "Maria Eusebio", role: "Marketing Specialist", rate: 0, accessLevel: ROLES.CONTRIBUTOR, managedClients: [], email: "" },
  { id: "mary-blondin", name: "Mary Blondin", role: "Accounting Specialist", rate: 0, accessLevel: ROLES.CONTRIBUTOR, managedClients: [], email: "" },
  { id: "mitchell-woodford", name: "Mitchell Woodford", role: "Marketing Intern", rate: 0, accessLevel: ROLES.CONTRIBUTOR, managedClients: [], email: "" },
];

export const isBillable = (s) => typeof s === "string" && s.startsWith("COS-");

/* S4 Connect mark, vector traced from the supplied logo artwork.
   The CONNECT wordmark is dropped because it stops being legible below about 60px tall,
   so the brand name is set in type beside the mark instead. */
export const S4_MARK = {
  viewBox: "0 0 1920 1593",
  transform: "translate(-0.236616,1593.855576) scale(0.100000,-0.100000)",
  d: "M15070 15929 c-1278 -62 -3258 -317 -5160 -665 -236 -43 -961 -186 -1105 -218 -38 -8 -124 -27 -190 -41 -213 -47 -573 -134 -764 -184 -102 -28 -474 -122 -826 -211 -352 -89 -701 -177 -775 -196 -2537 -662 -3942 -1179 -4376 -1609 -99 -98 -129 -148 -144 -241 -24 -142 29 -229 164 -270 157 -47 332 -67 606 -68 267 -1 344 2 655 29 388 34 1007 116 1500 200 568 96 1365 198 2000 255 127 11 250 22 275 25 48 5 573 40 730 49 863 49 1833 22 2550 -69 1328 -170 2261 -584 2680 -1191 55 -80 142 -243 135 -255 -3 -3 -31 -9 -64 -13 -71 -8 -362 -63 -556 -105 -1138 -245 -2840 -766 -3931 -1201 -2241 -896 -4391 -2182 -6256 -3742 -852 -714 -1443 -1355 -1807 -1962 -741 -1233 -465 -2081 749 -2300 410 -74 1062 -71 1625 9 827 116 1695 385 2670 827 1902 863 4122 2426 5741 4043 581 580 1006 1088 1393 1664 630 939 871 1697 787 2476 -7 66 -10 123 -7 127 13 14 656 114 1021 158 332 40 966 97 975 88 8 -8 -296 -342 -499 -548 -272 -276 -532 -558 -522 -567 6 -6 443 353 566 466 58 53 234 224 393 381 l288 284 262 8 c1151 32 1958 -121 2478 -471 350 -235 548 -532 552 -828 2 -109 3 -114 30 -140 39 -40 123 -38 204 3 75 38 85 59 79 157 -18 270 -261 651 -554 872 -206 155 -409 245 -722 319 -569 136 -1187 210 -1872 224 l-316 7 128 137 c1051 1124 1782 2104 1995 2673 119 320 134 570 45 792 -181 452 -798 726 -1840 818 -189 16 -692 18 -990 4z m770 -243 c825 -92 1300 -377 1464 -877 64 -197 70 -335 22 -534 -127 -524 -682 -1399 -1585 -2499 -108 -131 -203 -247 -212 -258 -14 -18 -34 -20 -255 -29 -131 -4 -266 -11 -299 -14 -33 -3 -141 -12 -241 -20 -232 -19 -484 -48 -749 -85 -198 -29 -602 -95 -635 -105 -12 -4 -23 17 -45 87 -158 498 -613 891 -1446 1249 -829 356 -2236 545 -4474 600 -411 10 -2175 6 -2335 -6 -98 -7 -465 -16 -460 -12 20 20 542 191 1080 354 1851 561 4189 1188 6200 1663 1317 311 2098 440 3050 504 146 10 783 -3 920 -18z m-2826 -4697 c24 -120 -6 -350 -69 -534 -545 -1596 -3888 -4673 -7050 -6487 -2519 -1446 -4356 -1797 -5126 -981 -109 115 -135 195 -126 388 26 600 683 1576 1702 2528 841 786 2376 1875 3765 2672 2234 1282 4438 2070 6805 2433 93 15 92 15 99 -19z M13525 9793 c-11 -64 -120 -382 -170 -498 -391 -914 -1228 -1997 -2345 -3035 -1717 -1595 -3807 -2999 -5610 -3768 -799 -340 -1595 -582 -2250 -684 -71 -11 778 -13 5147 -16 l5233 -2 2 -893 3 -892 1170 0 1170 0 3 892 2 893 605 0 605 0 0 1045 0 1045 -605 0 -605 0 0 2975 0 2975 -1174 0 -1174 0 -7 -37z m5 -4398 l0 -1515 -1285 0 c-707 0 -1285 2 -1285 5 0 8 2560 3025 2567 3025 2 0 3 682 3 1515z",
};
