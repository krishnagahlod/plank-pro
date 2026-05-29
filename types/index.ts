export type Profile = {
  id: string;
  full_name: string;
  email: string;
  city: string;
  phone: string | null;
  created_at: string;
};

export type Attempt = {
  id: string;
  user_id: string;
  total_seconds: number;
  valid_seconds: number;
  form_score: number;
  combined_score: number;
  is_best: boolean;
  created_at: string;
};

export type LeaderboardRow = {
  full_name: string;
  city: string;
  valid_seconds: number;
  form_score: number;
  combined_score: number;
  created_at: string;
  is_shortlisted: boolean;
};

export type FormState =
  | { kind: "IDLE" }
  | { kind: "READY" }
  | { kind: "IN_PLANK"; startedAt: number }
  | { kind: "WARNING"; startedAt: number; violationStartedAt: number }
  | { kind: "DISQUALIFIED"; reason: string }
  | { kind: "COMPLETED" };

export type EventMode = "online" | "offline";

export type Event = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  mode: EventMode;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  registration_url: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};
