import apiClient from "@/lib/api-client";

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

export const categoriesApi = {
  // Lấy tất cả categories
  getAll: async (): Promise<Category[]> => {
    const response = await apiClient.get("/categories");
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

