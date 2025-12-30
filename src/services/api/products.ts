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
  combos?: Array<{
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

export interface GetProductsFilterParams {
  categoryId?: string;
  status?: string;
}

export interface GetProductsPaginatedParams extends PaginationParams, GetProductsFilterParams {}

export const productsApi = {
  // Lấy tất cả products (không phân trang)
  getAll: async (params?: GetProductsFilterParams): Promise<Product[]> => {
    try {
      // Chỉ truyền params hợp lệ (loại bỏ undefined/null)
      const cleanParams: Record<string, any> = {};
      if (params) {
        Object.keys(params).forEach(key => {
          const value = params[key as keyof GetProductsFilterParams];
          if (value !== undefined && value !== null) {
            cleanParams[key] = value;
          }
        });
      }
      const response = await apiClient.get("/products", Object.keys(cleanParams).length > 0 ? { params: cleanParams } : {});
      
      // Xử lý response với cấu trúc: { statusCode, message, data: { data: [...] } }
      if (response?.data?.data?.data && Array.isArray(response.data.data.data)) {
        return response.data.data.data;
      }
      
      // Xử lý response với cấu trúc: { statusCode, message, data: [...] } (data là array trực tiếp)
      if (response?.data?.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      
      // Xử lý response với cấu trúc: { data: [...] } (không có statusCode)
      if (response?.data && Array.isArray(response.data)) {
        return response.data;
      }
      
      // Fallback
      const data = response.data?.data || response.data;
      if (Array.isArray(data)) {
        return data;
      }
      
      return [];
    } catch (error: any) {
      throw error;
    }
  },

  // Lấy products có phân trang
  getPaginated: async (params?: GetProductsPaginatedParams): Promise<PaginatedResponse<Product>> => {
    // Chỉ truyền params hợp lệ (loại bỏ undefined/null)
    const cleanParams: Record<string, any> = {};
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof GetProductsPaginatedParams];
        if (value !== undefined && value !== null) {
          cleanParams[key] = value;
        }
      });
    }
    const response = await apiClient.get("/products", Object.keys(cleanParams).length > 0 ? { params: cleanParams } : {});
    
    // Xử lý response với cấu trúc: { statusCode, message, data: { data: [...], pagination: {...} } }
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
        } as PaginatedResponse<Product>;
      }
    }
    
    // Xử lý response với cấu trúc: { statusCode, message, data: { data: [...], meta: {...} } }
    if (response?.data?.data?.data && response?.data?.data?.meta) {
      return response.data.data as PaginatedResponse<Product>;
    }
    
    // Xử lý response với cấu trúc: { statusCode, message, data: [...], meta: {...} }
    if (response?.data?.data && Array.isArray(response.data.data)) {
      if (response?.data?.meta || response?.data?.pagination) {
        const pagination = response.data.pagination || response.data.meta;
        return {
          data: response.data.data,
          meta: {
            page: pagination?.page || 1,
            pageSize: pagination?.pageSize || response.data.data.length,
            total: pagination?.total || response.data.data.length,
            totalPages: pagination?.totalPages || 1,
          }
        } as PaginatedResponse<Product>;
      }
    }
    
    // Check if response is direct paginated: { data: [...], meta: {...} }
    if (response?.data?.data && response?.data?.meta && Array.isArray(response.data.data)) {
      return response.data as PaginatedResponse<Product>;
    }
    
    // Fallback: nếu không có pagination, trả về với meta mặc định
    const data = response.data?.data || response.data;
    const productsArray = Array.isArray(data) ? data : [];
    return {
      data: productsArray,
      meta: {
        page: 1,
        pageSize: productsArray.length,
        total: productsArray.length,
        totalPages: 1,
      }
    };
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

