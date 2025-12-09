import apiClient from "@/lib/api-client";
import { PaginationParams, PaginatedResponse } from "./types";

export type TransactionType = "IMPORT" | "EXPORT";


export interface InventoryTransaction {
  id: string;
  sessionCode: string;
  type: TransactionType;
  quantity: number;
  notes: string | null;
  inventoryItemId: string;
  orderItemId: string | null;
  performedById: string;
  createdAt: string;
  session: {
    code: string;
    type: TransactionType;
    description: string | null;
    notes: string | null;
    createdAt: string;
  };
  inventoryItem: {
    id: string;
    inventoryProductId: string;
    quantity: number;
    expiryDate: string;
    notes: string | null;
    sessionCode: string;
    importedById: string;
    createdAt: string;
    updatedAt: string;
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
    order: {
      id: string;
      totalPrice: number;
      status: string;
      client: {
        id: string;
        name: string;
      };
    };
  } | null;
  performedBy: {
    id: string;
    name: string;
    phone: string;
  };
}

export interface GetTransactionsParams extends PaginationParams {
  productId?: string;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  orderId?: string;
  sessionId?: string;
  inventoryItemId?: string;
  orderItemId?: string;
}

export const inventoryTransactionsApi = {
  // Lấy tất cả transactions
  getAll: async (params?: GetTransactionsParams): Promise<InventoryTransaction[] | PaginatedResponse<InventoryTransaction>> => {
    const response = await apiClient.get("/inventory/transactions", { params });
    // Check if response has pagination structure: { data: { data: [...], meta: {...} } }
    if (response?.data?.data?.data && response?.data?.data?.meta) {
      return response.data.data as PaginatedResponse<InventoryTransaction>;
    }
    // Check if response is direct paginated: { data: [...], meta: {...} }
    if (response?.data?.data && response?.data?.meta && Array.isArray(response.data.data)) {
      return response.data as PaginatedResponse<InventoryTransaction>;
    }
    // Fallback to non-paginated response
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  // Lấy transaction theo ID
  getById: async (id: string): Promise<InventoryTransaction> => {
    const response = await apiClient.get(`/inventory/transactions/${id}`);
    return response?.data?.data || response?.data;
  },

  // Lấy transactions của một sản phẩm
  getByProduct: async (productId: string): Promise<InventoryTransaction[]> => {
    const response = await apiClient.get(`/inventory/transactions`, {
      params: { productId },
    });
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  // Lấy transactions của một đơn hàng
  getByOrder: async (orderId: string): Promise<InventoryTransaction[]> => {
    const response = await apiClient.get(`/inventory/transactions`, {
      params: { orderId },
    });
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  // Lấy transactions của một session
  getBySession: async (sessionId: string): Promise<InventoryTransaction[]> => {
    const response = await apiClient.get(`/inventory/transactions`, {
      params: { sessionId },
    });
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },
};

