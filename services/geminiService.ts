import { GoogleGenAI, Type, Schema } from "@google/genai";

// Helpers
const fileToGenerativePart = async (url: string): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  const response = await fetch(url);
  const blob = await response.blob();
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(blob);
  });
  const base64EncodedData = await base64EncodedDataPromise;
  return {
    inlineData: {
      data: base64EncodedData as string,
      mimeType: blob.type,
    },
  };
};

export class GeminiService {
  private ai: GoogleGenAI;
  public apiKey: string;

  constructor(apiKey: string) {
    // We instantiate with the user provided key
    // NOTE: In a production app, we would proxy this through a backend to avoid exposing keys,
    // or use the user's key client-side as requested by the prompt requirements.
    // The strict prompt rules enforce process.env.API_KEY usage for the *developer's* code, 
    // but here the USER is providing the key.
    // I will initialize it dynamically.
    this.apiKey = apiKey;
    this.ai = new GoogleGenAI({ apiKey });
  }

  async validateKey(): Promise<boolean> {
    try {
      // Simple lightweight check
      await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'ping',
      });
      return true;
    } catch (e) {
      console.error("Key validation failed", e);
      return false;
    }
  }

  async generateText(prompt: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "";
  }

  async generateImage(prompt: string): Promise<string> {
    // Using flash-image for speed as requested by "real time" feel
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
    });

    // Extract image
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part && part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("No image generated");
  }

  /**
   * Acts as the "Judge" to calculate similarity.
   * Returns a score 0-100 and reasoning.
   */
  async calculateSimilarity(
    target: string,
    generated: string,
    type: 'text' | 'image'
  ): Promise<{ score: number; reasoning: string }> {
    
    // Schema for the judge's output
    const judgeSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        score: {
          type: Type.NUMBER,
          description: "A similarity score between 0 and 100.",
        },
        reasoning: {
          type: Type.STRING,
          description: "Brief explanation of why this score was given.",
        },
      },
      required: ["score", "reasoning"],
    };

    if (type === 'text') {
      const prompt = `
        You are an objective judge in a prompt engineering contest.
        Compare the TARGET output with the GENERATED output.
        
        TARGET:
        """
        ${target}
        """

        GENERATED:
        """
        ${generated}
        """

        Task:
        1. Analyze semantic similarity, tone, and format.
        2. Assign a score from 0 to 100.
        3. 100 means exact match (ignoring trivial whitespace). 0 means completely unrelated.
        4. Be strict but fair. Give midway values (e.g., 56, 22) if it matches partially.
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: judgeSchema,
        }
      });

      const json = JSON.parse(response.text || "{}");
      return { score: json.score || 0, reasoning: json.reasoning || "Failed to judge." };
    
    } else {
      // IMAGE COMPARISON
      // We need to fetch the target URL and convert to base64 to send to the model
      const targetImagePart = await fileToGenerativePart(target);
      
      // Generated is already base64 data url, strip the prefix
      const generatedBase64 = generated.replace(/^data:image\/\w+;base64,/, "");
      const generatedImagePart = {
        inlineData: {
          data: generatedBase64,
          mimeType: "image/png", // Assuming PNG from generation
        }
      };

      const prompt = `
        You are a visual judge. 
        Image 1 is the TARGET. 
        Image 2 is the GENERATED output.
        Compare them based on composition, subject matter, style, and color palette.
        Give a similarity score (0-100).
        Be strict. If the subject is different, score low.
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash', // Flash 2.5 is multimodal and good for this
        contents: {
          parts: [
            targetImagePart, 
            generatedImagePart, 
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: judgeSchema,
        }
      });

      const json = JSON.parse(response.text || "{}");
      return { score: json.score || 0, reasoning: json.reasoning || "Failed to judge." };
    }
  }
}