import { NextRequest, NextResponse } from "next/server";
import { analyzeLead } from "@/lib/analyzeLead";
import { friendlyAnalysisError } from "@/lib/aiErrors";
import type { LeadFormInput } from "@/lib/types";

export async function POST(req: NextRequest) {
  let body: Partial<LeadFormInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body.name || !body.name.trim()) {
    return NextResponse.json(
      { error: "Lead name is required." },
      { status: 400 }
    );
  }

  const input: LeadFormInput = {
    name: body.name,
    location: body.location || "",
    requirement: body.requirement || "",
    budget: body.budget || "",
    timeline: body.timeline || "",
    message: body.message || "",
  };

  try {
    const analysis = await analyzeLead(input);
    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Raw provider detail (model names, "503", quota text) is useful for
    // debugging but never belongs in front of a salesperson — log it here,
    // server-side only, and translate it to something readable below.
    console.error("[analyze-lead] AI call failed:", message);

    const isRateLimit =
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("rate") ||
      message.toLowerCase().includes("429");

    return NextResponse.json(
      { error: friendlyAnalysisError(message) },
      { status: isRateLimit ? 429 : 502 }
    );
  }
}
