
import { GoogleGenAI } from "@google/genai";

// Safely access process.env
const env = typeof process !== 'undefined' ? process.env : {};

// Initialize the Gemini API client with the environment variable API_KEY
const ai = new GoogleGenAI({ apiKey: env.API_KEY || '' });

export const getTravelSuggestions = async (query: string, location?: { lat: number, lng: number }) => {
  try {
    // Using gemini-3-flash-preview as it is the recommended model for general tasks
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `請針對以下旅遊請求提供 3 個有趣的景點或活動建議，並附上簡短描述。請使用繁體中文（Traditional Chinese）回答。請求內容： "${query}"。`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: location ? {
              latitude: location.lat,
              longitude: location.lng
            } : undefined
          }
        }
      },
    });

    // Access the text property directly as per the SDK guidelines
    const responseText = response.text || "找不到建議。";
    
    // Extract grounding chunks for Maps URLs
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const links = groundingChunks
      .map((chunk: any) => {
        if (chunk.maps) {
          return {
            title: chunk.maps.title || "在地圖上查看",
            url: chunk.maps.uri
          };
        }
        return null;
      })
      .filter((l: any) => l !== null && l.url);

    return {
      text: responseText,
      links: links
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: "目前無法取得建議。", links: [] };
  }
};
