"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { vouchersApi, Voucher, CreateVoucherDto, VoucherType } from "@/services/api/vouchers"
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
import { useForm } from "react-hook-form"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"

export default function VouchersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)
  const queryClient = useQueryClient()

  const { data: vouchers, isLoading } = useQuery({
    queryKey: ["vouchers"],
    queryFn: vouchersApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: vouchersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] })
      setIsCreateOpen(false)
      toast.success("Tạo voucher thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Tạo voucher thất bại")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateVoucherDto }) =>
      vouchersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] })
      setEditingVoucher(null)
      toast.success("Cập nhật voucher thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Cập nhật voucher thất bại")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: vouchersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] })
      toast.success("Xóa voucher thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Xóa voucher thất bại")
    },
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CreateVoucherDto>({
    defaultValues: {
      type: "FIXED",
      isActive: true,
      isRedeemable: true,
      quantity: 0,
    }
  })

  const voucherType = watch("type")

  const onSubmit = (data: CreateVoucherDto) => {
    if (editingVoucher) {
      updateMutation.mutate({ id: editingVoucher.id, data })
    } else {
      createMutation.mutate(data)
    }
    reset()
  }

  const handleEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher)
    reset({
      name: voucher?.name,
      description: voucher?.description || "",
      type: voucher?.type,
      price: voucher?.price || undefined,
      percent: voucher?.percent || undefined,
      maxPrice: voucher?.maxPrice || undefined,
      minApply: voucher?.minApply || undefined,
      quantity: voucher?.quantity,
      pointsRequired: voucher?.pointsRequired || undefined,
      isRedeemable: voucher?.isRedeemable,
      isActive: voucher?.isActive,
    })
  }

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa voucher này?")) {
      deleteMutation.mutate(id)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Quản lý Vouchers</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tạo voucher mới
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tạo voucher mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Tên voucher *</Label>
                  <Input
                    id="name"
                    {...register("name", { required: "Tên voucher là bắt buộc" })}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="type">Loại voucher *</Label>
                  <Select
                    value={voucherType}
                    onValueChange={(value: VoucherType) => setValue("type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">Giảm giá cố định</SelectItem>
                      <SelectItem value="PERCENT">Giảm giá theo %</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {voucherType === "FIXED" ? (
                  <div>
                    <Label htmlFor="price">Giá giảm (VND) *</Label>
                    <Input
                      id="price"
                      type="number"
                      {...register("price", { 
                        required: "Giá giảm là bắt buộc",
                        valueAsNumber: true,
                        min: { value: 1, message: "Giá giảm phải lớn hơn 0" }
                      })}
                    />
                    {errors.price && (
                      <p className="text-sm text-red-500 mt-1">{errors.price.message}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="percent">Phần trăm giảm (%) *</Label>
                      <Input
                        id="percent"
                        type="number"
                        {...register("percent", { 
                          required: "Phần trăm giảm là bắt buộc",
                          valueAsNumber: true,
                          min: { value: 1, message: "Phần trăm phải từ 1-100" },
                          max: { value: 100, message: "Phần trăm không được vượt quá 100" }
                        })}
                      />
                      {errors.percent && (
                        <p className="text-sm text-red-500 mt-1">{errors.percent.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="maxPrice">Giảm tối đa (VND)</Label>
                      <Input
                        id="maxPrice"
                        type="number"
                        {...register("maxPrice", { valueAsNumber: true })}
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="minApply">Giá trị đơn hàng tối thiểu (VND)</Label>
                  <Input
                    id="minApply"
                    type="number"
                    {...register("minApply", { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Label htmlFor="quantity">Số lượng</Label>
                  <Input
                    id="quantity"
                    type="number"
                    {...register("quantity", { valueAsNumber: true, min: 0 })}
                  />
                </div>

                <div>
                  <Label htmlFor="pointsRequired">Điểm cần để đổi</Label>
                  <Input
                    id="pointsRequired"
                    type="number"
                    {...register("pointsRequired", { valueAsNumber: true, min: 0 })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isRedeemable"
                    checked={watch("isRedeemable")}
                    onCheckedChange={(checked) => setValue("isRedeemable", checked)}
                  />
                  <Label htmlFor="isRedeemable">Cho phép đổi điểm</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={watch("isActive")}
                    onCheckedChange={(checked) => setValue("isActive", checked)}
                  />
                  <Label htmlFor="isActive">Kích hoạt</Label>
                </div>

                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Tạo
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách vouchers</CardTitle>
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
                    <TableHead>Tên</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Giá trị</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Đã dùng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vouchers?.length > 0 ? (
                    vouchers?.map((voucher) => (
                    <TableRow key={voucher?.id}>
                      <TableCell className="font-medium">{voucher?.name}</TableCell>
                      <TableCell>
                        <Badge variant={voucher?.type === "FIXED" ? "default" : "secondary"}>
                          {voucher?.type === "FIXED" ? "Cố định" : "Phần trăm"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {voucher?.type === "FIXED" 
                          ? formatPrice(voucher?.price || 0)
                          : `${voucher?.percent}%${voucher?.maxPrice ? ` (tối đa ${formatPrice(voucher.maxPrice)})` : ""}`
                        }
                      </TableCell>
                      <TableCell>{voucher?.quantity}</TableCell>
                      <TableCell>{voucher?._count?.orders || 0}</TableCell>
                      <TableCell>
                        <Badge variant={voucher?.isActive ? "default" : "secondary"}>
                          {voucher?.isActive ? "Hoạt động" : "Không hoạt động"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(voucher)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(voucher?.id)}
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
                        Không có dữ liệu
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        {editingVoucher && (
          <Dialog open={!!editingVoucher} onOpenChange={() => setEditingVoucher(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cập nhật voucher</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Tên voucher *</Label>
                  <Input
                    id="edit-name"
                    {...register("name", { required: "Tên voucher là bắt buộc" })}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="edit-description">Mô tả</Label>
                  <Textarea
                    id="edit-description"
                    {...register("description")}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-type">Loại voucher *</Label>
                  <Select
                    value={voucherType}
                    onValueChange={(value: VoucherType) => setValue("type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FIXED">Giảm giá cố định</SelectItem>
                      <SelectItem value="PERCENT">Giảm giá theo %</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {voucherType === "FIXED" ? (
                  <div>
                    <Label htmlFor="edit-price">Giá giảm (VND) *</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      {...register("price", { 
                        required: "Giá giảm là bắt buộc",
                        valueAsNumber: true,
                        min: { value: 1, message: "Giá giảm phải lớn hơn 0" }
                      })}
                    />
                    {errors.price && (
                      <p className="text-sm text-red-500 mt-1">{errors.price.message}</p>
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="edit-percent">Phần trăm giảm (%) *</Label>
                      <Input
                        id="edit-percent"
                        type="number"
                        {...register("percent", { 
                          required: "Phần trăm giảm là bắt buộc",
                          valueAsNumber: true,
                          min: { value: 1, message: "Phần trăm phải từ 1-100" },
                          max: { value: 100, message: "Phần trăm không được vượt quá 100" }
                        })}
                      />
                      {errors.percent && (
                        <p className="text-sm text-red-500 mt-1">{errors.percent.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="edit-maxPrice">Giảm tối đa (VND)</Label>
                      <Input
                        id="edit-maxPrice"
                        type="number"
                        {...register("maxPrice", { valueAsNumber: true })}
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="edit-minApply">Giá trị đơn hàng tối thiểu (VND)</Label>
                  <Input
                    id="edit-minApply"
                    type="number"
                    {...register("minApply", { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-quantity">Số lượng</Label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    {...register("quantity", { valueAsNumber: true, min: 0 })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-pointsRequired">Điểm cần để đổi</Label>
                  <Input
                    id="edit-pointsRequired"
                    type="number"
                    {...register("pointsRequired", { valueAsNumber: true, min: 0 })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isRedeemable"
                    checked={watch("isRedeemable")}
                    onCheckedChange={(checked) => setValue("isRedeemable", checked)}
                  />
                  <Label htmlFor="edit-isRedeemable">Cho phép đổi điểm</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isActive"
                    checked={watch("isActive")}
                    onCheckedChange={(checked) => setValue("isActive", checked)}
                  />
                  <Label htmlFor="edit-isActive">Kích hoạt</Label>
                </div>

                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cập nhật
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  )
}

