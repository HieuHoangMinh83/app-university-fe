"use client"

import { useState, useRef } from "react"
import React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { productsApi, Product, CreateProductDto } from "@/services/api/products"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ImageUpload } from "@/components/ui/image-upload"
import { useForm, useFieldArray } from "react-hook-form"
import { Plus, Pencil, Trash2, Loader2, Package, Search, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"
import { deleteImage, uploadImage } from "@/lib/supabase"

export default function ProductsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const queryClient = useQueryClient()

  // Format number with thousand separators for display
  const formatNumberInput = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  // Parse formatted number back to number
  const parseFormattedNumber = (value: string) => {
    return parseInt(value.replace(/\./g, '')) || 0
  }

  const [createProductImageUrl, setCreateProductImageUrl] = useState<string | null>(null)
  const [createComboImageUrls, setCreateComboImageUrls] = useState<Record<number, string | null>>({})

  const { register: registerCreate, handleSubmit: handleSubmitCreate, control: controlCreate, watch: watchCreate, setValue: setValueCreate, reset: resetCreateForm, formState: { errors: createErrors } } = useForm<CreateProductDto>({
    defaultValues: {
      isActive: true,
      combos: [{ name: "", price: 0, quantity: 1, isActive: true }],
    },
    mode: "onChange"
  })

  const { fields: comboFields, append: appendCombo, remove: removeCombo } = useFieldArray({
    control: controlCreate,
    name: "combos",
  })

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      setIsCreateOpen(false)
      resetCreateForm({
        isActive: true,
        combos: [{ name: "", price: 0, quantity: 1, isActive: true }],
      })
      // Xóa ảnh đã upload nếu tạo thành công
      if (createProductImageUrl) {
        deleteImage(createProductImageUrl)
      }
      Object.values(createComboImageUrls).forEach(url => {
        if (url) deleteImage(url)
      })
      setCreateProductImageUrl(null)
      setCreateComboImageUrls({})
      toast.success("Tạo sản phẩm thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Tạo sản phẩm thất bại")
      // Xóa ảnh đã upload nếu tạo thất bại
      if (createProductImageUrl) {
        deleteImage(createProductImageUrl)
        setCreateProductImageUrl(null)
      }
      Object.values(createComboImageUrls).forEach(url => {
        if (url) deleteImage(url)
      })
      setCreateComboImageUrls({})
    },
  })

  const onSubmitCreate = (data: CreateProductDto) => {
    // Validate category
    if (!data?.categoryId) {
      toast.error("Vui lòng chọn danh mục")
      return
    }

    // Validate combos
    if (!data?.combos || data?.combos?.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 combo")
      return
    }

    // Format promotion dates to ISO 8601 format
    const formattedData = {
      ...data,
      combos: data.combos.map(combo => ({
        ...combo,
        // Convert datetime-local to ISO 8601 format
        promotionStart: combo.promotionStart 
          ? new Date(combo.promotionStart).toISOString() 
          : undefined,
        promotionEnd: combo.promotionEnd 
          ? new Date(combo.promotionEnd).toISOString() 
          : undefined,
      }))
    }

    createMutation.mutate(formattedData)
  }

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.getAll,
  })

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.getAll,
  })

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success("Xóa sản phẩm thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Xóa sản phẩm thất bại")
    },
  })

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) {
      deleteMutation.mutate(id)
    }
  }

  // Filter products based on search query, category, and status
  const filteredProducts = products?.filter((product) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        product?.name?.toLowerCase()?.includes(query) ||
        product?.description?.toLowerCase()?.includes(query) ||
        product?.category?.name?.toLowerCase()?.includes(query)
      if (!matchesSearch) return false
    }

    // Category filter
    if (categoryFilter !== "all") {
      if (product?.categoryId !== categoryFilter) return false
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "active" && !product?.isActive) return false
      if (statusFilter === "inactive" && product?.isActive) return false
    }

    return true
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Quản lý Sản phẩm</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tạo sản phẩm mới
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">Tạo sản phẩm mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitCreate(onSubmitCreate)} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Ảnh sản phẩm</Label>
                    <ImageUpload
                      value={watchCreate("image") || ""}
                      onChange={(url) => {
                        if (createProductImageUrl && createProductImageUrl !== url) {
                          deleteImage(createProductImageUrl)
                        }
                        setValueCreate("image", url)
                        setCreateProductImageUrl(url)
                      }}
                      folder="product-images"
                      disabled={createMutation.isPending}
                    />
                  </div>

                  <div>
                    <Label htmlFor="create-name">Tên sản phẩm <span className="text-red-500">*</span></Label>
                    <Input
                      id="create-name"
                      className="mt-1.5"
                      {...registerCreate("name", { required: "Tên sản phẩm là bắt buộc" })}
                      placeholder="Nhập tên sản phẩm"
                    />
                    {createErrors.name && (
                      <p className="text-sm text-red-500 mt-1">{createErrors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="create-description">Mô tả</Label>
                    <Textarea
                      id="create-description"
                      className="mt-1.5"
                      {...registerCreate("description")}
                      rows={3}
                      placeholder="Mô tả sản phẩm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="create-categoryId">Danh mục <span className="text-red-500">*</span></Label>
                    <Select
                      onValueChange={(value) => setValueCreate("categoryId", value)}
                    >
                      <SelectTrigger className="mt-1.5">
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
                    {createErrors.categoryId && (
                      <p className="text-sm text-red-500 mt-1">{createErrors.categoryId.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Combos</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendCombo({ name: "", price: 0, quantity: 1, isActive: true })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Thêm combo
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {comboFields.map((field, index) => {
                      const comboImageUrl = watchCreate(`combos.${index}.image`) || ""
                      
                      return (
                      <div key={field.id} className="p-4 border rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors space-y-4">
                        <div className="grid grid-cols-12 gap-4 items-start">
                          <div className="col-span-12 md:col-span-2">
                            <Label className="text-sm font-medium mb-1.5 block">Ảnh combo</Label>
                            <div 
                              className="relative w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors overflow-hidden"
                              onClick={() => comboFileInputRefs.current[index]?.click()}
                            >
                              {comboImageUrl ? (
                                <img 
                                  src={comboImageUrl} 
                                  alt="Combo preview" 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                  <Package className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                              <input
                                ref={(el) => { comboFileInputRefs.current[index] = el }}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
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
                                  
                                  try {
                                    const oldUrl = createComboImageUrls[index]
                                    const url = await uploadImage(file, "combo-images")
                                    if (oldUrl && oldUrl !== url) {
                                      await deleteImage(oldUrl)
                                    }
                                    setValueCreate(`combos.${index}.image`, url)
                                    setCreateComboImageUrls(prev => ({ ...prev, [index]: url }))
                                    toast.success("Upload ảnh thành công")
                                  } catch (error: any) {
                                    toast.error(error?.message || "Upload ảnh thất bại")
                                  }
                                }}
                                disabled={createMutation.isPending}
                              />
                            </div>
                          </div>
                          <div className="col-span-12 md:col-span-3">
                            <Label className="text-sm font-medium">
                              Tên combo <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              className="mt-1.5"
                              placeholder="Nhập tên combo"
                              {...registerCreate(`combos.${index}.name`, { required: "Tên combo là bắt buộc" })}
                            />
                            {createErrors.combos?.[index]?.name && (
                              <p className="text-xs text-red-500 mt-1">{createErrors.combos[index]?.name?.message}</p>
                            )}
                          </div>
                          <div className="col-span-12 md:col-span-3">
                            <Label className="text-sm font-medium">
                              Giá (VND) <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              className="mt-1.5"
                              placeholder="0"
                              value={watchCreate(`combos.${index}.price`) ? formatNumberInput(watchCreate(`combos.${index}.price`).toString()) : ''}
                              onChange={(e) => {
                                const formatted = formatNumberInput(e.target.value)
                                const parsed = parseFormattedNumber(formatted)
                                setValueCreate(`combos.${index}.price`, parsed, { shouldValidate: true })
                              }}
                              onBlur={(e) => {
                                const parsed = parseFormattedNumber(e.target.value)
                                if (parsed > 0) {
                                  setValueCreate(`combos.${index}.price`, parsed, { shouldValidate: true })
                                }
                              }}
                            />
                            {createErrors.combos?.[index]?.price && (
                              <p className="text-xs text-red-500 mt-1">{createErrors.combos[index]?.price?.message}</p>
                            )}
                          </div>
                          <div className="col-span-12 md:col-span-2">
                            <Label className="text-sm font-medium">Số lượng</Label>
                            <Input
                              className="mt-1.5"
                              type="number"
                              placeholder="1"
                              {...registerCreate(`combos.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                            />
                          </div>
                          <div className="col-span-12 md:col-span-2 flex justify-end md:justify-start pt-7">
                            {comboFields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  // Xóa ảnh combo nếu có
                                  const comboImageUrl = createComboImageUrls[index]
                                  if (comboImageUrl) {
                                    deleteImage(comboImageUrl)
                                    const newUrls = { ...createComboImageUrls }
                                    delete newUrls[index]
                                    setCreateComboImageUrls(newUrls)
                                  }
                                  removeCombo(index)
                                }}
                                className="h-8 w-8 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="col-span-12 grid grid-cols-12 gap-4 border-t pt-4">
                          <div className="col-span-12 md:col-span-3">
                            <Label className="text-sm font-medium">Giá khuyến mại (VND)</Label>
                            <Input
                              className="mt-1.5"
                              placeholder="0"
                              value={watchCreate(`combos.${index}.promotionalPrice`) ? formatNumberInput(watchCreate(`combos.${index}.promotionalPrice`).toString()) : ''}
                              onChange={(e) => {
                                const formatted = formatNumberInput(e.target.value)
                                const parsed = parseFormattedNumber(formatted)
                                setValueCreate(`combos.${index}.promotionalPrice`, parsed > 0 ? parsed : undefined, { shouldValidate: true })
                              }}
                              onBlur={(e) => {
                                const parsed = parseFormattedNumber(e.target.value)
                                if (parsed > 0) {
                                  setValueCreate(`combos.${index}.promotionalPrice`, parsed, { shouldValidate: true })
                                }
                              }}
                            />
                          </div>
                          <div className="col-span-12 md:col-span-3">
                            <Label className="text-sm font-medium">Bắt đầu khuyến mại</Label>
                            <Input
                              className="mt-1.5"
                              type="datetime-local"
                              {...registerCreate(`combos.${index}.promotionStart`)}
                            />
                          </div>
                          <div className="col-span-12 md:col-span-3">
                            <Label className="text-sm font-medium">Kết thúc khuyến mại</Label>
                            <Input
                              className="mt-1.5"
                              type="datetime-local"
                              {...registerCreate(`combos.${index}.promotionEnd`)}
                            />
                          </div>
                          <div className="col-span-12 md:col-span-3 flex items-center space-x-2 pt-7">
                            <Switch
                              id={`create-combo-promotion-${index}`}
                              checked={watchCreate(`combos.${index}.isPromotionActive`) || false}
                              onCheckedChange={(checked) => setValueCreate(`combos.${index}.isPromotionActive`, checked)}
                            />
                            <Label htmlFor={`create-combo-promotion-${index}`} className="text-sm cursor-pointer">
                              Kích hoạt khuyến mại
                            </Label>
                          </div>
                        </div>
                      </div>
                    ))}
                    {comboFields.length === 0 && (
                      <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
                        <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm mb-4">Chưa có combo nào</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendCombo({ name: "", price: 0, quantity: 1, isActive: true })}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Thêm combo đầu tiên
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // Xóa tất cả ảnh đã upload khi hủy
                      if (createProductImageUrl) {
                        deleteImage(createProductImageUrl)
                      }
                      Object.values(createComboImageUrls).forEach(url => {
                        if (url) deleteImage(url)
                      })
                      setIsCreateOpen(false)
                      resetCreateForm({
                        isActive: true,
                        combos: [{ name: "", price: 0, quantity: 1, isActive: true }],
                      })
                      setCreateProductImageUrl(null)
                      setCreateComboImageUrls({})
                    }}
                    disabled={createMutation.isPending}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Tạo sản phẩm
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle>Danh sách sản phẩm</CardTitle>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo tên, mô tả hoặc danh mục..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Tất cả danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả danh mục</SelectItem>
                    {categories?.map?.((category) => (
                      <SelectItem key={category?.id} value={category?.id}>
                        {category?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="active">Hoạt động</SelectItem>
                    <SelectItem value="inactive">Không hoạt động</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                    <TableHead>Tên sản phẩm</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Combo</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts && filteredProducts.length > 0 ? (
                    filteredProducts?.map((product) => (
                    <TableRow key={product?.id}>
                      <TableCell className="font-medium">
                        <Link href={`/products/${product?.id}`} className="hover:underline">
                          {product?.name}
                        </Link>
                      </TableCell>
                      <TableCell>{product?.category?.name || "-"}</TableCell>
                      <TableCell>{product?.quantity || 0}</TableCell>
                      <TableCell>
                        {(() => {
                          const activeCombos = product?.combos?.filter((combo) => combo?.isActive) || []
                          return activeCombos.length > 0 ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-xs">
                                  {activeCombos.length} combo
                                  <ChevronDown className="ml-1 h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80" align="start">
                                <div className="space-y-2">
                                  <h4 className="font-medium text-sm mb-3">Danh sách combo ({activeCombos.length})</h4>
                                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {activeCombos.map((combo) => (
                                      <div
                                        key={combo?.id}
                                        className="p-2 border rounded-lg space-y-1"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-sm">{combo?.name}</span>
                                          {combo?.isPromotionActive && (
                                            <Badge variant="destructive" className="text-xs">
                                              🔥 Khuyến mại
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                          {combo?.promotionalPrice && combo?.isPromotionActive ? (
                                            <>
                                              <span className="line-through text-gray-400">
                                                {new Intl.NumberFormat("vi-VN", {
                                                  style: "currency",
                                                  currency: "VND",
                                                }).format(combo.price)}
                                              </span>
                                              <span className="font-bold text-gray-900">
                                                {new Intl.NumberFormat("vi-VN", {
                                                  style: "currency",
                                                  currency: "VND",
                                                }).format(combo.promotionalPrice)}
                                              </span>
                                            </>
                                          ) : (
                                            <span>
                                              Giá:{" "}
                                              {new Intl.NumberFormat("vi-VN", {
                                                style: "currency",
                                                currency: "VND",
                                              }).format(combo?.price || 0)}
                                            </span>
                                          )}
                                        </div>
                                        {combo?.quantity !== undefined && (
                                          <div className="text-xs text-gray-500">
                                            Số lượng: {combo.quantity} sản phẩm
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="text-gray-400">0 combo</span>
                          )
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product?.isActive ? "default" : "secondary"}>
                          {product?.isActive ? "Hoạt động" : "Không hoạt động"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {product?.createdAt ? new Date(product.createdAt).toLocaleDateString("vi-VN") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/products/${product?.id}`}>
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product?.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                          ? "Không tìm thấy sản phẩm nào"
                          : "Không có dữ liệu"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

