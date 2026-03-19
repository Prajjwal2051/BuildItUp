import Image from "next/image";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import UserButton from "@/modules/auth/components/user-button";
import LogoutButton from "@/modules/auth/components/logout-button";

export default async function Home() {

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <Button>
        Get Started
      </Button>
      <div className="absolute top-4 right-4">
        <UserButton />
      </div>
    </div>
     
  );
}
