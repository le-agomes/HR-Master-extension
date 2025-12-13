import { GoogleGenAI, Type, SchemaType } from "@google/genai";
import { AnalysisResult } from "../types";

// NOTE: In a Chrome Extension, you would typically bundle the key or ask the user to input it.
// For this generation, we use process.env.API_KEY as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeJD = async (text: string): Promise<AnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert HR consultant and Recruiter. Analyze the following Job Description text.
      
      Text to analyze:
      """
      ${text}
      """
      
      Provide a score out of 100 based on clarity, inclusiveness, completeness, and appeal.
      Provide a brief 1-sentence summary.
      List up to 3 key strengths.
      List up to 3 key improvements.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: "Score out of 100" },
            summary: { type: Type.STRING, description: "A one sentence summary of the quality" },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of strengths"
            },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of improvements"
            }
          },
          required: ["score", "summary", "strengths", "improvements"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from Gemini");
    }

    return JSON.parse(jsonText) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze the text with Gemini.");
  }
};
