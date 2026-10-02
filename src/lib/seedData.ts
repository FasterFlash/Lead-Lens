import type { LeadFormInput } from "./types";

/**
 * Demo leads, deliberately varied in origin and messiness.
 *
 * The form only has one free-text field, but real leads arrive from very
 * different sources before they ever reach it — a terse portal auto-form,
 * a broker's notes typed up after a physical site visit, a forwarded
 * WhatsApp message. The system doesn't need to know which is which, but
 * demoing with that variety shows the AI analysis actually holds up
 * against realistic noise, not just clean textbook input.
 *
 * Several deliberately include the edge cases discussed: budget stated in
 * the message that contradicts the structured field, vague timelines,
 * a near-empty message, and a non-Indian (Dubai) lead to prove the system
 * isn't hardcoded to INR/lakhs/crores.
 */
// Full set, kept for later — trimmed down to 2 below while we confirm the
// free-tier flow works end-to-end without tripping rate limits.
export const ALL_SEED_LEADS: LeadFormInput[] = [
  {
    name: "Ramesh Iyer",
    location: "Whitefield, Bangalore",
    requirement: "3BHK apartment",
    budget: "70L",
    timeline: "3-6 months",
    message:
      "Hi, saw your listing online. We are a family of 4, my parents will also stay with us so need a bit more space. Budget is around 70L but can stretch to 80 for the right place. Also looking at a couple of other projects nearby. Please call after 6pm, I'm at work during the day.",
  },
  {
    name: "Priya Nair",
    location: "Kochi",
    requirement: "2BHK",
    budget: "",
    timeline: "",
    message: "price?",
  },
  {
    name: "Suresh & Lakshmi Menon",
    location: "Adyar, Chennai",
    requirement: "4BHK villa",
    budget: "2.5Cr",
    timeline: "Immediate",
    message:
      "Visited the site on Sunday with the broker. Interested in corner plot unit, wife wants vastu-compliant layout, husband is the decision maker on budget but wants mother's approval before booking. Mentioned they are also evaluating a project in ECR. Asked specifically about RERA registration number and possession date.",
  },
  {
    name: "Fatima Al Mansoori",
    location: "Dubai Marina, UAE",
    requirement: "2BR apartment, investment",
    budget: "AED 1.8M",
    timeline: "1-2 months",
    message:
      "Looking for a rental-yield investment property, not for self-use. Need expected ROI figures and management/maintenance fee structure before proceeding. Can do video call only, based overseas currently.",
  },
  {
    name: "Arjun Verma",
    location: "Gurgaon Sector 82",
    requirement: "3BHK",
    budget: "1.2Cr",
    timeline: "just exploring",
    message:
      "just checking prices for now, not in a rush. will decide after diwali maybe. saw the ad on 99acres",
  },
  {
    name: "Deepa Krishnan",
    location: "Indiranagar, Bangalore",
    requirement: "2BHK, resale preferred",
    budget: "90L nego",
    timeline: "within 6 months",
    message:
      "Forwarded from my broker: client urgently needs 2bhk, says URGENT URGENT budget flexible can discuss. no other details given, broker says client hasn't actually confirmed area preference yet.",
  },
  {
    name: "Mohammed Rafi",
    location: "Hyderabad, Gachibowli",
    requirement: "3BHK",
    budget: "95L",
    timeline: "Immediate",
    message:
      "Already shortlisted 3 properties after 2 site visits this week. Just need final price negotiation and loan pre-approval process details. Ready to book this month if numbers work.",
  },
  {
    name: "Blank Portal Submission",
    location: "",
    requirement: "",
    budget: "",
    timeline: "",
    message: "",
  },
];

// Full demo set — 8 leads covering the edge cases discussed (budget
// contradiction, near-empty message, vastu/family dynamics, non-INR/Dubai,
// vague timeline, urgent-but-vague broker forward, a fast decisive buyer,
// and a fully blank submission) so a fresh deploy never shows testers an
// empty queue. Pipeline is confirmed stable on the free tier — this is the
// permanent set, not a temporary trim.
export const SEED_LEADS: LeadFormInput[] = ALL_SEED_LEADS;
