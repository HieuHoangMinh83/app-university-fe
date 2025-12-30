import apiClient from "@/lib/api-client";
import { PaginationParams, PaginatedResponse } from "./types";

export interface InventoryItem {
  id: string;
  inventoryProductId: string;
  quantity: number;
  expiryDate: string;
  notes: string | null;
  sessionCode: string;
  importedById: string;
  createdAt: string;
  updatedAt: string;
  session: {
    code: string;
    type: "IMPORT" | "EXPORT";
    createdAt: string;
    description: string | null;
  };
  importedBy: {
    id: string;
    name: string;
    phone: string;
  };
}

export interface InventoryProduct {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  category: {
    id: string;
    name: string;
    description: string | null;
    createdById: string;
    updatedById: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  isActive: boolean;
  hasExpiryDate: boolean;
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  inventoryItems?: InventoryItem[];
  validItems?: InventoryItem[]; // Items còn hạn
  expiredItems?: InventoryItem[]; // Items hết hạn
  validQuantity?: number; // Số lượng còn hạn (từ API /inventory-products)
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
}

export interface CreateInventoryProductDto {
  name: string;
  description?: string;
  categoryId: string; // required
  isActive?: boolean;
  hasExpiryDate?: boolean;
}

export interface UpdateInventoryProductDto {
  name?: string;
  description?: string;
  categoryId?: string;
  isActive?: boolean;
  hasExpiryDate?: boolean;
}

export interface GetInventoryProductsParams extends PaginationParams {
  expiryDateFrom?: string;
  expiryDateTo?: string;
  categoryId?: string;
}

export interface GetInventoryItemsParams extends PaginationParams {
  productId?: string;
  groupByProduct?: boolean;
  expiryDate?: string; // Chỉ dùng 1 parameter ngày thay vì expiryDateFrom và expiryDateTo
  status?: "all" | "valid" | "expired";
}

export const inventoryProductsApi = {
  // Lấy tất cả inventory products
  getAll: async (params?: GetInventoryProductsParams): Promise<InventoryProduct[] | PaginatedResponse<InventoryProduct>> => {
    // Chỉ truyền params hợp lệ (loại bỏ undefined/null)
    const cleanParams: Record<string, any> = {};
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof GetInventoryProductsParams];
        if (value !== undefined && value !== null) {
          cleanParams[key] = value;
        }
      });
    }
    const response = await apiClient.get("/inventory-products", Object.keys(cleanParams).length > 0 ? { params: cleanParams } : {});
    
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
        } as PaginatedResponse<InventoryProduct>;
      }
      // Nếu có data nhưng không có pagination, trả về array
      return response.data.data;
    }
    
    // Check if response has nested pagination structure: { data: { data: [...], meta: {...} } }
    if (response?.data?.data?.data && Array.isArray(response.data.data.data) && response?.data?.data?.meta) {
      return response.data.data as PaginatedResponse<InventoryProduct>;
    }
    // Check if response is direct paginated: { data: [...], meta: {...} }
    if (response?.data?.data && Array.isArray(response.data.data) && response?.data?.meta) {
      return response.data as PaginatedResponse<InventoryProduct>;
    }
    // Fallback to non-paginated response
    const data = response?.data?.data || response?.data;
    return Array.isArray(data) ? data : [];
  },

  // Lấy inventory product theo ID
  getById: async (id: string): Promise<InventoryProduct> => {
    const response = await apiClient.get(`/inventory-products/${id}`);
    return response?.data?.data || response?.data;
  },

  // Tạo inventory product mới
  create: async (data: CreateInventoryProductDto): Promise<InventoryProduct> => {
    const response = await apiClient.post("/inventory-products", data);
    return response?.data?.data || response?.data;
  },

  // Cập nhật inventory product
  update: async (id: string, data: UpdateInventoryProductDto): Promise<InventoryProduct> => {
    const response = await apiClient.patch(`/inventory-products/${id}`, data);
    return response?.data?.data || response?.data;
  },

  // Xóa inventory product
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/inventory-products/${id}`);
  },

  // Lấy danh sách lô hàng chi tiết
  getItems: async (params?: GetInventoryItemsParams): Promise<InventoryProduct[] | PaginatedResponse<InventoryProduct>> => {
    // Chỉ truyền params hợp lệ (loại bỏ undefined/null)
    const cleanParams: Record<string, any> = {};
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof GetInventoryItemsParams];
        if (value !== undefined && value !== null) {
          cleanParams[key] = value;
        }
      });
    }
    const response = await apiClient.get("/inventory-products/items", Object.keys(cleanParams).length > 0 ? { params: cleanParams } : {});
    
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
        } as PaginatedResponse<InventoryProduct>;
      }
      // Nếu có data nhưng không có pagination, trả về array
      return response.data.data.data;
    }
    
    // Check if response has nested pagination structure: { data: { data: [...], meta: {...} } }
    if (response?.data?.data?.data && Array.isArray(response.data.data.data) && response?.data?.data?.meta) {
      return response.data.data as PaginatedResponse<InventoryProduct>;
    }
    // Check if response is direct paginated: { data: [...], meta: {...} }
    if (response?.data?.data && Array.isArray(response.data.data) && response?.data?.meta) {
      return response.data as PaginatedResponse<InventoryProduct>;
    }
    // Fallback to non-paginated response
    const data = response?.data?.data || response?.data;
    return Array.isArray(data) ? data : [];
  },

  // Lấy danh sách products với validItems và expiredItems từ /inventory/transactions
  getTransactions: async (params?: PaginationParams): Promise<InventoryProduct[] | PaginatedResponse<InventoryProduct>> => {
    const cleanParams: Record<string, any> = {};
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof PaginationParams];
        if (value !== undefined && value !== null) {
          cleanParams[key] = value;
        }
      });
    }
    const response = await apiClient.get("/inventory/transactions", Object.keys(cleanParams).length > 0 ? { params: cleanParams } : {});
    
    // Xử lý response với cấu trúc: { statusCode, message, data: { data: [...], meta: {...} } }
    if (response?.data?.statusCode && response?.data?.data?.data && Array.isArray(response.data.data.data)) {
      const meta = response.data.data.meta;
      if (meta) {
        return {
          data: response.data.data.data,
          meta: {
            page: meta.page,
            pageSize: meta.pageSize,
            total: meta.total,
            totalPages: meta.totalPages,
          }
        } as PaginatedResponse<InventoryProduct>;
      }
      // Nếu có data nhưng không có meta, trả về array
      return response.data.data.data;
    }
    
    // Fallback to other structures
    if (response?.data?.data?.data && Array.isArray(response.data.data.data)) {
      const pagination = response.data.data.pagination || response.data.data.meta;
      if (pagination) {
        return {
          data: response.data.data.data,
          meta: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            totalPages: pagination.totalPages,
          }
        } as PaginatedResponse<InventoryProduct>;
      }
      return response.data.data.data;
    }
    
    // Check if response has nested pagination structure: { data: { data: [...], meta: {...} } }
    if (response?.data?.data?.data && Array.isArray(response.data.data.data) && response?.data?.data?.meta) {
      return response.data.data as PaginatedResponse<InventoryProduct>;
    }
    // Check if response is direct paginated: { data: [...], meta: {...} }
    if (response?.data?.data && Array.isArray(response.data.data) && response?.data?.meta) {
      return response.data as PaginatedResponse<InventoryProduct>;
    }
    // Fallback to non-paginated response
    const data = response?.data?.data || response?.data;
    return Array.isArray(data) ? data : [];
  },
};

