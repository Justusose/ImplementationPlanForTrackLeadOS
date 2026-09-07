export type Stage = "new" | "contacted" | "negotiating" | "won" | "lost";

export const STAGES: { key: Stage; label: string; tone: string }[] = [
  { key: "new", label: "New", tone: "#3b82f6" },
  { key: "contacted", label: "Contacted", tone: "#8b5cf6" },
  { key: "negotiating", label: "Negotiating", tone: "#d97706" },
  { key: "won", label: "Won", tone: "#16a34a" },
  { key: "lost", label: "Lost", tone: "#94a3b8" },
];

export interface Lead {
  id: string;
  workspace_id: string;
  name: string;
  phone: string | null;
  stage: Stage;
  source: string | null;
  campaign: string | null;
  value: number | null;
  position: number;
  assigned_to: string | null;
  created_at: string;
}

export interface SocialEvent {
  id: string;
  type: "comment" | "dm" | "mention";
  platform: "instagram" | "facebook" | "tiktok" | "x" | "linkedin";
  author: string;
  text: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: string;
  url: string;
  clicks: number;
  leads: number;
  spend: number;
}
