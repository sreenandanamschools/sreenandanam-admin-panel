"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
  LogOut,
  CalendarDays,
  Star,
  Calendar,
  Newspaper,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BarChart3,
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
  {
    label: "Attendance",
    href: "/dashboard/attendance",
    icon: ClipboardCheck,
    subItems: [
      { label: "Mark Attendance", href: "/dashboard/attendance" },
      { label: "Attendance Reports", href: "/dashboard/attendance/reports" },
    ],
  },
  { label: "Announcements", href: "/dashboard/announcements", icon: Megaphone },
  { label: "Events", href: "/dashboard/events", icon: Calendar },
  { label: "News", href: "/dashboard/news", icon: Newspaper },
  { label: "Gallery", href: "/dashboard/gallery", icon: ImageIcon },
  { label: "Honorary Guests", href: "/dashboard/honorary-guests", icon: Star },
  { label: "Careers", href: "/dashboard/careers", icon: Briefcase },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) setCollapsed(saved === "true");
  }, []);

  useEffect(() => {
    // Auto-open active submenus on load
    const activeMenus: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if (
        item.subItems?.some(
          (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/"),
        )
      ) {
        activeMenus[item.label] = true;
      }
    });
    setOpenMenus(activeMenus);
  }, [pathname]);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

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
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="h-10 w-10"
        >
          {isMobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-white border-r border-slate-200 shadow-sm transition-all duration-300 z-40 flex flex-col",
          collapsed ? "w-[68px]" : "w-64",
          "md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className={cn(
          "border-b border-slate-100 flex items-center shrink-0",
          collapsed ? "justify-center h-16 px-0" : "px-5 h-16",
        )}>
          {collapsed ? (
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">S</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">Sreenandanam</p>
                <p className="text-[10px] text-slate-500 truncate">Admin Panel</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isOpen = !!openMenus[item.label];
            const isParentActive = pathname === item.href || (hasSubItems && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <div key={item.href} className="space-y-1">
                <div className="flex items-center justify-between relative group">
                  <Link
                    href={item.href}
                    onClick={() => {
                      setIsMobileOpen(false);
                      if (hasSubItems) {
                        setOpenMenus((prev) => ({
                          ...prev,
                          [item.label]: !prev[item.label],
                        }));
                      }
                    }}
                    className={cn(
                      "flex-1 flex items-center gap-3 rounded-lg transition-all duration-150 relative group/link",
                      collapsed ? "justify-center h-11 w-11 mx-auto" : "px-3 py-2.5 pr-10",
                      isParentActive
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    {isParentActive && !collapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-slate-900 rounded-full" />
                    )}
                    <div className={cn(
                      "flex items-center justify-center shrink-0 transition-colors",
                      isParentActive ? "text-slate-900" : "text-slate-400 group-hover/link:text-slate-600",
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {!collapsed && (
                      <span className="text-sm font-medium truncate">{item.label}</span>
                    )}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50">
                        {item.label}
                      </div>
                    )}
                  </Link>

                  {!collapsed && hasSubItems && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenMenus((prev) => ({
                          ...prev,
                          [item.label]: !prev[item.label],
                        }));
                      }}
                      className="absolute right-2 p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>
                  )}
                </div>

                {!collapsed && hasSubItems && isOpen && (
                  <div className="mt-1 ml-4 pl-4 border-l border-slate-100 space-y-1">
                    {item.subItems.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setIsMobileOpen(false)}
                          className={cn(
                            "flex items-center h-9 px-3 rounded-md text-xs font-medium transition-all duration-150",
                            isSubActive
                              ? "bg-slate-50 text-slate-900 font-semibold"
                              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50/50",
                          )}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn(
          "border-t border-slate-100 shrink-0",
          collapsed ? "p-2" : "p-3",
        )}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center justify-center h-9 w-9 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
              <button
                onClick={toggleCollapse}
                className="flex items-center justify-center h-9 w-9 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="truncate">{isSigningOut ? "Signing out\u2026" : "Sign Out"}</span>
              </button>
              <button
                onClick={toggleCollapse}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span className="truncate">Collapse</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}
