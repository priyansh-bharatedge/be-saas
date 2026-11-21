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
    email: "admin@bharatedge.com",
    name: "Vikramaditya Sharma",
    role: Role.Admin,
    jobTitle: "Chief Executive & Enterprise Admin",
  },
  {
    id: "usr-crm-02",
    email: "crm@bharatedge.com",
    name: "Aanya Singhania",
    role: Role.CRM,
    jobTitle: "Head of CRM & Strategic Deals",
  },
  {
    id: "usr-hrms-03",
    email: "hrms@bharatedge.com",
    name: "Rajesh Iyer",
    role: Role.HRMS,
    jobTitle: "Head of People & HRMS",
  },
  {
    id: "usr-support-04",
    email: "support@bharatedge.com",
    name: "Pooja Deshmukh",
    role: Role.Support,
    jobTitle: "Support Operations Lead",
  },
  {
    id: "usr-superadmin-05",
    email: "superadmin@bharatedge.com",
    name: "Super Administrator",
    role: Role.Admin,
    jobTitle: "Enterprise Super Admin",
  },
  {
    id: "usr-accounts-06",
    email: "accounts@bharatedge.com",
    name: "Accounts Manager",
    role: Role.CRM,
    jobTitle: "Head of Accounts & Finance",
  },
];

export async function findUserByEmail(email: string) {
  return db.employee.findUnique({
    where: { workEmail: email.trim().toLowerCase() },
  });
}
