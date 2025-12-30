import apiClient from "@/lib/api-client";
import { PaginationParams, PaginatedResponse } from "./types";

export type OrderStatus = 
  | "PENDING" 
  | "PROCESSING" 
  | "SHIPPED" 
  | "DELIVERED" 
  | "CANCELLED" 
  | "RETURN_PENDING" 
  | "RETURN_RECEIVED" 
  | "RETURN_REJECTED" 
  | "REFUND_PENDING" 
  | "REFUNDED";

export type PaymentMethod = "CASH" | "TRANSFER";

export interface OrderItem {
  id: string;
  comboId: string;
  productId: string;
  quantity: number;
  price: number;
  combo: {
    id: string;
    name: string;
    price: number;
    promotionalPrice?: number | null;
    isPromotionActive?: boolean;
    storeProduct?: {
      id: string;
      name: string;
    };
    items?: Array<{
      id: string;
      inventoryProductId: string;
      quantity: number;
      isGift: boolean;
      inventoryProduct: {
        id: string;
        name: string;
      };
    }>;
  };
  product?: {
    id: string;
    name: string;
  } | null;
  clientComboId: string | null;
}

export interface OrderRequest {
  id: string;
  status: OrderStatus;
  reason: string;
  imageUrls?: string[];
  notes?: string | null;
  createdBy?: {
    id: string;
    name: string;
    phone: string;
  };
  processedBy?: {
    id: string;
    name: string;
    phone: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CheckLog {
  id: string;
  type: "RETURN" | "REFUND";
  evidenceType: "RETURN_REQUEST" | "RETURN_RECEIVED" | "REFUND_PROOF" | "REJECTION_PROOF";
  description: string;
  imageUrls?: string[];
  notes?: string | null;
  createdBy?: {
    id: string;
    name: string;
    phone: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  clientId: string;
  voucherId: string | null;
  originalPrice?: number; // Giá gốc trước khi giảm
  totalPrice: number;
  paymentMethod?: PaymentMethod; // "CASH" | "TRANSFER"
  status: OrderStatus;
  cancelReason?: string | null;
  returnReason?: string | null;
  rejectionReason?: string | null;
  countedInRevenue?: boolean; // Order này có được tính vào doanh thu không
  revenue?: number; // Số tiền được tính vào doanh thu (0 nếu không tính)
  items: OrderItem[];
  voucher: {
    id: string;
    name: string;
    type: "PERCENT" | "FIXED";
    price?: number;
    percent?: number;
  } | null;
  request?: OrderRequest | null; // OrderRequest cho hoàn hàng/hoàn tiền
  checkLogs?: CheckLog[]; // Danh sách log kiểm tra
  client: {
    id: string;
    name: string;
    phone: string;
    zaloId?: string | null;
    point?: number;
    address?: string | null;
    avatar?: string | null;
    spinCount?: number;
    createdAt?: string;
    updatedAt?: string;
  };
  processedBy: {
    id: string;
    name: string;
    phone: string;
  } | null;
  clientVoucher?: {
    voucher?: {
      name: string;
    };
  } | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateOrderDto {
  items: Array<{
    comboId: string;
    quantity: number;
    clientComboId?: string;
  }>;
  voucherId?: string; // Deprecated: Dùng clientVoucherId thay thế
  clientVoucherId?: string; // ID của ClientVoucher trong ví của client
  paymentMethod?: PaymentMethod; // Optional, default: "CASH"
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
}

export interface OrderFlowDto {
  action: "PROCESS" | "SHIP" | "DELIVER";
  notes?: string;
  itemLots?: Array<{
    orderItemId: string;
    productLots: Array<{
      inventoryProductId: string;
      lots: Array<{
        inventoryItemId: string;
        quantity: number;
      }>;
    }>;
  }>;
}

export interface CancelOrderDto {
  cancelReason: string;
}

export interface RefundOrderDto {
  action: "CREATE" | "COMPLETE";
  reason?: string; // Bắt buộc khi CREATE
  imageUrls?: string[];
  notes?: string; // Optional, cho COMPLETE
}

export interface ReturnOrderDto {
  action: "CREATE" | "RECEIVE" | "COMPLETE";
  reason?: string; // Bắt buộc khi CREATE
  imageUrls?: string[];
  notes?: string; // Optional, cho RECEIVE hoặc COMPLETE
  accepted?: boolean; // Optional, cho COMPLETE (mặc định true)
  rejectionReason?: string; // Bắt buộc nếu accepted = false
}

export interface GetOrdersParams extends PaginationParams {
  clientId?: string;
  status?: OrderStatus;
}

export const ordersApi = {
  // Lấy tất cả orders (Admin only)
  getAll: async (params?: GetOrdersParams): Promise<Order[] | PaginatedResponse<Order>> => {
    // Chỉ truyền params hợp lệ (loại bỏ undefined/null)
    const cleanParams: Record<string, any> = {};
    if (params) {
      Object.keys(params).forEach(key => {
        const value = params[key as keyof GetOrdersParams];
        if (value !== undefined && value !== null) {
          cleanParams[key] = value;
        }
      });
    }
    const response = await apiClient.get("/orders", Object.keys(cleanParams).length > 0 ? { params: cleanParams } : {});
    
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
        } as PaginatedResponse<Order>;
      }
      // Nếu có data nhưng không có pagination, trả về array
      return response.data.data.data;
    }
    
    // Check if response has pagination structure: { data: { data: [...], meta: {...} } }
    if (response?.data?.data?.data && response?.data?.data?.meta) {
      return response.data.data as PaginatedResponse<Order>;
    }
    // Check if response is direct paginated: { data: [...], meta: {...} }
    if (response?.data?.data && response?.data?.meta && Array.isArray(response.data.data)) {
      return response.data as PaginatedResponse<Order>;
    }
    // Fallback to non-paginated response
    const data = response.data?.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  // Lấy order theo ID
  getById: async (id: string, clientId?: string): Promise<Order> => {
    const params = clientId ? { clientId } : {};
    const response = await apiClient.get(`/orders/${id}`, { params });
    
    // Xử lý response với cấu trúc: { statusCode, message, data: {...order data...} }
    // Hoặc: { data: {...order data...} }
    if (response?.data?.data && typeof response.data.data === 'object' && !Array.isArray(response.data.data)) {
      // Cấu trúc: { statusCode, message, data: { data: {...} } }
      return response.data.data;
    }
    
    // Cấu trúc: { statusCode, message, data: {...} } - order data nằm ở response.data
    if (response?.data && typeof response.data === 'object' && !Array.isArray(response.data) && 'id' in response.data) {
      return response.data;
    }
    
    // Fallback
    return response?.data as Order;
  },

  // Tạo order mới
  create: async (data: CreateOrderDto, clientId?: string): Promise<Order> => {
    const params = clientId ? { clientId } : {};
    const response = await apiClient.post("/orders", data, { params });
    return response?.data?.data || response?.data;
  },

  // Cập nhật trạng thái order (deprecated - dùng flow/cancel/refund/return thay thế)
  updateStatus: async (id: string, data: UpdateOrderStatusDto): Promise<Order> => {
    const response = await apiClient.patch(`/orders/${id}/status`, data);
    return response?.data?.data || response?.data;
  },

  // Cập nhật luồng đơn hàng (PROCESS, SHIP, DELIVER)
  flow: async (id: string, data: OrderFlowDto): Promise<Order> => {
    const response = await apiClient.patch(`/orders/${id}/flow`, data);
    return response?.data?.data || response?.data;
  },

  // Hủy đơn hàng
  cancel: async (id: string, data: CancelOrderDto): Promise<Order> => {
    const response = await apiClient.patch(`/orders/${id}/cancel`, data);
    return response?.data?.data || response?.data;
  },

  // Xử lý request hoàn tiền
  refund: async (id: string, data: RefundOrderDto): Promise<Order | OrderRequest> => {
    const response = await apiClient.post(`/orders/${id}/refund`, data);
    return response?.data?.data || response?.data;
  },

  // Xử lý request hoàn hàng
  return: async (id: string, data: ReturnOrderDto): Promise<Order | OrderRequest> => {
    const response = await apiClient.post(`/orders/${id}/return`, data);
    return response?.data?.data || response?.data;
  },
};

