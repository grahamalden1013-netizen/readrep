export type Profile = {
  id: string;
  role: "player" | "coach";
  full_name: string;
  team_id: string | null;
  created_at: string;
};

export type Team = {
  id: string;
  name: string;
  coach_id: string;
  invite_code: string | null;
  created_at: string;
};

export type Game = {
  id: string;
  team_id: string;
  title: string;
  video_url: string;
  created_at: string;
};

export type Clip = {
  id: string;
  game_id: string;
  decision_timestamp_ms: number;
  prompt: string;
  options: string[];
  correct_option: string;
  feedback: string;
  created_at: string;
};

export type Session = {
  id: string;
  player_id: string;
  assigned_by: string;
  completed_at: string | null;
  created_at: string;
};

export type SessionClip = {
  session_id: string;
  clip_id: string;
  position: number;
};

export type Prediction = {
  id: string;
  session_id: string;
  clip_id: string;
  player_id: string;
  selected_option: string;
  is_correct: boolean;
  created_at: string;
};

export type SessionSummary = Session & {
  clip_count: number;
  game_title: string | null;
};
