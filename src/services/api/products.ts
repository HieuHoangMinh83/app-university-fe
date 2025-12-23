import apiClient from "@/lib/api-client";
import { PaginationParams, PaginatedResponse } from "./types";

export interface ComboItem {
  id: string;
  inventoryProductId: string;
  quantity: number;
  isGift: boolean;
  inventoryProduct: {
    id: string;
    name: string;
  };
}

export interface Combo {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  image: string | null;
  promotionalPrice?: number | null;
  promotionStart?: string | null;
  promotionEnd?: string | null;
  isPromotionActive?: boolean;
  items: ComboItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  category: {
    id: string;
    name: string;
  } | null;
  isActive: boolean;
  spinCount?: number;
  image: string | null;
  combos: Combo[];
  createdBy: {
    id: string;
    name: string;
    phone: string;
  };
  updatedBy?: {
    id: string;
    name: string;
    phone: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  categoryId?: string;
  isActive?: boolean;
  spinCount?: number;
  image?: string;
  combos: Array<{
    name: string;
    price: number;
    isActive?: boolean;
    image?: string;
    promotionalPrice?: number;
    promotionStart?: string;
    promotionEnd?: string;
    isPromotionActive?: boolean;
    items: Array<{
      inventoryProductId: string;
      quantity: number;
      isGift?: boolean;
    }>;
  }>;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  categoryId?: string;
  isActive?: boolean;
  spinCount?: number;
  image?: string;
}

export interface CreateComboDto {
  name: string;
  price: number;
  isActive?: boolean;
  image?: string;
  promotionalPrice?: number;
  promotionStart?: string;
  promotionEnd?: string;
  isPromotionActive?: boolean;
  items: Array<{
    inventoryProductId: string;
    quantity: number;
    isGift?: boolean;
  }>;
}

export interface UpdateComboDto {
  name?: string;
  price?: number;
  isActive?: boolean;
  image?: string;
  promotionalPrice?: number;
  promotionStart?: string;
  promotionEnd?: string;
  isPromotionActive?: boolean;
}

export interface GetProductsParams extends PaginationParams {
  categoryId?: string;
  status?: string;
}

export const productsApi = {
  // Lấy tất cả products
  getAll: async (params?: GetProductsParams): Promise<Product[] | PaginatedResponse<Product>> => {
    const response = await apiClient.get("/products", { params });
    // Check if response has pagination structure: { data: { data: [...], meta: {...} } }
    if (response?.data?.data?.data && response?.data?.data?.meta) {
      return response.data.data as PaginatedResponse<Product>;
    }
    // Check if response is direct paginated: { data: [...], meta: {...} }
    if (response?.data?.data && response?.data?.meta && Array.isArray(response.data.data)) {
      return response.data as PaginatedResponse<Product>;
    }
    // Fallback to non-paginated response
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  // Lấy product theo ID
  getById: async (id: string): Promise<Product> => {
    const response = await apiClient.get(`/products/${id}`);
    return response?.data?.data || response?.data;
  },

  // Tạo product mới
  create: async (data: CreateProductDto): Promise<Product> => {
    const response = await apiClient.post("/products", data);
    return response?.data?.data || response?.data;
  },

  // Cập nhật product
  update: async (id: string, data: UpdateProductDto): Promise<Product> => {
    const response = await apiClient.patch(`/products/${id}`, data);
    return response?.data?.data || response?.data;
  },

  // Xóa product
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },

  // Thêm combo vào product
  addCombo: async (productId: string, data: CreateComboDto): Promise<Combo> => {
    const response = await apiClient.post(`/products/${productId}/combos`, data);
    return response?.data?.data || response?.data;
  },

  // Cập nhật combo
  updateCombo: async (comboId: string, data: UpdateComboDto): Promise<Combo> => {
    const response = await apiClient.patch(`/products/combos/${comboId}`, data);
    return response?.data?.data || response?.data;
  },

  // Xóa combo
  deleteCombo: async (comboId: string): Promise<void> => {
    await apiClient.delete(`/products/combos/${comboId}`);
  },

};

