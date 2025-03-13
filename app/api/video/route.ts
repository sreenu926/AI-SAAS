import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req: Request) {
  try {
    const authData = await auth();
    const userId = authData?.userId;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { prompt } = body;

    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    const response = await replicate.run(
      "anotherjesse/zeroscope-v2-xl:9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
      {
        input: {
          prompt,
        },
      }
    );

    console.log("[API RESPONSE]", response); // Check structure

    if (!response || !response[0]) {
      return NextResponse.json(
        { error: "Video generation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ videoUrl: String(response[0]) });
  } catch (error) {
    console.error("[VIDEO_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
