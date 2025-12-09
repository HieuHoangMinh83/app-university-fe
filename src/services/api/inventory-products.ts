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
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  inventoryItems: InventoryItem[];
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
}

export interface UpdateInventoryProductDto {
  name?: string;
  description?: string;
  categoryId?: string;
  isActive?: boolean;
}

export interface GetInventoryProductsParams extends PaginationParams {
  expiryDateFrom?: string;
  expiryDateTo?: string;
  categoryId?: string;
}

export const inventoryProductsApi = {
  // Lấy tất cả inventory products
  getAll: async (params?: GetInventoryProductsParams): Promise<InventoryProduct[] | PaginatedResponse<InventoryProduct>> => {
    const response = await apiClient.get("/inventory-products", { params });
    // Check if response has pagination structure: { data: { data: [...], meta: {...} } }
    if (response?.data?.data?.data && response?.data?.data?.meta) {
      return response.data.data as PaginatedResponse<InventoryProduct>;
    }
    // Check if response is direct paginated: { data: [...], meta: {...} }
    if (response?.data?.data && response?.data?.meta && Array.isArray(response.data.data)) {
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
};

