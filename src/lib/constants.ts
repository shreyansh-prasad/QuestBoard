/**
 * Shared constants used across the application
 */

// Branch options for profiles, signup, filters, etc.
export const BRANCHES = [
  "CSAI",
  "CSE",
  "CSDS",
  "CSDA",
  "CSIOT",
  "IT",
  "ITNS",
  "MAC",
  "ECE",
  "EE",
  "ECAM",
  "EIOT",
  "EVDT",
  "ICE",
  "ME",
  "MEEV",
  "BT",
  "GI",
  "CIVIL",
] as const;

export type Branch = typeof BRANCHES[number];

// Section options for profiles, signup, filters, etc.
export const SECTIONS = ["1", "2", "none"] as const;

export type Section = typeof SECTIONS[number];
