import { NextResponse } from "next/server";

export const maxDuration = 60;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

const systemPrompt = `You are an expert architectural spatial analyst with deep knowledge of building proportions,
standard dimensions, and interior design.
Analyze the provided room photograph and return structured spatial data.
You MUST return ONLY valid JSON. No markdown fences. No explanation. No text before or after the JSON.

Return this exact JSON schema:
{
  "roomType": string,
  "dimensions": {
    "length": string,
    "width": string,
    "height": string,
    "floorArea": string
  },
  "detectedObjects": [
    {
      "name": string,
      "estimatedSize": string,
      "confidence": "low" | "medium" | "high"
    }
  ],
  "calibrationUsed": boolean,
  "overallConfidence": "low" | "medium" | "high",
  "notes": string
}`;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const calibrationValue = String(formData.get("calibrationValue") || "");
    const calibrationTarget = String(formData.get("calibrationTarget") || "door_height");

    if (!image || !(image instanceof File)) {
      return NextResponse.json(
        { error: "Missing image file." },
        { status: 400, headers: corsHeaders() },
      );
    }

    const allowedMediaTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowedMediaTypes.has(image.type)) {
      return NextResponse.json(
        { error: "Unsupported image type." },
        { status: 400, headers: corsHeaders() },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY." },
        { status: 500, headers: corsHeaders() },
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mediaType = image.type as "image/png" | "image/jpeg" | "image/webp";

    const hasCalibration = calibrationValue.trim() !== "";
    const calibrationContext = hasCalibration
      ? `The user has provided a calibration reference: the ${calibrationTarget.replace("_", " ")} in this room is ${calibrationValue} meters. Use this as your scale anchor and recalibrate all other measurements proportionally.`
      : "No calibration reference was provided. Make your best estimates based on standard architectural proportions and visible reference objects (standard door = 2.1m, standard ceiling = 2.4-2.7m, standard chair seat = 0.45m, etc.).";

    const userMessage = `${calibrationContext}

Analyze this interior photograph. Identify:
1. The room type
2. Estimated room dimensions (length, width, ceiling height) and total floor area
3. All visible objects with their estimated sizes (furniture, fixtures, doors, windows)
4. Your confidence level in the measurements

Be specific and architectural in your estimates. Use standard object sizes as scale references where the calibration anchor is not available.`;

    const model = process.env.GEMINI_ANALYZE_MODEL?.trim() || "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          generationConfig: {
            responseMimeType: "application/json",
          },
          contents: [
            {
              parts: [
                { text: `${systemPrompt}\n\n${userMessage}` },
                {
                  inlineData: {
                    mimeType: mediaType,
                    data: base64,
                  },
                },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Analysis failed. Please try again." },
        { status: 500, headers: corsHeaders() },
      );
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      return NextResponse.json(
        { error: "Analysis returned invalid data. Please try again." },
        { status: 500, headers: corsHeaders() },
      );
    }

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json({ result: parsed }, { headers: corsHeaders() });
    } catch {
      return NextResponse.json(
        { error: "Analysis returned invalid data. Please try again." },
        { status: 500, headers: corsHeaders() },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500, headers: corsHeaders() },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  });
}
