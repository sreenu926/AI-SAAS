import { NextResponse } from "next/server";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { db } from "@/configs/FirebaseConfig";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // OpenAI API call to generate a response
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
    });

    const generatedMessage = response.choices[0].message;

    // Ensure proper structure for conversations
    const conversationEntry = {
      messages, // Only save the new messages
      response: generatedMessage, // Explicitly store the new response
    };

    const userDocRef = doc(db, "users", userId);
    const userDocSnapshot = await getDoc(userDocRef);

    if (userDocSnapshot.exists()) {
      // Get the existing conversations and filter out duplicates
      const existingData = userDocSnapshot.data();
      const existingConversations = existingData.conversations || [];

      // Check if this exact conversation already exists
      const isDuplicate = existingConversations.some((conversation: any) => {
        return (
          JSON.stringify(conversation.messages) === JSON.stringify(messages) &&
          JSON.stringify(conversation.response) ===
            JSON.stringify(generatedMessage)
        );
      });

      if (!isDuplicate) {
        // Add the new conversation only if it's not a duplicate
        await updateDoc(userDocRef, {
          conversations: [...existingConversations, conversationEntry],
        });
      }
    } else {
      // Create a new document with the first conversation
      await setDoc(userDocRef, {
        conversations: [conversationEntry],
      });
    }

    // ✅ Return generated message to the frontend
    return NextResponse.json({ success: true, message: generatedMessage });
  } catch (error) {
    console.error("[CONVERSATION_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const authData = await auth();
    const userId = authData.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract `firestoreId` from the query string
    const { searchParams } = new URL(req.url);
    const firestoreId = searchParams.get("firestoreId");

    if (!firestoreId) {
      return NextResponse.json(
        { error: "Firestore ID is required" },
        { status: 400 }
      );
    }

    // Fetch the user's document
    const userDocRef = doc(db, "users", userId);
    const userDocSnapshot = await getDoc(userDocRef);

    if (!userDocSnapshot.exists()) {
      return NextResponse.json(
        { error: "User document does not exist" },
        { status: 404 }
      );
    }

    const userData = userDocSnapshot.data();
    const conversations = userData?.conversations || [];

    const parts = firestoreId.split("-");
    const conversationIndex = parseInt(parts[1], 10);
    const identifier = parts[2];
    const messageIndex =
      parts.length === 4 && identifier === "message"
        ? parseInt(parts[3], 10)
        : null;

    // Validate parsed data
    if (
      isNaN(conversationIndex) ||
      (identifier === "message" && isNaN(messageIndex)) ||
      !conversations[conversationIndex]
    ) {
      console.error("Invalid Firestore ID:", { firestoreId, conversations });
      return NextResponse.json(
        { error: "Invalid Firestore ID" },
        { status: 400 }
      );
    }

    if (identifier === "message") {
      if (
        conversations[conversationIndex].messages &&
        conversations[conversationIndex].messages[messageIndex]
      ) {
        conversations[conversationIndex].messages.splice(messageIndex, 1);
      } else {
        return NextResponse.json(
          { error: "Message not found" },
          { status: 404 }
        );
      }
    } else if (identifier === "response") {
      delete conversations[conversationIndex].response;
    }

    if (
      conversations[conversationIndex].messages &&
      conversations[conversationIndex].messages.length === 0 &&
      !conversations[conversationIndex].response
    ) {
      conversations.splice(conversationIndex, 1);
    }

    await updateDoc(userDocRef, { conversations: conversations }); // Use mutable conversations

    return NextResponse.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("[DELETE_CONVERSATION_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
