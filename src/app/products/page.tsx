"use client"

import { useState, useRef, useMemo } from "react"
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
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, Loader2, Package, Search, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"
import { deleteImage, uploadImage } from "@/lib/supabase"

export default function ProductsPage() {
  const router = useRouter()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const queryClient = useQueryClient()

  const [createProductImageUrl, setCreateProductImageUrl] = useState<string | null>(null)

  interface CreateProductSimpleDto {
    name: string
    description?: string
    categoryId?: string
    isActive?: boolean
    spinCount?: number
    image?: string
  }

  const { register: registerCreate, handleSubmit: handleSubmitCreate, watch: watchCreate, setValue: setValueCreate, reset: resetCreateForm, formState: { errors: createErrors } } = useForm<CreateProductSimpleDto>({
    defaultValues: {
      isActive: true,
    },
    mode: "onChange"
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateProductSimpleDto) => {
      // Tạo sản phẩm với một combo tạm thời (API yêu cầu ít nhất 1 combo)
      // Combo này sẽ được xóa và thay thế khi user thêm combo thực sự từ trang detail
      // Tạm thời tạo combo với 1 item giả để đáp ứng yêu cầu API
      const productData: CreateProductDto = {
        ...data,
        categoryId: data.categoryId || "",
        combos: [{
          name: "Combo tạm thời - Vui lòng cập nhật",
          price: 0,
          isActive: false,
          items: [] // API có thể reject nếu items rỗng, nhưng để user thêm combo sau
        }]
      }
      return productsApi.create(productData)
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      setIsCreateOpen(false)
      resetCreateForm({
        isActive: true,
      })
      // Xóa ảnh đã upload nếu tạo thành công
      if (createProductImageUrl) {
        deleteImage(createProductImageUrl)
      }
      setCreateProductImageUrl(null)
      toast.success("Tạo sản phẩm thành công. Vui lòng thêm combo.")
      // Redirect đến trang detail để thêm combo với query param để tự động mở dialog
      if (product?.id) {
        router.push(`/products/${product.id}?addCombo=true`)
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Tạo sản phẩm thất bại")
      // Xóa ảnh đã upload nếu tạo thất bại
      if (createProductImageUrl) {
        deleteImage(createProductImageUrl)
        setCreateProductImageUrl(null)
      }
    },
  })

  const onSubmitCreate = (data: CreateProductSimpleDto) => {
    // Validate category
    if (!data?.categoryId) {
      toast.error("Vui lòng chọn danh mục")
      return
    }

    createMutation.mutate(data)
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
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return []
    
    return products.filter((product) => {
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
  }, [products, searchQuery, categoryFilter, statusFilter])

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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={watchCreate("isActive")}
                      onCheckedChange={(checked) => setValueCreate("isActive", checked)}
                    />
                    <Label>Kích hoạt sản phẩm</Label>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Lưu ý:</strong> Sau khi tạo sản phẩm, bạn sẽ được chuyển đến trang chi tiết để thêm combo và sản phẩm trong kho.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // Xóa ảnh đã upload khi hủy
                      if (createProductImageUrl) {
                        deleteImage(createProductImageUrl)
                      }
                      setIsCreateOpen(false)
                      resetCreateForm({
                        isActive: true,
                      })
                      setCreateProductImageUrl(null)
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
                    <TableHead>Tổng sản phẩm</TableHead>
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
                      <TableCell>
                        {(() => {
                          const totalItems = product?.combos?.reduce((sum, combo) => {
                            return sum + (combo?.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0)
                          }, 0) || 0
                          return totalItems
                        })()}
                      </TableCell>
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
                              <PopoverContent className="w-96" align="start">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between pb-2 border-b">
                                    <h4 className="font-semibold text-base">Danh sách combo</h4>
                                    <Badge variant="secondary" className="text-xs font-semibold">
                                      {activeCombos.length} combo
                                    </Badge>
                                  </div>
                                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                                    {activeCombos.map((combo) => {
                                      const mainProducts = combo?.items?.filter(item => !item.isGift) || []
                                      const giftProducts = combo?.items?.filter(item => item.isGift) || []
                                      
                                      return (
                                        <div
                                          key={combo?.id}
                                          className="group relative p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50"
                                        >
                                          {/* Promotion Badge */}
                                          {combo?.isPromotionActive && (
                                            <div className="absolute top-2 right-2">
                                              <Badge variant="destructive" className="text-[10px] px-2 py-0.5 font-semibold animate-pulse">
                                                🔥 Khuyến mãi
                                              </Badge>
                                            </div>
                                          )}

                                          {/* Combo Name */}
                                          <div className="pr-16 mb-3">
                                            <h5 className="font-bold text-sm text-gray-900 line-clamp-2 leading-tight">
                                              {combo?.name}
                                            </h5>
                                          </div>

                                          {/* Price Section */}
                                          <div className="mb-3 p-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                                            {combo?.promotionalPrice && combo?.isPromotionActive ? (
                                              <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-xs text-gray-500 line-through">
                                                    {new Intl.NumberFormat("vi-VN", {
                                                      style: "currency",
                                                      currency: "VND",
                                                    }).format(combo.price)}
                                                  </span>
                                                  <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-bold">
                                                    -{Math.round(((combo.price - combo.promotionalPrice) / combo.price) * 100)}%
                                                  </Badge>
                                                </div>
                                                <div className="text-lg font-bold text-red-600">
                                                  {new Intl.NumberFormat("vi-VN", {
                                                    style: "currency",
                                                    currency: "VND",
                                                  }).format(combo.promotionalPrice)}
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="text-lg font-bold text-gray-900">
                                                {new Intl.NumberFormat("vi-VN", {
                                                  style: "currency",
                                                  currency: "VND",
                                                }).format(combo?.price || 0)}
                                              </div>
                                            )}
                                          </div>

                                          {/* Products List */}
                                          {combo?.items && combo.items.length > 0 && (
                                            <div className="space-y-2 pt-2 border-t border-gray-200">
                                              {mainProducts.length > 0 && (
                                                <div className="space-y-1.5">
                                                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                                    Sản phẩm chính:
                                                  </p>
                                                  <div className="space-y-1">
                                                    {mainProducts.map((item, idx) => (
                                                      <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                                        <span className="font-medium flex-1">{item.inventoryProduct?.name}</span>
                                                        <span className="text-gray-500">x{item.quantity}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                              
                                              {giftProducts.length > 0 && (
                                                <div className="space-y-1.5 pt-2 border-t border-gray-200">
                                                  <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">
                                                    Tặng kèm:
                                                  </p>
                                                  <div className="space-y-1">
                                                    {giftProducts.map((item, idx) => (
                                                      <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                                                        <span className="font-medium flex-1">{item.inventoryProduct?.name}</span>
                                                        <span className="text-gray-500">x{item.quantity}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {/* Promotion Dates */}
                                          {(combo?.promotionStart || combo?.promotionEnd) && (
                                            <div className="mt-2 pt-2 border-t border-gray-200">
                                              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                                                {combo?.promotionStart && (
                                                  <div>
                                                    <span className="font-semibold">Bắt đầu:</span>{" "}
                                                    {new Date(combo.promotionStart).toLocaleDateString("vi-VN")}
                                                  </div>
                                                )}
                                                {combo?.promotionEnd && (
                                                  <div>
                                                    <span className="font-semibold">Kết thúc:</span>{" "}
                                                    {new Date(combo.promotionEnd).toLocaleDateString("vi-VN")}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
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

