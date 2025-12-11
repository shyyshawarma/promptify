import { RoundData, LeaderboardEntry } from './types';

export const ROUNDS: RoundData[] = [
  {
    id: 1,
    title: "The Polite Robot",
    description: "Reverse engineer the prompt to get this exact polite refusal.",
    type: 'text',
    targetContent: "I apologize, but I cannot fulfill that request as it goes against my safety guidelines. Is there anything else I can help you with today?",
  },
  {
    id: 2,
    title: "JSON Architect",
    description: "Make the model output this exact JSON structure for a user profile.",
    type: 'text',
    targetContent: `{"id":101,"active":true,"roles":["admin","editor"]}`,
    displayTarget: `{
  "id": 101,
  "active": true,
  "roles": ["admin", "editor"]
}`
  },
  {
    id: 3,
    title: "Pixel Perfect: The Coffee",
    description: "Generate an image that matches this target visual description: A minimal latte art heart in a white ceramic cup on a wooden table, top-down view.",
    type: 'image',
    targetContent: "https://picsum.photos/id/425/512/512", // Coffee cup
  },
  {
    id: 4,
    title: "Cyberpunk City",
    description: "Generate a futuristic cyberpunk city street at night with neon blue and pink lights, rain on pavement, and no people.",
    type: 'image',
    targetContent: "https://picsum.photos/id/203/512/512", // Using a placeholder bike/blur image for 'vibe' as a proxy, in real app would use specific generated asset
    // Since we rely on semantic similarity, we will compare against a provided description or reference image.
    // Let's use a specific reference for visual consistency.
  }
];

// Mock data removed in favor of Socket.io Server data
export const MOCK_LEADERBOARD: LeaderboardEntry[] = [];