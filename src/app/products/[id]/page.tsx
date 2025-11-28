"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { productsApi, Product, UpdateProductDto, CreateComboDto } from "@/services/api/products"
import { categoriesApi } from "@/services/api/categories"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useForm } from "react-hook-form"
import { ArrowLeft, Pencil, Trash2, Plus, Loader2, Package, Tag, Box, Calendar, FileText, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddComboOpen, setIsAddComboOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const queryClient = useQueryClient()

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => productsApi.getById(productId),
    enabled: !!productId,
  })

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.getAll,
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProductDto) => productsApi.update(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      setIsEditOpen(false)
      toast.success("Cập nhật sản phẩm thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Cập nhật sản phẩm thất bại")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success("Xóa sản phẩm thành công")
      router.push("/products")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Xóa sản phẩm thất bại")
    },
  })

  const addComboMutation = useMutation({
    mutationFn: (data: CreateComboDto) => productsApi.addCombo(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] })
      setIsAddComboOpen(false)
      toast.success("Thêm combo thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Thêm combo thất bại")
    },
  })

  const deleteComboMutation = useMutation({
    mutationFn: productsApi.deleteCombo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] })
      toast.success("Xóa combo thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Xóa combo thất bại")
    },
  })

  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, watch: watchEdit, setValue: setValueEdit, formState: { errors: editErrors } } = useForm<UpdateProductDto>({
    mode: "onChange"
  })
  const { register: registerCombo, handleSubmit: handleSubmitCombo, reset: resetCombo, watch: watchCombo, setValue: setValueCombo, formState: { errors: comboErrors } } = useForm<CreateComboDto>({
    defaultValues: {
      isActive: true,
      quantity: 1,
    },
    mode: "onChange"
  })

  const handleEdit = () => {
    if (product) {
      resetEdit({
        name: product?.name,
        description: product?.description || "",
        categoryId: product?.categoryId || "",
        isActive: product?.isActive,
      })
      setIsEditOpen(true)
    }
  }

  const handleDelete = () => {
    if (confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) {
      deleteMutation.mutate(productId)
    }
  }

  const handleDeleteCombo = (comboId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa combo này?")) {
      deleteComboMutation.mutate(comboId)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price)
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

  if (!product) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">Không tìm thấy sản phẩm</p>
          <Link href="/products">
            <Button className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const activeCombos = product?.combos?.filter((combo) => combo?.isActive) || []

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full px-4 md:px-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/products">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{product?.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                {product?.category?.name && (
                  <Badge variant="outline" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {product.category.name}
                  </Badge>
                )}
                <Badge variant={product?.isActive ? "default" : "secondary"} className="text-xs">
                  {product?.isActive ? "Hoạt động" : "Không hoạt động"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa
            </Button>
          </div>
        </div>

        {/* Main Content - 2 Columns */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Images */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ImageIcon className="h-5 w-5" />
                  Hình ảnh sản phẩm
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {product?.image ? (
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                    <Image
                      src={product.image}
                      alt={product?.name || "Product image"}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">Chưa có hình ảnh</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Info & Combos */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Thông tin sản phẩm
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Tên sản phẩm
                    </p>
                    <p className="text-base font-semibold text-gray-900">{product?.name}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Danh mục
                    </p>
                    <p className="text-base font-semibold text-gray-900">{product?.category?.name || "-"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Box className="h-4 w-4" />
                      Số lượng tồn kho
                    </p>
                    <p className="text-base font-semibold text-gray-900">{product?.quantity || 0} sản phẩm</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Ngày tạo
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {product?.createdAt
                        ? new Date(product.createdAt).toLocaleDateString("vi-VN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "-"}
                    </p>
                  </div>
                </div>
                {product?.description && (
                  <div className="mt-6 pt-6 border-t">
                    <p className="text-sm font-medium text-gray-500 mb-2">Mô tả</p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {product.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Combos Section */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Danh sách Combos ({activeCombos.length})
                </CardTitle>
                <Dialog open={isAddComboOpen} onOpenChange={setIsAddComboOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Thêm combo
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Thêm combo mới</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmitCombo((data) => {
                      addComboMutation.mutate(data)
                      resetCombo()
                    })} className="space-y-4">
                      <div>
                        <Label htmlFor="combo-name">Tên combo <span className="text-red-500">*</span></Label>
                        <Input
                          id="combo-name"
                          {...registerCombo("name", { required: "Tên combo là bắt buộc" })}
                          placeholder="Nhập tên combo"
                        />
                      </div>
                      <div>
                        <Label htmlFor="combo-price">Giá (VND) <span className="text-red-500">*</span></Label>
                        <Input
                          id="combo-price"
                          placeholder="0"
                          value={watchCombo("price") ? new Intl.NumberFormat("vi-VN").format(watchCombo("price") || 0) : ''}
                          onChange={(e) => {
                            const numbers = e.target.value.replace(/\D/g, '')
                            const parsed = parseInt(numbers) || 0
                            setValueCombo("price", parsed, { shouldValidate: true })
                          }}
                          onBlur={(e) => {
                            const numbers = e.target.value.replace(/\D/g, '')
                            const parsed = parseInt(numbers) || 0
                            if (parsed > 0) {
                              setValueCombo("price", parsed, { shouldValidate: true })
                            }
                          }}
                        />
                        {comboErrors.price && (
                          <p className="text-sm text-red-500 mt-1">{comboErrors.price.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="combo-quantity">Số lượng</Label>
                        <Input
                          id="combo-quantity"
                          type="number"
                          {...registerCombo("quantity", { valueAsNumber: true, min: 1 })}
                          placeholder="1"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          {...registerCombo("isActive")}
                          defaultChecked={true}
                        />
                        <Label>Kích hoạt</Label>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddComboOpen(false)}
                        >
                          Hủy
                        </Button>
                        <Button type="submit" disabled={addComboMutation.isPending}>
                          {addComboMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Thêm
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {activeCombos.length > 0 ? (
                  <div className="grid grid-cols-12 gap-3">
                    {activeCombos.map((combo) => (
                      <div
                        key={combo?.id}
                        className="col-span-1 p-3 border rounded-lg hover:shadow-md transition-all bg-white flex flex-col"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-xs mb-1 text-gray-900 truncate" title={combo?.name}>
                              {combo?.name}
                            </h3>
                            {combo?.isPromotionActive && (
                              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                🔥
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCombo(combo?.id)}
                            className="h-6 w-6 text-gray-400 hover:text-red-500 flex-shrink-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="space-y-1 mt-auto">
                          <div className="flex flex-col gap-1">
                            {combo?.promotionalPrice && combo?.isPromotionActive ? (
                              <>
                                <span className="text-[10px] line-through text-gray-400">
                                  {formatPrice(combo.price)}
                                </span>
                                <span className="text-sm font-bold text-gray-900">
                                  {formatPrice(combo.promotionalPrice)}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm font-semibold text-gray-900">
                                {formatPrice(combo?.price || 0)}
                              </span>
                            )}
                          </div>
                          {combo?.quantity !== undefined && (
                            <p className="text-[10px] text-gray-500">
                              {combo.quantity} sp
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm">Chưa có combo nào</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setIsAddComboOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Thêm combo đầu tiên
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cập nhật sản phẩm</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitEdit((data) => {
              if (!data?.categoryId) {
                toast.error("Vui lòng chọn danh mục")
                return
              }
              // Remove quantity from product data (only combos have quantity)
              const { quantity, ...productData } = data
              updateMutation.mutate(productData)
            })} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Tên sản phẩm <span className="text-red-500">*</span></Label>
                <Input
                  id="edit-name"
                  {...registerEdit("name", { required: "Tên sản phẩm là bắt buộc" })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Mô tả</Label>
                <Textarea
                  id="edit-description"
                  {...registerEdit("description")}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-categoryId">Danh mục <span className="text-red-500">*</span></Label>
                <Select
                  value={watchEdit("categoryId") || ""}
                  onValueChange={(value) => setValueEdit("categoryId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map?.((category) => (
                      <SelectItem key={category?.id} value={category?.id}>
                        {category?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editErrors.categoryId && (
                  <p className="text-sm text-red-500 mt-1">{editErrors.categoryId.message}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watchEdit("isActive")}
                  onCheckedChange={(checked) => setValueEdit("isActive", checked)}
                />
                <Label>Kích hoạt</Label>
              </div>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cập nhật
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

