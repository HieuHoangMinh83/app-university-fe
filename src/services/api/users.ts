import apiClient from "@/lib/api-client";
import { PaginationParams, PaginatedResponse } from "./types";

export interface User {
  id: string;
  name: string;
  phone: string;
  avatar: string | null;
  role: string | {
    id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserDto {
  name: string;
  phone: string;
  password: string;
  avatar?: string;
  role: string; // "admin", "Admin", "guest", "Guest"
}

export interface UpdateUserInfoDto {
  name?: string;
  avatar?: string;
}

export const usersApi = {
  // Lấy tất cả users (Admin only)
  getAll: async (params?: PaginationParams): Promise<User[] | PaginatedResponse<User>> => {
    try {
      // Chỉ truyền params hợp lệ (loại bỏ undefined/null)
      const cleanParams: Record<string, any> = {};
      if (params) {
        Object.keys(params).forEach(key => {
          const value = params[key as keyof PaginationParams];
          if (value !== undefined && value !== null) {
            cleanParams[key] = value;
          }
        });
      }
      const response = await apiClient.get("/users", Object.keys(cleanParams).length > 0 ? { params: cleanParams } : {});
      
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
          } as PaginatedResponse<User>;
        }
        // Nếu có data nhưng không có pagination, trả về array
        return response.data.data.data;
      }
      
      // Check if response has pagination structure: { data: { data: [...], meta: {...} } }
      if (response?.data?.data?.data && response?.data?.data?.meta) {
        return response.data.data as PaginatedResponse<User>;
      }
      // Check if response is direct paginated: { data: [...], meta: {...} }
      if (response?.data?.data && response?.data?.meta && Array.isArray(response.data.data)) {
        return response.data as PaginatedResponse<User>;
      }
      // Fallback to non-paginated response
      const data = response?.data?.data || response?.data;
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      // Nếu API không tồn tại, trả về mảng rỗng
      console.error("Get users error:", error);
      return [];
    }
  },

  // Lấy thông tin profile
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get("/users/profile");
    return response?.data?.data || response?.data;
  },

  // Tạo user mới (Admin only) - sử dụng auth/register endpoint
  create: async (data: CreateUserDto): Promise<User> => {
    const response = await apiClient.post("/auth/register", data);
    return response?.data?.data || response?.data;
  },

  // Cập nhật thông tin user
  updateInfo: async (data: UpdateUserInfoDto): Promise<User> => {
    const response = await apiClient.patch("/users/update-info", data);
    return response?.data?.data || response?.data;
  },

  // Xóa user (Super Admin, Assistant Admin only)
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },
};
