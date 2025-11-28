import apiClient from "@/lib/api-client";

export interface ProductImage {
  id: string;
  url: string;
}

export interface ComboGift {
  id: string;
  giftCombo: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  };
  quantity: number;
  createdBy: {
    id: string;
    name: string;
    phone: string;
  };
  createdAt: string;
}

export interface Combo {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isActive: boolean;
  promotionalPrice?: number | null;
  promotionStart?: string | null;
  promotionEnd?: string | null;
  isPromotionActive?: boolean;
  giftCombos?: ComboGift[];
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
  } | null;
  isActive: boolean;
  quantity: number;
  images: ProductImage[];
  combos: Combo[];
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  categoryId?: string;
  isActive?: boolean;
  quantity?: number;
  images?: Array<{ url: string }>;
  combos: Array<{
    name: string;
    price: number;
    quantity?: number;
    isActive?: boolean;
    promotionalPrice?: number;
    promotionStart?: string;
    promotionEnd?: string;
    isPromotionActive?: boolean;
    giftCombos?: Array<{
      giftComboId: string;
      quantity: number;
    }>;
  }>;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  categoryId?: string;
  isActive?: boolean;
  quantity?: number;
}

export interface CreateComboDto {
  name: string;
  price: number;
  quantity?: number;
  isActive?: boolean;
  promotionalPrice?: number;
  promotionStart?: string;
  promotionEnd?: string;
  isPromotionActive?: boolean;
}

export interface UpdateComboDto {
  name?: string;
  price?: number;
  quantity?: number;
  isActive?: boolean;
  promotionalPrice?: number;
  promotionStart?: string;
  promotionEnd?: string;
  isPromotionActive?: boolean;
}

export const productsApi = {
  // Lấy tất cả products
  getAll: async (): Promise<Product[]> => {
    const response = await apiClient.get("/products");
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

  // Thêm combo gift
  addComboGift: async (comboId: string, data: { giftComboId: string; quantity?: number; isActive?: boolean }): Promise<ComboGift> => {
    const response = await apiClient.post(`/products/combos/${comboId}/gifts`, data);
    return response?.data?.data || response?.data;
  },

  // Lấy danh sách combo gifts
  getComboGifts: async (comboId: string) => {
    const response = await apiClient.get(`/products/combos/${comboId}/gifts`);
    return response?.data?.data || response?.data;
  },

  // Xóa combo gift
  deleteComboGift: async (comboGiftId: string): Promise<void> => {
    await apiClient.delete(`/products/combos/gifts/${comboGiftId}`);
  },
};

