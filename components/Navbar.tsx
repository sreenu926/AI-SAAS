"use client";
import { UserButton, useUser, useClerk } from "@clerk/nextjs";
import MobileSidebar from "@/components/mobile-sidebar";
import { useRouter } from "next/navigation";

const Navbar = () => {
  const { user } = useUser();
  const { openSignIn } = useClerk();
  const router = useRouter();
  return (
    <div className="flex items-center p-4">
      <MobileSidebar />

      <div className="flex ml-auto">
        <div className="flex items-center mx-auto gap-2">
          <span className="text-sm font-medium">
            {user?.emailAddresses[0]?.emailAddress.split("@")[0]}
          </span>
          <UserButton />
        </div>
      </div>
    </div>
  );
};

export default Navbar;
