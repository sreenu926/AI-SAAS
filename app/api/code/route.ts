import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { db } from "@/configs/FirebaseConfig"; // Import your Firebase database instance
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const instructionMessage: OpenAI.ChatCompletionMessageParam = {
  role: "system",
  content:
    "You are a code generator. You must provide both the code in block and an explanation in another block. Always include a markdown code block for the code and a detailed explanation below the code block. Use code comments for additional clarifications inside the code.",
};

interface CodeGenerationData {
  userId: string;
  messages: OpenAI.ChatCompletionMessageParam[];
  createdAt: any; // Firebase Timestamp or Date
  id: string;
}

export async function POST(req: Request) {
  try {
    const authData = await auth();
    const userId = authData.userId;

    const body = await req.json();
    const { messages } = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return new NextResponse("OpenAI API Key not configured", { status: 500 });
    }
    if (!messages || !Array.isArray(messages)) {
      return new NextResponse("Messages are required", { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [instructionMessage, ...messages],
    });

    const botMessage = response.choices[0].message;

    // Store the interaction in Firebase
    await addDoc(collection(db, "codeGenerations"), {
      userId: userId,
      messages: [...messages, botMessage], // Store both user and bot messages
      createdAt: new Date(),
    });

    return NextResponse.json(botMessage);
  } catch (error) {
    console.error("[CONVERSATION_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

interface CodeGenerationData {
  userId: string;
  messages: OpenAI.ChatCompletionMessageParam[];
  createdAt: any; // Firebase Timestamp or Date
  id: string;
}

export async function GET(req: Request) {
  // New GET method to fetch data
  try {
    const authData = await auth();
    const userId = authData.userId;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const codeGenerationRef = collection(db, "codeGenerations");
    const q = query(codeGenerationRef, orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);

    const codeGenerations: CodeGenerationData[] = querySnapshot.docs.map(
      (doc) => ({
        id: doc.id,
        ...doc.data(),
      })
    ) as CodeGenerationData[];

    const filteredCodeGenerations = codeGenerations.filter(
      (item) => item.userId === userId
    );

    return NextResponse.json(filteredCodeGenerations);
  } catch (error) {
    console.error("[CODE_GET_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const authData = await auth();
    const userId = authData.userId;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const codeId = searchParams.get("codeId");

    if (!codeId) {
      return new NextResponse("Code ID is required", { status: 400 });
    }

    const codeDocRef = doc(db, "codeGenerations", codeId);
    const docSnapshot = await getDoc(codeDocRef);

    if (!docSnapshot.exists()) {
      return new NextResponse("Code ID not found", { status: 404 });
    }

    await deleteDoc(codeDocRef);

    return NextResponse.json({
      success: true,
      message: "Code generation deleted successfully",
    });
  } catch (error) {
    console.error("[CODE_DELETE_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
