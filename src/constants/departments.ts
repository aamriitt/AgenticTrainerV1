export const DEPARTMENTS = ["Analytics", "Engineering", "Finance", "HR", "Sales", "Operations", "Platform", "Legal"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const BRANCHES = ["Headquarters", "North Region", "South Region", "East Region", "West Region", "Remote"] as const;
export type Branch = (typeof BRANCHES)[number];
