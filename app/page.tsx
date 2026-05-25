"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          redirect("/dashboard");
        } else {
          redirect("/auth/login");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        redirect("/auth/login");
      }
    };

    checkAuth();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="text-center space-y-4">
        <p className="text-slate-600">Redirecting to login...</p>
      </div>
    </div>
  );
}
