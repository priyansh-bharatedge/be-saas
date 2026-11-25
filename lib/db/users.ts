import { Role } from "@prisma/client";
import { db } from "./index";

export interface EnterpriseUserSeed {
  id: string;
  email: string;
  name: string;
  role: Role;
  jobTitle: string;
}

export const ENTERPRISE_SEED_USERS: EnterpriseUserSeed[] = [
  {
    id: "usr-admin-01",
    email: "md@bharat-edge.com",
    name: "Vimlendu Mishra",
    role: Role.Admin,
    jobTitle: "Managing Director & Super Admin",
  },
  {
    id: "usr-hrms-03",
    email: "hr@bharat-edge.com",
    name: "Rajesh Iyer",
    role: Role.HRMS,
    jobTitle: "Head of People & HRMS",
  },
  {
    id: "usr-crm-02",
    email: "crm@bharatedge.com",
    name: "Aanya Singhania",
    role: Role.CRM,
    jobTitle: "Head of CRM & Strategic Deals",
  },
  {
    id: "usr-support-04",
    email: "support@bharatedge.com",
    name: "Pooja Deshmukh",
    role: Role.Support,
    jobTitle: "Support Operations Lead",
  },
  {
    id: "usr-accounts-06",
    email: "accounts@bharatedge.com",
    name: "Accounts Manager",
    role: Role.CRM,
    jobTitle: "Head of Accounts & Finance",
  },
  {
    id: "usr-legal-07",
    email: "legal@bharatedge.com",
    name: "Adv. Aditya Verma",
    role: Role.CRM,
    jobTitle: "Head of Legal & Compliance",
  },
];

export async function findUserByEmail(email: string) {
  return db.employee.findUnique({
    where: { workEmail: email.trim().toLowerCase() },
  });
}
