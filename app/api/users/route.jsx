import { db } from "@/configs/FirebaseConfig";
import { doc, getDoc, setDoc, getFirestore } from "firebase/firestore";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req) {
  try {
    const { userEmail, userName } = await req.json();

    if (!userEmail || !userName) {
      return NextResponse.json(
        { error: "Missing user details" },
        { status: 400 }
      );
    }

    // If user already exist
    const docRef = doc(db, "users", userEmail);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("user already exists: ", docSnap.data());
      return NextResponse.json(docSnap.data());
    } else {
      const data = {
        name: userName,
        email: userEmail,
        credits: 3,
      };
      // Insert new user
      await setDoc(doc(db, "users", userEmail), {
        ...data,
      });

      console.log("user data: ", data);
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("FIREBASE ERROR: ", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
