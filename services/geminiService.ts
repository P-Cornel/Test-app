
import { GoogleGenAI, Type } from "@google/genai";
import { SheetRow, ColumnMapping } from "../types";

// Defensive check for environment variable in browser environment
const getApiKey = (): string => {
  try {
    // @ts-ignore
    return (typeof process !== 'undefined' && process.env && process.env.API_KEY) || '';
  } catch (e) {
    return '';
  }
};

export const identifyColumns = async (headers: string[], sampleRows: SheetRow[]): Promise<ColumnMapping> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("API_KEY is missing. Falling back to heuristic mapping.");
    return fallbackMapping(headers);
  }

  const ai = new GoogleGenAI({ apiKey });
  const sampleDataStr = JSON.stringify(sampleRows.slice(0, 5));
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following CSV headers and sample data. 
      Identify the column(s) representing geographic coordinates.
      Headers: ${headers.join(", ")}
      Sample Data: ${sampleDataStr}
      
      Rules:
      1. If a single column contains BOTH values (e.g. "40.7, -74.0"), return that column name for BOTH latColumn and lngColumn.
      2. Coordinates might use a comma as a decimal separator (European style: 48,85) or a column separator.
      3. Look for headers like 'lat', 'long', 'coords', 'location', 'gps', 'y', 'x'.
      4. Return valid JSON only.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            latColumn: { type: Type.STRING, description: "Header for latitude" },
            lngColumn: { type: Type.STRING, description: "Header for longitude" }
          },
          required: ["latColumn", "lngColumn"]
        }
      }
    });

    const text = response.text;
    const mapping = JSON.parse(text);
    return mapping as ColumnMapping;
  } catch (e) {
    console.error("Failed to fetch column mapping from Gemini", e);
    return fallbackMapping(headers);
  }
};

const fallbackMapping = (headers: string[]): ColumnMapping => {
  const lat = headers.find(h => {
    const l = h.toLowerCase();
    return l.includes('lat') || l.includes('y') || l === 'coordinates' || l === 'coords';
  });
  const lng = headers.find(h => {
    const l = h.toLowerCase();
    return l.includes('lng') || l.includes('long') || l.includes('x') || l === 'coordinates' || l === 'coords';
  });
  return { 
    latColumn: lat || headers[0], 
    lngColumn: lng || headers[1] 
  };
};

export const getSheetInsights = async (rows: SheetRow[]): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "Visualize your spatial data using the map tools below.";

  const ai = new GoogleGenAI({ apiKey });
  const dataSummary = JSON.stringify(rows.slice(0, 10));
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user uploaded geographic data. 
      Summarize what these locations represent in 1-2 short sentences: ${dataSummary}.`,
    });
    return response.text;
  } catch (e) {
    return "Mapping complete. Explore the locations on the right.";
  }
};
