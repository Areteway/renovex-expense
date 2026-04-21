"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, getUserRole } from "@/store/useAppStore";
import { createClient } from "@/lib/supabase/client";
import { USERS } from "@/types";
import type { User } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, User as UserIcon, LogOut } from "lucide-react";
import { MobileNav } from "./MobileNav";

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  foreman: "bg-blue-100 text-blue-700",
  accounting: "bg-green-100 text-green-700",
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  foreman: "Foreman",
  accounting: "Accounting",
};

export function Header({ title }: { title: string }) {
  const { currentUser, currentRole, setCurrentUser } = useAppStore();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      setAuthUser(data.user);
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleUserSwitch(userId: string) {
    const role = getUserRole(userId);
    setCurrentUser(userId, role);
  }

  const displayName =
    authUser?.user_metadata?.full_name ??
    authUser?.email ??
    USERS.find((u) => u.value === currentUser)?.label ??
    currentUser;

  const avatarUrl = authUser?.user_metadata?.avatar_url;

  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b bg-white">
      <div className="flex items-center gap-3">
        <MobileNav />
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Badge className={`text-xs font-medium ${roleColors[currentRole]}`} variant="outline">
          {roleLabels[currentRole]}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="sm" className="flex items-center gap-1.5" />}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full" />
            ) : (
              <UserIcon className="w-4 h-4" />
            )}
            <span className="hidden sm:inline text-sm max-w-[120px] truncate">{displayName}</span>
            <ChevronDown className="w-3 h-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {authUser && (
              <>
                <div className="px-3 py-2">
                  <p className="text-xs font-medium text-gray-900 truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{authUser.email}</p>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuLabel className="text-xs text-gray-400">เปลี่ยน Role (Dev)</DropdownMenuLabel>
            {USERS.map((u) => (
              <DropdownMenuItem
                key={u.value}
                onClick={() => handleUserSwitch(u.value)}
                className={currentUser === u.value ? "bg-gray-100 font-medium" : ""}
              >
                {u.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
