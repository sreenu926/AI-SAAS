import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Replicate from "replicate";
import fs from "fs";
import path from "path";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Helper function to read a ReadableStream and convert it to a Buffer
async function streamToBuffer(stream: ReadableStream) {
  const reader = stream.getReader();
  const chunks = [];
  let done = false;

  while (!done) {
    const { value, done: doneReading } = await reader.read();
    if (value) chunks.push(value);
    done = doneReading;
  }

  return Buffer.concat(chunks);
}

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
      return new NextResponse("Prompt are required", { status: 400 });
    }

    type ReplicateResponse = {
      audio?: string; // Assuming audio is a string URL
      output?: string[]; // If it's an array, adjust accordingly
    };

    const response: ReplicateResponse = await replicate.run(
      "riffusion/riffusion:8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05",
      { input: { prompt_a: prompt } }
    );

    console.log("[REPLICATE_RESPONSE]", response);

    if (!response?.audio) {
      console.log("[DEBUG_REPLICATE_RESPONSE]", response);
      return NextResponse.json(
        { error: "Audio stream not found" },
        { status: 500 }
      );
    }

    // Convert ReadableStream to Buffer
    const audioBuffer = await streamToBuffer(response.audio);

    // Save to a temporary file (you can replace this with an upload to S3 or Cloudinary)
    const filePath = path.join(process.cwd(), "public", "generated_audio.mp3");
    fs.writeFileSync(filePath, audioBuffer);

    // Return public URL (adjust based on your deployment setup)
    return NextResponse.json({
      audio: "/generated_audio.mp3",
    });
  } catch (error) {
    console.error("[MUSIC_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
