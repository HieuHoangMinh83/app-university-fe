"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ordersApi, Order, OrderStatus } from "@/services/api/orders"
import { clientsApi, CreateClientDto } from "@/services/api/clients"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageUpload } from "@/components/ui/image-upload"
import { deleteImage } from "@/lib/supabase"
import { Loader2, Eye, Plus, Search } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"
import { useForm } from "react-hook-form"

export default function OrdersPage() {
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false)
  const [createClientOldImageUrl, setCreateClientOldImageUrl] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const queryClient = useQueryClient()

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersApi.getAll(),
  })

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
      // Xóa ảnh đã upload nếu tạo thất bại
      if (createClientOldImageUrl) {
        deleteImage(createClientOldImageUrl)
        setCreateClientOldImageUrl(null)
      }
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersApi.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      toast.success("Cập nhật trạng thái đơn hàng thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Cập nhật trạng thái thất bại")
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

  // Xử lý khi đóng dialog create client mà không submit
  const handleCreateClientDialogClose = (open: boolean) => {
    if (!open && createClientOldImageUrl) {
      // Xóa ảnh đã upload nếu hủy form
      deleteImage(createClientOldImageUrl)
      setCreateClientOldImageUrl(null)
    }
    setIsCreateClientOpen(open)
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price)
  }

  // Filter orders based on search query
  const ordersArray = Array.isArray(orders) ? orders : []
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Đơn hàng</CardTitle>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo mã đơn, tên hoặc số điện thoại..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Dialog open={isCreateClientOpen} onOpenChange={handleCreateClientDialogClose}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Tạo khách hàng mới
                    </Button>
                  </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader className="pb-4 border-b">
                <DialogTitle className="text-xl font-semibold">Tạo khách hàng mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitCreateClient(onSubmitCreateClient)} className="space-y-5 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="create-client-name" className="text-sm font-medium">
                    Tên khách hàng <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="create-client-name"
                    className="h-10"
                    {...registerCreateClient("name", { required: "Tên khách hàng là bắt buộc" })}
                    placeholder="Nhập tên khách hàng"
                  />
                  {createClientErrors.name && (
                    <p className="text-sm text-red-500 mt-1">{createClientErrors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-client-phone" className="text-sm font-medium">
                    Số điện thoại <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="create-client-phone"
                    className="h-10"
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
                  <Label htmlFor="create-client-address" className="text-sm font-medium">
                    Địa chỉ
                  </Label>
                  <Input
                    id="create-client-address"
                    className="h-10"
                    {...registerCreateClient("address")}
                    placeholder="123 Đường ABC, Quận 1, TP.HCM"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Ảnh đại diện
                  </Label>
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
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateClientOpen(false)}
                    disabled={createClientMutation.isPending}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" disabled={createClientMutation.isPending}>
                    {createClientMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Tạo khách hàng
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredOrders && filteredOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Số lượng sản phẩm</TableHead>
                    <TableHead>Tổng tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders?.length > 0 ? (
                    filteredOrders?.map((order) => (
                    <TableRow key={order?.id}>
                      <TableCell className="font-medium">#{order?.id?.slice?.(0, 8)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order?.client?.name}</div>
                          <div className="text-sm text-gray-500">{order?.client?.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>{order?.items?.length || 0}</TableCell>
                      <TableCell className="font-medium">{order?.totalPrice ? formatPrice(order.totalPrice) : "-"}</TableCell>
                      <TableCell>
                        <Select
                          value={order?.status}
                          onValueChange={(value: OrderStatus) => {
                            updateStatusMutation.mutate({ id: order?.id, status: value })
                          }}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                            <SelectItem value="PAID">Đã thanh toán</SelectItem>
                            <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {order?.createdAt ? new Date(order.createdAt).toLocaleDateString("vi-VN") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/orders/${order?.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {searchQuery ? "Không tìm thấy đơn hàng nào" : "Không có dữ liệu"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? "Không tìm thấy đơn hàng nào" : "Chưa có đơn hàng nào"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

