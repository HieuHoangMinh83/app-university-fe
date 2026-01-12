"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ordersApi, Order, OrderStatus, OrderFlowDto, CancelOrderDto, RefundOrderDto, ReturnOrderDto } from "@/services/api/orders"
import { inventoryProductsApi } from "@/services/api/inventory-products"
import { Loader2, ArrowLeft, ChevronRight, Package, Truck, CheckCircle, X, RotateCcw, DollarSign } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import Image from "next/image"

// Breadcrumb Components
function Breadcrumb({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <nav className={className} aria-label="Breadcrumb">{children}</nav>
}

function BreadcrumbList({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <ol className={className}>{children}</ol>
}

function BreadcrumbItem({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <li className={className}>{children}</li>
}

function BreadcrumbLink({ className = "", href, children, ...props }: { className?: string; href: string; children: React.ReactNode; [key: string]: any }) {
  return (
    <Link href={href} className={className} {...props}>
      {children}
    </Link>
  )
}

function BreadcrumbSeparator({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return <span className={className}>{children || <ChevronRight className="h-4 w-4" />}</span>
}

// Custom Modal component
function Modal({ open, onClose, title, description, children, className = "" }: {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col ${className}`}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            {title && <h2 className="text-lg font-semibold text-gray-900 text-center" >{title}</h2>}
            {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params.id as string
  const queryClient = useQueryClient()
  const [isVoucherHovered, setIsVoucherHovered] = useState(false)
  
  // Modal states
  const [flowModalOpen, setFlowModalOpen] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  
  // Form states
  const [flowAction, setFlowAction] = useState<"PROCESS" | "SHIP" | "DELIVER">("PROCESS")
  const [flowNotes, setFlowNotes] = useState("")
  // State cho chọn lô hàng: { orderItemId: { inventoryProductId: { inventoryItemId: quantity } } }
  const [selectedLots, setSelectedLots] = useState<Record<string, Record<string, Record<string, number>>>>({})
  const [processModalOpenCount, setProcessModalOpenCount] = useState(0) // Đếm số lần mở modal để force refetch
  const [cancelReason, setCancelReason] = useState("")
  const [refundAction, setRefundAction] = useState<"CREATE" | "COMPLETE">("CREATE")
  const [refundReason, setRefundReason] = useState("")
  const [refundNotes, setRefundNotes] = useState("")
  const [refundImageUrls, setRefundImageUrls] = useState<string[]>([])
  const [returnAction, setReturnAction] = useState<"CREATE" | "RECEIVE" | "COMPLETE">("CREATE")
  const [returnReason, setReturnReason] = useState("")
  const [returnNotes, setReturnNotes] = useState("")
  const [returnImageUrls, setReturnImageUrls] = useState<string[]>([])
  const [returnAccepted, setReturnAccepted] = useState(true)
  const [returnRejectionReason, setReturnRejectionReason] = useState("")

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.getById(orderId),
    enabled: !!orderId,
  })

  // Lấy danh sách inventory product IDs từ order items (từ combo items)
  const inventoryProductIds = useMemo(() => {
    if (!order?.items) {
      return []
    }
    const productIds = new Set<string>()
    
    order.items.forEach((item) => {
      // Lấy từ combo.items (các sản phẩm trong combo)
      if (item?.combo?.items && Array.isArray(item.combo.items)) {
        item.combo.items.forEach((comboItem: any) => {
          // Có thể có inventoryProductId trực tiếp hoặc trong inventoryProduct.id
          const inventoryProductId = comboItem?.inventoryProductId || comboItem?.inventoryProduct?.id
          if (inventoryProductId) {
            productIds.add(inventoryProductId)
          } else {
          }
        })
      } else {
      }
    })
    
    const result = Array.from(productIds)
    return result
  }, [order])

  // Fetch valid items khi mở modal PROCESS
  const shouldFetchValidItems = flowModalOpen && flowAction === "PROCESS" && inventoryProductIds.length > 0 && !!order
  
  
  const { data: validItemsData, isLoading: isLoadingValidItems, refetch: refetchValidItems } = useQuery({
    queryKey: ["valid-items", orderId, inventoryProductIds.sort().join(","), processModalOpenCount],
    queryFn: async () => {
      if (inventoryProductIds.length === 0) {
        return []
      }
      try {
        const result = await inventoryProductsApi.getValidItems(inventoryProductIds)
        return result
      } catch (error) {
        console.error("❌ Error fetching valid items:", error)
        throw error
      }
    },
    enabled: shouldFetchValidItems, // Tự động fetch khi có điều kiện
    staleTime: 0, // Luôn coi là stale để fetch lại
    gcTime: 0, // Không cache
    refetchOnMount: true, // Refetch khi mount lại
    refetchOnWindowFocus: false, // Không refetch khi focus window
  })

  // Reset selected lots khi đóng modal
  useEffect(() => {
    if (!flowModalOpen) {
      setSelectedLots({})
    }
  }, [flowModalOpen])

  // Tự động chọn lô hàng theo FIFO khi có dữ liệu valid items
  useEffect(() => {
    if (flowModalOpen && flowAction === "PROCESS" && validItemsData && order?.items && Array.isArray(validItemsData) && validItemsData.length > 0) {
      const autoSelected = autoSelectLots(validItemsData, order.items)
      setSelectedLots(autoSelected)
    }
  }, [flowModalOpen, flowAction, validItemsData, order?.items])

  // Force refetch API mỗi lần mở modal PROCESS
  useEffect(() => {
    if (flowModalOpen && flowAction === "PROCESS" && inventoryProductIds.length > 0 && order && processModalOpenCount > 0) {
      // Sử dụng setTimeout nhỏ để đảm bảo query đã được setup
      const timer = setTimeout(() => {
        refetchValidItems()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [flowModalOpen, flowAction, processModalOpenCount, inventoryProductIds.length, order, refetchValidItems])

  // Tự động chọn lô hàng theo FIFO (hạn sử dụng sớm nhất)
  const autoSelectLots = (validItemsData: any[], orderItems: any[]) => {
    const autoSelected: Record<string, Record<string, Record<string, number>>> = {}

    orderItems.forEach((orderItem) => {
      if (!orderItem?.combo?.items || !Array.isArray(orderItem.combo.items)) return

      orderItem.combo.items.forEach((comboItem: any) => {
        const inventoryProductId = comboItem?.inventoryProductId || comboItem?.inventoryProduct?.id
        if (!inventoryProductId) return

        const requiredQuantity = (comboItem?.quantity || 0) * (orderItem.quantity || 0)
        const productData = validItemsData?.find((v: any) => v.productId === inventoryProductId)
        
        if (!productData?.items || productData.items.length === 0) return

        // Sắp xếp theo expiryDate (FIFO - hạn sử dụng sớm nhất trước)
        const sortedItems = [...productData.items].sort((a: any, b: any) => 
          new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
        )

        let remainingQuantity = requiredQuantity

        if (!autoSelected[orderItem.id]) {
          autoSelected[orderItem.id] = {}
        }
        if (!autoSelected[orderItem.id][inventoryProductId]) {
          autoSelected[orderItem.id][inventoryProductId] = {}
        }

        // Chọn lô hàng theo FIFO cho đến khi đủ số lượng
        for (const item of sortedItems) {
          if (remainingQuantity <= 0) break
          
          const takeQuantity = Math.min(item.quantity, remainingQuantity)
          if (takeQuantity > 0) {
            autoSelected[orderItem.id][inventoryProductId][item.id] = takeQuantity
            remainingQuantity -= takeQuantity
          }
        }
      })
    })

    return autoSelected
  }

  // Build itemLots structure từ selectedLots
  const buildItemLots = (): OrderFlowDto["itemLots"] => {
    if (!selectedLots || Object.keys(selectedLots).length === 0) {
      return undefined
    }

    const itemLots: OrderFlowDto["itemLots"] = []

    Object.entries(selectedLots).forEach(([orderItemId, productLotsMap]) => {
      const productLots: Array<{
        inventoryProductId: string
        lots: Array<{ inventoryItemId: string; quantity: number }>
      }> = []

      Object.entries(productLotsMap).forEach(([inventoryProductId, lotsMap]) => {
        const lots = Object.entries(lotsMap)
          .filter(([_, quantity]) => quantity > 0)
          .map(([inventoryItemId, quantity]) => ({
            inventoryItemId,
            quantity,
          }))

        if (lots.length > 0) {
          productLots.push({
            inventoryProductId,
            lots,
          })
        }
      })

      if (productLots.length > 0) {
        itemLots.push({
          orderItemId,
          productLots,
        })
      }
    })

    return itemLots.length > 0 ? itemLots : undefined
  }

  // Flow mutation (PROCESS, SHIP, DELIVER)
  const flowMutation = useMutation({
    mutationFn: (data: OrderFlowDto) => ordersApi.flow(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      setFlowModalOpen(false)
      setFlowNotes("")
      setSelectedLots({})
      toast.success("Cập nhật trạng thái đơn hàng thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Cập nhật trạng thái thất bại")
    },
  })

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (data: CancelOrderDto) => ordersApi.cancel(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      setCancelModalOpen(false)
      setCancelReason("")
      toast.success("Hủy đơn hàng thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Hủy đơn hàng thất bại")
    },
  })

  // Refund mutation
  const refundMutation = useMutation({
    mutationFn: (data: RefundOrderDto) => ordersApi.refund(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      setRefundModalOpen(false)
      setRefundReason("")
      setRefundNotes("")
      setRefundImageUrls([])
      toast.success(refundAction === "CREATE" ? "Tạo yêu cầu hoàn tiền thành công" : "Hoàn tiền thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Xử lý hoàn tiền thất bại")
    },
  })

  // Return mutation
  const returnMutation = useMutation({
    mutationFn: (data: ReturnOrderDto) => ordersApi.return(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      setReturnModalOpen(false)
      setReturnReason("")
      setReturnNotes("")
      setReturnImageUrls([])
      setReturnAccepted(true)
      setReturnRejectionReason("")
      toast.success(
        returnAction === "CREATE" ? "Tạo yêu cầu hoàn hàng thành công" :
        returnAction === "RECEIVE" ? "Xác nhận nhận hàng trả thành công" :
        "Xử lý hoàn hàng thành công"
      )
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Xử lý hoàn hàng thất bại")
    },
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price)
  }

  // Xác định các action có thể thực hiện dựa trên status
  const getAvailableActions = (status: OrderStatus) => {
    const actions: Array<{ type: string; label: string; icon: React.ReactNode; className: string }> = []
    
    switch (status) {
      case "PENDING":
        actions.push(
          { type: "PROCESS", label: "Xử lý đơn hàng", icon: <Package className="h-4 w-4" />, className: "bg-blue-600 hover:bg-blue-700 !text-white" },
          { type: "CANCEL", label: "Hủy đơn hàng", icon: <X className="h-4 w-4" />, className: "bg-red-600 hover:bg-red-700 !text-white" }
        )
        break
      case "PROCESSING":
        actions.push(
          { type: "SHIP", label: "Giao hàng", icon: <Truck className="h-4 w-4" />, className: "bg-green-600 hover:bg-green-700 !text-white" },
          { type: "CANCEL", label: "Hủy đơn hàng", icon: <X className="h-4 w-4" />, className: "bg-red-600 hover:bg-red-700 !text-white" }
        )
        break
      case "SHIPPED":
        actions.push(
          { type: "DELIVER", label: "Xác nhận nhận hàng", icon: <CheckCircle className="h-4 w-4" />, className: "bg-green-600 hover:bg-green-700 !text-white" },
          { type: "CANCEL", label: "Hủy đơn hàng", icon: <X className="h-4 w-4" />, className: "bg-red-600 hover:bg-red-700 !text-white" }
        )
        break
      case "DELIVERED":
        actions.push(
          { type: "RETURN_CREATE", label: "Tạo yêu cầu hoàn hàng", icon: <RotateCcw className="h-4 w-4" />, className: "bg-orange-600 hover:bg-orange-700 !text-white" }
        )
        break
      case "RETURN_PENDING":
        actions.push(
          { type: "RETURN_RECEIVE", label: "Xác nhận nhận hàng trả", icon: <Package className="h-4 w-4" />, className: "bg-blue-600 hover:bg-blue-700 !text-white" }
        )
        break
      case "RETURN_RECEIVED":
        actions.push(
          { type: "RETURN_COMPLETE", label: "Xử lý hoàn hàng", icon: <CheckCircle className="h-4 w-4" />, className: "bg-green-600 hover:bg-green-700 !text-white" }
        )
        break
      case "REFUND_PENDING":
        actions.push(
          { type: "REFUND_COMPLETE", label: "Xác nhận hoàn tiền", icon: <DollarSign className="h-4 w-4" />, className: "bg-green-600 hover:bg-green-700 !text-white" }
        )
        break
    }
    
    return actions
  }

  const handleActionClick = (actionType: string) => {
    switch (actionType) {
      case "PROCESS":
        // Tăng counter để force refetch API mỗi lần mở modal
        setProcessModalOpenCount(prev => prev + 1)
        setFlowAction("PROCESS")
        setFlowModalOpen(true)
        break
      case "SHIP":
        setFlowAction("SHIP")
        setFlowModalOpen(true)
        break
      case "DELIVER":
        setFlowAction("DELIVER")
        setFlowModalOpen(true)
        break
      case "CANCEL":
        setCancelModalOpen(true)
        break
      case "REFUND_CREATE":
        setRefundAction("CREATE")
        setRefundModalOpen(true)
        break
      case "REFUND_COMPLETE":
        setRefundAction("COMPLETE")
        setRefundModalOpen(true)
        break
      case "RETURN_CREATE":
        setReturnAction("CREATE")
        setReturnModalOpen(true)
        break
      case "RETURN_RECEIVE":
        setReturnAction("RECEIVE")
        setReturnModalOpen(true)
        break
      case "RETURN_COMPLETE":
        setReturnAction("COMPLETE")
        setReturnModalOpen(true)
        break
    }
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    )
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">Không tìm thấy đơn hàng</p>
          <Link href="/orders">
            <button className="mt-4 px-4 py-2 bg-blue-600 !text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2 mx-auto">
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
           
            <div>
              <Breadcrumb>
                <BreadcrumbList className="flex items-center gap-2 text-lg">
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      href="/orders"
                      className="text-gray-500 hover:text-gray-700 hover:underline transition-colors"
                    >
                      Đơn hàng
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-gray-400" />
                  <BreadcrumbItem>
                    <span className="text-gray-900 font-medium">Chi tiết đơn hàng</span>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {order?.status && getStatusBadge(order.status)}
            {order?.status && getAvailableActions(order.status).length > 0 && (
              <div className="flex items-center gap-2 ml-4">
                {getAvailableActions(order.status).map((action) => (
                  <button
                    key={action.type}
                    onClick={() => handleActionClick(action.type)}
                    className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${action.className}`}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Client Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 rounded-t-lg" style={{ backgroundColor: 'rgb(54, 56, 58)' }}>
              <h2 className="text-lg font-semibold text-white">Thông tin khách hàng</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {order?.client && (
                  <>
                    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 h-[60px]">
                      <span className="text-sm font-medium text-gray-500">Tên khách hàng</span>
                      <div className="flex items-center gap-3">
                        {order.client.avatar && (
                          <Image 
                            src={order.client.avatar} 
                            alt={order.client.name}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        )}
                        <Link href={`/customers/${order.client.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                          {order.client.name}
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 min-h-[44px]">
                      <span className="text-sm font-medium text-gray-500">Số điện thoại</span>
                      <span className="text-sm text-gray-900">{order.client.phone}</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 min-h-[44px]">
                      <span className="text-sm font-medium text-gray-500">Trạng thái Zalo</span>
                      <div className="flex items-center gap-2">
                        {order.client.zaloId ? (
                          <>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-300">
                              Đã đăng ký
                            </span>
                            <span className="text-sm text-gray-900">({order.client.zaloId})</span>
                          </>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-800 border-gray-300">
                            Chưa đăng ký
                          </span>
                        )}
                      </div>
                    </div>
                    {order.client.address && (
                      <div className="flex items-center justify-between py-2.5 border-b border-gray-100 min-h-[44px]">
                        <span className="text-sm font-medium text-gray-500">Địa chỉ</span>
                        <span className="text-sm text-gray-900 text-right max-w-[60%]">{order.client.address}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 min-h-[44px]">
                      <span className="text-sm font-medium text-gray-500">Điểm tích lũy</span>
                      <span className="text-sm font-semibold text-blue-600">{order.client.point || 0} điểm</span>
                    </div>
                    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 min-h-[44px]">
                      <span className="text-sm font-medium text-gray-500">Ngày tạo</span>
                      <span className="text-sm text-gray-900 text-right">
                        {order.client.createdAt ? new Date(order.client.createdAt).toLocaleDateString("vi-VN") : "-"}
                      </span>
                    </div>
                  </>
                )}
                {order?.voucher && (
                  <div className="flex items-center justify-between py-2.5 border-b border-gray-100 min-h-[44px]">
                    <span className="text-sm font-medium text-gray-500">Voucher</span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">{order.voucher.name}</span>
                      {order.voucher.type === "FIXED" && order.voucher.price && (
                        <p className="text-xs text-gray-500">Giảm {formatPrice(order.voucher.price)}</p>
                      )}
                      {order.voucher.type === "PERCENT" && order.voucher.percent && (
                        <p className="text-xs text-gray-500">Giảm {order.voucher.percent}%</p>
                      )}
                    </div>
                  </div>
                )}
                {order?.clientVoucher && (
                  <div className="flex items-center justify-between py-2.5 border-b border-gray-100 min-h-[44px]">
                    <span className="text-sm font-medium text-gray-500">Voucher đã dùng</span>
                    <span className="text-sm text-gray-900">{order.clientVoucher.voucher?.name || "-"}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 rounded-t-lg" style={{ backgroundColor: 'rgb(54, 56, 58)' }}>
              <h2 className="text-lg font-semibold text-white">Thông tin đơn hàng</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2.5 border-b border-gray-100 h-[60px]">
                  <span className="text-sm font-medium text-gray-500">Mã đơn hàng</span>
                  <span className="text-sm font-semibold text-gray-900">#{order?.id?.slice?.(0, 8)}</span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-gray-100 min-h-[44px]">
                  <span className="text-sm font-medium text-gray-500">Trạng thái</span>
                  <div>
                    {order?.status && getStatusBadge(order.status)}
                  </div>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-gray-100 min-h-[44px]">
                  <span className="text-sm font-medium text-gray-500">Ngày tạo</span>
                  <span className="text-sm text-gray-900 text-right">
                    {order?.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    }) : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-gray-100 min-h-[44px]">
                  <span className="text-sm font-medium text-gray-500">Số lượng sản phẩm</span>
                  <span className="text-sm text-gray-900">{order?.items?.length || 0} sản phẩm</span>
                </div>
                {order?.processedBy && (
                  <div className="flex items-center justify-between py-2.5 border-b border-gray-100 min-h-[44px]">
                    <span className="text-sm font-medium text-gray-500">Người xử lý</span>
                    <span className="text-sm text-gray-900">{order?.processedBy?.name}</span>
                  </div>
                )}
                <div 
                  className="flex items-center justify-between py-2.5 border-b border-gray-100 min-h-[44px] relative"
                  onMouseEnter={() => setIsVoucherHovered(true)}
                  onMouseLeave={() => setIsVoucherHovered(false)}
                >
                  <span className="text-sm font-medium text-gray-500">Voucher</span>
                  <div className="relative">
                    {order?.voucher || order?.clientVoucher ? (
                      <>
                        <span className="text-sm font-semibold text-blue-600 cursor-pointer hover:text-blue-800">
                          {order?.voucher?.name || order?.clientVoucher?.voucher?.name || "-"}
                        </span>
                        {isVoucherHovered && (
                          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4">
                            <div className="space-y-2">
                              <div>
                                <span className="text-xs font-medium text-gray-500">Tên voucher:</span>
                                <p className="text-sm font-semibold text-gray-900 mt-1">
                                  {order?.voucher?.name || order?.clientVoucher?.voucher?.name || "-"}
                                </p>
                              </div>
                              {order?.voucher && (
                                <>
                                  <div>
                                    <span className="text-xs font-medium text-gray-500">Loại:</span>
                                    <p className="text-sm text-gray-900 mt-1">
                                      {order.voucher.type === "FIXED" ? "Giảm giá cố định" : "Giảm theo phần trăm"}
                                    </p>
                                  </div>
                                  {order.voucher.type === "FIXED" && order.voucher.price && (
                                    <div>
                                      <span className="text-xs font-medium text-gray-500">Giá trị giảm:</span>
                                      <p className="text-sm font-semibold text-green-600 mt-1">
                                        {formatPrice(order.voucher.price)}
                                      </p>
                                    </div>
                                  )}
                                  {order.voucher.type === "PERCENT" && order.voucher.percent && (
                                    <div>
                                      <span className="text-xs font-medium text-gray-500">Giá trị giảm:</span>
                                      <p className="text-sm font-semibold text-green-600 mt-1">
                                        {order.voucher.percent}%
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}
                              {order?.clientVoucher && !order?.voucher && (
                                <div>
                                  <span className="text-xs font-medium text-gray-500">Voucher từ ví khách hàng</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">Không áp dụng voucher</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-gray-100 min-h-[44px]">
                  <span className="text-sm font-medium text-gray-500">Tổng tiền</span>
                  <span className="text-lg font-bold text-blue-600">{order?.totalPrice ? formatPrice(order.totalPrice) : "-"}</span>
                </div>
                {order?.revenue !== undefined && order.revenue > 0 && (
                  <div className="flex items-center justify-between py-2.5 border-b border-gray-100 min-h-[44px]">
                    <span className="text-sm font-medium text-gray-500">Doanh thu</span>
                    <span className="text-sm font-bold text-green-600">{formatPrice(order.revenue)}</span>
                  </div>
                )}
                {order?.cancelReason && (
                  <div className="flex items-start justify-between py-2.5 border-b border-gray-100 min-h-[44px]">
                    <span className="text-sm font-medium text-gray-500">Lý do hủy</span>
                    <span className="text-sm text-gray-900 text-right max-w-[60%]">{order.cancelReason}</span>
                  </div>
                )}
                {order?.returnReason && (
                  <div className="flex items-start justify-between py-2.5 border-b border-gray-100 min-h-[44px]">
                    <span className="text-sm font-medium text-gray-500">Lý do hoàn hàng</span>
                    <span className="text-sm text-gray-900 text-right max-w-[60%]">{order.returnReason}</span>
                  </div>
                )}
                {order?.rejectionReason && (
                  <div className="flex items-start justify-between py-2.5 border-b border-gray-100 min-h-[44px]">
                    <span className="text-sm font-medium text-gray-500">Lý do từ chối</span>
                    <span className="text-sm text-red-600 text-right max-w-[60%]">{order.rejectionReason}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Chi tiết sản phẩm</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Tên sản phẩm</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Tên combo</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Sản phẩm chính</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Sản phẩm tặng kèm</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Số lượng mua sắm</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Giá tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {order?.items?.length > 0 ? (
                    order?.items?.map((item) => {
                      // Phân loại sản phẩm chính và tặng kèm
                      const mainProducts: Array<{ name: string; quantity: number }> = []
                      const giftProducts: Array<{ name: string; quantity: number }> = []
                      
                      if (item?.combo?.items && Array.isArray(item.combo.items)) {
                        item.combo.items.forEach((comboItem: any) => {
                          const productName = comboItem?.inventoryProduct?.name || "Sản phẩm không xác định"
                          const quantity = comboItem?.quantity || 0
                          
                          if (comboItem?.isGift) {
                            giftProducts.push({ name: productName, quantity })
                          } else {
                            mainProducts.push({ name: productName, quantity })
                          }
                        })
                      }

                      return (
                      <tr key={item?.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {item?.product?.id && item?.product?.name ? (
                            <Link 
                              href={`/products/${item.product.id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                            >
                              {item.product.name}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {item?.combo?.name || "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {mainProducts.length > 0 ? (
                            <div className="space-y-1">
                              {mainProducts.map((product, idx) => (
                                <div key={idx} className="text-sm">
                                  {product.name} x {product.quantity}
                                </div>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {giftProducts.length > 0 ? (
                            <div className="space-y-1">
                              {giftProducts.map((product, idx) => (
                                <div key={idx} className="text-sm text-green-600">
                                  {product.name} x {product.quantity}
                                </div>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-700">{item?.quantity || 0}</td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900">
                          {item?.price ? formatPrice(item.price) : "-"}
                        </td>
                      </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        Không có sản phẩm
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Order Request */}
        {order?.request && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Yêu cầu hoàn hàng/hoàn tiền</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Trạng thái</span>
                  <div>
                    {order.request.status && getStatusBadge(order.request.status)}
                  </div>
                </div>
                <div className="flex items-start justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-500">Lý do</span>
                  <span className="text-sm text-gray-900 text-right max-w-[60%]">{order.request.reason}</span>
                </div>
                {order.request.imageUrls && order.request.imageUrls.length > 0 && (
                  <div className="py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-500 block mb-2">Hình ảnh minh chứng</span>
                    <div className="grid grid-cols-3 gap-2">
                      {order.request.imageUrls.map((url, index) => (
                        <Image
                          key={index}
                          src={url}
                          alt={`Minh chứng ${index + 1}`}
                          width={200}
                          height={200}
                          className="w-full h-32 object-cover rounded-md"
                        />
                      ))}
                    </div>
                  </div>
                )}
                {order.request.notes && (
                  <div className="flex items-start justify-between py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-500">Ghi chú</span>
                    <span className="text-sm text-gray-900 text-right max-w-[60%]">{order.request.notes}</span>
                  </div>
                )}
                {order.request.createdBy && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-500">Người tạo</span>
                    <span className="text-sm text-gray-900">{order.request.createdBy.name}</span>
                  </div>
                )}
                {order.request.processedBy && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-500">Người xử lý</span>
                    <span className="text-sm text-gray-900">{order.request.processedBy.name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-500">Ngày tạo</span>
                  <span className="text-sm text-gray-900">
                    {order.request.createdAt ? new Date(order.request.createdAt).toLocaleString("vi-VN") : "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Check Logs */}
        {order?.checkLogs && order.checkLogs.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Lịch sử kiểm tra</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {order.checkLogs.map((log) => (
                  <div key={log.id} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          log.type === "RETURN" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {log.type === "RETURN" ? "Hoàn hàng" : "Hoàn tiền"}
                        </span>
                        <span className="text-xs text-gray-500">
                          {log.evidenceType === "RETURN_REQUEST" && "Yêu cầu hoàn hàng"}
                          {log.evidenceType === "RETURN_RECEIVED" && "Đã nhận hàng trả"}
                          {log.evidenceType === "REFUND_PROOF" && "Minh chứng hoàn tiền"}
                          {log.evidenceType === "REJECTION_PROOF" && "Minh chứng từ chối"}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString("vi-VN") : "-"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mb-2">{log.description}</p>
                    {log.imageUrls && log.imageUrls.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {log.imageUrls.map((url, index) => (
                          <Image
                            key={index}
                            src={url}
                            alt={`Minh chứng ${index + 1}`}
                            width={200}
                            height={200}
                            className="w-full h-32 object-cover rounded-md"
                          />
                        ))}
                      </div>
                    )}
                    {log.notes && (
                      <p className="text-sm text-gray-600 mt-2">Ghi chú: {log.notes}</p>
                    )}
                    {log.createdBy && (
                      <p className="text-xs text-gray-500 mt-2">Bởi: {log.createdBy.name}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Flow Modal (PROCESS, SHIP, DELIVER) */}
        <Modal
          open={flowModalOpen}
          onClose={() => {
            setFlowModalOpen(false)
            setFlowNotes("")
            setSelectedLots({})
          }}
          title={`${flowAction === "PROCESS" ? "Xử lý đơn hàng" : flowAction === "SHIP" ? "Giao hàng" : "Xác nhận nhận hàng"}`}

          className={flowAction === "PROCESS" ? "max-w-4xl" : ""}
        >
          <div className="space-y-4">
            {flowAction === "PROCESS" && (
              <>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto border border-gray-200 rounded-md p-4">
                  {isLoadingValidItems ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      <span className="ml-2 text-sm text-gray-500">Đang tải danh sách lô hàng...</span>
                    </div>
                  ) : order?.items && order.items.length > 0 ? (
                      // Sắp xếp theo số lượng combo giảm dần (số lượng lớn nhất trước)
                      [...order.items].sort((a, b) => (b.quantity || 0) - (a.quantity || 0)).map((orderItem) => {
                        if (!orderItem?.combo?.items || !Array.isArray(orderItem.combo.items)) {
                          return null
                        }

                        // Lấy valid items cho các inventory products trong combo này
                        const comboProductIds = orderItem.combo.items
                          .map((item: any) => item?.inventoryProductId || item?.inventoryProduct?.id)
                          .filter(Boolean)

                        const validItemsForCombo = (Array.isArray(validItemsData) ? validItemsData.filter((v: any) =>
                          comboProductIds.includes(v.productId)
                        ) : []) || []

                        if (validItemsForCombo.length === 0) {
                          return (
                            <div key={orderItem.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                              <p className="text-sm text-yellow-800">
                                <strong>{orderItem.combo.name}</strong> - Không có lô hàng còn hạn
                              </p>
                            </div>
                          )
                        }

                        return (
                          <div key={orderItem.id} className="border border-gray-200 rounded-md p-4 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                              <h4 className="font-semibold text-gray-900">{orderItem.combo.name}</h4>
                              <span className="text-sm text-gray-500">Số lượng: {orderItem.quantity} combo</span>
                            </div>

                            {orderItem.combo.items.map((comboItem: any) => {
                              // Có thể có inventoryProductId trực tiếp hoặc trong inventoryProduct.id
                              const inventoryProductId = comboItem?.inventoryProductId || comboItem?.inventoryProduct?.id
                              const productName = comboItem?.inventoryProduct?.name || "Sản phẩm không xác định"
                              const requiredQuantity = (comboItem?.quantity || 0) * (orderItem.quantity || 0)
                              const isGift = comboItem?.isGift

                              const validItems = (Array.isArray(validItemsData) ? validItemsData.find((v: any) => v.productId === inventoryProductId)?.items : []) || []

                              if (validItems.length === 0) {
                                return (
                                  <div key={inventoryProductId} className="p-2 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-800">
                                      <strong>{productName}</strong> {isGift && "(Tặng kèm)"} - Cần: {requiredQuantity} - Không có lô hàng còn hạn
                                    </p>
                                  </div>
                                )
                              }

                              const totalAvailable = validItems.reduce((sum: number, item: any) => sum + item.quantity, 0)

                              return (
                                <div key={inventoryProductId} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="font-medium text-gray-900">{productName}</span>
                                      {isGift && (
                                        <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded">
                                          Tặng kèm
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      Cần: <strong>{requiredQuantity}</strong> | Có sẵn: <strong>{totalAvailable}</strong>
                                    </div>
                                  </div>

                                  <div className="space-y-2 pl-4 border-l-2 border-gray-200">
                                    {validItems.map((item: any) => {
                                      const currentQuantity =
                                        selectedLots[orderItem.id]?.[inventoryProductId]?.[item.id] || 0
                                      
                                      // Tính tổng số lượng đã chọn từ tất cả các lô cho sản phẩm này
                                      const totalSelected = Object.values(selectedLots[orderItem.id]?.[inventoryProductId] || {}).reduce((sum: number, qty: any) => sum + (qty || 0), 0)
                                      
                                      // Số lượng còn thiếu để đạt requiredQuantity
                                      const remainingNeeded = Math.max(0, requiredQuantity - (totalSelected - currentQuantity))
                                      
                                      // Tối đa có thể chọn cho lô này: không vượt quá số lượng có trong lô và số lượng còn thiếu
                                      const maxQuantityForThisLot = Math.min(item.quantity, remainingNeeded)
                                      
                                      // Kiểm tra xem đã đủ số lượng chưa
                                      const isQuantitySufficient = totalSelected >= requiredQuantity

                                      return (
                                        <div key={item.id} className={`flex items-center justify-between p-3 rounded-md border-2 ${
                                          currentQuantity > 0 ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'
                                        }`}>
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="text-sm font-semibold text-gray-900">
                                                Lô: {item.session.code}
                                              </span>
                                              {currentQuantity > 0 && (
                                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-medium">
                                                  Đã chọn: {currentQuantity}
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-xs text-gray-600 space-y-0.5">
                                              <div>📅 HSD: <strong>{new Date(item.expiryDate).toLocaleDateString("vi-VN")}</strong></div>
                                              <div>📦 Số lượng có: <strong>{item.quantity}</strong></div>
                                              <div>📥 Nhập: {new Date(item.session.createdAt).toLocaleDateString("vi-VN")}</div>
                                            </div>
                                          </div>
                                          <div className="flex items-center">
                                            <input
                                              type="text"
                                              inputMode="numeric"
                                              value={currentQuantity || ""}
                                              onKeyDown={(e) => {
                                                // Chỉ cho phép nhập số (0-9)
                                                const isNumber = /^[0-9]$/.test(e.key)
                                                
                                                // Các phím điều hướng và điều khiển được phép
                                                const allowedKeys = [
                                                  "Backspace", "Delete", "Tab", "Escape", "Enter",
                                                  "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
                                                  "Home", "End"
                                                ]
                                                const isAllowedKey = allowedKeys.includes(e.key)
                                                
                                                // Cho phép Ctrl/Cmd + A, C, V, X
                                                const isCtrlCmd = e.ctrlKey || e.metaKey
                                                const isCopyPaste = isCtrlCmd && ["a", "c", "v", "x"].includes(e.key.toLowerCase())
                                                
                                                // Chặn tất cả các ký tự không phải số và không phải phím điều khiển
                                                if (!isNumber && !isAllowedKey && !isCopyPaste) {
                                                  e.preventDefault()
                                                }
                                              }}
                                              onPaste={(e) => {
                                                // Xử lý khi paste: chỉ lấy số
                                                e.preventDefault()
                                                const pastedText = e.clipboardData.getData("text")
                                                const numbersOnly = pastedText.replace(/[^0-9]/g, "")
                                                
                                                if (numbersOnly) {
                                                  // Tính toán max value
                                                  const otherLotsTotal = Object.entries(selectedLots[orderItem.id]?.[inventoryProductId] || {})
                                                    .filter(([lotId, _]) => lotId !== item.id)
                                                    .reduce((sum, [_, qty]) => sum + (qty || 0), 0)
                                                  const remainingNeeded = Math.max(0, requiredQuantity - otherLotsTotal)
                                                  const maxForThisLot = Math.min(item.quantity, remainingNeeded)
                                                  
                                                  const numValue = parseInt(numbersOnly) || 0
                                                  const value = Math.max(0, Math.min(maxForThisLot, numValue))
                                                  
                                                  setSelectedLots((prev) => {
                                                    const newState = { ...prev }
                                                    if (!newState[orderItem.id]) {
                                                      newState[orderItem.id] = {}
                                                    }
                                                    if (!newState[orderItem.id][inventoryProductId]) {
                                                      newState[orderItem.id][inventoryProductId] = {}
                                                    }
                                                    
                                                    if (value === 0) {
                                                      delete newState[orderItem.id][inventoryProductId][item.id]
                                                    } else {
                                                      newState[orderItem.id][inventoryProductId][item.id] = value
                                                    }
                                                    return newState
                                                  })
                                                  
                                                  // Cập nhật giá trị hiển thị trong input
                                                  e.currentTarget.value = String(value || "")
                                                }
                                              }}
                                              onChange={(e) => {
                                                // Chỉ lấy số từ input, loại bỏ tất cả ký tự không phải số
                                                let inputValue = e.target.value.replace(/[^0-9]/g, "")
                                                
                                                // Nếu input rỗng, cho phép để người dùng có thể xóa hết
                                                if (inputValue === "") {
                                                  setSelectedLots((prev) => {
                                                    const newState = { ...prev }
                                                    if (!newState[orderItem.id]) {
                                                      newState[orderItem.id] = {}
                                                    }
                                                    if (!newState[orderItem.id][inventoryProductId]) {
                                                      newState[orderItem.id][inventoryProductId] = {}
                                                    }
                                                    delete newState[orderItem.id][inventoryProductId][item.id]
                                                    return newState
                                                  })
                                                  return
                                                }
                                                
                                                // Tính toán max value dựa trên số lượng đã chọn từ các lô khác
                                                const otherLotsTotal = Object.entries(selectedLots[orderItem.id]?.[inventoryProductId] || {})
                                                  .filter(([lotId, _]) => lotId !== item.id)
                                                  .reduce((sum, [_, qty]) => sum + (qty || 0), 0)
                                                const remainingNeeded = Math.max(0, requiredQuantity - otherLotsTotal)
                                                const maxForThisLot = Math.min(item.quantity, remainingNeeded)
                                                
                                                // Parse và giới hạn giá trị
                                                let numValue = parseInt(inputValue) || 0
                                                
                                                // Nếu giá trị nhập vào vượt quá max, tự động cắt về max
                                                if (numValue > maxForThisLot) {
                                                  numValue = maxForThisLot
                                                  inputValue = String(maxForThisLot)
                                                  // Cập nhật giá trị hiển thị
                                                  e.target.value = inputValue
                                                }
                                                
                                                // Giới hạn giá trị trong khoảng [0, maxForThisLot]
                                                const value = Math.max(0, Math.min(maxForThisLot, numValue))
                                                
                                                setSelectedLots((prev) => {
                                                  const newState = { ...prev }
                                                  if (!newState[orderItem.id]) {
                                                    newState[orderItem.id] = {}
                                                  }
                                                  if (!newState[orderItem.id][inventoryProductId]) {
                                                    newState[orderItem.id][inventoryProductId] = {}
                                                  }
                                                  
                                                  if (value === 0) {
                                                    delete newState[orderItem.id][inventoryProductId][item.id]
                                                  } else {
                                                    newState[orderItem.id][inventoryProductId][item.id] = value
                                                  }
                                                  return newState
                                                })
                                                
                                                // Đảm bảo giá trị hiển thị đúng
                                                if (e.target.value !== inputValue) {
                                                  e.target.value = inputValue
                                                }
                                              }}
                                              onBlur={(e) => {
                                                // Khi blur, đảm bảo giá trị hiển thị đúng với state
                                                const current = selectedLots[orderItem.id]?.[inventoryProductId]?.[item.id] || 0
                                                if (e.target.value !== String(current)) {
                                                  e.target.value = String(current || "")
                                                }
                                              }}
                                              className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                              placeholder="0"
                                            />
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Không có sản phẩm trong đơn hàng
                      </div>
                    )}
                  </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú (tùy chọn)
              </label>
              <textarea
                value={flowNotes}
                onChange={(e) => setFlowNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Nhập ghi chú..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setFlowModalOpen(false)
                  setFlowNotes("")
                  setSelectedLots({})
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  const itemLots = buildItemLots()
                  flowMutation.mutate({
                    action: flowAction,
                    notes: flowNotes || undefined,
                    itemLots,
                  })
                }}
                disabled={flowMutation.isPending || (flowAction === "PROCESS" && isLoadingValidItems)}
                className="px-4 py-2 bg-blue-600 !text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {flowMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Xác nhận
              </button>
            </div>
          </div>
        </Modal>

        {/* Cancel Modal */}
        <Modal
          open={cancelModalOpen}
          onClose={() => {
            setCancelModalOpen(false)
            setCancelReason("")
          }}
          title="Hủy đơn hàng"
          description="Nhập lý do hủy đơn hàng"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lý do hủy <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                placeholder="Nhập lý do hủy đơn hàng..."
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setCancelModalOpen(false)
                  setCancelReason("")
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!cancelReason.trim()) {
                    toast.error("Vui lòng nhập lý do hủy")
                    return
                  }
                  cancelMutation.mutate({ cancelReason: cancelReason.trim() })
                }}
                disabled={cancelMutation.isPending || !cancelReason.trim()}
                className="px-4 py-2 bg-red-600 !text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {cancelMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Xác nhận hủy
              </button>
            </div>
          </div>
        </Modal>

        {/* Refund Modal */}
        <Modal
          open={refundModalOpen}
          onClose={() => {
            setRefundModalOpen(false)
            setRefundReason("")
            setRefundNotes("")
            setRefundImageUrls([])
          }}
          title={refundAction === "CREATE" ? "Tạo yêu cầu hoàn tiền" : "Xác nhận hoàn tiền"}
          description={refundAction === "CREATE" ? "Tạo yêu cầu hoàn tiền cho đơn hàng" : "Xác nhận đã hoàn tiền cho khách hàng"}
        >
          <div className="space-y-4">
            {refundAction === "CREATE" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lý do hoàn tiền <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Nhập lý do hoàn tiền..."
                  required
                />
              </div>
            )}
            {refundAction === "COMPLETE" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú (tùy chọn)
                </label>
                <textarea
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Nhập ghi chú về việc hoàn tiền..."
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setRefundModalOpen(false)
                  setRefundReason("")
                  setRefundNotes("")
                  setRefundImageUrls([])
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (refundAction === "CREATE" && !refundReason.trim()) {
                    toast.error("Vui lòng nhập lý do hoàn tiền")
                    return
                  }
                  refundMutation.mutate({
                    action: refundAction,
                    reason: refundAction === "CREATE" ? refundReason.trim() : undefined,
                    notes: refundAction === "COMPLETE" ? refundNotes.trim() || undefined : undefined,
                    imageUrls: refundImageUrls.length > 0 ? refundImageUrls : undefined,
                  })
                }}
                disabled={refundMutation.isPending || (refundAction === "CREATE" && !refundReason.trim())}
                className="px-4 py-2 bg-amber-600 !text-white rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {refundMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {refundAction === "CREATE" ? "Tạo yêu cầu" : "Xác nhận hoàn tiền"}
              </button>
            </div>
          </div>
        </Modal>

        {/* Return Modal */}
        <Modal
          open={returnModalOpen}
          onClose={() => {
            setReturnModalOpen(false)
            setReturnReason("")
            setReturnNotes("")
            setReturnImageUrls([])
            setReturnAccepted(true)
            setReturnRejectionReason("")
          }}
          title={
            returnAction === "CREATE" ? "Tạo yêu cầu hoàn hàng" :
            returnAction === "RECEIVE" ? "Xác nhận nhận hàng trả" :
            "Xử lý hoàn hàng"
          }
          description={
            returnAction === "CREATE" ? "Tạo yêu cầu hoàn hàng cho đơn hàng" :
            returnAction === "RECEIVE" ? "Xác nhận đã nhận được hàng trả về" :
            "Quyết định chấp nhận hoặc từ chối hoàn hàng"
          }
        >
          <div className="space-y-4">
            {returnAction === "CREATE" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lý do hoàn hàng <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Nhập lý do hoàn hàng..."
                  required
                />
              </div>
            )}
            {(returnAction === "RECEIVE" || returnAction === "COMPLETE") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú (tùy chọn)
                </label>
                <textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Nhập ghi chú..."
                />
              </div>
            )}
            {returnAction === "COMPLETE" && (
              <>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={returnAccepted}
                      onChange={(e) => setReturnAccepted(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Chấp nhận hoàn hàng</span>
                  </label>
                </div>
                {!returnAccepted && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lý do từ chối <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={returnRejectionReason}
                      onChange={(e) => setReturnRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                      placeholder="Nhập lý do từ chối hoàn hàng..."
                      required
                    />
                  </div>
                )}
              </>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setReturnModalOpen(false)
                  setReturnReason("")
                  setReturnNotes("")
                  setReturnImageUrls([])
                  setReturnAccepted(true)
                  setReturnRejectionReason("")
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (returnAction === "CREATE" && !returnReason.trim()) {
                    toast.error("Vui lòng nhập lý do hoàn hàng")
                    return
                  }
                  if (returnAction === "COMPLETE" && !returnAccepted && !returnRejectionReason.trim()) {
                    toast.error("Vui lòng nhập lý do từ chối")
                    return
                  }
                  returnMutation.mutate({
                    action: returnAction,
                    reason: returnAction === "CREATE" ? returnReason.trim() : undefined,
                    notes: (returnAction === "RECEIVE" || returnAction === "COMPLETE") ? returnNotes.trim() || undefined : undefined,
                    imageUrls: returnImageUrls.length > 0 ? returnImageUrls : undefined,
                    accepted: returnAction === "COMPLETE" ? returnAccepted : undefined,
                    rejectionReason: returnAction === "COMPLETE" && !returnAccepted ? returnRejectionReason.trim() : undefined,
                  })
                }}
                disabled={
                  returnMutation.isPending ||
                  (returnAction === "CREATE" && !returnReason.trim()) ||
                  (returnAction === "COMPLETE" && !returnAccepted && !returnRejectionReason.trim())
                }
                className="px-4 py-2 bg-orange-600 !text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {returnMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {returnAction === "CREATE" ? "Tạo yêu cầu" :
                 returnAction === "RECEIVE" ? "Xác nhận nhận hàng" :
                 returnAccepted ? "Chấp nhận hoàn hàng" : "Từ chối hoàn hàng"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
