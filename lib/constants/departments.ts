export const DEPARTMENTS = [
  "Sales",
  "Account",
  "Legal",
  "Operation",
  "Quality",
  "IT",
  "HR",
  "Executive Management",
  "Other",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export function isValidDepartment(dept: string): dept is Department {
  return (DEPARTMENTS as readonly string[]).includes(dept);
}

/**
 * Filter options for HRMS Directory and Attendance tabs
 */
export const DEPARTMENT_FILTER_TABS = [
  "ALL",
  ...DEPARTMENTS,
] as const;

/**
 * Form options with display labels for dropdown selectors
 */
export const DEPARTMENT_FORM_OPTIONS = [
  { value: "Sales", label: "Sales" },
  { value: "Account", label: "Account" },
  { value: "Legal", label: "Legal" },
  { value: "Operation", label: "Operation" },
  { value: "Quality", label: "Quality" },
  { value: "IT", label: "IT" },
  { value: "HR", label: "HR" },
  {
    value: "Executive Management",
    label: "Executive Management (C-level / Super Admin only)",
  },
  { value: "Other", label: "Other" },
] as const;
