import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Replicate from "replicate";
import { initializeApp } from "firebase/app";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import path from "path";
import { promises as fsPromises } from "fs";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTHDOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECTID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGINGSENDERID,
  appId: process.env.NEXT_PUBLIC_APPID,
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);
const replicate = new Replicate({
  auth: process.env.REPLICATE_MUSIC_API_TOKEN,
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

    // If response.audio is a URL, fetch it firsxs
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

export async function GET() {
  try {
    const querySnapshot = await getDocs(collection(db, "music"));
    const musicList = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return NextResponse.json(musicList);
  } catch (error) {
    console.error("[FETCH_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// export async function DELETE(req: {
//   json: () => PromiseLike<{ id: any; url: any }> | { id: any; url: any };
// }) {
//   try {
//     const { id, url } = await req.json();
//     if (!id || !url)
//       return new NextResponse("Missing parameters", { status: 400 });

//     const fileRef = ref(storage, url);
//     await deleteObject(fileRef);
//     await deleteDoc(doc(db, "music", id));

//     return new NextResponse("Deleted successfully", { status: 200 });
//   } catch (error) {
//     console.error("[DELETE_ERROR]", error);
//     return new NextResponse("Internal error", { status: 500 });
//   }
// }
