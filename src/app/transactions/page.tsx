"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { Transaction, Project, CATEGORIES, ROLE_PERMISSIONS } from "@/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Paperclip,
  Filter,
  X,
} from "lucide-react";

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  unpaid: "bg-red-100 text-red-700",
  deposit: "bg-yellow-100 text-yellow-700",
};
const statusLabels: Record<string, string> = {
  paid: "จ่ายแล้ว",
  unpaid: "ค้างจ่าย",
  deposit: "มัดจำ",
};

function TransactionsContent() {
  const searchParams = useSearchParams();
  const { currentUser, currentRole, selectedProjectId, setSelectedProjectId } = useAppStore();
  const permissions = ROLE_PERMISSIONS[currentRole];

  // URL param takes priority, then store, then ""
  const initialProject = searchParams.get("project") ?? selectedProjectId ?? "";

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  // Filters
  const [filterProject, setFilterProject] = useState(initialProject);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const supabase = createClient();

  function switchProject(projectId: string) {
    setFilterProject(projectId);
    setSelectedProjectId(projectId || null);
    setFilterUser("all");
  }

  useEffect(() => {
    loadProjects();
    loadTransactions();
  }, []);

  useEffect(() => {
    loadProjectMembers(filterProject);
  }, [filterProject]);

  async function loadProjects() {
    const { data } = await supabase.from("projects").select("*").order("project_name");
    if (data) setProjects(data);
  }

  async function loadProjectMembers(projectId: string) {
    if (!projectId) {
      // ทั้งหมด — ดึงสมาชิกจากทุกโปรเจกต์
      const { data } = await supabase
        .from("project_members")
        .select("name")
        .order("name");
      if (data) {
        const unique = [...new Set(data.map((m: { name: string }) => m.name))];
        setProjectMembers(unique);
      }
      return;
    }
    const { data } = await supabase
      .from("project_members")
      .select("name")
      .eq("project_id", projectId)
      .order("name");
    if (data) setProjectMembers(data.map((m: { name: string }) => m.name));
  }

  async function loadTransactions() {
    setLoading(true);
    const { data } = await supabase
      .from("transactions")
      .select("*, project:projects(project_name), attachments(*)")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (data) setTransactions(data);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("ลบรายการนี้?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      toast.error("ลบไม่สำเร็จ");
    } else {
      toast.success("ลบรายการแล้ว");
      loadTransactions();
    }
  }

  function handleEdit(tx: Transaction) {
    setEditTx(tx);
    setFormOpen(true);
  }

  function handleCreate() {
    setEditTx(null);
    setFormOpen(true);
  }

  function clearFilters() {
    setFilterCategory("all");
    setFilterStatus("all");
    setFilterUser("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearch("");
  }

  const filtered = transactions.filter((tx) => {
    if (filterProject && tx.project_id !== filterProject) return false;
    if (filterCategory !== "all" && tx.category !== filterCategory) return false;
    if (filterStatus !== "all" && tx.status !== filterStatus) return false;
    if (filterUser !== "all" && tx.created_by !== filterUser) return false;
    if (filterDateFrom && tx.date < filterDateFrom) return false;
    if (filterDateTo && tx.date > filterDateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !tx.description.toLowerCase().includes(q) &&
        !(tx.payee ?? "").toLowerCase().includes(q) &&
        !tx.category.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const totalExpense = filtered
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const totalIncome = filtered
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const hasFilters =
    filterCategory !== "all" || filterStatus !== "all" ||
    filterUser !== "all" || filterDateFrom || filterDateTo || search;

  const activeProject = projects.find((p) => p.id === filterProject);

  return (
    <div className="flex-1 flex flex-col">
      <Header title="รายการ" />

      {/* Project Tabs */}
      <div className="border-b bg-white px-4 md:px-6">
        <div className="flex gap-0 overflow-x-auto">
          <button
            onClick={() => switchProject("")}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
              filterProject === ""
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
            )}
          >
            ทั้งหมด
          </button>
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => switchProject(p.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                filterProject === p.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
              )}
            >
              {p.project_name}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 p-4 md:p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหารายการ..."
              className="pl-8 h-9"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            className="gap-1.5 h-9"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3.5 h-3.5" />
            ตัวกรอง
            {hasFilters && (
              <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-xs bg-orange-500">
                !
              </Badge>
            )}
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-9 gap-1 text-gray-500" onClick={clearFilters}>
              <X className="w-3.5 h-3.5" /> ล้างตัวกรอง
            </Button>
          )}
          <div className="flex-1" />
          {permissions.canCreate && (
            <Button onClick={handleCreate} size="sm" className="gap-1.5 h-9">
              <Plus className="w-4 h-4" />
              เพิ่มรายการ
            </Button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 p-3 bg-gray-50 rounded-lg border">
            <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v ?? "all")}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue>
                  {filterCategory === "all" ? "ทุกหมวด" : filterCategory}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกหมวด</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue>
                  {filterStatus === "paid" ? "จ่ายแล้ว" : filterStatus === "unpaid" ? "ค้างจ่าย" : filterStatus === "deposit" ? "มัดจำ" : "ทุกสถานะ"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="paid">จ่ายแล้ว</SelectItem>
                <SelectItem value="unpaid">ค้างจ่าย</SelectItem>
                <SelectItem value="deposit">มัดจำ</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterUser} onValueChange={(v) => setFilterUser(v ?? "all")}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue>
                  {filterUser === "all" ? "ผู้จ่ายเงิน" : filterUser}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกคน</SelectItem>
                {projectMembers.length > 0 ? (
                  projectMembers.map((name) => (
                    <SelectItem key={name} value={name} className="text-xs">{name}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="all" disabled className="text-xs text-gray-400">
                    เลือกโปรเจกต์ก่อน
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 shrink-0">จาก</span>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 shrink-0">ถึง</span>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="flex items-center gap-4 text-sm">
          {activeProject && (
            <span className="font-semibold text-gray-800">{activeProject.project_name}</span>
          )}
          <span className="text-gray-500">
            {filtered.length} รายการ
          </span>
          <span className="text-red-600 font-medium">
            จ่าย {formatCurrency(totalExpense)}
          </span>
          {totalIncome > 0 && (
            <span className="text-green-600 font-medium">
              รับ {formatCurrency(totalIncome)}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-24">วันที่</TableHead>
                  <TableHead className="w-32">โปรเจกต์</TableHead>
                  <TableHead className="w-32">หมวดหมู่</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead className="w-24">ผู้รับเงิน</TableHead>
                  <TableHead className="w-28 text-right">จำนวนเงิน</TableHead>
                  <TableHead className="w-24">ชำระ</TableHead>
                  <TableHead className="w-20">สถานะ</TableHead>
                  <TableHead className="w-10 text-center">แนบ</TableHead>
                  <TableHead className="w-24">ผู้จ่ายเงิน</TableHead>
                  {(permissions.canEdit || permissions.canDelete) && (
                    <TableHead className="w-10" />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-gray-400">
                      กำลังโหลด...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-gray-400">
                      ไม่พบรายการ
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-gray-50">
                      <TableCell className="text-xs text-gray-600">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell className="text-xs text-gray-700 max-w-[8rem] truncate">
                        {(tx.project as unknown as { project_name: string })?.project_name ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs text-gray-700">{tx.category}</TableCell>
                      <TableCell className="text-sm text-gray-800 max-w-[12rem] truncate">
                        {tx.description}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 max-w-[6rem] truncate">
                        {tx.payee ?? "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        <span
                          className={
                            tx.type === "income" ? "text-green-600" : "text-gray-800"
                          }
                        >
                          {tx.type === "income" ? "+" : ""}
                          {formatCurrency(tx.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {tx.payment_method}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${statusColors[tx.status]}`}
                        >
                          {statusLabels[tx.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {tx.attachments && tx.attachments.length > 0 ? (
                          <span className="flex items-center justify-center gap-0.5 text-xs text-blue-600">
                            <Paperclip className="w-3 h-3" />
                            {tx.attachments.length}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-700 font-medium">{tx.created_by || "-"}</TableCell>
                      {(permissions.canEdit || permissions.canDelete) && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={<Button variant="ghost" size="icon" className="h-7 w-7" />}
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {permissions.canEdit && (
                                <DropdownMenuItem onClick={() => handleEdit(tx)}>
                                  <Pencil className="w-3.5 h-3.5 mr-2" /> แก้ไข
                                </DropdownMenuItem>
                              )}
                              {permissions.canDelete && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(tx.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> ลบ
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      <TransactionForm
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditTx(null);
        }}
        onSuccess={loadTransactions}
        transaction={editTx}
        projects={projects}
        defaultProjectId={filterProject || undefined}
        currentUser={currentUser}
      />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-gray-400">กำลังโหลด...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
