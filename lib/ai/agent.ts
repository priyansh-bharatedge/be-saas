import { db } from "@/lib/db";
import { SystemRole, Role, ChatParticipantRole } from "@prisma/client";

export const AI_AGENT_EMAIL = "ai.executive@bharat-edge.com";
export const AI_AGENT_EMP_ID = "BE-AI-001";
export const AI_AGENT_NAME = "BharatEdge AI";

/**
 * Ensures the system AI agent employee record exists in PostgreSQL.
 * Strictly hidden from regular colleague search and group pickers.
 */
export async function getOrCreateAiAgentEmployee() {
  let aiBot = await db.employee.findUnique({
    where: { workEmail: AI_AGENT_EMAIL },
  });

  if (!aiBot) {
    aiBot = await db.employee.create({
      data: {
        employeeId: AI_AGENT_EMP_ID,
        firstName: "BharatEdge",
        lastName: "AI",
        workEmail: AI_AGENT_EMAIL,
        personalEmail: AI_AGENT_EMAIL,
        contactNumber: "9999999999",
        dateOfBirth: new Date("2024-01-01"),
        dateOfJoining: new Date("2024-01-01"),
        gender: "AI",
        department: "Executive Intelligence",
        designation: "Executive AI Chief",
        systemRole: SystemRole.SUPER_ADMIN,
        role: Role.Admin,
        jobTitle: "Executive AI Copilot",
        branch: "Headquarters - Ahmedabad",
        permanentAddress: "BharatEdge Cloud Neural Core",
        currentAddress: "BharatEdge Cloud Neural Core",
        emergencyFirstName: "System",
        emergencyLastName: "Admin",
        emergencyNumber: "9999999999",
        emergencyRelationship: "System Admin",
        educationQualification: "BharatEdge Neural Core v2.0",
        bankAccountNumber: "N/A",
        bankName: "N/A",
        ifscCode: "N/A",
        panNumber: "N/A",
        aadhaarNumber: "N/A",
        isOnline: true,
        avatarUrl: null,
      },
    });
  }

  return aiBot;
}

/**
 * Ensures the dedicated 1-on-1 AI Conversation exists for the SUPER_ADMIN.
 * Pinned at the top of the chat list and isolated from all other roles.
 */
export async function getOrCreateSuperAdminAiConversation(superAdminId: string) {
  const aiBot = await getOrCreateAiAgentEmployee();

  // Find existing 1-on-1 AI conversation
  let conv = await db.chatConversation.findFirst({
    where: {
      isAiAgent: true,
      participants: {
        some: { employeeId: superAdminId },
      },
    },
    include: {
      participants: {
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              workEmail: true,
              department: true,
              designation: true,
              avatarUrl: true,
              isOnline: true,
              lastSeen: true,
            },
          },
        },
      },
      messages: {
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!conv) {
    conv = await db.chatConversation.create({
      data: {
        isGroup: false,
        isAiAgent: true,
        name: AI_AGENT_NAME,
        createdById: superAdminId,
        participants: {
          create: [
            { employeeId: superAdminId, role: ChatParticipantRole.ADMIN },
            { employeeId: aiBot.id, role: ChatParticipantRole.MEMBER },
          ],
        },
      },
      include: {
        participants: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                workEmail: true,
                department: true,
                designation: true,
                avatarUrl: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    // Seed welcome greeting from BharatEdge AI
    await db.chatMessage.create({
      data: {
        conversationId: conv.id,
        senderId: aiBot.id,
        content: `👋 **Welcome to BharatEdge Executive AI**, Super Administrator.\n\nI am connected to live PostgreSQL records across **CRM, HRMS, and Support Desk**. You can ask me real-time business queries with zero hallucinations, or use the quick buttons above to audit payments, inspect outsource costs, and review operations pipelines.\n\nHow can I assist your executive decisions today?`,
        messageType: "TEXT",
      },
    });
  }

  return conv;
}
