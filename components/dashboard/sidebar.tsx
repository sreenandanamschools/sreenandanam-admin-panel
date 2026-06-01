"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Menu,
  X,
  LayoutDashboard,
  GraduationCap,
  Users,
  School,
  ClipboardCheck,
  Megaphone,
  Image as ImageIcon,
  BarChart3,
  LogOut,
  CalendarDays,
  BookOpen,
  ArrowUpRight,
  Star,
  Calendar,
  Newspaper,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Academics", href: "/dashboard/academics", icon: CalendarDays },
  { label: "Students", href: "/dashboard/students", icon: GraduationCap },
  { label: "Teachers", href: "/dashboard/teachers", icon: Users },
  { label: "Classes", href: "/dashboard/classes", icon: School },
  { label: "Attendance", href: "/dashboard/attendance", icon: ClipboardCheck },
  { label: "Announcements", href: "/dashboard/announcements", icon: Megaphone },
  { label: "Events", href: "/dashboard/events", icon: Calendar },
  { label: "News", href: "/dashboard/news", icon: Newspaper },
  { label: "Gallery", href: "/dashboard/gallery", icon: ImageIcon },
  { label: "Honorary Guests", href: "/dashboard/honorary-guests", icon: Star },
  { label: "Careers", href: "/dashboard/careers", icon: Briefcase },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="h-10 w-10"
        >
          {isOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-white text-slate-800 border-r border-slate-200 shadow-sm transition-transform duration-300 z-40",
          "md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-slate-200 flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Sreenandanam"
              width={200}
              height={200}
              className="rounded"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200">
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-red-600 hover:text-white rounded-lg text-sm text-slate-600 transition-colors disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" />
              {isSigningOut ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
