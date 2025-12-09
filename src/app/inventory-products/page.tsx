"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { inventoryProductsApi, InventoryProduct, CreateInventoryProductDto, UpdateInventoryProductDto } from "@/services/api/inventory-products"
import { categoriesApi } from "@/services/api/categories"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useForm } from "react-hook-form"
import { Plus, Pencil, Trash2, Loader2, Package, Search } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"

export default function InventoryProductsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const queryClient = useQueryClient()

  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ["inventory-products"],
    queryFn: () => inventoryProductsApi.getAll(),
  })

  // Extract products array from paginated or non-paginated response
  const products = useMemo(() => {
    if (!productsResponse) return undefined
    if (Array.isArray(productsResponse)) return productsResponse
    if ('data' in productsResponse && Array.isArray(productsResponse.data)) {
      return productsResponse.data
    }
    return []
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

  // Filter products based on search query
  const filteredProducts = Array.isArray(products) ? products.filter((product) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      product?.name?.toLowerCase()?.includes(query) ||
      product?.description?.toLowerCase()?.includes(query) ||
      product?.category?.name?.toLowerCase()?.includes(query)
    )
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên sản phẩm</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts && filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <TableRow key={product?.id}>
                        <TableCell className="font-medium">{product?.name}</TableCell>
                        <TableCell>{product?.category?.name || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">{product?.description || "-"}</TableCell>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(product)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
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
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {searchQuery ? "Không tìm thấy sản phẩm kho nào" : "Không có dữ liệu"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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

