import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import OpenAI from "openai";
import { AI_AGENT_TOOLS, executeAiTool } from "@/lib/ai/tools";
import { getOrCreateAiAgentEmployee, getOrCreateSuperAdminAiConversation } from "@/lib/ai/agent";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // STRICT ISOLATION: Only SUPER_ADMIN is allowed to use the AI Agent
    if (user.systemRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: BharatEdge AI Copilot is exclusively for Super Administrators." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const prompt = (body.message || "").trim();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt message is required." }, { status: 400 });
    }

    // Ensure AI bot employee and conversation exist
    const aiBot = await getOrCreateAiAgentEmployee();
    const aiConversation = await getOrCreateSuperAdminAiConversation(user.id);

    // Save user's message
    const userMsg = await db.chatMessage.create({
      data: {
        conversationId: aiConversation.id,
        senderId: user.id,
        content: prompt,
        messageType: "TEXT",
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    // Load recent conversation history (last 12 messages)
    const history = await db.chatMessage.findMany({
      where: {
        conversationId: aiConversation.id,
        isDeleted: false,
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    history.reverse();

    // Prepare OpenAI Messages
    const systemPrompt = `You are BharatEdge AI, the executive AI copilot for BharatEdge Enterprise OS, serving exclusively the Super Administrator.
You have direct, real-time read-only tool access to live PostgreSQL data across CRM (leads, deals, payments, services), Operations, Legal, HRMS (attendance, employees, leaves), and Support Desk.

STRICT OPERATING DIRECTIVES:
1. ZERO HALLUCINATIONS: Whenever asked about numbers, revenues, attendance, targets, costs, or tickets, you MUST call the relevant tool. Never guess, invent, or extrapolate metrics.
2. CRISP EXECUTIVE BRIEFING: Structure answers with high-density executive summaries. Highlight key KPIs in bold, use bullet points, format Indian currency with ₹ and Indian commas (e.g., ₹1,45,000), and conclude with clear operational insights.
3. 50/50 PARTNER BDM SPLIT: Revenue credited to sales reps honors the 50% Primary / 50% Partner split without double counting the company's total revenue.
4. DATE CONTEXT: Today's date is Wednesday, 25 November 2026. Operating corporate entities are BharatEdge Solutions Pvt Ltd (BSPL) and BharatEdge Software & App Pvt Ltd (BSAPL).`;

    const openAiMessages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of history) {
      // Skip report cards and alerts from history prompt to keep token window clean
      if (msg.messageType === "AI_REPORT" || msg.messageType === "AI_ALERT") continue;

      if (msg.senderId === aiBot.id) {
        openAiMessages.push({ role: "assistant", content: msg.content });
      } else {
        openAiMessages.push({ role: "user", content: msg.content });
      }
    }

    // Call OpenAI with function tools
    let response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: openAiMessages,
      tools: AI_AGENT_TOOLS,
      tool_choice: "auto",
      temperature: 0.2,
    });

    let choice = response.choices[0];
    let responseMessage = choice?.message;

    // Handle tool execution loop (up to 4 recursive tool rounds)
    let loopCount = 0;
    while (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0 && loopCount < 4) {
      loopCount++;
      openAiMessages.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.type !== "function") continue;
        try {
          const fnName = toolCall.function.name;
          const fnArgs = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
          const toolResult = await executeAiTool(fnName, fnArgs);

          openAiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        } catch (toolErr: any) {
          openAiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: toolErr.message || "Failed to execute database query tool" }),
          });
        }
      }

      response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: openAiMessages,
        tools: AI_AGENT_TOOLS,
        tool_choice: "auto",
        temperature: 0.2,
      });

      choice = response.choices[0];
      responseMessage = choice?.message;
    }

    const finalReply = responseMessage?.content || "I have analyzed the data and updated the executive records.";

    // Store AI Bot reply
    const botMsg = await db.chatMessage.create({
      data: {
        conversationId: aiConversation.id,
        senderId: aiBot.id,
        content: finalReply,
        messageType: "TEXT",
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    // Touch conversation updated timestamp
    await db.chatConversation.update({
      where: { id: aiConversation.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: {
        userMessage: {
          id: userMsg.id,
          content: userMsg.content,
          senderId: userMsg.senderId,
          senderName: `${userMsg.sender.firstName} ${userMsg.sender.lastName}`,
          senderAvatar: userMsg.sender.avatarUrl,
          messageType: userMsg.messageType,
          createdAt: userMsg.createdAt.toISOString(),
        },
        botMessage: {
          id: botMsg.id,
          content: botMsg.content,
          senderId: botMsg.senderId,
          senderName: "BharatEdge AI",
          senderAvatar: null,
          messageType: botMsg.messageType,
          createdAt: botMsg.createdAt.toISOString(),
        },
      },
    });
  } catch (err: any) {
    console.error("[AiAgentChatRoute Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process AI conversation." },
      { status: 500 }
    );
  }
}
