"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  Download,
  HardHat,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { selectedProjectId } = useAppStore();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "โปรเจกต์", icon: FolderKanban },
    {
      href: selectedProjectId
        ? `/transactions?project=${selectedProjectId}`
        : "/transactions",
      label: "รายการ",
      icon: Receipt,
      matchPath: "/transactions",
    },
    { href: "/export", label: "Export", icon: Download },
  ];

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-700">
        <div className="flex items-center justify-center w-8 h-8 bg-orange-500 rounded-lg">
          <HardHat className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight">RenovEx</p>
          <p className="text-xs text-gray-400 leading-tight">Expense Control</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const checkPath = item.matchPath ?? item.href;
          const isActive =
            checkPath === "/"
              ? pathname === "/"
              : pathname.startsWith(checkPath);
          return (
            <Link
              key={item.matchPath ?? item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-orange-500 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">MVP v1.0</p>
      </div>
    </aside>
  );
}
