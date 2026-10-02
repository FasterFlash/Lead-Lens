import { NextRequest, NextResponse } from "next/server";
import { askLeadChat } from "@/lib/leadChat";
import { friendlyChatError } from "@/lib/aiErrors";
import type { ChatMessage, Lead } from "@/lib/types";

interface RequestBody {
  lead: Lead;
  history: ChatMessage[];
  question: string;
}

export async function POST(req: NextRequest) {
  let body: Partial<RequestBody>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.lead || !body.question || !body.question.trim()) {
    return NextResponse.json(
      { error: "lead and question are required." },
      { status: 400 }
    );
  }

  try {
    const answer = await askLeadChat(
      body.lead as Lead,
      body.history || [],
      body.question
    );
    return NextResponse.json({ answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[lead-chat] AI call failed:", message);

    const isRateLimit =
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("rate") ||
      message.toLowerCase().includes("429");

    return NextResponse.json(
      { error: friendlyChatError(message) },
      { status: isRateLimit ? 429 : 502 }
    );
  }
}
