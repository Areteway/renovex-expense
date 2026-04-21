"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

interface CategoryChartProps {
  data: { category: string; amount: number }[];
}

const COLORS = [
  "#f97316", "#3b82f6", "#22c55e", "#a855f7",
  "#ec4899", "#14b8a6", "#f59e0b", "#64748b",
];

export function CategoryChart({ data }: CategoryChartProps) {
  const sorted = [...data]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          ค่าใช้จ่ายตามหมวดหมู่
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">ยังไม่มีข้อมูล</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={sorted}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 11 }}
                width={110}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value)), "ยอด"]}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {sorted.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
