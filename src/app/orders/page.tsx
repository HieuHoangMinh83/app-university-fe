"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ordersApi, Order, OrderStatus } from "@/services/api/orders"
import { clientsApi, CreateClientDto } from "@/services/api/clients"
import { deleteImage, uploadImage } from "@/lib/supabase"
import { Loader2, Plus, Search, Upload, X, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"
import { useForm } from "react-hook-form"

// Custom ImageUpload component without shadcn
function ImageUpload({ value, onChange, folder = "avatars", disabled, onDeleteOldImage }: {
  value?: string
  onChange: (url: string) => void
  folder?: string
  disabled?: boolean
  onDeleteOldImage?: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value || null)
  const [oldImageUrl, setOldImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value && value.includes('supabase.co')) {
      setOldImageUrl(value)
    }
  }, [value])

  useEffect(() => {
    return () => {
      if (oldImageUrl && onDeleteOldImage) {
        onDeleteOldImage(oldImageUrl)
      }
    }
  }, [oldImageUrl, onDeleteOldImage])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error("Vui lòng chọn file ảnh")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước ảnh không được vượt quá 5MB")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    const previousImageUrl = oldImageUrl || (value && value.includes('supabase.co') ? value : null)
    
    setUploading(true)
    try {
      const url = await uploadImage(file, folder)
      
      if (previousImageUrl && previousImageUrl !== url) {
        await deleteImage(previousImageUrl)
      }
      
      setOldImageUrl(url)
      onChange(url)
      toast.success("Upload ảnh thành công")
    } catch (error: any) {
      toast.error(error?.message || "Upload ảnh thất bại")
      setPreview(value || null)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = async () => {
    const imageToDelete = oldImageUrl || (value && value.includes('supabase.co') ? value : null)
    if (imageToDelete) {
      await deleteImage(imageToDelete)
    }
    
    setPreview(null)
    setOldImageUrl(null)
    onChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 rounded-full border-2 border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <Upload className="h-6 w-6 text-gray-400" />
        )}
      </div>
      
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          style={{ display: "none" }}
          id="image-upload"
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang upload...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Chọn ảnh
              </>
            )}
          </button>
          {preview && (
            <button
              type="button"
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={handleRemove}
              disabled={disabled || uploading}
            >
              <X className="h-4 w-4" />
              Xóa
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          JPG, PNG hoặc GIF (tối đa 5MB)
        </p>
      </div>
    </div>
  )
}

// Custom Modal component
function Modal({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-[500px] max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b px-6 py-4 z-10">
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false)
  const [createClientOldImageUrl, setCreateClientOldImageUrl] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ["orders", page, pageSize],
    queryFn: () => ordersApi.getAll({ page, pageSize }),
  })

  // Extract orders array and pagination meta from paginated or non-paginated response
  const { orders, paginationMeta } = useMemo(() => {
    if (!ordersResponse) return { orders: undefined, paginationMeta: undefined }
    
    if (Array.isArray(ordersResponse)) {
      return { orders: ordersResponse, paginationMeta: undefined }
    }
    
    if ('data' in ordersResponse && Array.isArray(ordersResponse.data)) {
      return {
        orders: ordersResponse.data,
        paginationMeta: 'meta' in ordersResponse ? ordersResponse.meta : undefined
      }
    }
    
    return { orders: [], paginationMeta: undefined }
  }, [ordersResponse])

  const createClientMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      setIsCreateClientOpen(false)
      resetCreateClientForm()
      setCreateClientOldImageUrl(null)
      toast.success("Tạo khách hàng mới thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Tạo khách hàng thất bại")
      if (createClientOldImageUrl) {
        deleteImage(createClientOldImageUrl)
        setCreateClientOldImageUrl(null)
      }
    },
  })

  const { register: registerCreateClient, handleSubmit: handleSubmitCreateClient, reset: resetCreateClientForm, watch: watchCreateClient, setValue: setValueCreateClient, formState: { errors: createClientErrors } } = useForm<CreateClientDto>({
    defaultValues: {
      avatar: ''
    }
  })

  const createClientAvatarUrl = watchCreateClient('avatar')

  const onSubmitCreateClient = (data: CreateClientDto) => {
    createClientMutation.mutate(data)
  }

  const handleCreateClientDialogClose = (open: boolean) => {
    if (!open && createClientOldImageUrl) {
      deleteImage(createClientOldImageUrl)
      setCreateClientOldImageUrl(null)
    }
    setIsCreateClientOpen(open)
  }

  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
      PENDING: { label: "Chờ xử lý", className: "bg-gray-100 text-gray-800 border-gray-300" },
      PROCESSING: { label: "Đang xử lý", className: "bg-blue-100 text-blue-800 border-blue-300" },
      SHIPPED: { label: "Đã giao hàng", className: "bg-purple-100 text-purple-800 border-purple-300" },
      DELIVERED: { label: "Đã nhận hàng", className: "bg-green-100 text-green-800 border-green-300" },
      CANCELLED: { label: "Đã hủy", className: "bg-red-100 text-red-800 border-red-300" },
      RETURN_PENDING: { label: "Chờ hoàn hàng", className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
      RETURN_RECEIVED: { label: "Đã nhận hàng trả", className: "bg-orange-100 text-orange-800 border-orange-300" },
      RETURN_REJECTED: { label: "Từ chối hoàn hàng", className: "bg-red-100 text-red-800 border-red-300" },
      REFUND_PENDING: { label: "Chờ hoàn tiền", className: "bg-amber-100 text-amber-800 border-amber-300" },
      REFUNDED: { label: "Đã hoàn tiền", className: "bg-gray-100 text-gray-800 border-gray-300" },
    }
    const config = statusConfig[status]
    if (!config) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-800 border-gray-300">
          {status}
        </span>
      )
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
        {config.label}
      </span>
    )
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price)
  }

  const ordersArray = orders || []
  const filteredOrders = ordersArray.filter((order: Order) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      order?.id?.toLowerCase()?.includes(query) ||
      order?.client?.name?.toLowerCase()?.includes(query) ||
      order?.client?.phone?.toLowerCase()?.includes(query)
    )
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">Đơn hàng</h1>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo mã đơn, tên hoặc số điện thoại..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => setIsCreateClientOpen(true)}
                  className="px-4 py-2 bg-blue-600 !text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Tạo khách hàng mới
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredOrders && filteredOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Mã đơn</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Khách hàng</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Số lượng sản phẩm</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Tổng tiền</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Trạng thái</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders?.length > 0 ? (
                      filteredOrders?.map((order) => (
                        <tr key={order?.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-medium">
                            <Link href={`/orders/${order?.id}`} className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">
                              #{order?.id?.slice?.(0, 8)}
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <div className="font-medium text-gray-900">{order?.client?.name}</div>
                              <div className="text-sm text-gray-500">{order?.client?.phone}</div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{order?.items?.length || 0}</td>
                          <td className="py-3 px-4 font-medium text-gray-900">{order?.totalPrice ? formatPrice(order.totalPrice) : "-"}</td>
                          <td className="py-3 px-4">
                                                  {getStatusBadge(order?.status)}
                          </td>
                          <td className="py-3 px-4 text-gray-700">
                            {order?.createdAt ? new Date(order.createdAt).toLocaleDateString("vi-VN") : "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                          {searchQuery ? "Không tìm thấy đơn hàng nào" : "Không có dữ liệu"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? "Không tìm thấy đơn hàng nào" : "Chưa có đơn hàng nào"}
              </div>
            )}
            {/* Pagination */}
            {paginationMeta && paginationMeta.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-700">
                  Hiển thị {((paginationMeta.page - 1) * paginationMeta.pageSize) + 1} - {Math.min(paginationMeta.page * paginationMeta.pageSize, paginationMeta.total)} trong tổng số {paginationMeta.total} đơn hàng
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Trước
                  </button>
                  <span className="text-sm text-gray-700">
                    Trang {paginationMeta.page} / {paginationMeta.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(paginationMeta.totalPages, p + 1))}
                    disabled={page >= paginationMeta.totalPages || isLoading}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Sau
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Client Modal */}
        <Modal
          open={isCreateClientOpen}
          onClose={() => handleCreateClientDialogClose(false)}
          title="Tạo khách hàng mới"
        >
          <form onSubmit={handleSubmitCreateClient(onSubmitCreateClient)} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="create-client-name" className="text-sm font-medium text-gray-700 block">
                Tên khách hàng <span className="text-red-500">*</span>
              </label>
              <input
                id="create-client-name"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                {...registerCreateClient("name", { required: "Tên khách hàng là bắt buộc" })}
                placeholder="Nhập tên khách hàng"
              />
              {createClientErrors.name && (
                <p className="text-sm text-red-500 mt-1">{createClientErrors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="create-client-phone" className="text-sm font-medium text-gray-700 block">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                id="create-client-phone"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                {...registerCreateClient("phone", { 
                  required: "Số điện thoại là bắt buộc",
                  pattern: {
                    value: /^(03|05|07|08|09)[0-9]{8}$/,
                    message: "Số điện thoại phải là 10 số, bắt đầu bằng 03, 05, 07, 08, 09"
                  }
                })}
                placeholder="0388888888"
              />
              {createClientErrors.phone && (
                <p className="text-sm text-red-500 mt-1">{createClientErrors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="create-client-address" className="text-sm font-medium text-gray-700 block">
                Địa chỉ
              </label>
              <input
                id="create-client-address"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                {...registerCreateClient("address")}
                placeholder="123 Đường ABC, Quận 1, TP.HCM"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 block">
                Ảnh đại diện
              </label>
              <ImageUpload
                value={createClientAvatarUrl}
                onChange={(url) => {
                  setValueCreateClient('avatar', url)
                  if (url && url.includes('supabase.co')) {
                    setCreateClientOldImageUrl(url)
                  }
                }}
                folder="client-avatars"
                disabled={createClientMutation.isPending}
              />
              <input
                type="hidden"
                {...registerCreateClient("avatar")}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setIsCreateClientOpen(false)}
                disabled={createClientMutation.isPending}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 !text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={createClientMutation.isPending}
              >
                {createClientMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Tạo khách hàng
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
