"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Transaction } from "@/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowRight, Paperclip } from "lucide-react";

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

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-gray-600">
          รายการล่าสุด
        </CardTitle>
        <Link href="/transactions">
          <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
            ดูทั้งหมด <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">ยังไม่มีรายการ</p>
        ) : (
          <div className="divide-y">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {tx.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {tx.category} · {formatDate(tx.date)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {tx.attachments && tx.attachments.length > 0 && (
                    <Paperclip className="w-3 h-3 text-gray-400" />
                  )}
                  <Badge
                    variant="outline"
                    className={`text-xs ${statusColors[tx.status]}`}
                  >
                    {statusLabels[tx.status]}
                  </Badge>
                  <span
                    className={`text-sm font-semibold ${
                      tx.type === "income" ? "text-green-600" : "text-gray-800"
                    }`}
                  >
                    {tx.type === "income" ? "+" : ""}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
