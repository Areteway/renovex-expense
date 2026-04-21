"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { BudgetProgress } from "@/components/dashboard/BudgetProgress";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { Project, Transaction } from "@/types";
import { formatCurrency } from "@/lib/format";
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Tag,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DashboardPage() {
  const { selectedProjectId, setSelectedProjectId } = useAppStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      const activeId = selectedProjectId ?? projects[0]?.id;
      loadTransactions(activeId);
    }
  }, [selectedProjectId, projects]);

  async function loadProjects() {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setProjects(data);
      if (!selectedProjectId && data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    }
    setLoading(false);
  }

  async function loadTransactions(projectId: string | null) {
    if (!projectId) return;
    const { data } = await supabase
      .from("transactions")
      .select("*, attachments(*)")
      .eq("project_id", projectId)
      .order("date", { ascending: false });
    if (data) setTransactions(data);
  }

  const activeProject = projects.find((p) => p.id === selectedProjectId) ?? projects[0];

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);

  const unpaidAmount = transactions
    .filter((t) => t.status === "unpaid")
    .reduce((s, t) => s + t.amount, 0);

  const budgetTotal = activeProject?.budget_total ?? 0;
  const budgetUsedPercent =
    budgetTotal > 0 ? ((totalExpense / budgetTotal) * 100).toFixed(1) : "0";

  const categoryMap: Record<string, number> = {};
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      categoryMap[t.category] = (categoryMap[t.category] ?? 0) + t.amount;
    });
  const categoryData = Object.entries(categoryMap).map(([category, amount]) => ({
    category,
    amount,
  }));
  const topCategory = [...categoryData].sort((a, b) => b.amount - a.amount)[0];

  const recentTx = transactions.slice(0, 5);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header title="Dashboard" />

      <main className="flex-1 p-4 md:p-6 space-y-5">
        {/* Project Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 shrink-0">โปรเจกต์:</label>
          <Select
            value={selectedProjectId ?? ""}
            onValueChange={(v) => setSelectedProjectId(v)}
          >
            <SelectTrigger className="w-64 bg-white">
              <SelectValue>
                {projects.find((p) => p.id === selectedProjectId)?.project_name ?? "เลือกโปรเจกต์"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.project_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <p className="text-lg font-medium">ยังไม่มีโปรเจกต์</p>
            <p className="text-sm mt-1">
              ไปที่เมนู{" "}
              <a href="/projects" className="text-orange-500 underline">
                โปรเจกต์
              </a>{" "}
              เพื่อสร้างโปรเจกต์แรก
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatsCard
                title="ค่าใช้จ่ายรวม"
                value={formatCurrency(totalExpense)}
                icon={TrendingDown}
                color="red"
              />
              <StatsCard
                title="รายรับรวม"
                value={formatCurrency(totalIncome)}
                icon={TrendingUp}
                color="green"
              />
              <StatsCard
                title="งบคงเหลือ"
                value={formatCurrency(budgetTotal - totalExpense)}
                subtitle={`ใช้ไป ${budgetUsedPercent}%`}
                icon={Wallet}
                color="orange"
              />
              <StatsCard
                title="ค้างจ่าย"
                value={formatCurrency(unpaidAmount)}
                icon={AlertTriangle}
                color={unpaidAmount > 0 ? "red" : "default"}
              />
            </div>

            {/* Budget + Top Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                {activeProject && (
                  <BudgetProgress
                    projectName={activeProject.project_name}
                    budgetTotal={budgetTotal}
                    totalExpense={totalExpense}
                  />
                )}
              </div>
              <StatsCard
                title="หมวดใช้จ่ายสูงสุด"
                value={topCategory?.category ?? "-"}
                subtitle={
                  topCategory ? formatCurrency(topCategory.amount) : "ยังไม่มีข้อมูล"
                }
                icon={Tag}
                color="blue"
              />
            </div>

            {/* Chart + Recent */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CategoryChart data={categoryData} />
              <RecentTransactions transactions={recentTx} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
