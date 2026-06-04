import {
  Briefcase, Wrench, Building2, Coffee,
  GraduationCap, Palmtree, UserX,
} from "lucide-react";

export const EMP_OPTIONS = [
  { value: "employed",       label: "Employed",       icon: Briefcase,     desc: "Work for a company"  },
  { value: "self_employed",  label: "Self-employed",  icon: Wrench,        desc: "Run your own work"   },
  { value: "business_owner", label: "Business owner", icon: Building2,     desc: "Own a company"       },
  { value: "freelance",      label: "Freelancer",     icon: Coffee,        desc: "Project-based work"  },
  { value: "retired",        label: "Retired",        icon: Palmtree,      desc: "Pension / savings"   },
  { value: "student",        label: "Student",        icon: GraduationCap, desc: "Currently studying"  },
  { value: "unemployed",     label: "Unemployed",     icon: UserX,         desc: "Between jobs"        },
] as const;

export const WEALTH_OPTIONS = [
  { value: "salary",      label: "Salary",      icon: "💼" },
  { value: "business",    label: "Business",    icon: "🏢" },
  { value: "investments", label: "Investments", icon: "📈" },
  { value: "inheritance", label: "Inheritance", icon: "🏛️" },
  { value: "property",    label: "Property",    icon: "🏠" },
  { value: "savings",     label: "Savings",     icon: "🏦" },
  { value: "other",       label: "Other",       icon: "✦"  },
] as const;

export const ASSET_ROWS = [
  { name: "savings"      as const, label: "Savings",        icon: "💰", desc: "Bank accounts, cash"    },
  { name: "investments"  as const, label: "Investments",    icon: "📈", desc: "Stocks, funds, crypto"  },
  { name: "propertyValue"as const, label: "Property",       icon: "🏠", desc: "Real estate value"      },
  { name: "vehicleValue" as const, label: "Vehicles",       icon: "🚗", desc: "Cars, motorcycles"      },
  { name: "businessAssets"as const,label: "Business assets",icon: "🏢", desc: "Equipment, inventory"   },
  { name: "otherAssets"  as const, label: "Other assets",   icon: "📦", desc: "Jewellery, art, etc."   },
] as const;

export const STEP_LABELS = ["Income & Employment", "Assets & Loans", "Compliance"] as const;
