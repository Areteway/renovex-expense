import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserRole, USERS } from "@/types";

interface AppState {
  currentUser: string;
  currentRole: UserRole;
  selectedProjectId: string | null;
  setCurrentUser: (user: string, role: UserRole) => void;
  setSelectedProjectId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: "admin",
      currentRole: "admin",
      selectedProjectId: null,
      setCurrentUser: (user, role) => set({ currentUser: user, currentRole: role }),
      setSelectedProjectId: (id) => set({ selectedProjectId: id }),
    }),
    { name: "app-store" }
  )
);

export function getUserRole(userId: string): UserRole {
  return USERS.find((u) => u.value === userId)?.role ?? "accounting";
}
