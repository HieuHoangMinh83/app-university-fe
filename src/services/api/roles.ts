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
    const response = await apiClient.get("/roles", { params });
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

