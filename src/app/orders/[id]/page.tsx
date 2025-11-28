"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ordersApi, Order, OrderStatus } from "@/services/api/orders"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"
import { useParams } from "next/navigation"

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params.id as string
  const queryClient = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.getById(orderId),
    enabled: !!orderId,
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: OrderStatus) =>
      ordersApi.updateStatus(orderId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] })
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      toast.success("Cập nhật trạng thái đơn hàng thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Cập nhật trạng thái thất bại")
    },
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price)
  }

  const getStatusBadge = (status: OrderStatus) => {
    const variants: Record<OrderStatus, "default" | "secondary" | "destructive"> = {
      PENDING: "secondary",
      PAID: "default",
      CANCELLED: "destructive",
    }
    const labels: Record<OrderStatus, string> = {
      PENDING: "Chờ xử lý",
      PAID: "Đã thanh toán",
      CANCELLED: "Đã hủy",
    }
    return <Badge variant={variants[status]}>{labels[status]}</Badge>
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
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
            <Button className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
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
            <Link href="/orders">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Chi tiết đơn hàng</h1>
              <p className="text-sm text-gray-500">#{order?.id?.slice?.(0, 8)}</p>
            </div>
          </div>
          <Select
            value={order?.status}
            onValueChange={(value: OrderStatus) => {
              if (order?.id) {
                updateStatusMutation.mutate(value)
              }
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Chờ xử lý</SelectItem>
              <SelectItem value="PAID">Đã thanh toán</SelectItem>
              <SelectItem value="CANCELLED">Đã hủy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Khách hàng</p>
                <p className="font-medium">{order?.client?.name}</p>
                <p className="text-sm text-gray-500">{order?.client?.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Trạng thái</p>
                {order?.status && getStatusBadge(order.status)}
              </div>
              <div>
                <p className="text-sm text-gray-500">Ngày tạo</p>
                <p className="font-medium">
                  {order?.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "-"}
                </p>
              </div>
              {order?.processedBy && (
                <div>
                  <p className="text-sm text-gray-500">Người xử lý</p>
                  <p className="font-medium">{order?.processedBy?.name}</p>
                </div>
              )}
              {order?.voucher && (
                <div>
                  <p className="text-sm text-gray-500">Voucher</p>
                  <p className="font-medium">{order?.voucher?.name}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Tổng kết</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Tổng tiền:</span>
                <span className="text-2xl font-bold">{order?.totalPrice ? formatPrice(order.totalPrice) : "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Số sản phẩm:</span>
                <span>{order?.items?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết sản phẩm</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Combo</TableHead>
                  <TableHead>Số lượng</TableHead>
                  <TableHead>Đơn giá</TableHead>
                  <TableHead className="text-right">Thành tiền</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order?.items?.length > 0 ? (
                  order?.items?.map((item) => (
                  <TableRow key={item?.id}>
                    <TableCell className="font-medium">{item?.product?.name}</TableCell>
                    <TableCell>
                      <div>
                        <div>{item?.combo?.name}</div>
                        {item?.combo?.isPromotionActive && item?.combo?.promotionalPrice && (
                          <div className="text-sm text-gray-500">
                            <span className="line-through">{formatPrice(item?.combo?.price || 0)}</span>
                            <span className="ml-2 text-red-500">
                              {formatPrice(item?.combo?.promotionalPrice || 0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item?.quantity}</TableCell>
                    <TableCell>{item?.price && item?.quantity ? formatPrice(item.price / item.quantity) : "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {item?.price ? formatPrice(item.price) : "-"}
                    </TableCell>
                  </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      Không có sản phẩm
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

