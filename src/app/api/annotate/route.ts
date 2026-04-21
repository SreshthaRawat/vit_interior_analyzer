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

type AnnotationAnalysis = {
  roomType?: string;
  dimensions?: {
    length?: string;
    width?: string;
    height?: string;
    floorArea?: string;
  };
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageData = String(formData.get("imageData") || "");
    const analysisContext = String(formData.get("analysisContext") || "");

    if (!imageData || !analysisContext) {
      return NextResponse.json(
        { error: "Missing required annotation fields." },
        { status: 400, headers: corsHeaders() },
      );
    }

    const [header, base64] = imageData.split(",");
    const mimeType = header?.match(/:(.*?);/)?.[1] ?? "image/jpeg";

    if (!base64) {
      return NextResponse.json(
        { error: "Invalid image data." },
        { status: 400, headers: corsHeaders() },
      );
    }

    let analysis: AnnotationAnalysis;
    try {
      analysis = JSON.parse(analysisContext) as AnnotationAnalysis;
    } catch {
      return NextResponse.json(
        { error: "Invalid analysis context JSON." },
        { status: 400, headers: corsHeaders() },
      );
    }

    const prompt = `You are a professional architectural 
documentation tool. Add precise dimension annotations to 
this room photograph following standard architectural 
drawing conventions.

CONFIRMED MEASUREMENTS:
- Length: ${analysis.dimensions?.length ?? "unknown"}
- Width: ${analysis.dimensions?.width ?? "unknown"}
- Ceiling height: ${analysis.dimensions?.height ?? "unknown"}

STEP 1 — OBSERVE THE GEOMETRY:
Before drawing anything, study this specific photo carefully:
- Identify the exact pixel edges where floor meets walls
- Find the strongest visible vertical corner for height
- Identify the perspective direction and vanishing points
- Note which areas are clear of furniture and clutter
- If the ceiling is vaulted or sloped, note the lowest 
  and highest visible points separately

STEP 2 — DRAW ANNOTATIONS FOLLOWING THESE EXACT RULES:

LINE STYLE:
- Use thin, crisp lines — 1 to 1.5px weight maximum
- Color: pure white (#FFFFFF) with a 1px dark shadow/outline 
  so lines are visible on both light and dark surfaces
- Draw proper architectural dimension lines:
  * Two short perpendicular extension lines at each end 
    (like small tick marks, 8-10px long)
  * One horizontal or vertical dimension line connecting them
  * Small filled arrow or slash at each terminus

LABEL STYLE:
- Place measurement text at the exact midpoint of each 
  dimension line, centered above the line
- Font: clean sans-serif, small — approximately 11-12px
- Format: numbers only with unit — "4.2m" not "4.2 M" 
  not "4200mm" not "LENGTH: 4.2m"
- White text with subtle dark outline for readability
- No other text anywhere on the image — no room type label,
  no floor area label, no title, no watermark

WHAT TO ANNOTATE — exactly these three dimensions, nothing more:
1. LENGTH: draw along the longest visible floor edge or 
   skirting board line. If floor edge is not clear, draw 
   just above the floor plane along the wall base.
2. WIDTH: draw along the perpendicular floor edge or the 
   front edge of the visible floor plane
3. HEIGHT: draw a vertical line on the clearest visible 
   room corner. If ceiling is vaulted or sloped, annotate 
   the clear height at the lowest visible point only — 
   one measurement, not multiple

PLACEMENT RULES:
- Dimension lines must follow the actual perspective 
  of THIS photo — never draw flat horizontal/vertical 
  lines if the floor edges are at an angle in the photo
- Keep lines close to the edges they measure — 
  15 to 25px offset from the actual surface edge
- Never overlap furniture, people, or visually busy areas
- If an edge is partially obscured, draw the line along 
  the visible portion only
- Do not extend lines outside the photo boundary

WHAT NOT TO DO:
- Do not label room type anywhere on the image
- Do not label floor area on the image
- Do not add any title, legend, or scale bar
- Do not add north arrow or compass
- Do not change anything else in the photo
- Do not add grid lines or reference marks
- Do not duplicate any annotation

Return the photo with only these three clean dimension 
annotations added. Everything else must be pixel-identical 
to the input.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY." },
        { status: 500, headers: corsHeaders() },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const imageModel = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-image-preview",
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
      } as Parameters<typeof genAI.getGenerativeModel>[0]["generationConfig"],
    });

    const generated = await imageModel.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
      { text: prompt },
    ]);

    const parts = generated?.response?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part) => part.inlineData?.data && part.inlineData?.mimeType);

    if (!imagePart?.inlineData?.data || !imagePart.inlineData.mimeType) {
      return NextResponse.json(
        { error: "Annotation failed — model did not return an image. Try again." },
        { status: 500, headers: corsHeaders() },
      );
    }

    const stream = new ReadableStream({
      start(controller) {
        const payload = JSON.stringify({
          result: {
            imageData: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType,
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
      { error: "Annotation request failed. Please try again." },
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
