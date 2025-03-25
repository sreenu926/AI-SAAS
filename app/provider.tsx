"use client";
import axios from "axios";
import React, { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

function Provider({ children }) {
  const { user, isSignedIn } = useUser();

  //Save user data
  const CheckUserAuth = async () => {
    if (!user || !isSignedIn) return;

    //Save user to database
    try {
      const response = await axios.post("/api/users", {
        userName: user.fullName,
        userEmail: user.primaryEmailAddress?.emailAddress,
      });
      console.log("user data:", response.data);
    } catch (error) {
      console.error("Error saving user:", error);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      CheckUserAuth();
    }
  }, [isSignedIn]);

  return (
    <div>
      <div>{children}</div>
    </div>
  );
}

export default Provider;
