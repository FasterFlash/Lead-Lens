"use client";

import { useCallback, useEffect, useState } from "react";
import { SEED_LEADS } from "./seedData";
import { friendlyAnalysisError, friendlyChatError } from "./aiErrors";
import {
  appendChatMessage,
  claimLead as claimLeadFn,
  createLeadSkeleton,
  loadLeads,
  logContactOutcome,
  saveLeads,
  upsertLead,
} from "./storage";
import type { ChatMessage, ContactLog, Lead, LeadFormInput } from "./types";

const CURRENT_REP = "Demo Agent"; // no auth in this build — single hardcoded identity, documented in README

async function runAnalysis(lead: Lead): Promise<Lead> {
  try {
    const res = await fetch("/api/analyze-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ...lead, analysisStatus: "failed", analysisError: data.error };
    }
    return { ...lead, analysis: data.analysis, analysisStatus: "done" };
  } catch (err) {
    // Never reached the server at all (offline, DNS, etc.) — still never
    // show the raw JS error text, same rule as a server-side AI failure.
    return {
      ...lead,
      analysisStatus: "failed",
      analysisError: friendlyAnalysisError(err instanceof Error ? err.message : "network error"),
    };
  }
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Load once on mount. If nothing is stored yet, seed with demo leads —
  // this is what makes the dashboard non-empty the instant someone opens
  // the link, no manual setup required. Analysis is NOT auto-triggered for
  // seed leads: each one sits "not_started" until explicitly analyzed via
  // triggerAnalysis, so opening/reloading the app during testing never
  // spends free-tier quota on its own. (Stage 2: ship these pre-analyzed
  // from a real backend instead — see task list.)
  useEffect(() => {
    const existing = loadLeads();
    if (existing.length > 0) {
      setLeads(existing);
      setInitialized(true);
      return;
    }

    const skeletons = SEED_LEADS.map((input) => createLeadSkeleton(input));
    setLeads(skeletons);
    saveLeads(skeletons);
    setInitialized(true);
  }, []);

  const persist = useCallback((next: Lead[]) => {
    setLeads(next);
    saveLeads(next);
  }, []);

  const addLead = useCallback(
    async (input: LeadFormInput) => {
      // Submitting the form IS the explicit trigger — analyze immediately,
      // unlike seed leads which wait for a manual click.
      const skeleton = { ...createLeadSkeleton(input), analysisStatus: "pending" as const };
      persist(upsertLead(leads, skeleton));

      const analyzed = await runAnalysis(skeleton);
      setLeads((prev) => {
        const next = upsertLead(prev, analyzed);
        saveLeads(next);
        return next;
      });
      return skeleton.id;
    },
    [leads, persist]
  );

  /** Manually trigger (or retry) analysis for one lead — used for seed
   *  leads sitting "not_started", and for leads whose analysis "failed". */
  const triggerAnalysis = useCallback(
    async (leadId: string) => {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) return;
      persist(upsertLead(leads, { ...lead, analysisStatus: "pending" }));
      const analyzed = await runAnalysis(lead);
      setLeads((prev) => {
        const next = upsertLead(prev, analyzed);
        saveLeads(next);
        return next;
      });
    },
    [leads, persist]
  );

  const claimLead = useCallback(
    (leadId: string) => {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) return;
      persist(upsertLead(leads, claimLeadFn(lead, CURRENT_REP)));
    },
    [leads, persist]
  );

  const logOutcome = useCallback(
    (
      leadId: string,
      outcome: ContactLog["outcome"],
      notes: string,
      nextFollowUpDate?: string
    ) => {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) return;
      persist(
        upsertLead(leads, logContactOutcome(lead, outcome, notes, nextFollowUpDate))
      );
    },
    [leads, persist]
  );

  const sendChatMessage = useCallback(
    async (leadId: string, question: string) => {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) return;

      const userMsg: ChatMessage = {
        id: `${Date.now()}-u`,
        role: "user",
        content: question,
        timestamp: new Date().toISOString(),
      };
      const withUserMsg = appendChatMessage(lead, userMsg);
      persist(upsertLead(leads, withUserMsg));

      try {
        const res = await fetch("/api/lead-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead: withUserMsg,
            history: lead.chatHistory,
            question,
          }),
        });
        const data = await res.json();
        // On failure, data.error is already a friendly message (the API
        // route translates the raw Gemini/network error server-side) — no
        // emoji prefix, no "Error:" label, just marked so the UI can show
        // it as a quiet notice instead of a normal answer bubble.
        const assistantMsg: ChatMessage = res.ok
          ? {
              id: `${Date.now()}-a`,
              role: "assistant",
              content: data.answer,
              timestamp: new Date().toISOString(),
            }
          : {
              id: `${Date.now()}-a`,
              role: "assistant",
              content: data.error || friendlyChatError("unknown"),
              timestamp: new Date().toISOString(),
              isError: true,
            };
        setLeads((prev) => {
          const current = prev.find((l) => l.id === leadId);
          if (!current) return prev;
          const next = upsertLead(
            prev,
            appendChatMessage(current, assistantMsg)
          );
          saveLeads(next);
          return next;
        });
      } catch (err) {
        const assistantMsg: ChatMessage = {
          id: `${Date.now()}-a`,
          role: "assistant",
          content: friendlyChatError(err instanceof Error ? err.message : "network error"),
          timestamp: new Date().toISOString(),
          isError: true,
        };
        setLeads((prev) => {
          const current = prev.find((l) => l.id === leadId);
          if (!current) return prev;
          const next = upsertLead(
            prev,
            appendChatMessage(current, assistantMsg)
          );
          saveLeads(next);
          return next;
        });
      }
    },
    [leads, persist]
  );

  return {
    leads,
    initialized,
    addLead,
    triggerAnalysis,
    claimLead,
    logOutcome,
    sendChatMessage,
    currentRep: CURRENT_REP,
  };
}
