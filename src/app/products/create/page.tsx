"use client"

import { useState } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { productsApi, CreateProductDto } from "@/services/api/products"
import { categoriesApi } from "@/services/api/categories"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useForm, useFieldArray } from "react-hook-form"
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function CreateProductPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.getAll,
  })

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<CreateProductDto>({
    defaultValues: {
      isActive: true,
      quantity: 0,
      combos: [{ name: "", price: 0, quantity: 1, isActive: true }],
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "combos",
  })

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success("Tạo sản phẩm thành công")
      router.push("/products")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Tạo sản phẩm thất bại")
    },
  })

  const onSubmit = (data: CreateProductDto) => {
    // Validate combos
    if (!data?.combos || data?.combos?.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 combo")
      return
    }

    createMutation.mutate(data)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Tạo sản phẩm mới</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin sản phẩm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Tên sản phẩm *</Label>
                <Input
                  id="name"
                  {...register("name", { required: "Tên sản phẩm là bắt buộc" })}
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
                <Label htmlFor="categoryId">Danh mục</Label>
                <Select
                  onValueChange={(value) => setValue("categoryId", value)}
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
                <Label htmlFor="quantity">Số lượng</Label>
                <Input
                  id="quantity"
                  type="number"
                  {...register("quantity", { valueAsNumber: true, min: 0 })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={watch("isActive")}
                  onCheckedChange={(checked) => setValue("isActive", checked)}
                />
                <Label htmlFor="isActive">Kích hoạt</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Combos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Combo {index + 1}</h3>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tên combo *</Label>
                      <Input
                        {...register(`combos.${index}.name`, { required: "Tên combo là bắt buộc" })}
                      />
                    </div>
                    <div>
                      <Label>Giá (VND) *</Label>
                      <Input
                        type="number"
                        {...register(`combos.${index}.price`, { 
                          required: "Giá là bắt buộc",
                          valueAsNumber: true,
                          min: { value: 1, message: "Giá phải lớn hơn 0" }
                        })}
                      />
                    </div>
                    <div>
                      <Label>Số lượng</Label>
                      <Input
                        type="number"
                        {...register(`combos.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        checked={watch(`combos.${index}.isActive`)}
                        onCheckedChange={(checked) => setValue(`combos.${index}.isActive`, checked)}
                      />
                      <Label>Kích hoạt</Label>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => append({ name: "", price: 0, quantity: 1, isActive: true })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm combo
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href="/products">
              <Button type="button" variant="outline">Hủy</Button>
            </Link>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo sản phẩm
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

