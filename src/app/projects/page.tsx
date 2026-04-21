"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { MemberManager } from "@/components/projects/MemberManager";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { Project } from "@/types";
import { ROLE_PERMISSIONS } from "@/types";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  FolderKanban,
  TrendingDown,
  Users,
} from "lucide-react";
import Link from "next/link";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  paused: "bg-gray-100 text-gray-600",
};
const statusLabels: Record<string, string> = {
  active: "ดำเนินการ",
  completed: "เสร็จแล้ว",
  paused: "หยุดชั่วคราว",
};

export default function ProjectsPage() {
  const { currentUser, currentRole } = useAppStore();
  const permissions = ROLE_PERMISSIONS[currentRole];
  const [projects, setProjects] = useState<Project[]>([]);
  const [spentMap, setSpentMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [memberProject, setMemberProject] = useState<Project | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: proj } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (proj) {
      setProjects(proj);
      // load total expense per project
      const { data: tx } = await supabase
        .from("transactions")
        .select("project_id, amount, type")
        .eq("type", "expense");
      if (tx) {
        const map: Record<string, number> = {};
        tx.forEach((t: { project_id: string; amount: number }) => {
          map[t.project_id] = (map[t.project_id] ?? 0) + t.amount;
        });
        setSpentMap(map);
      }
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("ลบโปรเจกต์นี้? รายการทั้งหมดในโปรเจกต์จะถูกลบด้วย")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      toast.error("ลบไม่สำเร็จ");
    } else {
      toast.success("ลบโปรเจกต์แล้ว");
      loadData();
    }
  }

  function handleEdit(p: Project) {
    setEditProject(p);
    setFormOpen(true);
  }

  function handleCreate() {
    setEditProject(null);
    setFormOpen(true);
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header title="โปรเจกต์" />

      <main className="flex-1 p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{projects.length} โปรเจกต์</p>
          {permissions.canCreate && (
            <Button onClick={handleCreate} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              สร้างโปรเจกต์
            </Button>
          )}
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm text-center py-12">กำลังโหลด...</p>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <FolderKanban className="w-12 h-12 mb-3 text-gray-300" />
            <p className="font-medium">ยังไม่มีโปรเจกต์</p>
            {permissions.canCreate && (
              <Button onClick={handleCreate} variant="outline" size="sm" className="mt-3">
                สร้างโปรเจกต์แรก
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((p) => {
              const spent = spentMap[p.id] ?? 0;
              const pct = p.budget_total > 0 ? (spent / p.budget_total) * 100 : 0;
              const barColor =
                pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-orange-500" : "bg-green-500";

              return (
                <Card key={p.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {p.project_name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-xs mt-1 ${statusColors[p.status]}`}
                        >
                          {statusLabels[p.status]}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" />}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setMemberProject(p)}>
                            <Users className="w-3.5 h-3.5 mr-2" /> จัดการทีม
                          </DropdownMenuItem>
                          {permissions.canEdit && (
                            <DropdownMenuItem onClick={() => handleEdit(p)}>
                              <Pencil className="w-3.5 h-3.5 mr-2" /> แก้ไข
                            </DropdownMenuItem>
                          )}
                          {permissions.canDelete && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(p.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> ลบ
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>ใช้ไป {formatCurrency(spent)}</span>
                        <span>งบ {formatCurrency(p.budget_total)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400">{pct.toFixed(1)}% ของงบ</p>
                    </div>

                    <div className="space-y-1 text-xs text-gray-500 pt-1">
                      {p.address && (
                        <p className="text-gray-600 truncate">📍 {p.address}</p>
                      )}
                      {p.area && (
                        <p>พื้นที่ <span className="font-medium text-gray-700">{p.area} ตร.ม.</span></p>
                      )}
                    </div>

                    <Link href={`/transactions?project=${p.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs gap-1.5 mt-1"
                      >
                        <TrendingDown className="w-3.5 h-3.5" />
                        ดูรายการ
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <ProjectForm
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditProject(null);
        }}
        onSuccess={loadData}
        project={editProject}
        currentUser={currentUser}
      />

      {memberProject && (
        <MemberManager
          projectId={memberProject.id}
          projectName={memberProject.project_name}
          open={!!memberProject}
          onOpenChange={(v) => { if (!v) setMemberProject(null); }}
        />
      )}
    </div>
  );
}
