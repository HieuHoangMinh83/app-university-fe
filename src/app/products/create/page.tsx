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
import { Loader2, Plus, Trash2, ArrowLeft, Package } from "lucide-react"
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
      combos: [{ name: "", price: 0, quantity: 1, isActive: true }],
    },
    mode: "onChange"
  })

  // Format number with thousand separators for display
  const formatNumberInput = (value: string) => {
    // Remove all non-digit characters
    const numbers = value.replace(/\D/g, '')
    // Add thousand separators
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  // Parse formatted number back to number
  const parseFormattedNumber = (value: string) => {
    return parseInt(value.replace(/\./g, '')) || 0
  }

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

    // Remove quantity from product data (only combos have quantity)
    const { quantity, ...productData } = data
    createMutation.mutate(productData)
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
                <Label htmlFor="name">Tên sản phẩm <span className="text-red-500">*</span></Label>
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
                <Label htmlFor="categoryId">Danh mục <span className="text-red-500">*</span></Label>
                <Select
                  onValueChange={(value) => setValue("categoryId", value)}
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
                {errors.categoryId && (
                  <p className="text-sm text-red-500 mt-1">{errors.categoryId.message}</p>
                )}
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Combos</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: "", price: 0, quantity: 1, isActive: true })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm combo
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-12 md:col-span-4">
                      <Label className="text-sm font-medium">
                        Tên combo <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        className="mt-1.5"
                        placeholder="Nhập tên combo"
                        {...register(`combos.${index}.name`, { required: "Tên combo là bắt buộc" })}
                      />
                      {errors.combos?.[index]?.name && (
                        <p className="text-xs text-red-500 mt-1">{errors.combos[index]?.name?.message}</p>
                      )}
                    </div>
                    <div className="col-span-12 md:col-span-3">
                      <Label className="text-sm font-medium">
                        Giá (VND) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        className="mt-1.5"
                        placeholder="0"
                        value={watch(`combos.${index}.price`) ? formatNumberInput(watch(`combos.${index}.price`).toString()) : ''}
                        onChange={(e) => {
                          const formatted = formatNumberInput(e.target.value)
                          const parsed = parseFormattedNumber(formatted)
                          setValue(`combos.${index}.price`, parsed, { shouldValidate: true })
                        }}
                        onBlur={(e) => {
                          const parsed = parseFormattedNumber(e.target.value)
                          if (parsed > 0) {
                            setValue(`combos.${index}.price`, parsed, { shouldValidate: true })
                          }
                        }}
                      />
                      {errors.combos?.[index]?.price && (
                        <p className="text-xs text-red-500 mt-1">{errors.combos[index]?.price?.message}</p>
                      )}
                    </div>
                    <div className="col-span-12 md:col-span-2">
                      <Label className="text-sm font-medium">Số lượng</Label>
                      <Input
                        className="mt-1.5"
                        type="number"
                        placeholder="1"
                        {...register(`combos.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-2 flex items-center gap-3">
                      <div className="flex items-center space-x-2 pt-7">
                        <Switch
                          id={`combo-active-${index}`}
                          checked={watch(`combos.${index}.isActive`)}
                          onCheckedChange={(checked) => setValue(`combos.${index}.isActive`, checked)}
                        />
                        <Label htmlFor={`combo-active-${index}`} className="text-sm cursor-pointer">
                          Kích hoạt
                        </Label>
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-1 flex justify-end md:justify-start pt-7">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="h-8 w-8 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {fields.length === 0 && (
                <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm mb-4">Chưa có combo nào</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: "", price: 0, quantity: 1, isActive: true })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm combo đầu tiên
                  </Button>
                </div>
              )}
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

