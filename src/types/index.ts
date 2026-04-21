export type ProjectStatus = "active" | "completed" | "paused";
export type TransactionType = "expense" | "income";
export type PaymentMethod = "โอนเงิน" | "เงินสด" | "บัตร" | "ค้างจ่าย";
export type TransactionStatus = "paid" | "unpaid" | "deposit";
export type AttachmentType = "slip" | "invoice" | "photo" | "other";
export type UserRole = "admin" | "foreman" | "accounting";

export interface Project {
  id: string;
  project_name: string;
  budget_total: number;
  area: number | null;
  address: string | null;
  target_sell_price: number | null;
  status: ProjectStatus;
  owner_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  project_id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  type: TransactionType;
  payment_method: PaymentMethod;
  status: TransactionStatus;
  payee: string | null;
  created_by: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  project?: Project;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  transaction_id: string;
  file_name: string;
  file_url: string;
  file_type: AttachmentType;
  storage_path: string;
  created_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  name: string;
  role: string;
  created_at: string;
}

export interface DashboardStats {
  totalExpense: number;
  totalIncome: number;
  budgetTotal: number;
  budgetRemaining: number;
  budgetUsedPercent: number;
  unpaidAmount: number;
  topCategory: string;
  topCategoryAmount: number;
}

export const INCOME_CATEGORIES = [
  "เงินลงทุน",
  "รายได้",
] as const;

export const EXPENSE_CATEGORIES = [
  "เครื่องใช้ไฟฟ้า",
  "อุปกรณ์ไฟฟ้าและไฟแสงสว่าง",
  "เงินมัดจำทำสัญญา",
  "วัสดุตกแต่งห้อง",
  "วัสดุระบบประปา",
  "วัสดุก่อสร้าง",
  "วัสดุพื้น",
  "กระเบื้อง",
  "เฟอร์นิเจอร์",
  "ค่าแรงช่าง",
  "ค่าขนส่ง",
  "ค่านิติส่วนกลาง",
  "ค่าออกแบบ",
  "ค่าเบ็ดเตล็ด",
  "บิ้วอิน",
  "ค่าคอมมิชชั่น",
  "เงินสำรองลงทุน",
] as const;

export const CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES] as const;

export const PAYMENT_METHODS: PaymentMethod[] = [
  "โอนเงิน",
  "เงินสด",
  "บัตร",
  "ค้างจ่าย",
];

export const USERS: { value: string; label: string; role: UserRole }[] = [
  { value: "admin", label: "Admin (Owner)", role: "admin" },
  { value: "zack", label: "Zack (Foreman)", role: "foreman" },
  { value: "accounting", label: "Accounting", role: "accounting" },
];

export const ROLE_PERMISSIONS: Record<
  UserRole,
  { canCreate: boolean; canEdit: boolean; canDelete: boolean; canExport: boolean }
> = {
  admin: { canCreate: true, canEdit: true, canDelete: true, canExport: true },
  foreman: { canCreate: true, canEdit: false, canDelete: false, canExport: false },
  accounting: { canCreate: false, canEdit: false, canDelete: false, canExport: true },
};
