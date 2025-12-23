import apiClient from "@/lib/api-client";
import { PaginationParams, PaginatedResponse } from "./types";

export interface InventoryItem {
  id: string;
  productId: string;
  quantity: number;
  expiryDate: string;
  batchCode: string | null;
  notes: string | null;
  product: {
    id: string;
    name: string;
  };
  importedBy: {
    id: string;
    name: string;
    phone: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductInventory {
  product: {
    id: string;
    name: string;
    totalQuantity: number;
  };
  inventoryItems: InventoryItem[];
}

export interface ImportInventoryItemDto {
  productId: string;
  quantity: number;
  expiryDate?: string;
  notes?: string;
}

export interface ImportInventoryDto {
  sessionDescription: string;
  items: ImportInventoryItemDto[];
}

export interface CreateSessionDto {
  type: "IMPORT" | "EXPORT";
  description?: string;
  notes?: string;
  orderId?: string; // Chỉ dùng khi type = "EXPORT"
}

export interface InventorySession {
  id?: string;
  code: string;
  type: "IMPORT" | "EXPORT";
  description: string | null;
  notes: string | null;
  orderId: string | null;
  createdBy?: {
    id: string;
    name: string;
    phone: string;
  };
  order: {
    id: string;
    totalPrice: number;
    status: string;
    client: {
      id: string;
      name: string;
    };
  } | null;
  transactions: InventoryTransaction[];
  _count?: {
    transactions: number;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface InventoryTransaction {
  id: string;
  type: "IMPORT" | "EXPORT";
  quantity: number;
  notes: string | null;
  sessionId: string;
  inventoryItemId: string;
  orderItemId: string | null;
  inventoryItem: {
    id: string;
    quantity: number;
    expiryDate: string;
    batchCode: string | null;
    inventoryProduct: {
      id: string;
      name: string;
    };
  };
  orderItem: {
    id: string;
    quantity: number;
    combo: {
      id: string;
      name: string;
    };
  } | null;
  performedBy: {
    id: string;
    name: string;
    phone: string;
  };
  createdAt: string;
}

export const inventoryApi = {
  // Tạo session nhập/xuất kho
  createSession: async (data: CreateSessionDto): Promise<InventorySession> => {
    const response = await apiClient.post("/inventory/sessions", data);
    return response?.data?.data || response?.data;
  },

  // Lấy danh sách sessions
  getSessions: async (params?: { type?: "IMPORT" | "EXPORT"; orderId?: string } & PaginationParams): Promise<InventorySession[] | PaginatedResponse<InventorySession>> => {
    const response = await apiClient.get("/inventory/sessions", { params });
    // Check if response has pagination structure: { data: { data: [...], meta: {...} } }
    if (response?.data?.data?.data && response?.data?.data?.meta) {
      return response.data.data as PaginatedResponse<InventorySession>;
    }
    // Check if response is direct paginated: { data: [...], meta: {...} }
    if (response?.data?.data && response?.data?.meta && Array.isArray(response.data.data)) {
      return response.data as PaginatedResponse<InventorySession>;
    }
    // Fallback to non-paginated response
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  // Lấy chi tiết session
  getSessionById: async (sessionId: string): Promise<InventorySession> => {
    const response = await apiClient.get(`/inventory/sessions/${sessionId}`);
    return response?.data?.data || response?.data;
  },

  // Nhập kho (nhận mảng các items)
  import: async (data: ImportInventoryDto): Promise<InventoryItem[]> => {
    const response = await apiClient.post("/inventory/import", data);
    const result = response?.data?.data || response?.data;
    return Array.isArray(result) ? result : [];
  },

  // Lấy inventory của product
  getByProduct: async (productId: string): Promise<ProductInventory> => {
    const response = await apiClient.get(`/inventory/product/${productId}`);
    return response?.data?.data || response?.data;
  },

  // Lấy tất cả inventory
  getAll: async (productId?: string): Promise<InventoryItem[]> => {
    const params = productId ? { productId } : {};
    const response = await apiClient.get("/inventory", { params });
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  // Lấy inventory sắp hết hạn
  getExpiringSoon: async (days: number = 7): Promise<InventoryItem[]> => {
    const response = await apiClient.get("/inventory/expiring-soon", {
      params: { days },
    });
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },
};

