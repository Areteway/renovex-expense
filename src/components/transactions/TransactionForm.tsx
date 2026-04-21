"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AttachmentUpload } from "./AttachmentUpload";
import { createClient } from "@/lib/supabase/client";
import {
  Transaction,
  Project,
  ProjectMember,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  Attachment,
} from "@/types";
import { toast } from "sonner";
import { Loader2, Paperclip, Upload, X } from "lucide-react";

const schema = z.object({
  project_id: z.string().min(1, "กรุณาเลือกโปรเจกต์"),
  date: z.string().min(1, "กรุณาเลือกวันที่"),
  category: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  description: z.string().min(1, "กรุณากรอกรายละเอียด"),
  amount: z.coerce.number().min(0.01, "จำนวนต้องมากกว่า 0"),
  type: z.enum(["expense", "income"]),
  payment_method: z.enum(["โอนเงิน", "เงินสด", "บัตร", "ค้างจ่าย"]),
  status: z.enum(["paid", "unpaid", "deposit"]),
  payee: z.string().optional(),
  note: z.string().optional(),
  created_by: z.string().optional(),
});

interface TxFormValues {
  project_id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  type: "expense" | "income";
  payment_method: "โอนเงิน" | "เงินสด" | "บัตร" | "ค้างจ่าย";
  status: "paid" | "unpaid" | "deposit";
  payee?: string;
  note?: string;
  created_by?: string;
}

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  transaction?: Transaction | null;
  projects: Project[];
  defaultProjectId?: string;
  currentUser: string;
}

export function TransactionForm({
  open,
  onOpenChange,
  onSuccess,
  transaction,
  projects,
  defaultProjectId,
  currentUser,
}: TransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [savedTxId, setSavedTxId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const pendingFileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const isEdit = !!transaction;

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<TxFormValues>({ resolver: zodResolver(schema) as any,
    defaultValues: transaction
      ? {
          project_id: transaction.project_id,
          date: transaction.date,
          category: transaction.category,
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          payment_method: transaction.payment_method,
          status: transaction.status,
          payee: transaction.payee ?? "",
          note: transaction.note ?? "",
        }
      : {
          project_id: defaultProjectId ?? "",
          date: today,
          type: "expense",
          payment_method: "โอนเงิน",
          status: "paid",
          created_by: "",
        },
  });

  useEffect(() => {
    if (open && transaction) {
      // โหลดข้อมูลเดิมเข้า form
      reset({
        project_id: transaction.project_id,
        date: transaction.date,
        category: transaction.category,
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        payment_method: transaction.payment_method,
        status: transaction.status,
        payee: transaction.payee ?? "",
        note: transaction.note ?? "",
        created_by: transaction.created_by ?? "",
      });
      setSavedTxId(transaction.id);
      loadAttachments(transaction.id);
    }
    if (open && !transaction) {
      // form ใหม่
      reset({
        project_id: defaultProjectId ?? "",
        date: today,
        type: "expense",
        payment_method: "โอนเงิน",
        status: "paid",
        created_by: "",
      });
    }
    if (!open) {
      setSavedTxId(null);
      setAttachments([]);
      setPendingFiles([]);
    }
  }, [open, transaction]);

  // โหลด members เมื่อเลือกโปรเจกต์
  const watchedProjectId = watch("project_id");
  useEffect(() => {
    if (watchedProjectId) loadMembers(watchedProjectId);
    else setMembers([]);
  }, [watchedProjectId]);

  async function loadMembers(projectId: string) {
    const { data } = await supabase
      .from("project_members")
      .select("*")
      .eq("project_id", projectId)
      .order("name");
    if (data) setMembers(data);
  }

  async function loadAttachments(txId: string) {
    const { data } = await supabase
      .from("attachments")
      .select("*")
      .eq("transaction_id", txId);
    if (data) setAttachments(data);
  }

  async function uploadPendingFiles(txId: string) {
    for (const file of pendingFiles) {
      const ext = file.name.split(".").pop();
      const path = `${txId}/${Date.now()}_other.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("attachment")
        .upload(path, file);
      if (uploadError) continue;
      const { data: urlData } = supabase.storage.from("attachment").getPublicUrl(path);
      await supabase.from("attachments").insert({
        transaction_id: txId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: "other",
        storage_path: path,
      });
    }
  }

  async function onSubmit(values: TxFormValues) {
    setLoading(true);
    try {
      if (isEdit && transaction) {
        const { error } = await supabase
          .from("transactions")
          .update({ ...values })
          .eq("id", transaction.id);
        if (error) throw error;
        if (pendingFiles.length > 0) await uploadPendingFiles(transaction.id);
        toast.success("แก้ไขรายการสำเร็จ");
      } else {
        const { data: inserted, error } = await supabase
          .from("transactions")
          .insert({ ...values, created_by: values.created_by || currentUser })
          .select()
          .single();
        if (error) throw error;
        if (inserted) {
          setSavedTxId(inserted.id as string);
          if (pendingFiles.length > 0) await uploadPendingFiles(inserted.id as string);
        }
        toast.success("บันทึกรายการสำเร็จ");
      }
      reset();
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขรายการ" : "เพิ่มรายการใหม่"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit, () => {
            toast.error("กรุณากรอกข้อมูลให้ครบก่อนบันทึก");
            setTimeout(() => {
              const el = document.querySelector("[data-invalid='true'], .border-red-500");
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 50);
          })}
          className="space-y-4"
        >
          {/* Row: Project + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>โปรเจกต์ *</Label>
              <Select
                value={watch("project_id") ?? ""}
                onValueChange={(v) => setValue("project_id", v ?? "")}
              >
                <SelectTrigger
                  className={errors.project_id ? "border-red-500" : ""}
                  data-invalid={errors.project_id ? "true" : undefined}
                >
                  <SelectValue>
                    {projects.find((p) => p.id === watch("project_id"))?.project_name ?? "เลือกโปรเจกต์"}
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
              {errors.project_id && (
                <p className="text-xs text-red-500">{errors.project_id.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>วันที่ *</Label>
              <Input type="date" {...register("date")} />
            </div>
          </div>

          {/* Row: Type + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>ประเภท *</Label>
              <Select
                value={watch("type") ?? "expense"}
                onValueChange={(v) => {
                  const newType = (v ?? "expense") as "expense" | "income";
                  setValue("type", newType);
                  setValue("category", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue>
                    {watch("type") === "income" ? "รายรับ" : "รายจ่าย"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">รายจ่าย</SelectItem>
                  <SelectItem value="income">รายรับ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>หมวดหมู่ *</Label>
              <Select
                value={watch("category") ?? ""}
                onValueChange={(v) => setValue("category", v ?? "")}
              >
                <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                  <SelectValue>
                    {watch("category") || "เลือกหมวดหมู่"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(watch("type") === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>รายละเอียด *</Label>
            <Input
              {...register("description")}
              placeholder="เช่น ซื้อกระเบื้อง 30x60 cm"
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Row: Amount + Payee */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>จำนวนเงิน (บาท) *</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                {...register("amount")}
                className={errors.amount ? "border-red-500" : ""}
              />
              {errors.amount && (
                <p className="text-xs text-red-500">{errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>ผู้รับเงิน / ร้าน</Label>
              <Input {...register("payee")} placeholder="เช่น ร้านวัสดุไทย" />
            </div>
          </div>

          {/* Row: Payment + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>วิธีชำระ *</Label>
              <Select
                value={watch("payment_method") ?? "โอนเงิน"}
                onValueChange={(v) =>
                  setValue("payment_method", (v ?? "โอนเงิน") as typeof PAYMENT_METHODS[number])
                }
              >
                <SelectTrigger>
                  <SelectValue>{watch("payment_method") || "โอนเงิน"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>สถานะ *</Label>
              <Select
                value={watch("status") ?? "paid"}
                onValueChange={(v) =>
                  setValue("status", (v ?? "paid") as "paid" | "unpaid" | "deposit")
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {watch("status") === "unpaid" ? "ค้างจ่าย" : watch("status") === "deposit" ? "มัดจำ" : "จ่ายแล้ว"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">จ่ายแล้ว</SelectItem>
                  <SelectItem value="unpaid">ค้างจ่าย</SelectItem>
                  <SelectItem value="deposit">มัดจำ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row: Paid by + Note */}
          <div className="space-y-1.5">
            <Label>{watch("type") === "income" ? "ผู้รับเงิน *" : "ผู้จ่ายเงิน *"}</Label>
            <Select
              value={watch("created_by") ?? ""}
              onValueChange={(v) => setValue("created_by" as keyof TxFormValues, (v ?? "") as never)}
            >
              <SelectTrigger>
                <SelectValue>
                  {watch("created_by") || (watch("type") === "income" ? "เลือกผู้รับเงิน" : "เลือกผู้จ่ายเงิน")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {members.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400">
                    ยังไม่มีสมาชิก — ไปเพิ่มที่หน้าโปรเจกต์
                  </div>
                ) : (
                  members.map((m) => (
                    <SelectItem key={m.id} value={m.name}>
                      {m.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label>หมายเหตุ</Label>
            <Textarea {...register("note")} rows={2} placeholder="หมายเหตุเพิ่มเติม..." />
          </div>

          {/* Attachments */}
          <Separator />
          <div className="space-y-2">
            <Label>ไฟล์แนบ</Label>

            {savedTxId ? (
              <AttachmentUpload
                transactionId={savedTxId}
                existingAttachments={attachments}
                onUpdate={() => loadAttachments(savedTxId)}
              />
            ) : (
              <>
                {/* Pending files list */}
                {pendingFiles.length > 0 && (
                  <div className="space-y-1.5">
                    {pendingFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md text-sm"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="flex-1 truncate text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-400 shrink-0">
                          {(file.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setPendingFiles((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* File picker button */}
                <input
                  ref={pendingFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length > 0) {
                      setPendingFiles((prev) => [...prev, ...files]);
                    }
                    if (pendingFileInputRef.current) pendingFileInputRef.current.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => pendingFileInputRef.current?.click()}
                >
                  <Upload className="w-3 h-3" />
                  เลือกไฟล์แนบ
                </Button>
                <p className="text-xs text-gray-400">
                  รองรับไฟล์ jpg, png, pdf — ไฟล์จะถูกอัปโหลดพร้อมกับการบันทึกรายการ
                </p>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "บันทึกการแก้ไข" : "บันทึกรายการ"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
