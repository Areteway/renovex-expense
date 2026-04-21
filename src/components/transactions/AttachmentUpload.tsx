"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { AttachmentType, Attachment } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Paperclip,
  Upload,
  Trash2,
  FileImage,
  FileText,
  Loader2,
  ExternalLink,
} from "lucide-react";

const attachmentTypeLabels: Record<AttachmentType, string> = {
  slip: "สลิป",
  invoice: "Invoice",
  photo: "รูปภาพ",
  other: "อื่นๆ",
};

interface AttachmentUploadProps {
  transactionId: string;
  existingAttachments: Attachment[];
  onUpdate: () => void;
}

export function AttachmentUpload({
  transactionId,
  existingAttachments,
  onUpdate,
}: AttachmentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [fileType, setFileType] = useState<AttachmentType>("slip");
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${transactionId}/${Date.now()}_${fileType}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("attachment")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("attachment")
        .getPublicUrl(path);

      const { error: dbError } = await supabase.from("attachments").insert({
        transaction_id: transactionId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: fileType,
        storage_path: path,
      });

      if (dbError) throw dbError;
      toast.success("อัปโหลดไฟล์สำเร็จ");
      onUpdate();
    } catch {
      toast.error("อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(attachment: Attachment) {
    if (!confirm("ลบไฟล์นี้?")) return;
    await supabase.storage.from("attachment").remove([attachment.storage_path]);
    await supabase.from("attachments").delete().eq("id", attachment.id);
    toast.success("ลบไฟล์แล้ว");
    onUpdate();
  }

  return (
    <div className="space-y-3">
      {/* Existing files */}
      {existingAttachments.length > 0 && (
        <div className="space-y-2">
          {existingAttachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm"
            >
              {att.file_type === "photo" ? (
                <FileImage className="w-4 h-4 text-blue-500 shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-orange-500 shrink-0" />
              )}
              <span className="flex-1 truncate text-gray-700">{att.file_name}</span>
              <Badge variant="outline" className="text-xs shrink-0">
                {attachmentTypeLabels[att.file_type]}
              </Badge>
              <a href={att.file_url} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-500 hover:text-red-700"
                onClick={() => handleDelete(att)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload */}
      <div className="flex items-center gap-2">
        <Select
          value={fileType}
          onValueChange={(v) => setFileType(v as AttachmentType)}
        >
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(attachmentTypeLabels) as [AttachmentType, string][]).map(
              ([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {v}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>

        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Upload className="w-3 h-3" />
          )}
          {uploading ? "กำลังอัปโหลด..." : "แนบไฟล์"}
        </Button>
      </div>

      {existingAttachments.length === 0 && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <Paperclip className="w-3 h-3" />
          ยังไม่มีไฟล์แนบ
        </p>
      )}
    </div>
  );
}
