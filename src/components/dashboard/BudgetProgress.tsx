"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

interface BudgetProgressProps {
  projectName: string;
  budgetTotal: number;
  totalExpense: number;
}

export function BudgetProgress({
  projectName,
  budgetTotal,
  totalExpense,
}: BudgetProgressProps) {
  const percent = budgetTotal > 0 ? Math.min((totalExpense / budgetTotal) * 100, 100) : 0;
  const remaining = budgetTotal - totalExpense;

  const barColor =
    percent >= 90
      ? "bg-red-500"
      : percent >= 75
      ? "bg-orange-500"
      : "bg-green-500";

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          งบประมาณ — {projectName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-700 font-medium">
            ใช้ไป {formatCurrency(totalExpense)}
          </span>
          <span className="text-gray-500">
            ทั้งหมด {formatCurrency(budgetTotal)}
          </span>
        </div>
        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span className="font-medium" style={{ color: percent >= 90 ? "#ef4444" : percent >= 75 ? "#f97316" : "#22c55e" }}>
            {percent.toFixed(1)}% ของงบ
          </span>
          <span>เหลือ {formatCurrency(remaining)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
