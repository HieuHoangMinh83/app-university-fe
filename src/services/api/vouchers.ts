import apiClient from "@/lib/api-client";
import { PaginationParams, PaginatedResponse } from "./types";

export type VoucherType = "PERCENT" | "FIXED";

export interface Voucher {
  id: string;
  name: string;
  description: string | null;
  type: VoucherType;
  price: number | null;
  percent: number | null;
  maxPrice: number | null;
  hasMaxPrice: boolean;
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
  hasMaxPrice?: boolean;
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
  hasMaxPrice?: boolean;
  minApply?: number;
  quantity?: number;
  pointsRequired?: number;
  isRedeemable?: boolean;
  isActive?: boolean;
  redeemStart?: string;
  redeemEnd?: string;
  useEnd?: string;
}

export interface GetVouchersParams extends PaginationParams {
  isActive?: boolean;
  isRedeemable?: boolean;
}

export const vouchersApi = {
  // Lấy tất cả vouchers
  getAll: async (params?: GetVouchersParams): Promise<Voucher[] | PaginatedResponse<Voucher>> => {
    // Chỉ truyền params hợp lệ (loại bỏ undefined/null)
    const cleanParams: Record<string, any> = {};
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof GetVouchersParams];
        if (value !== undefined && value !== null) {
          cleanParams[key] = value;
        }
      });
    }
    const response = await apiClient.get("/vouchers", Object.keys(cleanParams).length > 0 ? { params: cleanParams } : {});
    
    // Xử lý response với cấu trúc: { data: { data: [...], pagination: {...} } }
    if (response?.data?.data?.data && Array.isArray(response.data.data.data)) {
      const pagination = response.data.data.pagination;
      if (pagination) {
        return {
          data: response.data.data.data,
          meta: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            totalPages: pagination.totalPages,
          }
        } as PaginatedResponse<Voucher>;
      }
      // Nếu có data nhưng không có pagination, trả về array
      return response.data.data.data;
    }
    
    // Check if response has pagination structure: { data: { data: [...], meta: {...} } }
    if (response?.data?.data?.data && response?.data?.data?.meta) {
      return response.data.data as PaginatedResponse<Voucher>;
    }
    // Check if response is direct paginated: { data: [...], meta: {...} }
    if (response?.data?.data && response?.data?.meta && Array.isArray(response.data.data)) {
      return response.data as PaginatedResponse<Voucher>;
    }
    // Fallback to non-paginated response
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

  // Lấy danh sách voucher có thể đổi (redeemable)
  getRedeemableList: async (): Promise<Voucher[]> => {
    console.log(`[API] Calling GET /vouchers/redeemable/list`);
    const response = await apiClient.get("/vouchers/redeemable/list");
    console.log(`[API] Response:`, response?.data);
    return response?.data?.data || response?.data || [];
  },
};

