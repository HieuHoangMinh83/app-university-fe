import apiClient from "@/lib/api-client";
import { PaginationParams, PaginatedResponse } from "./types";

export interface Category {
  id: string;
  name: string;
  description: string | null;
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
    products: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
}

export interface GetCategoriesParams extends PaginationParams {}

export const categoriesApi = {
  // Lấy tất cả categories
  getAll: async (params?: GetCategoriesParams): Promise<Category[] | PaginatedResponse<Category>> => {
    const response = await apiClient.get("/categories", { params });
    // Check if response has pagination structure: { data: { data: [...], meta: {...} } }
    if (response?.data?.data?.data && response?.data?.data?.meta) {
      return response.data.data as PaginatedResponse<Category>;
    }
    // Check if response is direct paginated: { data: [...], meta: {...} }
    if (response?.data?.data && response?.data?.meta && Array.isArray(response.data.data)) {
      return response.data as PaginatedResponse<Category>;
    }
    // Fallback to non-paginated response
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  // Lấy category theo ID
  getById: async (id: string): Promise<Category> => {
    const response = await apiClient.get(`/categories/${id}`);
    return response?.data?.data || response?.data;
  },

  // Tạo category mới
  create: async (data: CreateCategoryDto): Promise<Category> => {
    const response = await apiClient.post("/categories", data);
    return response?.data?.data || response?.data;
  },

  // Cập nhật category
  update: async (id: string, data: UpdateCategoryDto): Promise<Category> => {
    const response = await apiClient.patch(`/categories/${id}`, data);
    return response?.data?.data || response?.data;
  },

  // Xóa category
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },
};

