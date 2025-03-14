import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Replicate from "replicate";
import path from "path";
import { promises as fsPromises } from "fs";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Helper function to read a ReadableStream and convert it to a Buffer
async function streamToBuffer(stream: ReadableStream) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  // let done = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value instanceof Uint8Array) {
      chunks.push(value);
    }
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

    // If response.audio is a URL, fetch it first
    let audioStream: ReadableStream;

    if (typeof response.audio === "string") {
      try {
        const audioResponse = await fetch(response.audio);
        if (!audioResponse.ok || !audioResponse.body) {
          return NextResponse.json(
            { error: "Failed to fetch audio stream" },
            { status: 500 }
          );
        }
        audioStream = audioResponse.body;
      } catch (fetchError) {
        console.error("[AUDIO_FETCH_ERROR]", fetchError);
        return NextResponse.json(
          { error: "Error fetching audio stream" },
          { status: 500 }
        );
      }
    } else {
      audioStream = response.audio as ReadableStream;
    }

    // Convert ReadableStream to Buffer
    const audioBuffer = await streamToBuffer(audioStream);

    // Save to a temporary file (you can replace this with an upload to S3 or Cloudinary)
    const filePath = path.join(process.cwd(), "public", "generated_audio.mp3");

    try {
      await fsPromises.writeFile(filePath, audioBuffer);
    } catch (fsError) {
      console.error("[FILE_WRITE_ERROR]", fsError);
      return NextResponse.json(
        { error: "Failed to save audio file" },
        { status: 500 }
      );
    }

    // ✅ Ensure correct URL format for deployment environments
    const audioUrl = `/generated_audio.mp3`;

    return NextResponse.json({ audio: audioUrl });
  } catch (error) {
    console.error("[MUSIC_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
