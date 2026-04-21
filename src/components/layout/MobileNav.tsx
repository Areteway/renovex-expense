"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  Download,
  HardHat,
  Menu,
} from "lucide-react";

export function MobileNav() {
  const [open, setOpen] = useState(false);
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="md:hidden" />}
      >
        <Menu className="w-5 h-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-56 bg-gray-900 text-white p-0">
        <SheetHeader className="px-5 py-5 border-b border-gray-700">
          <SheetTitle className="flex items-center gap-2 text-white">
            <div className="flex items-center justify-center w-8 h-8 bg-orange-500 rounded-lg">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm leading-tight">RenovEx</p>
              <p className="text-xs text-gray-400 leading-tight">Expense Control</p>
            </div>
          </SheetTitle>
        </SheetHeader>
        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const checkPath = item.matchPath ?? item.href;
            const isActive =
              checkPath === "/" ? pathname === "/" : pathname.startsWith(checkPath);
            return (
              <Link
                key={item.matchPath ?? item.href}
                href={item.href}
                onClick={() => setOpen(false)}
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
      </SheetContent>
    </Sheet>
  );
}
