"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProjectMember } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Users, Loader2 } from "lucide-react";

interface MemberManagerProps {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberManager({
  projectId,
  projectName,
  open,
  onOpenChange,
}: MemberManagerProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (open) loadMembers();
  }, [open, projectId]);

  async function loadMembers() {
    setLoading(true);
    const { data } = await supabase
      .from("project_members")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at");
    if (data) setMembers(data);
    setLoading(false);
  }

  async function handleAdd() {
    if (!newName.trim()) {
      toast.error("กรุณากรอกชื่อ");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("project_members").insert({
      project_id: projectId,
      name: newName.trim(),
      role: newRole.trim() || "ทั่วไป",
    });
    if (error) {
      toast.error(error.message.includes("unique") ? "ชื่อนี้มีอยู่แล้ว" : "เพิ่มไม่สำเร็จ");
    } else {
      toast.success(`เพิ่ม ${newName} สำเร็จ`);
      setNewName("");
      setNewRole("");
      loadMembers();
    }
    setAdding(false);
  }

  async function handleDelete(member: ProjectMember) {
    if (!confirm(`ลบ ${member.name} ออกจากโปรเจกต์?`)) return;
    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("id", member.id);
    if (error) {
      toast.error("ลบไม่สำเร็จ");
    } else {
      toast.success(`ลบ ${member.name} แล้ว`);
      loadMembers();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            ทีม — {projectName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add member */}
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ชื่อ เช่น สมชาย"
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="หน้าที่ เช่น ช่างไฟ"
              className="w-32"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={adding} size="icon">
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Member list */}
          <div className="space-y-2 min-h-[120px]">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-8">กำลังโหลด...</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                ยังไม่มีสมาชิกในโปรเจกต์นี้
              </p>
            ) : (
              members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{m.name}</span>
                    {m.role && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                        {m.role}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-600"
                    onClick={() => handleDelete(m)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
