"use client";
import { UserButton } from "@clerk/nextjs";
import MobileSidebar from "@/components/mobile-sidebar";

const Navbar = () => {
  return (
    <div className="flex items-center p-4">
      <MobileSidebar />

      <div className="flex ml-auto">
        <div className="my-auto">
          <UserButton />
        </div>
      </div>
    </div>
  );
};

export default Navbar;
