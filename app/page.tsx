import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Role, SystemRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    if (
      user.role === Role.Admin ||
      user.systemRole === SystemRole.SUPER_ADMIN ||
      (user as any).isSuperAdmin
    ) {
      redirect("/admin");
    }
    redirect("/portal");
  } else {
    redirect("/login");
  }
}
