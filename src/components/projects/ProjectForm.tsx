"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { Project } from "@/types";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";

const schema = z.object({
  project_name: z.string().min(1, "กรุณากรอกชื่อโปรเจกต์"),
  address: z.string().optional(),
  area: z.coerce.number().optional(),
  members: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
    })
  ).optional(),
});

interface ProjectFormValues {
  project_name: string;
  address?: string;
  area?: number;
  members?: { name: string; role: string }[];
}

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  project?: Project | null;
  currentUser: string;
}

export function ProjectForm({
  open,
  onOpenChange,
  onSuccess,
  project,
  currentUser,
}: ProjectFormProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const isEdit = !!project;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<ProjectFormValues>({ resolver: zodResolver(schema) as any,
    defaultValues: project
      ? {
          project_name: project.project_name,
          address: project.address ?? "",
          area: project.area ?? undefined,
          members: [],
        }
      : {
          project_name: "",
          address: "",
          area: undefined,
          members: [{ name: "", role: "" }],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "members",
  });

  async function onSubmit(data: ProjectFormValues) {
    setLoading(true);
    try {
      if (isEdit && project) {
        const { error } = await supabase
          .from("projects")
          .update({
            project_name: data.project_name,
            address: data.address || null,
            area: data.area || null,
          })
          .eq("id", project.id);
        if (error) throw error;
        toast.success("แก้ไขโปรเจกต์สำเร็จ");
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่");

        // สร้างโปรเจกต์
        const { data: inserted, error } = await supabase
          .from("projects")
          .insert({
            project_name: data.project_name,
            address: data.address || null,
            area: data.area || null,
            budget_total: 0,
            owner_id: authUser.id,
            created_by: authUser.user_metadata?.full_name ?? authUser.email ?? currentUser,
          })
          .select()
          .single();
        if (error) throw error;

        // เพิ่มสมาชิกที่กรอกไว้
        const validMembers = (data.members ?? []).filter((m) => m.name.trim());
        if (validMembers.length > 0 && inserted) {
          await supabase.from("project_members").insert(
            validMembers.map((m) => ({
              project_id: inserted.id,
              name: m.name.trim(),
              role: m.role.trim() || "ทั่วไป",
            }))
          );
        }

        toast.success("สร้างโปรเจกต์สำเร็จ");
      }
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error(`เกิดข้อผิดพลาด: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขโปรเจกต์" : "สร้างโปรเจกต์ใหม่"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* ชื่อโปรเจกต์ */}
          <div className="space-y-1.5">
            <Label>ชื่อโปรเจกต์ *</Label>
            <Input
              {...register("project_name")}
              placeholder="เช่น บ้านรีโนเวทสุขุมวิท 71"
              autoFocus
            />
            {errors.project_name && (
              <p className="text-xs text-red-500">{errors.project_name.message}</p>
            )}
          </div>

          {/* เบอร์ห้อง / ที่อยู่ */}
          <div className="space-y-1.5">
            <Label>เบอร์ห้อง / ที่อยู่</Label>
            <Input
              {...register("address")}
              placeholder="เช่น ห้อง 502 ชั้น 5 หรือ 123/4 ถ.สุขุมวิท"
            />
          </div>

          {/* พื้นที่ */}
          <div className="space-y-1.5">
            <Label>พื้นที่ (ตร.ม.)</Label>
            <Input
              {...register("area")}
              type="number"
              placeholder="0.00"
              min={0}
              step="0.01"
            />
          </div>

          {/* สมาชิกในทีม — แสดงเฉพาะตอนสร้างใหม่ */}
          {!isEdit && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>สมาชิกในทีม</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => append({ name: "", role: "" })}
                  >
                    <Plus className="w-3 h-3" /> เพิ่มสมาชิก
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Input
                        {...register(`members.${index}.name`)}
                        placeholder="ชื่อ เช่น สมชาย"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Input
                        {...register(`members.${index}.role`)}
                        placeholder="หน้าที่ เช่น ช่างไฟ"
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-500 shrink-0"
                      onClick={() => remove(index)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}

                {fields.length === 0 && (
                  <p className="text-xs text-gray-400">ยังไม่มีสมาชิก (เพิ่มทีหลังได้)</p>
                )}
              </div>
            </>
          )}

          <DialogFooter className="pt-2">
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
              {isEdit ? "บันทึกการแก้ไข" : "สร้างโปรเจกต์"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
