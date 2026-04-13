import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface EvaluationResult {
  score: number;
  silhouette: string;
  advice: string;
  tags: string[];
}

export async function evaluateOutfit(userImageBase64: string): Promise<EvaluationResult> {
  const model = "gemini-3-flash-preview";
  const prompt = `
    Analyze this interview outfit. Provide a professionalism score (0-100), 
    a silhouette evaluation (how well it fits and the overall shape), 
    and stylist's advice for improvement.
    Also, provide 3 short hashtags (e.g., #전문성, #신뢰감) that describe the outfit.
    IMPORTANT: All text (silhouette, advice, and tags) MUST be in Korean.
    Return the result in JSON format with keys: "score" (number), "silhouette" (string), "advice" (string), "tags" (array of strings).
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: userImageBase64 } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json"
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse evaluation result", e);
    return { 
      score: 0, 
      silhouette: "이미지 분석 중 오류가 발생했습니다.", 
      advice: "다시 시도해주세요.",
      tags: ["#오류", "#재시도"]
    };
  }
}

export async function synthesizeOutfit(userImageBase64WithHeader: string, clothingImageBase64WithHeader: string): Promise<string> {
  // Using gemini-2.5-flash-image for broader compatibility
  const model = "gemini-2.5-flash-image";
  
  const userMimeType = userImageBase64WithHeader.split(';')[0].split(':')[1] || "image/jpeg";
  const userRawBase64 = userImageBase64WithHeader.split(',')[1];
  
  const clothingMimeType = clothingImageBase64WithHeader.split(';')[0].split(':')[1] || "image/jpeg";
  const clothingRawBase64 = clothingImageBase64WithHeader.split(',')[1];

  const prompt = `
    VIRTUAL TRY-ON INSTRUCTION:
    - INPUT 1: A person.
    - INPUT 2: A clothing item.
    - TASK: Generate a new image where the person from INPUT 1 is wearing the clothing from INPUT 2.
    - Keep the person's face and the background exactly as they are in INPUT 1.
    - Fit the new clothing naturally to the person's body.
    - Return ONLY the generated image.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType: userMimeType, data: userRawBase64 } },
          { inlineData: { mimeType: clothingMimeType, data: clothingRawBase64 } },
          { text: prompt }
        ]
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("이미지 생성 결과가 없습니다. 다른 사진으로 시도해보세요.");
  } catch (error) {
    console.error("Synthesis error:", error);
    throw error;
  }
}

export async function customRequest(userImageBase64: string, request: string): Promise<{ image?: string, advice: string }> {
  const model = "gemini-2.5-flash-image";
  const prompt = `
    The user has a styling request: "${request}".
    If the request involves a visual change (e.g., "change the tie color to red", "remove the glasses"), 
    generate a new image reflecting this change while keeping the rest of the person's appearance consistent.
    If the request is a question or general advice (e.g., "does this look okay?"), 
    provide a helpful and professional stylist's response in Korean.
    You can provide both a new image and text advice if appropriate.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: userImageBase64 } },
            { text: prompt }
          ]
        }
      ]
    });

    let generatedImage: string | undefined;
    let textAdvice = "";

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        } else if (part.text) {
          textAdvice += part.text;
        }
      }
    }

    return { image: generatedImage, advice: textAdvice || "요청하신 내용을 처리했습니다." };
  } catch (error) {
    console.error("Custom request error:", error);
    return { advice: "요청을 처리하는 중 오류가 발생했습니다." };
  }
}
