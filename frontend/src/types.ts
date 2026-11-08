export type Player = {
  id: string;
  name: string;
  seat: number;
  stack: number;
  connected: boolean;
  in_hand: boolean;
  folded: boolean;
  committed: number;
  all_in: boolean;
};
export type TableSettings = {
  small_blind: number;
  big_blind: number;
  seven_deuce_bonus: number;
  cents: boolean;
};
export type State = TableSettings & {
  players: Player[];
  you: string;
  dealer: string;
  actor: string | null;
  street: string;
  running: boolean;
  board: string[];
  hand: string[];
  hand_strengths: string[];
  shown_hand_strengths?: Record<string, string[]>;
  pot: number;
  target: number;
  queued_stack: number | null;
  queued_settings: TableSettings | null;
  min_raise_to: number;
  max_raise_to: number;
  can_raise: boolean;
  call_amount: number;
  hand_number: number;
  history: string[];
  runout_vote: null | {
    hand_id: string;
    eligible: string[];
    hands?: Record<string, string[]>;
    votes: Record<string, number>;
    deadline: string;
  };
  result: null | {
    cents?: boolean;
    payouts: Record<string, number>;
    pots: { amount: number; winners: string[] }[];
    hands: Record<string, string[]>;
    shown_indices?: Record<string, number[]>;
    seven_deuce_bonus?: { winner: string; payments: Record<string, number>; total: number } | null;
    runouts?: { board: string[]; payouts: Record<string, number>; pots: { amount: number; winners: string[]; runout: number }[] }[];
  };
};
