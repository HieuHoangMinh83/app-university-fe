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
import { Plus, Pencil, Loader2, Search, Filter, X } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"

export default function VouchersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isActiveFilter, setIsActiveFilter] = useState<string>("all")
  const [isRedeemableFilter, setIsRedeemableFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const queryClient = useQueryClient()
  
  // State for number input values
  const [numberInputValues, setNumberInputValues] = useState<{
    price?: string
    percent?: string
    maxPrice?: string
    minApply?: string
    quantity?: string
    pointsRequired?: string
  }>({})

  const { data: vouchersData, isLoading } = useQuery({
    queryKey: ["vouchers"],
    queryFn: () => vouchersApi.getAll(),
  })

  // Extract vouchers array from response (handle both array and paginated response)
  const vouchers = Array.isArray(vouchersData) 
    ? vouchersData 
    : (vouchersData?.data || [])

  // Filter vouchers based on active tab
  const filteredVouchers = vouchers?.filter((voucher: Voucher) => {
    if (activeTab === "all") return true
    return voucher?.type === activeTab
  }) || []

  const createMutation = useMutation({
    mutationFn: vouchersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] })
      setIsCreateOpen(false)
      reset()
      setNumberInputValues({})
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
      reset()
      setNumberInputValues({})
      toast.success("Cập nhật voucher thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Cập nhật voucher thất bại")
    },
  })


  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CreateVoucherDto>({
    defaultValues: {
      type: "FIXED",
      isActive: true,
      isRedeemable: false,
      hasMaxPrice: false,
      quantity: 0,
      minApply: 0,
      price: 0,
    }
  })

  const voucherType = watch("type")
  const isRedeemable = watch("isRedeemable")
  const hasMaxPrice = watch("hasMaxPrice")

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
      price: voucher?.price != null ? voucher.price : 0,
      percent: voucher?.percent || undefined,
      maxPrice: voucher?.maxPrice || undefined,
      hasMaxPrice: voucher?.hasMaxPrice != null ? voucher.hasMaxPrice : false,
      minApply: voucher?.minApply != null ? voucher.minApply : 0,
      quantity: voucher?.quantity != null ? voucher.quantity : 0,
      pointsRequired: voucher?.pointsRequired || undefined,
      isRedeemable: voucher?.isRedeemable != null ? voucher.isRedeemable : false,
      isActive: voucher?.isActive,
    })
    // Reset number input values when editing
    setNumberInputValues({})
  }


  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price)
  }

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader className=" text-center">
            <CardTitle>Danh sách vouchers</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Toolbar: Search + Select + Create + Filter */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-wrap items-center gap-4 justify-end">
                {/* Search */}
                <div className="relative min-w-[200px] max-w-[300px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm voucher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 h-9"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Select Type */}
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Loại voucher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="PERCENT">Phần trăm</SelectItem>
                    <SelectItem value="FIXED">Cố định</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filter Button */}
                <Button
                  variant={showFilters ? "default" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Bộ lọc
                </Button>

                {/* Create Button */}
                <Dialog open={isCreateOpen} onOpenChange={(open) => {
                  setIsCreateOpen(open)
                  if (!open) {
                    reset()
                    setNumberInputValues({})
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Tạo voucher mới
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tạo voucher mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Tên voucher <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    className="mt-2"
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
                    className="mt-2"
                    {...register("description")}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="type">Loại voucher <span className="text-red-500">*</span></Label>
                  <Select
                    value={voucherType}
                    onValueChange={(value: VoucherType) => setValue("type", value)}
                  >
                    <SelectTrigger className="mt-2">
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
                    <Label htmlFor="price">Giá giảm (VND) <span className="text-red-500">*</span></Label>
                    <Input
                      id="price"
                      type="text"
                      className="mt-2"
                      placeholder="0"
                      value={numberInputValues.price !== undefined ? formatNumberInput(numberInputValues.price) : (watch("price") != null && !isNaN(watch("price")!) ? formatNumberInput(watch("price")!.toString()) : "0")}
                      onChange={(e) => {
                        const formatted = formatNumberInput(e.target.value)
                        setNumberInputValues(prev => ({ ...prev, price: formatted.replace(/\./g, '') }))
                      }}
                      onBlur={(e) => {
                        const value = e.target.value
                        const parsed = parseFormattedNumber(value)
                        if (!value || parsed < 1 || isNaN(parsed)) {
                          setValue("price", 0, { shouldValidate: true })
                          setNumberInputValues(prev => {
                            const newValues = { ...prev }
                            delete newValues.price
                            return newValues
                          })
                        } else {
                          setValue("price", parsed, { shouldValidate: true })
                          setNumberInputValues(prev => {
                            const newValues = { ...prev }
                            delete newValues.price
                            return newValues
                          })
                        }
                      }}
                    />
                    <input
                      type="hidden"
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
                      <Label htmlFor="percent">Phần trăm giảm (%) <span className="text-red-500">*</span></Label>
                      <Input
                        id="percent"
                        type="text"
                        className="mt-2"
                        placeholder="0"
                        value={numberInputValues.percent !== undefined ? numberInputValues.percent : (watch("percent") != null && !isNaN(watch("percent")!) ? watch("percent")!.toString() : "")}
                        onChange={(e) => {
                          const value = e.target.value
                          const numbers = value.replace(/\D/g, '')
                          setNumberInputValues(prev => ({ ...prev, percent: numbers }))
                        }}
                        onBlur={(e) => {
                          const value = e.target.value
                          const numbers = value.replace(/\D/g, '')
                          const parsed = parseInt(numbers)
                          if (!numbers || !parsed || parsed < 1 || parsed > 100 || isNaN(parsed)) {
                            setValue("percent", undefined, { shouldValidate: true })
                            setNumberInputValues(prev => {
                              const newValues = { ...prev }
                              delete newValues.percent
                              return newValues
                            })
                          } else {
                            setValue("percent", parsed, { shouldValidate: true })
                            setNumberInputValues(prev => {
                              const newValues = { ...prev }
                              delete newValues.percent
                              return newValues
                            })
                          }
                        }}
                      />
                      <input
                        type="hidden"
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
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="hasMaxPrice"
                        checked={watch("hasMaxPrice") || false}
                        onCheckedChange={(checked) => {
                          setValue("hasMaxPrice", checked)
                          if (!checked) {
                            setValue("maxPrice", undefined)
                            setNumberInputValues(prev => {
                              const newValues = { ...prev }
                              delete newValues.maxPrice
                              return newValues
                            })
                          }
                        }}
                      />
                      <Label htmlFor="hasMaxPrice">Có giới hạn giảm tối đa</Label>
                    </div>
                    {hasMaxPrice && (
                      <div>
                        <Label htmlFor="maxPrice">Giảm tối đa (VND) <span className="text-red-500">*</span></Label>
                        <Input
                          id="maxPrice"
                          type="text"
                          className="mt-2"
                          placeholder="0"
                          value={numberInputValues.maxPrice !== undefined ? formatNumberInput(numberInputValues.maxPrice) : (watch("maxPrice") != null && !isNaN(watch("maxPrice")!) ? formatNumberInput(watch("maxPrice")!.toString()) : "")}
                          onChange={(e) => {
                            const formatted = formatNumberInput(e.target.value)
                            setNumberInputValues(prev => ({ ...prev, maxPrice: formatted.replace(/\./g, '') }))
                          }}
                          onBlur={(e) => {
                            const value = e.target.value
                            const parsed = parseFormattedNumber(value)
                            if (!value || parsed < 0 || isNaN(parsed)) {
                              setValue("maxPrice", undefined, { shouldValidate: true })
                              setNumberInputValues(prev => {
                                const newValues = { ...prev }
                                delete newValues.maxPrice
                                return newValues
                              })
                            } else {
                              setValue("maxPrice", parsed, { shouldValidate: true })
                              setNumberInputValues(prev => {
                                const newValues = { ...prev }
                                delete newValues.maxPrice
                                return newValues
                              })
                            }
                          }}
                        />
                        <input
                          type="hidden"
                          {...register("maxPrice", { 
                            valueAsNumber: true,
                            validate: (value) => {
                              if (hasMaxPrice && (!value || value <= 0)) {
                                return "Giảm tối đa là bắt buộc khi có giới hạn"
                              }
                              return true
                            }
                          })}
                        />
                        {errors.maxPrice && (
                          <p className="text-sm text-red-500 mt-1">{errors.maxPrice.message}</p>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div>
                  <Label htmlFor="minApply">Giá trị đơn hàng tối thiểu (VND)</Label>
                  <Input
                    id="minApply"
                    type="text"
                    className="mt-2"
                    placeholder="0"
                    value={numberInputValues.minApply !== undefined ? formatNumberInput(numberInputValues.minApply) : (watch("minApply") != null && !isNaN(watch("minApply")!) ? formatNumberInput(watch("minApply")!.toString()) : "0")}
                    onChange={(e) => {
                      const formatted = formatNumberInput(e.target.value)
                      setNumberInputValues(prev => ({ ...prev, minApply: formatted.replace(/\./g, '') }))
                    }}
                    onBlur={(e) => {
                      const value = e.target.value
                      const parsed = parseFormattedNumber(value)
                      if (!value || parsed < 0 || isNaN(parsed)) {
                        setValue("minApply", 0, { shouldValidate: true })
                        setNumberInputValues(prev => {
                          const newValues = { ...prev }
                          delete newValues.minApply
                          return newValues
                        })
                      } else {
                        setValue("minApply", parsed, { shouldValidate: true })
                        setNumberInputValues(prev => {
                          const newValues = { ...prev }
                          delete newValues.minApply
                          return newValues
                        })
                      }
                    }}
                  />
                  <input
                    type="hidden"
                    {...register("minApply", { valueAsNumber: true })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isRedeemable"
                    checked={watch("isRedeemable")}
                    onCheckedChange={(checked) => {
                      setValue("isRedeemable", checked)
                      if (!checked) {
                        setValue("pointsRequired", undefined)
                        setNumberInputValues(prev => {
                          const newValues = { ...prev }
                          delete newValues.pointsRequired
                          return newValues
                        })
                      }
                    }}
                  />
                  <Label htmlFor="isRedeemable">Cho phép đổi điểm</Label>
                </div>

                {isRedeemable && (
                  <div>
                    <Label htmlFor="pointsRequired">Điểm cần để đổi</Label>
                    <Input
                      id="pointsRequired"
                      type="text"
                      className="mt-2"
                      placeholder="0"
                      value={numberInputValues.pointsRequired !== undefined ? numberInputValues.pointsRequired : (watch("pointsRequired") != null && !isNaN(watch("pointsRequired")!) ? watch("pointsRequired")!.toString() : "")}
                      onChange={(e) => {
                        const value = e.target.value
                        const numbers = value.replace(/\D/g, '')
                        setNumberInputValues(prev => ({ ...prev, pointsRequired: numbers }))
                      }}
                      onBlur={(e) => {
                        const value = e.target.value
                        const numbers = value.replace(/\D/g, '')
                        const parsed = parseInt(numbers)
                        if (!numbers || !parsed || parsed < 0 || isNaN(parsed)) {
                          setValue("pointsRequired", undefined, { shouldValidate: true })
                          setNumberInputValues(prev => {
                            const newValues = { ...prev }
                            delete newValues.pointsRequired
                            return newValues
                          })
                        } else {
                          setValue("pointsRequired", parsed, { shouldValidate: true })
                          setNumberInputValues(prev => {
                            const newValues = { ...prev }
                            delete newValues.pointsRequired
                            return newValues
                          })
                        }
                      }}
                    />
                    <input
                      type="hidden"
                      {...register("pointsRequired", { valueAsNumber: true, min: 0 })}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="quantity">Số lượng</Label>
                  <Input
                    id="quantity"
                    type="text"
                    className="mt-2"
                    placeholder="0"
                    value={numberInputValues.quantity !== undefined ? numberInputValues.quantity : (watch("quantity") != null && !isNaN(watch("quantity")!) ? watch("quantity")!.toString() : "0")}
                    onChange={(e) => {
                      const value = e.target.value
                      const numbers = value.replace(/\D/g, '')
                      setNumberInputValues(prev => ({ ...prev, quantity: numbers }))
                    }}
                    onBlur={(e) => {
                      const value = e.target.value
                      const numbers = value.replace(/\D/g, '')
                      if (!numbers) {
                        setValue("quantity", 0, { shouldValidate: true })
                        setNumberInputValues(prev => {
                          const newValues = { ...prev }
                          delete newValues.quantity
                          return newValues
                        })
                      } else {
                        const parsed = parseInt(numbers)
                        if (isNaN(parsed) || parsed < 0) {
                          setValue("quantity", 0, { shouldValidate: true })
                          setNumberInputValues(prev => {
                            const newValues = { ...prev }
                            delete newValues.quantity
                            return newValues
                          })
                        } else {
                          setValue("quantity", parsed, { shouldValidate: true })
                          setNumberInputValues(prev => {
                            const newValues = { ...prev }
                            delete newValues.quantity
                            return newValues
                          })
                        }
                      }
                    }}
                  />
                  <input
                    type="hidden"
                    {...register("quantity", { valueAsNumber: true, min: 0 })}
                  />
                </div>

                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Tạo
                </Button>
              </form>
            </DialogContent>
          </Dialog>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="active-filter" className="text-sm font-medium whitespace-nowrap">
                      Trạng thái:
                    </Label>
                    <Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
                      <SelectTrigger id="active-filter" className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="active">Hoạt động</SelectItem>
                        <SelectItem value="inactive">Không hoạt động</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label htmlFor="redeemable-filter" className="text-sm font-medium whitespace-nowrap">
                      Cho phép đổi điểm:
                    </Label>
                    <Select value={isRedeemableFilter} onValueChange={setIsRedeemableFilter}>
                      <SelectTrigger id="redeemable-filter" className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="redeemable">Có</SelectItem>
                        <SelectItem value="not-redeemable">Không</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsActiveFilter("all")
                      setIsRedeemableFilter("all")
                      setSearchQuery("")
                      setActiveTab("all")
                    }}
                    className="gap-2 ml-auto"
                  >
                    <X className="h-4 w-4" />
                    Xóa bộ lọc
                  </Button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">STT</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Giá trị</TableHead>
                    <TableHead>Giới hạn</TableHead>
                    <TableHead>Cho phép đổi điểm</TableHead>
                    <TableHead>Số điểm cần đổi</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Đã dùng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVouchers && Array.isArray(filteredVouchers) && filteredVouchers.length > 0 ? (
                    filteredVouchers.map((voucher: Voucher, index: number) => (
                    <TableRow key={voucher?.id}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="font-medium">{voucher?.name}</TableCell>
                      <TableCell>
                        <Badge variant={voucher?.type === "FIXED" ? "default" : "secondary"}>
                          {voucher?.type === "FIXED" ? "Cố định" : "Phần trăm"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {voucher?.type === "FIXED" 
                          ? formatPrice(voucher?.price || 0)
                          : `${voucher?.percent}%${voucher?.hasMaxPrice && voucher?.maxPrice ? ` (tối đa ${formatPrice(voucher.maxPrice)})` : ""}`
                        }
                      </TableCell>
                      <TableCell>
                        {voucher?.type === "PERCENT" ? (
                          voucher?.hasMaxPrice ? (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              Có giới hạn
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Không giới hạn
                            </Badge>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={voucher?.isRedeemable ? "default" : "secondary"}>
                          {voucher?.isRedeemable ? "Có" : "Không"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {voucher?.isRedeemable && voucher?.pointsRequired 
                          ? voucher.pointsRequired.toLocaleString("vi-VN")
                          : <span className="text-gray-400">-</span>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(voucher)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-gray-500">
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
          <Dialog open={!!editingVoucher} onOpenChange={(open) => {
            if (!open) {
              setEditingVoucher(null)
              reset()
              setNumberInputValues({})
            }
          }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cập nhật voucher</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Tên voucher <span className="text-red-500">*</span></Label>
                  <Input
                    id="edit-name"
                    className="mt-2"
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
                    className="mt-2"
                    {...register("description")}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-type">Loại voucher <span className="text-red-500">*</span></Label>
                  <Select
                    value={voucherType}
                    onValueChange={(value: VoucherType) => setValue("type", value)}
                  >
                    <SelectTrigger className="mt-2">
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
                    <Label htmlFor="edit-price">Giá giảm (VND) <span className="text-red-500">*</span></Label>
                    <Input
                      id="edit-price"
                      type="text"
                      className="mt-2"
                      placeholder="0"
                      value={numberInputValues.price !== undefined ? formatNumberInput(numberInputValues.price) : (watch("price") != null && !isNaN(watch("price")!) ? formatNumberInput(watch("price")!.toString()) : "0")}
                      onChange={(e) => {
                        const formatted = formatNumberInput(e.target.value)
                        setNumberInputValues(prev => ({ ...prev, price: formatted.replace(/\./g, '') }))
                      }}
                      onBlur={(e) => {
                        const value = e.target.value
                        const parsed = parseFormattedNumber(value)
                        if (!value || parsed < 1 || isNaN(parsed)) {
                          setValue("price", 0, { shouldValidate: true })
                          setNumberInputValues(prev => {
                            const newValues = { ...prev }
                            delete newValues.price
                            return newValues
                          })
                        } else {
                          setValue("price", parsed, { shouldValidate: true })
                          setNumberInputValues(prev => {
                            const newValues = { ...prev }
                            delete newValues.price
                            return newValues
                          })
                        }
                      }}
                    />
                    <input
                      type="hidden"
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
                      <Label htmlFor="edit-percent">Phần trăm giảm (%) <span className="text-red-500">*</span></Label>
                      <Input
                        id="edit-percent"
                        type="text"
                        className="mt-2"
                        placeholder="0"
                        value={numberInputValues.percent !== undefined ? numberInputValues.percent : (watch("percent") != null && !isNaN(watch("percent")!) ? watch("percent")!.toString() : "")}
                        onChange={(e) => {
                          const value = e.target.value
                          const numbers = value.replace(/\D/g, '')
                          setNumberInputValues(prev => ({ ...prev, percent: numbers }))
                        }}
                        onBlur={(e) => {
                          const value = e.target.value
                          const numbers = value.replace(/\D/g, '')
                          const parsed = parseInt(numbers)
                          if (!numbers || !parsed || parsed < 1 || parsed > 100 || isNaN(parsed)) {
                            setValue("percent", undefined, { shouldValidate: true })
                            setNumberInputValues(prev => {
                              const newValues = { ...prev }
                              delete newValues.percent
                              return newValues
                            })
                          } else {
                            setValue("percent", parsed, { shouldValidate: true })
                            setNumberInputValues(prev => {
                              const newValues = { ...prev }
                              delete newValues.percent
                              return newValues
                            })
                          }
                        }}
                      />
                      <input
                        type="hidden"
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
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit-hasMaxPrice"
                        checked={watch("hasMaxPrice") || false}
                        onCheckedChange={(checked) => {
                          setValue("hasMaxPrice", checked)
                          if (!checked) {
                            setValue("maxPrice", undefined)
                            setNumberInputValues(prev => {
                              const newValues = { ...prev }
                              delete newValues.maxPrice
                              return newValues
                            })
                          }
                        }}
                      />
                      <Label htmlFor="edit-hasMaxPrice">Có giới hạn giảm tối đa</Label>
                    </div>
                    {hasMaxPrice && (
                      <div>
                        <Label htmlFor="edit-maxPrice">Giảm tối đa (VND) <span className="text-red-500">*</span></Label>
                        <Input
                          id="edit-maxPrice"
                          type="text"
                          className="mt-2"
                          placeholder="0"
                          value={numberInputValues.maxPrice !== undefined ? formatNumberInput(numberInputValues.maxPrice) : (watch("maxPrice") != null && !isNaN(watch("maxPrice")!) ? formatNumberInput(watch("maxPrice")!.toString()) : "")}
                          onChange={(e) => {
                            const formatted = formatNumberInput(e.target.value)
                            setNumberInputValues(prev => ({ ...prev, maxPrice: formatted.replace(/\./g, '') }))
                          }}
                          onBlur={(e) => {
                            const value = e.target.value
                            const parsed = parseFormattedNumber(value)
                            if (!value || parsed < 0 || isNaN(parsed)) {
                              setValue("maxPrice", undefined, { shouldValidate: true })
                              setNumberInputValues(prev => {
                                const newValues = { ...prev }
                                delete newValues.maxPrice
                                return newValues
                              })
                            } else {
                              setValue("maxPrice", parsed, { shouldValidate: true })
                              setNumberInputValues(prev => {
                                const newValues = { ...prev }
                                delete newValues.maxPrice
                                return newValues
                              })
                            }
                          }}
                        />
                        <input
                          type="hidden"
                          {...register("maxPrice", { 
                            valueAsNumber: true,
                            validate: (value) => {
                              if (hasMaxPrice && (!value || value <= 0)) {
                                return "Giảm tối đa là bắt buộc khi có giới hạn"
                              }
                              return true
                            }
                          })}
                        />
                        {errors.maxPrice && (
                          <p className="text-sm text-red-500 mt-1">{errors.maxPrice.message}</p>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div>
                  <Label htmlFor="edit-minApply">Giá trị đơn hàng tối thiểu (VND)</Label>
                  <Input
                    id="edit-minApply"
                    type="text"
                    className="mt-2"
                    placeholder="0"
                    value={numberInputValues.minApply !== undefined ? formatNumberInput(numberInputValues.minApply) : (watch("minApply") != null && !isNaN(watch("minApply")!) ? formatNumberInput(watch("minApply")!.toString()) : "0")}
                    onChange={(e) => {
                      const formatted = formatNumberInput(e.target.value)
                      setNumberInputValues(prev => ({ ...prev, minApply: formatted.replace(/\./g, '') }))
                    }}
                    onBlur={(e) => {
                      const value = e.target.value
                      const parsed = parseFormattedNumber(value)
                      if (!value || parsed < 0 || isNaN(parsed)) {
                        setValue("minApply", 0, { shouldValidate: true })
                        setNumberInputValues(prev => {
                          const newValues = { ...prev }
                          delete newValues.minApply
                          return newValues
                        })
                      } else {
                        setValue("minApply", parsed, { shouldValidate: true })
                        setNumberInputValues(prev => {
                          const newValues = { ...prev }
                          delete newValues.minApply
                          return newValues
                        })
                      }
                    }}
                  />
                  <input
                    type="hidden"
                    {...register("minApply", { valueAsNumber: true })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isRedeemable"
                    checked={watch("isRedeemable")}
                    onCheckedChange={(checked) => {
                      setValue("isRedeemable", checked)
                      if (!checked) {
                        setValue("pointsRequired", undefined)
                        setNumberInputValues(prev => {
                          const newValues = { ...prev }
                          delete newValues.pointsRequired
                          return newValues
                        })
                      }
                    }}
                  />
                  <Label htmlFor="edit-isRedeemable">Cho phép đổi điểm</Label>
                </div>

                {isRedeemable && (
                  <div>
                    <Label htmlFor="edit-pointsRequired">Điểm cần để đổi</Label>
                    <Input
                      id="edit-pointsRequired"
                      type="text"
                      className="mt-2"
                      placeholder="0"
                      value={numberInputValues.pointsRequired !== undefined ? numberInputValues.pointsRequired : (watch("pointsRequired") != null && !isNaN(watch("pointsRequired")!) ? watch("pointsRequired")!.toString() : "")}
                      onChange={(e) => {
                        const value = e.target.value
                        const numbers = value.replace(/\D/g, '')
                        setNumberInputValues(prev => ({ ...prev, pointsRequired: numbers }))
                      }}
                      onBlur={(e) => {
                        const value = e.target.value
                        const numbers = value.replace(/\D/g, '')
                        const parsed = parseInt(numbers)
                        if (!numbers || !parsed || parsed < 0 || isNaN(parsed)) {
                          setValue("pointsRequired", undefined, { shouldValidate: true })
                          setNumberInputValues(prev => {
                            const newValues = { ...prev }
                            delete newValues.pointsRequired
                            return newValues
                          })
                        } else {
                          setValue("pointsRequired", parsed, { shouldValidate: true })
                          setNumberInputValues(prev => {
                            const newValues = { ...prev }
                            delete newValues.pointsRequired
                            return newValues
                          })
                        }
                      }}
                    />
                    <input
                      type="hidden"
                      {...register("pointsRequired", { valueAsNumber: true, min: 0 })}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="edit-quantity">Số lượng</Label>
                  <Input
                    id="edit-quantity"
                    type="text"
                    className="mt-2"
                    placeholder="0"
                    value={numberInputValues.quantity !== undefined ? numberInputValues.quantity : (watch("quantity") != null && !isNaN(watch("quantity")!) ? watch("quantity")!.toString() : "0")}
                    onChange={(e) => {
                      const value = e.target.value
                      const numbers = value.replace(/\D/g, '')
                      setNumberInputValues(prev => ({ ...prev, quantity: numbers }))
                    }}
                    onBlur={(e) => {
                      const value = e.target.value
                      const numbers = value.replace(/\D/g, '')
                      if (!numbers) {
                        setValue("quantity", 0, { shouldValidate: true })
                        setNumberInputValues(prev => {
                          const newValues = { ...prev }
                          delete newValues.quantity
                          return newValues
                        })
                      } else {
                        const parsed = parseInt(numbers)
                        if (isNaN(parsed) || parsed < 0) {
                          setValue("quantity", 0, { shouldValidate: true })
                          setNumberInputValues(prev => {
                            const newValues = { ...prev }
                            delete newValues.quantity
                            return newValues
                          })
                        } else {
                          setValue("quantity", parsed, { shouldValidate: true })
                          setNumberInputValues(prev => {
                            const newValues = { ...prev }
                            delete newValues.quantity
                            return newValues
                          })
                        }
                      }
                    }}
                  />
                  <input
                    type="hidden"
                    {...register("quantity", { valueAsNumber: true, min: 0 })}
                  />
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

