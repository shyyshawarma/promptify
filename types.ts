export interface User {
  username: string;
  apiKey: string;
  avatarUrl: string;
}

export type RoundType = 'text' | 'image';

export interface RoundData {
  id: number;
  title: string;
  description: string;
  type: RoundType;
  targetContent: string; // Text string or Image URL
  displayTarget?: string; // Optional nice display version (if target is raw data)
}

export interface RoundResult {
  roundId: number;
  userPrompt: string;
  generatedContent: string;
  score: number;
  reasoning: string;
}

export interface GameState {
  currentRoundId: number;
  completedRounds: number[];
  results: Record<number, RoundResult>;
  totalScore: number;
}

export interface LeaderboardEntry {
  username: string;
  score: number;
  avatarUrl: string;
  rank: number;
  status: string; // e.g. "Round 1", "Thinking...", "Finished"
  isBot?: boolean;
}