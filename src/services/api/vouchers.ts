import apiClient from "@/lib/api-client";

export type VoucherType = "PERCENT" | "FIXED";

export interface Voucher {
  id: string;
  name: string;
  description: string | null;
  type: VoucherType;
  price: number | null;
  percent: number | null;
  maxPrice: number | null;
  minApply: number | null;
  quantity: number;
  pointsRequired: number | null;
  isRedeemable: boolean;
  isActive: boolean;
  redeemStart: string | null;
  redeemEnd: string | null;
  useEnd: string | null;
  createdBy: {
    id: string;
    name: string;
    phone: string;
  };
  updatedBy: {
    id: string;
    name: string;
    phone: string;
  } | null;
  _count?: {
    orders: number;
    clientVouchers: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateVoucherDto {
  name: string;
  description?: string;
  type: VoucherType;
  price?: number;
  percent?: number;
  maxPrice?: number;
  minApply?: number;
  quantity?: number;
  pointsRequired?: number;
  isRedeemable?: boolean;
  isActive?: boolean;
  redeemStart?: string;
  redeemEnd?: string;
  useEnd?: string;
}

export interface UpdateVoucherDto {
  name?: string;
  description?: string;
  type?: VoucherType;
  price?: number;
  percent?: number;
  maxPrice?: number;
  minApply?: number;
  quantity?: number;
  pointsRequired?: number;
  isRedeemable?: boolean;
  isActive?: boolean;
  redeemStart?: string;
  redeemEnd?: string;
  useEnd?: string;
}

export const vouchersApi = {
  // Lấy tất cả vouchers
  getAll: async (): Promise<Voucher[]> => {
    const response = await apiClient.get("/vouchers");
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  // Lấy voucher theo ID
  getById: async (id: string): Promise<Voucher> => {
    const response = await apiClient.get(`/vouchers/${id}`);
    return response?.data?.data || response?.data;
  },

  // Tạo voucher mới
  create: async (data: CreateVoucherDto): Promise<Voucher> => {
    const response = await apiClient.post("/vouchers", data);
    return response?.data?.data || response?.data;
  },

  // Cập nhật voucher
  update: async (id: string, data: UpdateVoucherDto): Promise<Voucher> => {
    const response = await apiClient.patch(`/vouchers/${id}`, data);
    return response?.data?.data || response?.data;
  },

  // Xóa voucher
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/vouchers/${id}`);
  },
};

