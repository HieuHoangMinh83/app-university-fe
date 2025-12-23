import apiClient from "@/lib/api-client";
import { PaginationParams, PaginatedResponse } from "./types";

export interface Role {
  id: string;
  name: string;
  users?: Array<{
    id: string;
    name: string;
    phone: string;
  }>;
}

export interface CreateRoleDto {
  name: string;
}

export interface UpdateRoleDto {
  name: string;
}

export const rolesApi = {
  // Lấy tất cả roles
  getAll: async (params?: PaginationParams): Promise<Role[] | PaginatedResponse<Role>> => {
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
    const response = await apiClient.get("/roles", Object.keys(cleanParams).length > 0 ? { params: cleanParams } : {});
    
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
        } as PaginatedResponse<Role>;
      }
      // Nếu có data nhưng không có pagination, trả về array
      return response.data.data.data;
    }
    
    // Check if response has pagination structure: { data: { data: [...], meta: {...} } }
    if (response?.data?.data?.data && response?.data?.data?.meta) {
      return response.data.data as PaginatedResponse<Role>;
    }
    // Check if response is direct paginated: { data: [...], meta: {...} }
    if (response?.data?.data && response?.data?.meta && Array.isArray(response.data.data)) {
      return response.data as PaginatedResponse<Role>;
    }
    // Fallback to non-paginated response
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  // Lấy role theo ID
  getById: async (id: string): Promise<Role> => {
    const response = await apiClient.get(`/roles/${id}`);
    return response?.data?.data || response?.data;
  },

  // Tạo role mới
  create: async (data: CreateRoleDto): Promise<Role> => {
    const response = await apiClient.post("/roles", data);
    return response?.data?.data || response?.data;
  },

  // Cập nhật role
  update: async (id: string, data: UpdateRoleDto): Promise<Role> => {
    const response = await apiClient.patch(`/roles/${id}`, data);
    return response?.data?.data || response?.data;
  },

  // Xóa role
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/roles/${id}`);
  },
};

