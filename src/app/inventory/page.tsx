"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { inventoryApi, InventoryItem, ImportInventoryDto } from "@/services/api/inventory"
import { productsApi } from "@/services/api/products"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useForm } from "react-hook-form"
import { Plus, Loader2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"

export default function InventoryPage() {
  const [isImportOpen, setIsImportOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => inventoryApi.getAll(),
  })

  const { data: expiringSoon } = useQuery({
    queryKey: ["inventory", "expiring-soon"],
    queryFn: () => inventoryApi.getExpiringSoon(7),
  })

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.getAll,
  })

  const importMutation = useMutation({
    mutationFn: inventoryApi.import,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      setIsImportOpen(false)
      toast.success("Nhập kho thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Nhập kho thất bại")
    },
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ImportInventoryDto>()

  const onSubmit = (data: ImportInventoryDto) => {
    importMutation.mutate(data)
    reset()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN")
  }

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Quản lý Kho hàng</h1>
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nhập kho
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nhập kho</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="productId">Sản phẩm <span className="text-red-500">*</span></Label>
                  <Select
                    {...register("productId", { required: "Vui lòng chọn sản phẩm" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn sản phẩm" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map?.((product) => (
                        <SelectItem key={product?.id} value={product?.id}>
                          {product?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.productId && (
                    <p className="text-sm text-red-500 mt-1">{errors.productId.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="quantity">Số lượng <span className="text-red-500">*</span></Label>
                  <Input
                    id="quantity"
                    type="number"
                    {...register("quantity", { 
                      required: "Số lượng là bắt buộc",
                      valueAsNumber: true,
                      min: { value: 1, message: "Số lượng phải lớn hơn 0" }
                    })}
                  />
                  {errors.quantity && (
                    <p className="text-sm text-red-500 mt-1">{errors.quantity.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="expiryDate">Ngày hết hạn <span className="text-red-500">*</span></Label>
                  <Input
                    id="expiryDate"
                    type="datetime-local"
                    {...register("expiryDate", { required: "Ngày hết hạn là bắt buộc" })}
                  />
                  {errors.expiryDate && (
                    <p className="text-sm text-red-500 mt-1">{errors.expiryDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="batchCode">Mã lô hàng</Label>
                  <Input
                    id="batchCode"
                    {...register("batchCode")}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Ghi chú</Label>
                  <Input
                    id="notes"
                    {...register("notes")}
                  />
                </div>

                <Button type="submit" disabled={importMutation.isPending}>
                  {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Nhập kho
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="expiring">Sắp hết hạn</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách kho hàng</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Số lượng</TableHead>
                        <TableHead>Ngày hết hạn</TableHead>
                        <TableHead>Mã lô</TableHead>
                        <TableHead>Người nhập</TableHead>
                        <TableHead>Ngày nhập</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory?.length > 0 ? (
                        inventory?.map((item) => {
                          const daysUntilExpiry = item?.expiryDate ? getDaysUntilExpiry(item.expiryDate) : 0
                          return (
                            <TableRow key={item?.id}>
                              <TableCell className="font-medium">{item?.product?.name}</TableCell>
                              <TableCell>{item?.quantity}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {item?.expiryDate ? formatDate(item.expiryDate) : "-"}
                                  {daysUntilExpiry <= 7 && daysUntilExpiry >= 0 && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      {daysUntilExpiry} ngày
                                    </Badge>
                                  )}
                                  {daysUntilExpiry < 0 && (
                                    <Badge variant="destructive">Đã hết hạn</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{item?.batchCode || "-"}</TableCell>
                              <TableCell>{item?.importedBy?.name}</TableCell>
                              <TableCell>{item?.createdAt ? formatDate(item.createdAt) : "-"}</TableCell>
                            </TableRow>
                          )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            Không có dữ liệu
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expiring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sản phẩm sắp hết hạn (7 ngày tới)</CardTitle>
              </CardHeader>
              <CardContent>
                {!Array.isArray(expiringSoon) || expiringSoon.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Không có sản phẩm nào sắp hết hạn
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Số lượng</TableHead>
                        <TableHead>Ngày hết hạn</TableHead>
                        <TableHead>Còn lại</TableHead>
                        <TableHead>Mã lô</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expiringSoon?.map?.((item) => {
                        const daysUntilExpiry = item?.expiryDate ? getDaysUntilExpiry(item.expiryDate) : 0
                        return (
                          <TableRow key={item?.id}>
                            <TableCell className="font-medium">{item?.product?.name}</TableCell>
                            <TableCell>{item?.quantity}</TableCell>
                            <TableCell>{item?.expiryDate ? formatDate(item.expiryDate) : "-"}</TableCell>
                            <TableCell>
                              <Badge variant={daysUntilExpiry <= 3 ? "destructive" : "secondary"}>
                                {daysUntilExpiry} ngày
                              </Badge>
                            </TableCell>
                            <TableCell>{item?.batchCode || "-"}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

