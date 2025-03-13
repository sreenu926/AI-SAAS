import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";

function LandingPage() {
  return (
    <div className="flex flex-col items-center h-full gap-10 justify-center">
      <p className="text-xl">Landing Page (Protected)</p>
      <div className="flex w-full items-center justify-center gap-10">
        <Link href="/sign-in">
          <Button className="text-xl" variant="default" size="lg">
            Login
          </Button>
        </Link>
        <Link href="/sign-up">
          <Button className="text-xl" variant="destructive" size="lg">
            Register
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default LandingPage;
