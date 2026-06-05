"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "./AuthProvider";

export function AuthGuard({ children }) {
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user === null) router.replace("/login");
  }, [user, router]);

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user === null) return null;

  return children;
}
