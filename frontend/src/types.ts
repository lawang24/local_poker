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
export type LedgerSession = {
  name: string; start: string; end: string | null; buy_in: number; buy_out: number;
  movements: { at: string; amount: number; incoming: boolean; reason: "seat_entry" | "seat_removed" | "stack_adjustment" }[];
};
export type LedgerRow = {
  id: string; name: string; buy_in: number; buy_out: number; stack: number; net: number;
  sessions: LedgerSession[];
};
export type TableSettings = {
  small_blind: number;
  big_blind: number;
  seven_deuce_bonus: number;
  cents: boolean;
};
export type State = TableSettings & {
  players: Player[];
  ledger: LedgerRow[];
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
  chat_history: { name: string; text: string }[];
  server_time: number;
  runout: null | {
    hand_id: string; count: number; active: number; started_at: number;
    hands: Record<string, string[]>; boards: (string | null)[][];
    revealed_at: (number | null)[][]; backs_at: (number | null)[][];
    equities: Record<string, number>; phase: string;
  };
  runout_vote: null | {
    hand_id: string;
    eligible: string[];
    hands?: Record<string, string[]>;
    votes: Record<string, number>;
    deadline: string;
  };
  result: null | {
    runout_presentation?: { result_hold: number; refunds: Record<string, number> };
    cents?: boolean;
    payouts: Record<string, number>;
    stacks_before_payout?: Record<string, number>;
    winning_cards?: Record<string, string[]>;
    pots: { amount: number; winners: string[] }[];
    hands: Record<string, string[]>;
    shown_indices?: Record<string, number[]>;
    seven_deuce_bonus?: { winner: string; payments: Record<string, number>; total: number } | null;
    runouts?: { board: string[]; payouts: Record<string, number>; pots: { amount: number; winners: string[]; runout: number }[] }[];
  };
};
