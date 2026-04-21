"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { Transaction, Project, CATEGORIES, ROLE_PERMISSIONS } from "@/types";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Lock } from "lucide-react";

const statusLabels: Record<string, string> = {
  paid: "จ่ายแล้ว",
  unpaid: "ค้างจ่าย",
  deposit: "มัดจำ",
};

export default function ExportPage() {
  const { currentRole } = useAppStore();
  const permissions = ROLE_PERMISSIONS[currentRole];

  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterProject, setFilterProject] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const supabase = createClient();

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const { data } = await supabase.from("projects").select("*").order("project_name");
    if (data) setProjects(data);
  }

  async function loadPreview() {
    setLoading(true);
    let query = supabase
      .from("transactions")
      .select("*, project:projects(project_name), attachments(*)")
      .order("date", { ascending: false });

    if (filterProject !== "all") query = query.eq("project_id", filterProject);
    if (filterCategory !== "all") query = query.eq("category", filterCategory);
    if (filterStatus !== "all") query = query.eq("status", filterStatus);
    if (filterDateFrom) query = query.gte("date", filterDateFrom);
    if (filterDateTo) query = query.lte("date", filterDateTo);

    const { data } = await query;
    if (data) setTransactions(data);
    setLoading(false);
  }

  function exportCSV() {
    if (!permissions.canExport) {
      toast.error("คุณไม่มีสิทธิ์ Export");
      return;
    }
    if (transactions.length === 0) {
      toast.error("ไม่มีข้อมูลให้ Export");
      return;
    }

    const headers = [
      "วันที่",
      "โปรเจกต์",
      "หมวดหมู่",
      "รายละเอียด",
      "จำนวนเงิน",
      "ประเภท",
      "วิธีชำระ",
      "สถานะ",
      "ผู้รับเงิน",
      "มี Slip",
      "มี Invoice",
      "ผู้จ่ายเงิน",
      "หมายเหตุ",
    ];

    const rows = transactions.map((tx) => {
      const hasSlip = tx.attachments?.some((a) => a.file_type === "slip") ? "ใช่" : "ไม่";
      const hasInvoice = tx.attachments?.some((a) => a.file_type === "invoice") ? "ใช่" : "ไม่";
      const projName =
        (tx.project as unknown as { project_name: string })?.project_name ?? "";
      return [
        formatDate(tx.date),
        projName,
        tx.category,
        tx.description,
        tx.amount.toString(),
        tx.type === "expense" ? "รายจ่าย" : "รายรับ",
        tx.payment_method,
        statusLabels[tx.status] ?? tx.status,
        tx.payee ?? "",
        hasSlip,
        hasInvoice,
        tx.created_by,
        tx.note ?? "",
      ];
    });

    const csvContent =
      "\uFEFF" + // BOM for Thai Excel
      [headers, ...rows]
        .map((r) =>
          r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `renovex_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Export ${transactions.length} รายการสำเร็จ`);
  }

  if (!permissions.canExport) {
    return (
      <div className="flex-1 flex flex-col">
        <Header title="Export" />
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
          <Lock className="w-10 h-10 text-gray-300" />
          <p className="font-medium">คุณไม่มีสิทธิ์ Export ข้อมูล</p>
          <p className="text-sm">เฉพาะ Admin และ Accounting เท่านั้น</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Export ข้อมูล" />

      <main className="flex-1 p-4 md:p-6 space-y-5">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              ตัวกรองข้อมูล
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">โปรเจกต์</Label>
                <Select value={filterProject} onValueChange={(v) => setFilterProject(v ?? "all")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue>
                      {projects.find((p) => p.id === filterProject)?.project_name ?? "ทั้งหมด"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">หมวดหมู่</Label>
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
              </div>

              <div className="space-y-1">
                <Label className="text-xs">สถานะ</Label>
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
              </div>

              <div className="space-y-1">
                <Label className="text-xs">วันที่เริ่ม</Label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">วันที่สิ้นสุด</Label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={loadPreview} variant="outline" size="sm" disabled={loading}>
                {loading ? "กำลังโหลด..." : "แสดงตัวอย่าง"}
              </Button>
              <Button
                onClick={exportCSV}
                size="sm"
                disabled={transactions.length === 0}
                className="gap-1.5"
              >
                <Download className="w-4 h-4" />
                Export CSV ({transactions.length} รายการ)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Table */}
        {transactions.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                ตัวอย่างข้อมูล ({transactions.length} รายการ)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 sticky top-0">
                      <TableHead className="text-xs">วันที่</TableHead>
                      <TableHead className="text-xs">โปรเจกต์</TableHead>
                      <TableHead className="text-xs">หมวดหมู่</TableHead>
                      <TableHead className="text-xs">รายละเอียด</TableHead>
                      <TableHead className="text-xs text-right">จำนวนเงิน</TableHead>
                      <TableHead className="text-xs">สถานะ</TableHead>
                      <TableHead className="text-xs">ผู้รับเงิน</TableHead>
                      <TableHead className="text-xs">ไฟล์แนบ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs">{formatDate(tx.date)}</TableCell>
                        <TableCell className="text-xs max-w-[8rem] truncate">
                          {(tx.project as unknown as { project_name: string })?.project_name ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs">{tx.category}</TableCell>
                        <TableCell className="text-xs max-w-[12rem] truncate">
                          {tx.description}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          {tx.amount.toLocaleString("th-TH")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              tx.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : tx.status === "unpaid"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {statusLabels[tx.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{tx.payee ?? "-"}</TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {tx.attachments?.length ?? 0} ไฟล์
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
