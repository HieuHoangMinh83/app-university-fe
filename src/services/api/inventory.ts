import apiClient from "@/lib/api-client";

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

export interface ImportInventoryDto {
  productId: string;
  quantity: number;
  expiryDate: string;
  batchCode?: string;
  notes?: string;
}

export const inventoryApi = {
  // Nhập kho
  import: async (data: ImportInventoryDto): Promise<InventoryItem> => {
    const response = await apiClient.post("/inventory/import", data);
    return response?.data?.data || response?.data;
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

