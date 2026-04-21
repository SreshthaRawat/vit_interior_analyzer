import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function parseDataUrl(imageDataUrl: string) {
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

function extractImageFromResponse(
  response: Awaited<ReturnType<ReturnType<GoogleGenerativeAI["getGenerativeModel"]>["generateContent"]>>,
) {
  const parts = response?.response?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.data && part.inlineData?.mimeType) {
      return {
        imageData: part.inlineData.data,
        mimeType: part.inlineData.mimeType,
      };
    }
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageDataUrl = String(formData.get("imageData") || "");
    const editType = String(formData.get("editType") || "") as
      | "remove"
      | "add"
      | "material";
    const editPrompt = String(formData.get("editPrompt") || "").trim();
    const materialSurface = String(formData.get("materialSurface") || "floor");
    const analysisContextRaw = formData.get("analysisContext");

    let analysisContext: {
      roomType?: string;
      dimensions?: {
        length?: string;
        width?: string;
        height?: string;
        floorArea?: string;
      };
      detectedObjects?: {
        name: string;
        estimatedSize: string;
      }[];
    } | null = null;

    if (analysisContextRaw && typeof analysisContextRaw === "string") {
      try {
        analysisContext = JSON.parse(analysisContextRaw);
      } catch {
        analysisContext = null;
      }
    }

    if (!imageDataUrl || !editPrompt || !["remove", "add", "material"].includes(editType)) {
      return NextResponse.json(
        { error: "Missing required edit fields." },
        { status: 400, headers: corsHeaders() },
      );
    }

    const parsed = parseDataUrl(imageDataUrl);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid image data." },
        { status: 400, headers: corsHeaders() },
      );
    }

    const roomContextBlock = analysisContext
      ? `You are editing a photo of a ${analysisContext.roomType ?? "room"} 
measuring ${analysisContext.dimensions?.length ?? "?"} × ${analysisContext.dimensions?.width ?? "?"} 
with ${analysisContext.dimensions?.height ?? "?"} ceiling height 
(${analysisContext.dimensions?.floorArea ?? "?"} floor area).
The room contains the following detected objects: ${
          analysisContext.detectedObjects
            ?.map((o) => `${o.name} (${o.estimatedSize})`)
            .join(", ") ?? "unknown objects"
        }.`
      : "";

    let instruction = "";

    if (editType === "remove") {
      instruction = `${roomContextBlock}

User instruction: Remove the following object from this room photo: ${editPrompt}.
Fill the vacated area naturally with what would realistically exist 
behind or beneath the removed object given the room type and 
surrounding elements — wall surface, floor, or ceiling as appropriate.
Keep every other detected object exactly as it is.
Maintain the room's existing lighting direction, perspective, 
and photographic style.`;
    }

    if (editType === "add") {
      instruction = `${roomContextBlock}

User instruction: Add the following to this room photo: ${editPrompt}.
Scale the new object proportionally to the room dimensions.
Respect the room's existing perspective, lighting direction, 
and spatial depth.
Place it so it looks like it naturally belongs in a 
${analysisContext?.roomType ?? "room"} of this size.
Keep every other detected object exactly as it is.`;
    }

    if (editType === "material") {
      instruction = `${roomContextBlock}

User instruction: Replace the ${materialSurface} finish in this room with: ${editPrompt}.
Apply the new finish consistently across all visible ${materialSurface} 
surface area in the photo.
Ensure the texture and pattern scale looks realistic for a room 
measuring ${analysisContext?.dimensions?.floorArea ?? "this size"}.
Keep all furniture, objects, and other surfaces exactly as they are.
Maintain the same photographic perspective and lighting conditions.`;
    }

    if (!instruction) {
      return NextResponse.json(
        { error: "Invalid edit type provided." },
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

    const defaultModel = "gemini-3.1-flash-image-preview";
    const fallbackModel = "gemini-2.5-flash-image";
    const primaryModel = process.env.GEMINI_IMAGE_MODEL?.trim() || defaultModel;

    const genAI = new GoogleGenerativeAI(apiKey);

    const runModel = async (modelName: string) => {
      const imageModel = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseModalities: ["image", "text"],
        } as Parameters<typeof genAI.getGenerativeModel>[0]["generationConfig"],
      });

      const generated = await imageModel.generateContent([
        {
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.data,
          },
        },
        { text: instruction },
      ]);
      return extractImageFromResponse(generated);
    };

    let result = await runModel(primaryModel);
    if (!result && primaryModel !== fallbackModel) {
      result = await runModel(fallbackModel);
    }

    if (!result) {
      return NextResponse.json(
        { error: "Edit failed. The AI could not process this request. Try rephrasing." },
        { status: 500, headers: corsHeaders() },
      );
    }

    const stream = new ReadableStream({
      start(controller) {
        const payload = JSON.stringify({
          result: {
            imageData: result.imageData,
            mimeType: result.mimeType,
          },
        });
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders(),
        "Content-Type": "application/json",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Edit failed. The AI could not process this request. Try rephrasing." },
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
