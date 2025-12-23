"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { inventoryProductsApi, InventoryProduct, CreateInventoryProductDto, UpdateInventoryProductDto } from "@/services/api/inventory-products"
import { categoriesApi } from "@/services/api/categories"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useForm } from "react-hook-form"
import { Plus, Pencil, Trash2, Loader2, Package, Search, ChevronLeft, ChevronRight, AlertTriangle, Filter } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"

export default function InventoryProductsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isItemsDialogOpen, setIsItemsDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null)
  const [itemsTab, setItemsTab] = useState<"all" | "valid" | "expired">("all")
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  // Temporary filter states for dialog
  const [tempCategoryFilter, setTempCategoryFilter] = useState<string>("all")
  const [tempStatusFilter, setTempStatusFilter] = useState<string>("all")
  const queryClient = useQueryClient()

  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ["inventory-products", page, pageSize, categoryFilter],
    queryFn: () => {
      const params: { page?: number; pageSize?: number; categoryId?: string } = {
        page,
        pageSize,
      }
      if (categoryFilter !== "all") {
        params.categoryId = categoryFilter
      }
      return inventoryProductsApi.getAll(params)
    },
  })

  // Extract products array and pagination meta from paginated or non-paginated response
  const { products, paginationMeta } = useMemo(() => {
    if (!productsResponse) return { products: undefined, paginationMeta: undefined }
    if (Array.isArray(productsResponse)) return { products: productsResponse, paginationMeta: undefined }
    if ('data' in productsResponse && Array.isArray(productsResponse.data)) {
      return {
        products: productsResponse.data,
        paginationMeta: 'meta' in productsResponse ? productsResponse.meta : undefined
      }
    }
    return { products: [], paginationMeta: undefined }
  }, [productsResponse])

  const { data: categoriesResponse } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.getAll(),
  })

  // Extract categories array from paginated or non-paginated response
  const categories = useMemo(() => {
    if (!categoriesResponse) return undefined
    if (Array.isArray(categoriesResponse)) return categoriesResponse
    if ('data' in categoriesResponse && Array.isArray(categoriesResponse.data)) {
      return categoriesResponse.data
    }
    return []
  }, [categoriesResponse])

  const createMutation = useMutation({
    mutationFn: inventoryProductsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] })
      setIsCreateOpen(false)
      resetCreateForm()
      toast.success("Tạo sản phẩm kho thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Tạo sản phẩm kho thất bại")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInventoryProductDto }) =>
      inventoryProductsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] })
      setEditingProduct(null)
      setIsEditOpen(false)
      resetEditForm()
      toast.success("Cập nhật sản phẩm kho thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Cập nhật thất bại")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: inventoryProductsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] })
      toast.success("Xóa sản phẩm kho thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Xóa sản phẩm kho thất bại")
    },
  })

  const { register: registerCreate, handleSubmit: handleSubmitCreate, reset: resetCreateForm, watch: watchCreate, setValue: setValueCreate, formState: { errors: createErrors } } = useForm<CreateInventoryProductDto>({
    defaultValues: {
      isActive: true,
    },
    mode: "onChange"
  })

  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEditForm, watch: watchEdit, setValue: setValueEdit, formState: { errors: editErrors } } = useForm<UpdateInventoryProductDto>({
    mode: "onChange"
  })

  const onSubmitCreate = (data: CreateInventoryProductDto) => {
    if (!data?.categoryId) {
      toast.error("Vui lòng chọn danh mục")
      return
    }
    createMutation.mutate(data)
  }

  const onSubmitEdit = (data: UpdateInventoryProductDto) => {
    if (editingProduct) {
      if (data?.categoryId === undefined || data?.categoryId === "") {
        toast.error("Vui lòng chọn danh mục")
        return
      }
      updateMutation.mutate({ id: editingProduct.id, data })
    }
  }

  const handleEdit = (product: InventoryProduct) => {
    setEditingProduct(product)
    resetEditForm({
      name: product?.name,
      description: product?.description || "",
      categoryId: product?.categoryId,
      isActive: product?.isActive,
    })
    setIsEditOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa sản phẩm kho này?")) {
      deleteMutation.mutate(id)
    }
  }

  const handleViewItems = (product: InventoryProduct, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSelectedProduct(product)
    setItemsTab("all") // Reset về tab "Tất cả" khi mở dialog mới
    setIsItemsDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN")
  }

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Filter products based on search query and status
  const filteredProducts = Array.isArray(products) ? products.filter((product) => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = (
        product?.name?.toLowerCase()?.includes(query) ||
        product?.description?.toLowerCase()?.includes(query) ||
        product?.category?.name?.toLowerCase()?.includes(query)
      )
      if (!matchesSearch) return false
    }
    
    // Filter by status (isActive)
    if (statusFilter !== "all") {
      if (statusFilter === "active" && !product?.isActive) return false
      if (statusFilter === "inactive" && product?.isActive) return false
    }
    
    return true
  }) : []

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle>Danh sách sản phẩm kho</CardTitle>
              <div className="flex items-center justify-end gap-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo tên, mô tả hoặc danh mục..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Sheet open={isFilterOpen} onOpenChange={(open) => {
                  setIsFilterOpen(open)
                  if (open) {
                    // Initialize temp filters when dialog opens
                    setTempCategoryFilter(categoryFilter)
                    setTempStatusFilter(statusFilter)
                  }
                }}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full md:w-auto">
                      <Filter className="mr-2 h-4 w-4" />
                      Bộ lọc
                      {(categoryFilter !== "all" || statusFilter !== "all") && (
                        <Badge variant="secondary" className="ml-2">
                          {[categoryFilter !== "all", statusFilter !== "all"].filter(Boolean).length}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-md">
                    <SheetHeader>
                      <SheetTitle>Bộ lọc</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-6 mt-6">
                      <div>
                        <Label htmlFor="filter-category" className="text-base font-semibold mb-2 block">Danh mục</Label>
                        <Select value={tempCategoryFilter} onValueChange={setTempCategoryFilter}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Chọn danh mục" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả danh mục</SelectItem>
                            {Array.isArray(categories) && categories.map((category) => (
                              <SelectItem key={category?.id} value={category?.id}>
                                {category?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="filter-status" className="text-base font-semibold mb-2 block">Trạng thái</Label>
                        <Select value={tempStatusFilter} onValueChange={setTempStatusFilter}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Chọn trạng thái" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="active">Hoạt động</SelectItem>
                            <SelectItem value="inactive">Không hoạt động</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-3 pt-4 border-t">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setTempCategoryFilter("all")
                            setTempStatusFilter("all")
                            setCategoryFilter("all")
                            setStatusFilter("all")
                            setPage(1) // Reset về trang đầu khi xóa filter
                            setIsFilterOpen(false)
                          }}
                        >
                          Xóa bộ lọc
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => {
                            setCategoryFilter(tempCategoryFilter)
                            setStatusFilter(tempStatusFilter)
                            setPage(1) // Reset về trang đầu khi áp dụng filter
                            setIsFilterOpen(false)
                          }}
                        >
                          Áp dụng
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Tạo sản phẩm kho mới
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader className="pb-4 border-b">
                      <DialogTitle className="text-xl font-semibold">Tạo sản phẩm kho mới</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmitCreate(onSubmitCreate)} className="space-y-5 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="create-name" className="text-sm font-medium">
                          Tên sản phẩm kho <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="create-name"
                          className="h-10"
                          {...registerCreate("name", { required: "Tên sản phẩm kho là bắt buộc" })}
                          placeholder="Nhập tên sản phẩm kho"
                        />
                        {createErrors.name && (
                          <p className="text-sm text-red-500 mt-1">{createErrors.name.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="create-description" className="text-sm font-medium">
                          Mô tả
                        </Label>
                        <Textarea
                          id="create-description"
                          {...registerCreate("description")}
                          rows={3}
                          placeholder="Mô tả sản phẩm kho"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="create-categoryId" className="text-sm font-medium">
                          Danh mục <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          onValueChange={(value) => setValueCreate("categoryId", value)}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Chọn danh mục" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(categories) && categories.map((category) => (
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

                      <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateOpen(false)}
                          disabled={createMutation.isPending}
                        >
                          Hủy
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                          {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Tạo sản phẩm kho
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
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên sản phẩm</TableHead>
                      <TableHead>Danh mục</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead>Số lượng còn hạn</TableHead>
                      <TableHead>Số lượng hết hạn</TableHead>
                      <TableHead>Tổng số lượng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts && filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => {
                        // Tính số lượng từ validItems và expiredItems
                        const validQuantity = product?.validItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
                        const expiredQuantity = product?.expiredItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
                        const totalQuantity = validQuantity + expiredQuantity
                        return (
                          <TableRow 
                            key={product?.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleViewItems(product)}
                          >
                            <TableCell className="font-medium">{product?.name}</TableCell>
                            <TableCell>{product?.category?.name || "-"}</TableCell>
                            <TableCell className="max-w-xs truncate">{product?.description || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="default" className="bg-green-500">
                                {validQuantity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive">
                                {expiredQuantity}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{totalQuantity}</TableCell>
                            <TableCell>
                              <Badge variant={product?.isActive ? "default" : "secondary"}>
                                {product?.isActive ? "Hoạt động" : "Không hoạt động"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {product?.createdAt ? new Date(product.createdAt).toLocaleDateString("vi-VN") : "-"}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEdit(product)
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(product?.id)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                            ? "Không tìm thấy sản phẩm kho nào phù hợp" 
                            : "Không có dữ liệu"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {/* Pagination Controls */}
                {paginationMeta && paginationMeta.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      Hiển thị {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, paginationMeta.total)} trong tổng số {paginationMeta.total} sản phẩm
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || isLoading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Trang {page} / {paginationMeta.totalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(paginationMeta.totalPages, p + 1))}
                        disabled={page >= paginationMeta.totalPages || isLoading}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Dialog hiển thị danh sách lô hàng */}
        <Dialog open={isItemsDialogOpen} onOpenChange={setIsItemsDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Danh sách lô hàng: {selectedProduct?.name}
              </DialogTitle>
            </DialogHeader>
            {selectedProduct ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-sm text-gray-500">Danh mục</Label>
                    <div className="mt-1 font-medium">
                      {selectedProduct.category?.name || "-"}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Tổng số lượng</Label>
                    <div className="mt-1 font-medium">
                      {(selectedProduct.validItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0) + 
                       (selectedProduct.expiredItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Số lượng còn hạn</Label>
                    <div className="mt-1">
                      <Badge variant="default" className="bg-green-500">
                        {selectedProduct.validItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Số lượng hết hạn</Label>
                    <div className="mt-1">
                      <Badge variant="destructive">
                        {selectedProduct.expiredItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                      </Badge>
                    </div>
                  </div>
                  {selectedProduct.description && (
                    <div className="col-span-2">
                      <Label className="text-sm text-gray-500">Mô tả</Label>
                      <div className="mt-1">{selectedProduct.description}</div>
                    </div>
                  )}
                </div>

                {/* Tabs để chuyển đổi giữa các chế độ */}
                <Tabs value={itemsTab} onValueChange={(v) => setItemsTab(v as "all" | "valid" | "expired")}>
                  <TabsList>
                    <TabsTrigger value="all">
                      Tất cả ({((selectedProduct.validItems?.length || 0) + (selectedProduct.expiredItems?.length || 0))})
                    </TabsTrigger>
                    <TabsTrigger value="valid">
                      Còn hạn ({selectedProduct.validItems?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="expired">
                      Hết hạn ({selectedProduct.expiredItems?.length || 0})
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab: Tất cả */}
                  <TabsContent value="all" className="mt-4">
                    {((selectedProduct.validItems && selectedProduct.validItems.length > 0) || 
                      (selectedProduct.expiredItems && selectedProduct.expiredItems.length > 0)) ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>STT</TableHead>
                            <TableHead>Số lượng</TableHead>
                            <TableHead>Ngày hết hạn</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Mã session</TableHead>
                            <TableHead>Người nhập</TableHead>
                            <TableHead>Ngày nhập</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            ...(selectedProduct.validItems || []).map(item => ({ ...item, isExpired: false })),
                            ...(selectedProduct.expiredItems || []).map(item => ({ ...item, isExpired: true }))
                          ].map((item, index) => {
                            const daysUntilExpiry = item.expiryDate ? getDaysUntilExpiry(item.expiryDate) : null
                            return (
                              <TableRow key={item.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="font-medium">{item.quantity}</TableCell>
                                <TableCell>
                                  {item.expiryDate ? formatDate(item.expiryDate) : "-"}
                                </TableCell>
                                <TableCell>
                                  {item.isExpired ? (
                                    <Badge variant="destructive">Hết hạn</Badge>
                                  ) : daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry >= 0 ? (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      {daysUntilExpiry} ngày
                                    </Badge>
                                  ) : (
                                    <Badge variant="default" className="bg-green-500">Còn hạn</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {item.sessionCode}
                                  </Badge>
                                </TableCell>
                                <TableCell>{item.importedBy?.name || "-"}</TableCell>
                                <TableCell>{item.createdAt ? formatDate(item.createdAt) : "-"}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Không có lô hàng nào
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab: Còn hạn */}
                  <TabsContent value="valid" className="mt-4">
                    {selectedProduct.validItems && selectedProduct.validItems.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>STT</TableHead>
                            <TableHead>Số lượng</TableHead>
                            <TableHead>Ngày hết hạn</TableHead>
                            <TableHead>Mã session</TableHead>
                            <TableHead>Người nhập</TableHead>
                            <TableHead>Ngày nhập</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedProduct.validItems.map((item, index) => {
                            const daysUntilExpiry = item.expiryDate ? getDaysUntilExpiry(item.expiryDate) : null
                            return (
                              <TableRow key={item.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="font-medium">{item.quantity}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {item.expiryDate ? formatDate(item.expiryDate) : "-"}
                                    {daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry >= 0 && (
                                      <Badge variant="destructive" className="text-xs">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {daysUntilExpiry} ngày
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {item.sessionCode}
                                  </Badge>
                                </TableCell>
                                <TableCell>{item.importedBy?.name || "-"}</TableCell>
                                <TableCell>{item.createdAt ? formatDate(item.createdAt) : "-"}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Không có lô hàng còn hạn
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab: Hết hạn */}
                  <TabsContent value="expired" className="mt-4">
                    {selectedProduct.expiredItems && selectedProduct.expiredItems.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>STT</TableHead>
                            <TableHead>Số lượng</TableHead>
                            <TableHead>Ngày hết hạn</TableHead>
                            <TableHead>Mã session</TableHead>
                            <TableHead>Người nhập</TableHead>
                            <TableHead>Ngày nhập</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedProduct.expiredItems.map((item, index) => {
                            const daysUntilExpiry = item.expiryDate ? getDaysUntilExpiry(item.expiryDate) : null
                            return (
                              <TableRow key={item.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="font-medium">{item.quantity}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {item.expiryDate ? formatDate(item.expiryDate) : "-"}
                                    {daysUntilExpiry !== null && daysUntilExpiry < 0 && (
                                      <Badge variant="destructive">Đã hết hạn</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {item.sessionCode}
                                  </Badge>
                                </TableCell>
                                <TableCell>{item.importedBy?.name || "-"}</TableCell>
                                <TableCell>{item.createdAt ? formatDate(item.createdAt) : "-"}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Không có lô hàng hết hạn
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Không tìm thấy thông tin sản phẩm
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        {editingProduct && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader className="pb-4 border-b">
                <DialogTitle className="text-xl font-semibold">Cập nhật sản phẩm kho</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitEdit(onSubmitEdit)} className="space-y-5 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-sm font-medium">
                    Tên sản phẩm kho <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    className="h-10"
                    {...registerEdit("name", { required: "Tên sản phẩm kho là bắt buộc" })}
                    placeholder="Nhập tên sản phẩm kho"
                  />
                  {editErrors.name && (
                    <p className="text-sm text-red-500 mt-1">{editErrors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description" className="text-sm font-medium">
                    Mô tả
                  </Label>
                  <Textarea
                    id="edit-description"
                    {...registerEdit("description")}
                    rows={3}
                    placeholder="Mô tả sản phẩm kho"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-categoryId" className="text-sm font-medium">
                    Danh mục <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={watchEdit("categoryId") || ""}
                    onValueChange={(value) => setValueEdit("categoryId", value)}
                  >
                    <SelectTrigger className="h-10">
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

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditOpen(false)}
                    disabled={updateMutation.isPending}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cập nhật
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  )
}

