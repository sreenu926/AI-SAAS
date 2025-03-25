import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Replicate from "replicate";
import { storage } from "@/configs/FirebaseConfig";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
  deleteObject,
} from "firebase/storage";

const replicate = new Replicate({
  auth: process.env.REPLICATE_IMAGE_API_TOKEN,
});

// POST: Generate and upload images
export async function POST(req: Request) {
  try {
    const authData = await auth();
    const userId = authData.userId;
    const body = await req.json();
    const { prompt, amount = 1, resolution = "256x256" } = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (!process.env.REPLICATE_IMAGE_API_TOKEN)
      return new NextResponse("Replicate API Key not configured", {
        status: 500,
      });
    if (!prompt) {
      return new NextResponse("Prompt required", { status: 400 });
    }
    if (!amount) {
      return new NextResponse("Amount required", { status: 400 });
    }
    if (!resolution) {
      return new NextResponse("Resolution required", { status: 400 });
    }

    const response = await replicate.run(
      "bytedance/sdxl-lightning-4step:5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637", // Model name
      {
        input: {
          prompt: prompt,
          num_outputs: Number(amount),
          num_inference_steps: 4,
          width: 1024,
          height: 1024,
        },
      }
    );

    console.log("response: ", response);
    if (!response || !Array.isArray(response)) {
      return new NextResponse("Failed to generate images", { status: 500 });
    }

    let firebaseUrls = [];

    for (let i = 0; i < response.length; i++) {
      const imageUrl = response[i];
      const imageBlob = await fetch(imageUrl).then((res) => res.blob());

      // Upload to Firebase Storage
      const imageRef = ref(storage, `images/${Date.now()}-${i}.png`);
      await uploadBytes(imageRef, imageBlob);

      // Get Firebase URL
      const firebaseUrl = await getDownloadURL(imageRef);
      firebaseUrls.push(firebaseUrl);
    }

    return NextResponse.json(firebaseUrls); // Return stored Firebase URLs
  } catch (error) {
    console.error("[IMAGE_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// GET: Fetch all stored images
export async function GET(req: Request) {
  try {
    const imagesRef = ref(storage, "images/");
    const imagesList = await listAll(imagesRef);
    let urls = await Promise.all(
      imagesList.items.map(async (item) => {
        const downloadUrl = await getDownloadURL(item);
        return { url: downloadUrl, path: item.fullPath };
      })
    );
    return NextResponse.json(urls);
  } catch (error) {
    console.error("[FETCH_IMAGE_ERROR]", error);
    return new NextResponse("Failed to fetch images", { status: 500 });
  }
}

// DELETE: Remove an image from Firebase Storage
export async function DELETE(req: Request) {
  try {
    const authData = await auth();
    const userId = authData.userId;

    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { imagePath } = body;

    if (!imagePath)
      return new NextResponse("Image path required", { status: 400 });

    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);

    return new NextResponse("Image deleted successfully", { status: 200 });
  } catch (error) {
    console.error("[DELETE_IMAGE_ERROR]", error);
    return new NextResponse("Failed to delete image", { status: 500 });
  }
}
