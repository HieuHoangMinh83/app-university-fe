"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { inventoryProductsApi, InventoryProduct, UpdateInventoryProductDto } from "@/services/api/inventory-products"
import { categoriesApi } from "@/services/api/categories"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { 
  ArrowLeft, 
  Pencil, 
  Loader2, 
  Package, 
  Tag, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  User,
  FileText,
  ChevronRight,
  Box
} from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"
import { useForm } from "react-hook-form"
import Link from "next/link"

export default function InventoryProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const productId = params?.id as string
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"valid" | "expired">("valid")

  const { data: product, isLoading } = useQuery<InventoryProduct>({
    queryKey: ["inventory-product-detail", productId],
    queryFn: () => inventoryProductsApi.getById(productId),
    enabled: !!productId,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.getAll(),
  })

  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : (categoriesData as any)?.data || []

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<UpdateInventoryProductDto>({
    mode: "onChange"
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateInventoryProductDto) => inventoryProductsApi.update(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-product-detail", productId] })
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] })
      setIsEditOpen(false)
      toast.success("Cập nhật sản phẩm kho thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Cập nhật thất bại")
    },
  })

  const handleEdit = () => {
    if (product) {
      reset({
        name: product.name || "",
        categoryId: product.categoryId || "",
        isActive: product.isActive ?? true,
        description: product.description || undefined,
        hasExpiryDate: product.hasExpiryDate ?? false,
      })
      setIsEditOpen(true)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: "no-expiry", label: "Không có hạn", color: "default" }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)
    const diff = expiry.getTime() - today.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    
    if (days < 0) {
      return { status: "expired", label: "Đã hết hạn", color: "destructive", days: Math.abs(days) }
    } else if (days <= 7) {
      return { status: "soon", label: `Còn ${days} ngày`, color: "warning", days }
    } else {
      return { status: "valid", label: `Còn ${days} ngày`, color: "success", days }
    }
  }

  // Tính tổng số lượng
  const validQuantity = product?.validItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
  const expiredQuantity = product?.expiredItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
  const totalQuantity = validQuantity + expiredQuantity

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!product) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">Không tìm thấy sản phẩm kho</p>
          <Link href="/inventory-products">
            <Button className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const displayItems = activeTab === "valid" ? (product.validItems || []) : (product.expiredItems || [])

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full">
        {/* Breadcrumb */}
        <Card className="border-gray-200">
          <div className="p-6 pb-3">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/inventory-products" className="text-gray-600 text-lg hover:text-gray-900">
                    Sản phẩm kho
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-6 w-6" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <span className="text-blue-500 font-medium text-lg">{product.name}</span>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </Card>

        {/* Main Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Info Card */}
          <Card className="lg:col-span-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <div className="p-2 bg-white rounded-lg">
                    <Package className="h-4 w-4 text-blue-600" />
                  </div>
                  Thông tin sản phẩm
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Chỉnh sửa
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Product Name */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                    <Box className="h-4 w-4 text-blue-600" />
                    Tên sản phẩm
                  </Label>
                  <Input
                    value={product.name || ""}
                    readOnly
                    className="bg-gray-50 border-gray-200 text-gray-900 font-medium cursor-default"
                  />
                </div>

                {/* Category and Status Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category */}
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                      <Tag className="h-4 w-4 text-blue-600" />
                      Danh mục
                    </Label>
                    <Input
                      value={product.category?.name || "Chưa có danh mục"}
                      readOnly
                      className="bg-gray-50 border-gray-200 text-gray-900 cursor-default"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Trạng thái
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={product.isActive ? "Hoạt động" : "Không hoạt động"}
                        readOnly
                        className={`bg-gray-50 border-gray-200 text-gray-900 cursor-default ${
                          product.isActive ? 'text-green-700 font-semibold' : 'text-gray-600'
                        }`}
                      />
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? "Hoạt động" : "Không hoạt động"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Has Expiry Date */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    Có ngày hết hạn
                  </Label>
                  <Input
                    value={product.hasExpiryDate ? "Có" : "Không"}
                    readOnly
                    className="bg-gray-50 border-gray-200 text-gray-900 cursor-default"
                  />
                </div>

                {/* Description */}
                {product.description && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      Mô tả
                    </Label>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                      {product.description}
                    </div>
                  </div>
                )}

                {/* Created/Updated Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-blue-600" />
                      Người tạo
                    </Label>
                    <Input
                      value={product.createdBy?.name || "-"}
                      readOnly
                      className="bg-gray-50 border-gray-200 text-gray-900 cursor-default"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      Ngày tạo
                    </Label>
                    <Input
                      value={product.createdAt ? formatDate(product.createdAt) : "-"}
                      readOnly
                      className="bg-gray-50 border-gray-200 text-gray-900 cursor-default"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Card */}
          <Card className="border-gray-200">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <div className="p-2 bg-white rounded-lg">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                Thống kê
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-700 font-medium mb-1">Tổng số lượng</div>
                  <div className="text-2xl font-bold text-blue-900">{totalQuantity.toLocaleString("vi-VN")}</div>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm text-green-700 font-medium mb-1">Còn hạn</div>
                  <div className="text-2xl font-bold text-green-900">{validQuantity.toLocaleString("vi-VN")}</div>
                  <div className="text-xs text-green-600 mt-1">
                    {product.validItems?.length || 0} lô hàng
                  </div>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-sm text-red-700 font-medium mb-1">Hết hạn</div>
                  <div className="text-2xl font-bold text-red-900">{expiredQuantity.toLocaleString("vi-VN")}</div>
                  <div className="text-xs text-red-600 mt-1">
                    {product.expiredItems?.length || 0} lô hàng
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items Table */}
        <Card className="border-gray-200">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <div className="p-2 bg-white rounded-lg">
                <Box className="h-4 w-4 text-blue-600" />
              </div>
              Chi tiết lô hàng
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "valid" | "expired")}>
              <TabsList className="mb-4">
                <TabsTrigger value="valid">
                  Còn hạn ({product.validItems?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="expired">
                  Hết hạn ({product.expiredItems?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {displayItems.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">STT</TableHead>
                          <TableHead className="text-right">Số lượng</TableHead>
                          {product.hasExpiryDate && (
                            <TableHead>Ngày hết hạn</TableHead>
                          )}
                          <TableHead>Mã session</TableHead>
                          <TableHead>Mô tả session</TableHead>
                          <TableHead>Người nhập</TableHead>
                          <TableHead>Ngày nhập</TableHead>
                          {activeTab === "expired" && <TableHead>Ghi chú</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayItems.map((item, index) => {
                          const expiryStatus = getExpiryStatus(item.expiryDate || null)
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {item.quantity.toLocaleString("vi-VN")}
                              </TableCell>
                              {product.hasExpiryDate && (
                                <TableCell>
                                  {item.expiryDate ? (
                                    <div className="space-y-1">
                                      <div>{formatDate(item.expiryDate)}</div>
                                      <Badge 
                                        variant={
                                          expiryStatus.status === "expired" ? "destructive" :
                                          expiryStatus.status === "soon" ? "secondary" :
                                          "default"
                                        }
                                      >
                                        {expiryStatus.label}
                                      </Badge>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </TableCell>
                              )}
                              <TableCell>
                                <Badge variant="outline" className="font-mono">
                                  {item.sessionCode}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {item.session?.description || "-"}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium">{item.importedBy?.name || "-"}</div>
                                  {item.importedBy?.phone && (
                                    <div className="text-xs text-gray-500">{item.importedBy.phone}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {item.createdAt ? formatDateTime(item.createdAt) : "-"}
                              </TableCell>
                              {activeTab === "expired" && (
                                <TableCell>
                                  {item.notes || "-"}
                                </TableCell>
                              )}
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                      <Box className="h-10 w-10 text-gray-400" />
                    </div>
                    <p className="text-base font-semibold mb-2 text-gray-700">
                      {activeTab === "valid" ? "Chưa có lô hàng còn hạn" : "Chưa có lô hàng hết hạn"}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Chỉnh sửa sản phẩm kho</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit((data) => {
              if (!data.categoryId) {
                toast.error("Vui lòng chọn danh mục")
                return
              }
              updateMutation.mutate(data)
            })} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Tên sản phẩm <span className="text-red-500">*</span></Label>
                <Input
                  id="edit-name"
                  {...register("name", { required: "Tên sản phẩm là bắt buộc" })}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="edit-categoryId">Danh mục <span className="text-red-500">*</span></Label>
                <Select
                  value={watch("categoryId") || ""}
                  onValueChange={(value) => setValue("categoryId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map?.((category: any) => (
                      <SelectItem key={category?.id} value={category?.id}>
                        {category?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && (
                  <p className="text-sm text-red-500 mt-1">{errors.categoryId.message}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch("isActive")}
                  onCheckedChange={(checked) => setValue("isActive", checked)}
                />
                <Label>Kích hoạt</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch("hasExpiryDate")}
                  onCheckedChange={(checked) => setValue("hasExpiryDate", checked)}
                />
                <Label>Có ngày hết hạn</Label>
              </div>
              <div>
                <Label htmlFor="edit-description">Mô tả</Label>
                <Textarea
                  id="edit-description"
                  {...register("description")}
                  rows={4}
                  placeholder="Nhập mô tả (tùy chọn)"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cập nhật
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
