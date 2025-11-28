"use client"

import { useQuery } from "@tanstack/react-query"
import { clientsApi } from "@/services/api/clients"
import { ordersApi, Order } from "@/services/api/orders"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, ArrowLeft, Phone, MapPin, Gift, Calendar } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"
import { useParams } from "next/navigation"

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string

  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => clientsApi.getById(clientId),
    enabled: !!clientId,
  })

  const { data: orders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["orders", clientId],
    queryFn: () => ordersApi.getAll(clientId),
    enabled: !!clientId,
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      PENDING: "secondary",
      PAID: "default",
      CANCELLED: "destructive",
    }
    const labels: Record<string, string> = {
      PENDING: "Chờ xử lý",
      PAID: "Đã thanh toán",
      CANCELLED: "Đã hủy",
    }
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>
  }

  if (isLoadingClient) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">Không tìm thấy khách hàng</p>
          <Link href="/customers">
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
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Chi tiết khách hàng</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin khách hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={client?.avatar || undefined} alt={client?.name} />
                  <AvatarFallback className="text-xl">
                    {client?.name?.charAt?.(0)?.toUpperCase() || "K"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">{client?.name}</h2>
                  <p className="text-sm text-gray-500">ID: {client?.id?.slice?.(0, 8)}...</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Số điện thoại</p>
                    <p className="font-medium">{client?.phone}</p>
                  </div>
                </div>

                {client?.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Địa chỉ</p>
                      <p className="font-medium">{client?.address}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Gift className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Điểm tích lũy</p>
                    <p className="font-medium">
                      <Badge variant="outline" className="text-base">
                        {client?.point || 0} điểm
                      </Badge>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Ngày tạo</p>
                    <p className="font-medium">
                      {client?.createdAt
                        ? new Date(client.createdAt).toLocaleDateString("vi-VN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "-"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Trạng thái</p>
                  <p className="font-medium">
                    {client?.zaloId ? (
                      <Badge variant="default">Đã đăng ký</Badge>
                    ) : (
                      <Badge variant="secondary">Chưa đăng ký</Badge>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Thống kê</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Tổng số đơn hàng</span>
                <span className="text-2xl font-bold">{orders?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Số lượt quay</span>
                <span className="text-2xl font-bold">{client?.spinCount || 0}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Tổng giá trị đơn hàng</span>
                <span className="text-xl font-bold text-green-600">
                  {orders?.reduce?.((sum: number, order: Order) => sum + (order?.totalPrice || 0), 0)
                    ? formatPrice(
                        orders.reduce((sum: number, order: Order) => sum + (order?.totalPrice || 0), 0)
                      )
                    : formatPrice(0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách đơn hàng</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingOrders ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : orders && orders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn hàng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Số sản phẩm</TableHead>
                    <TableHead>Tổng tiền</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.map((order: Order) => (
                    <TableRow key={order?.id}>
                      <TableCell className="font-medium">
                        #{order?.id?.slice?.(0, 8)}...
                      </TableCell>
                      <TableCell>{order?.status && getStatusBadge(order.status)}</TableCell>
                      <TableCell>{order?.items?.length || 0}</TableCell>
                      <TableCell className="font-medium">
                        {order?.totalPrice ? formatPrice(order.totalPrice) : "-"}
                      </TableCell>
                      <TableCell>
                        {order?.createdAt
                          ? new Date(order.createdAt).toLocaleDateString("vi-VN")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/orders/${order?.id}`}>
                          <Button variant="ghost" size="sm">
                            Xem chi tiết
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Khách hàng chưa có đơn hàng nào
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

