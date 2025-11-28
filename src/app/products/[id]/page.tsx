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
import { ArrowLeft, Pencil, Trash2, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddComboOpen, setIsAddComboOpen] = useState(false)
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

  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, watch: watchEdit, setValue: setValueEdit } = useForm<UpdateProductDto>()
  const { register: registerCombo, handleSubmit: handleSubmitCombo, reset: resetCombo } = useForm<CreateComboDto>({
    defaultValues: {
      isActive: true,
      quantity: 1,
    }
  })

  const handleEdit = () => {
    if (product) {
      resetEdit({
        name: product?.name,
        description: product?.description || "",
        categoryId: product?.categoryId || "",
        isActive: product?.isActive,
        quantity: product?.quantity,
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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/products">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{product?.name}</h1>
              <p className="text-sm text-gray-500">{product?.category?.name || "Không có danh mục"}</p>
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

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList>
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="combos">Combos</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin sản phẩm</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Tên sản phẩm</p>
                  <p className="font-medium">{product?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Mô tả</p>
                  <p className="font-medium">{product?.description || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Danh mục</p>
                  <p className="font-medium">{product?.category?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Số lượng</p>
                  <p className="font-medium">{product?.quantity}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Trạng thái</p>
                  <Badge variant={product?.isActive ? "default" : "secondary"}>
                    {product?.isActive ? "Hoạt động" : "Không hoạt động"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ngày tạo</p>
                  <p className="font-medium">
                    {product?.createdAt ? new Date(product.createdAt).toLocaleDateString("vi-VN") : "-"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="combos" className="space-y-4">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Danh sách Combos</CardTitle>
                <Dialog open={isAddComboOpen} onOpenChange={setIsAddComboOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Thêm combo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Thêm combo mới</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmitCombo((data) => {
                      addComboMutation.mutate(data)
                      resetCombo()
                    })} className="space-y-4">
                      <div>
                        <Label htmlFor="combo-name">Tên combo *</Label>
                        <Input
                          id="combo-name"
                          {...registerCombo("name", { required: "Tên combo là bắt buộc" })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="combo-price">Giá (VND) *</Label>
                        <Input
                          id="combo-price"
                          type="number"
                          {...registerCombo("price", { 
                            required: "Giá là bắt buộc",
                            valueAsNumber: true,
                            min: { value: 1 }
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="combo-quantity">Số lượng</Label>
                        <Input
                          id="combo-quantity"
                          type="number"
                          {...registerCombo("quantity", { valueAsNumber: true, min: 1 })}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          {...registerCombo("isActive")}
                          defaultChecked={true}
                        />
                        <Label>Kích hoạt</Label>
                      </div>
                      <Button type="submit" disabled={addComboMutation.isPending}>
                        {addComboMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Thêm
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên combo</TableHead>
                      <TableHead>Giá</TableHead>
                      <TableHead>Giá khuyến mại</TableHead>
                      <TableHead>Số lượng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product?.combos?.length > 0 ? (
                      product?.combos?.map((combo) => (
                      <TableRow key={combo?.id}>
                        <TableCell className="font-medium">{combo?.name}</TableCell>
                        <TableCell>{combo?.price ? formatPrice(combo.price) : "-"}</TableCell>
                        <TableCell>
                          {combo?.promotionalPrice && combo?.isPromotionActive ? (
                            <span className="text-red-500">{formatPrice(combo.promotionalPrice)}</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{combo?.quantity}</TableCell>
                        <TableCell>
                          <Badge variant={combo?.isActive ? "default" : "secondary"}>
                            {combo?.isActive ? "Hoạt động" : "Không hoạt động"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCombo(combo?.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          Không có combo nào
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cập nhật sản phẩm</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitEdit((data) => {
              updateMutation.mutate(data)
            })} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Tên sản phẩm *</Label>
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
                <Label htmlFor="edit-categoryId">Danh mục</Label>
                <Select
                  value={watchEdit("categoryId") || ""}
                  onValueChange={(value) => setValueEdit("categoryId", value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Không có danh mục</SelectItem>
                    {categories?.map?.((category) => (
                      <SelectItem key={category?.id} value={category?.id}>
                        {category?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-quantity">Số lượng</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  {...registerEdit("quantity", { valueAsNumber: true, min: 0 })}
                />
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

