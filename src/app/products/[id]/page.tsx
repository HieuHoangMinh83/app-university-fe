"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { productsApi, Product, UpdateProductDto, CreateComboDto } from "@/services/api/products"
import { categoriesApi, Category } from "@/services/api/categories"
import { inventoryProductsApi } from "@/services/api/inventory-products"
import { PaginatedResponse } from "@/services/api/types"
import { useFieldArray } from "react-hook-form"
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
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useForm } from "react-hook-form"
import { ArrowLeft, Pencil, Trash2, Plus, Loader2, Package, Tag, Box, Calendar, FileText, Image as ImageIcon, Edit, ShoppingBag, Gift, ChevronRight, Eye, Check, ChevronsUpDown } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { ImageUpload } from "@/components/ui/image-upload"
import { deleteImage } from "@/lib/supabase"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const productId = params.id as string
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isEditImageDescOpen, setIsEditImageDescOpen] = useState(false)
  const [isAddComboOpen, setIsAddComboOpen] = useState(false)
  const [isEditComboOpen, setIsEditComboOpen] = useState(false)
  const [editingComboId, setEditingComboId] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [imageUrl, setImageUrl] = useState<string>("")
  const [productSearchValues, setProductSearchValues] = useState<Record<number, string>>({})
  const [productPopoverOpen, setProductPopoverOpen] = useState<Record<number, boolean>>({})
  const [quantityInputValues, setQuantityInputValues] = useState<Record<number, string>>({})
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => productsApi.getById(productId),
    enabled: !!productId,
  })

  // Tự động mở dialog thêm option chỉ khi có query param "addCombo=true" 
  // (khi redirect từ trang tạo sản phẩm)
  useEffect(() => {
    if (product && !isLoading && searchParams.get("addCombo") === "true" && !isAddComboOpen) {
      setIsAddComboOpen(true)
      // Xóa query param sau khi đã mở
      router.replace(`/products/${productId}`, { scroll: false })
    }
  }, [product, isLoading, searchParams, isAddComboOpen, productId, router])

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.getAll(),
  })

  const categories = Array.isArray(categoriesData)
    ? categoriesData
    : (categoriesData as any)?.data || []

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

  const updateImageDescMutation = useMutation({
    mutationFn: async (data: { image?: string; description?: string; oldImageUrl?: string }) => {
      // Xóa hình ảnh cũ nếu có hình ảnh mới và khác với hình ảnh cũ
      if (data.image && data.oldImageUrl && data.image !== data.oldImageUrl) {
        try {
          await deleteImage(data.oldImageUrl)
        } catch (error) {
          console.error("Error deleting old image:", error)
        }
      }
      return productsApi.update(productId, { image: data.image, description: data.description })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      setIsEditImageDescOpen(false)
      setImageUrl("")
      toast.success("Cập nhật hình ảnh và mô tả thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Cập nhật hình ảnh và mô tả thất bại")
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
      resetCombo({ isActive: true, isPromotionActive: false, items: [] })
      setProductSearchValues({})
      setProductPopoverOpen({})
      setQuantityInputValues({})
      toast.success("Thêm option thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Thêm option thất bại")
    },
  })

  const deleteComboMutation = useMutation({
    mutationFn: productsApi.deleteCombo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] })
      toast.success("Xóa option thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Xóa option thất bại")
    },
  })

  const updateComboMutation = useMutation({
    mutationFn: ({ comboId, data }: { comboId: string; data: any }) => productsApi.updateCombo(comboId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] })
      setIsEditComboOpen(false)
      setEditingComboId(null)
      resetCombo({ isActive: true, isPromotionActive: false, items: [] })
      setProductSearchValues({})
      setProductPopoverOpen({})
      setQuantityInputValues({})
      toast.success("Cập nhật option thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Cập nhật option thất bại")
    },
  })

  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, watch: watchEdit, setValue: setValueEdit, formState: { errors: editErrors } } = useForm<UpdateProductDto>({
    mode: "onChange"
  })
  const { register: registerImageDesc, handleSubmit: handleSubmitImageDesc, reset: resetImageDesc, watch: watchImageDesc, setValue: setValueImageDesc, formState: { errors: imageDescErrors } } = useForm<{ image?: string; description?: string }>({
    mode: "onChange"
  })
  const { register: registerCombo, handleSubmit: handleSubmitCombo, reset: resetCombo, watch: watchCombo, setValue: setValueCombo, control: controlCombo, formState: { errors: comboErrors } } = useForm<CreateComboDto>({
    defaultValues: {
      isActive: true,
      isPromotionActive: false,
      items: [],
    },
    mode: "onChange"
  })

  const { fields: comboItemFields, append: appendComboItem, remove: originalRemoveComboItem } = useFieldArray({
    control: controlCombo,
    name: "items",
  })

  const { data: inventoryProductsData } = useQuery({
    queryKey: ["inventory-products"],
    queryFn: () => inventoryProductsApi.getAll(),
  })

  const inventoryProducts = Array.isArray(inventoryProductsData)
    ? inventoryProductsData
    : (inventoryProductsData as any)?.data || []

  // Wrapper để reset state khi remove item
  const removeComboItem = (index: number) => {
    originalRemoveComboItem(index)
    // Reset search values và popover state cho các items sau index
    setProductSearchValues(prev => {
      const newValues: Record<number, string> = {}
      Object.keys(prev).forEach(key => {
        const keyNum = parseInt(key)
        if (keyNum < index) {
          newValues[keyNum] = prev[keyNum]
        } else if (keyNum > index) {
          newValues[keyNum - 1] = prev[keyNum]
        }
      })
      return newValues
    })
    setProductPopoverOpen(prev => {
      const newOpen: Record<number, boolean> = {}
      Object.keys(prev).forEach(key => {
        const keyNum = parseInt(key)
        if (keyNum < index) {
          newOpen[keyNum] = prev[keyNum]
        } else if (keyNum > index) {
          newOpen[keyNum - 1] = prev[keyNum]
        }
      })
      return newOpen
    })
    setQuantityInputValues(prev => {
      const newValues: Record<number, string> = {}
      Object.keys(prev).forEach(key => {
        const keyNum = parseInt(key)
        if (keyNum < index) {
          newValues[keyNum] = prev[keyNum]
        } else if (keyNum > index) {
          newValues[keyNum - 1] = prev[keyNum]
        }
      })
      return newValues
    })
  }

  // Sync search values khi inventoryProductId thay đổi
  useEffect(() => {
    comboItemFields.forEach((field, index) => {
      const productId = watchCombo(`items.${index}.inventoryProductId`)
      if (productId) {
        const selectedProduct = inventoryProducts?.find((ip: any) => ip?.id === productId)
        if (selectedProduct && productSearchValues[index] !== selectedProduct.name) {
          setProductSearchValues(prev => ({ ...prev, [index]: selectedProduct.name }))
        }
      } else if (productSearchValues[index]) {
        // Clear nếu không có productId
        setProductSearchValues(prev => {
          const newValues = { ...prev }
          delete newValues[index]
          return newValues
        })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comboItemFields.length])

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      // Kiểm tra xem click có phải bên trong dropdown container không
      const dropdownContainer = target.closest('[data-dropdown-item]')
      if (!dropdownContainer) {
        // Click ra ngoài tất cả dropdowns, đóng tất cả
        setProductPopoverOpen({})
      }
      // Nếu click vào dropdown container khác, giữ nguyên state của container đó
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Tự động scroll xuống khi popup mở ở item cuối cùng
  useEffect(() => {
    const openIndexes = Object.keys(productPopoverOpen)
      .map(key => parseInt(key))
      .filter(index => productPopoverOpen[index] === true)
    
    if (openIndexes.length > 0 && scrollContainerRef.current) {
      const lastOpenIndex = Math.max(...openIndexes)
      const isLastItem = lastOpenIndex === comboItemFields.length - 1
      
      if (isLastItem) {
        // Scroll xuống một chút để user thấy popup
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
              top: scrollContainerRef.current.scrollHeight,
              behavior: 'smooth'
            })
          }
        }, 100)
      }
    }
  }, [productPopoverOpen, comboItemFields.length])

  const handleEdit = () => {
    if (product) {
      resetEdit({
        name: product?.name,
        categoryId: product?.categoryId || "",
        isActive: product?.isActive,
      })
      setIsEditOpen(true)
    }
  }

  const handleEditImageDesc = () => {
    if (product) {
      resetImageDesc({
        image: product?.image || "",
        description: product?.description || "",
      })
      setImageUrl(product?.image || "")
      setIsEditImageDescOpen(true)
    }
  }

  const handleDelete = () => {
    if (confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) {
      deleteMutation.mutate(productId)
    }
  }

  const handleDeleteCombo = (comboId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa option này?")) {
      deleteComboMutation.mutate(comboId)
    }
  }

  const handleEditCombo = (combo: any) => {
    setEditingComboId(combo.id)
    resetCombo({
      name: combo.name,
      price: combo.price,
      isActive: combo.isActive,
      isPromotionActive: combo.isPromotionActive || false,
      promotionalPrice: combo.promotionalPrice,
      promotionStart: combo.promotionStart || undefined,
      promotionEnd: combo.promotionEnd || undefined,
      items: combo.items?.map((item: any) => ({
        inventoryProductId: item.inventoryProductId,
        quantity: item.quantity,
        isGift: item.isGift || false,
      })) || [],
    })
    // Set search values cho các sản phẩm đã chọn
    const searchValues: Record<number, string> = {}
    combo.items?.forEach((item: any, index: number) => {
      if (item.inventoryProductId) {
        const product = inventoryProducts?.find((ip: any) => ip?.id === item.inventoryProductId)
        if (product?.name) {
          searchValues[index] = product.name
        }
      }
    })
    setProductSearchValues(searchValues)
    setIsEditComboOpen(true)
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
      <div className="space-y-6 w-full ">
        {/* Breadcrumb */}


        {/* Main Card Container */}
        <Card className="border-gray-200">
          <div className="p-6 pb-3">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/products" className="text-gray-600 text-lg hover:text-gray-900">
                    Quản lý sản phẩm
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-6 w-6" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <span className="text-blue-500 font-medium text-lg">Chi tiết Đơn hàng</span>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Card 1: Hình ảnh & Mô tả */}
              <Card className="border-gray-200 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <div className="p-2 bg-white rounded-lg">
                        <ImageIcon className="h-4 w-4 text-blue-600" />
                      </div>
                      Hình ảnh & Mô tả sản phẩm
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditImageDesc}
                      className="gap-2"
                    >
                      <Pencil className="h-4 w-4" />
                      Chỉnh sửa
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Hình ảnh - Nhỏ hơn */}
                    <div className="md:col-span-1">
                      <Label className="text-sm font-semibold text-gray-700 mb-3 block">
                        Hình ảnh
                      </Label>
                      {product?.image ? (
                        <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-xl overflow-hidden border-2 border-gray-100 bg-gradient-to-br from-gray-50 to-gray-100 group">
                          <Image
                            src={product.image}
                            alt={product?.name || "Product image"}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ) : (
                        <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                          <div className="text-center text-gray-400">
                            <div className="p-3 bg-white rounded-full mb-3 inline-block">
                              <ImageIcon className="h-8 w-8 opacity-50" />
                            </div>
                            <p className="text-xs font-medium">Chưa có hình ảnh</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mô tả */}
                    <div className="md:col-span-2">
                      <Label className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-600" />
                        Mô tả sản phẩm
                      </Label>
                      {product?.description ? (
                        <div
                          className="min-h-[200px] p-5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: product.description }}
                        />
                      ) : (
                        <div className="min-h-[200px] p-5 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-400 italic flex items-center justify-center">
                          Chưa có mô tả
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Thông tin sản phẩm */}
              <Card className="border-gray-200 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <div className="p-2 bg-white rounded-lg">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      Thông tin sản phẩm
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEdit}
                      className="gap-2"
                    >
                      <Pencil className="h-4 w-4" />
                      Chỉnh sửa
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <form className="space-y-6">
                    {/* Product Name */}
                    <div className="space-y-2">
                      <Label htmlFor="product-name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Box className="h-4 w-4 text-blue-600" />
                        Tên sản phẩm
                      </Label>
                      <Input
                        id="product-name"
                        value={product?.name || ""}
                        readOnly
                        className="bg-gray-50 border-gray-200 text-gray-900 font-medium cursor-default"
                      />
                    </div>

                    {/* Category and Status Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Category */}
                      <div className="space-y-2">
                        <Label htmlFor="product-category" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Tag className="h-4 w-4 text-blue-600" />
                          Danh mục
                        </Label>
                        <Input
                          id="product-category"
                          value={product?.category?.name || "Chưa có danh mục"}
                          readOnly
                          className="bg-gray-50 border-gray-200 text-gray-900 cursor-default"
                        />
                      </div>

                      {/* Status */}
                      <div className="space-y-2">
                        <Label htmlFor="product-status" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Package className="h-4 w-4 text-green-600" />
                          Trạng thái
                        </Label>
                        <Input
                          id="product-status"
                          value={product?.isActive ? "Hoạt động" : "Không hoạt động"}
                          readOnly
                          className={`bg-gray-50 border-gray-200 text-gray-900 cursor-default ${
                            product?.isActive ? 'text-green-700 font-semibold' : 'text-gray-600'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Created Date */}
                    <div className="space-y-2">
                      <Label htmlFor="product-created" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        Ngày tạo
                      </Label>
                      <Input
                        id="product-created"
                        value={
                          product?.createdAt
                            ? new Date(product.createdAt).toLocaleDateString("vi-VN", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "-"
                        }
                        readOnly
                        className="bg-gray-50 border-gray-200 text-gray-900 cursor-default"
                      />
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Options Section */}
            <Card className="shadow-md border-gray-200 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <ShoppingBag className="h-4 w-4 text-blue-600" />
                    </div>
                    Lựa chọn mua hàng
                    <Badge variant="secondary" className="ml-3 text-sm font-semibold px-2.5 py-1">
                      {product?.combos?.filter((combo) => combo?.isActive)?.length || 0}
                    </Badge>
                  </CardTitle>
                  <Dialog open={isAddComboOpen} onOpenChange={setIsAddComboOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="h-4 w-4" />
                        Thêm option
                      </Button>
                    </DialogTrigger>
                        <DialogContent className="sm:max-w-[750px] max-h-[95vh] h-[90vh] flex flex-col">
                          <DialogHeader>
                            <DialogTitle className="text-lg font-semibold">Thêm option mới</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleSubmitCombo((data) => {
                            if (!data.items || data.items.length === 0) {
                              toast.error("Vui lòng thêm ít nhất 1 sản phẩm chính")
                              return
                            }
                            // Kiểm tra có ít nhất 1 sản phẩm chính (không phải tặng kèm)
                            const mainProducts = data.items.filter(item => !item.isGift)
                            if (mainProducts.length === 0) {
                              toast.error("Vui lòng thêm ít nhất 1 sản phẩm chính")
                              return
                            }
                            for (const item of data.items) {
                              if (!item.inventoryProductId) {
                                toast.error("Vui lòng chọn đầy đủ sản phẩm")
                                return
                              }
                              if (!item.quantity || item.quantity < 1) {
                                toast.error("Số lượng sản phẩm phải lớn hơn 0")
                                return
                              }
                            }
                            addComboMutation.mutate(data)
                          })} className="flex flex-col flex-1 min-h-0 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="combo-name">Tên option <span className="text-red-500">*</span></Label>
                                <Input
                                  id="combo-name"
                                  {...registerCombo("name", { required: "Tên option là bắt buộc" })}
                                  placeholder="Nhập tên option"
                                />
                              </div>
                              <div className="space-y-2">
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
                            </div>

                            {/* Khuyến mãi */}
                            <div className="space-y-4 border-t pt-4">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={watchCombo("isPromotionActive") || false}
                                  onCheckedChange={(checked) => {
                                    setValueCombo("isPromotionActive", checked)
                                    if (!checked) {
                                      setValueCombo("promotionalPrice", undefined)
                                      setValueCombo("promotionStart", undefined)
                                      setValueCombo("promotionEnd", undefined)
                                    }
                                  }}
                                />
                                <Label className="text-sm font-semibold">Kích hoạt khuyến mãi</Label>
                              </div>

                              {watchCombo("isPromotionActive") && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-6 border-l-2 border-blue-200">
                                  <div className="space-y-2">
                                    <Label htmlFor="combo-promotional-price">Giá khuyến mãi (VND) <span className="text-red-500">*</span></Label>
                                    <Input
                                      id="combo-promotional-price"
                                      placeholder="0"
                                      value={watchCombo("promotionalPrice") ? new Intl.NumberFormat("vi-VN").format(watchCombo("promotionalPrice") || 0) : ''}
                                      onChange={(e) => {
                                        const numbers = e.target.value.replace(/\D/g, '')
                                        const parsed = parseInt(numbers) || 0
                                        setValueCombo("promotionalPrice", parsed, { shouldValidate: true })
                                      }}
                                      onBlur={(e) => {
                                        const numbers = e.target.value.replace(/\D/g, '')
                                        const parsed = parseInt(numbers) || 0
                                        if (parsed > 0) {
                                          setValueCombo("promotionalPrice", parsed, { shouldValidate: true })
                                        }
                                      }}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="combo-promotion-start">Ngày bắt đầu</Label>
                                    <Input
                                      id="combo-promotion-start"
                                      type="date"
                                      value={watchCombo("promotionStart") ? new Date(watchCombo("promotionStart")!).toISOString().split('T')[0] : ""}
                                      onChange={(e) => {
                                        const dateValue = e.target.value
                                        if (dateValue) {
                                          // Set time to start of day (00:00:00)
                                          const date = new Date(dateValue)
                                          date.setHours(0, 0, 0, 0)
                                          setValueCombo("promotionStart", date.toISOString())
                                        } else {
                                          setValueCombo("promotionStart", undefined)
                                        }
                                      }}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="combo-promotion-end">Ngày kết thúc</Label>
                                    <Input
                                      id="combo-promotion-end"
                                      type="date"
                                      value={watchCombo("promotionEnd") ? new Date(watchCombo("promotionEnd")!).toISOString().split('T')[0] : ""}
                                      onChange={(e) => {
                                        const dateValue = e.target.value
                                        if (dateValue) {
                                          // Set time to end of day (23:59:59)
                                          const date = new Date(dateValue)
                                          date.setHours(23, 59, 59, 999)
                                          setValueCombo("promotionEnd", date.toISOString())
                                        } else {
                                          setValueCombo("promotionEnd", undefined)
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Option Items */}
                            <div className="space-y-6 border-t pt-4 flex flex-col flex-1 min-h-0">
                              {/* Sản phẩm chính */}
                              <div className="space-y-3 flex flex-col flex-1 min-h-0">
                                <div className="flex items-center justify-between flex-shrink-0">
                                  <Label className="text-sm font-semibold">Sản phẩm chính <span className="text-red-500">*</span></Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => appendComboItem({ inventoryProductId: "", quantity: 1, isGift: false })}
                                  >
                                    <Plus className="mr-2 h-3 w-3" />
                                    Thêm sản phẩm
                                  </Button>
                                </div>
                                <div ref={scrollContainerRef} className="space-y-3 overflow-y-auto max-h-[400px] pr-2 flex-1">
                                  {comboItemFields.map((field, itemIndex) => {
                                    const isGift = watchCombo(`items.${itemIndex}.isGift`) || false
                                    if (isGift) return null
                                    
                                    return (
                                      <div key={field.id} className="flex gap-2 items-start p-4 border rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                                        <div className="flex-1 grid grid-cols-12 gap-3">
                                          <div className="col-span-12 md:col-span-7 space-y-2">
                                            <Label className="text-xs font-medium text-gray-700">Sản phẩm</Label>
                                            <div className="relative product-search-dropdown" data-dropdown-item={itemIndex}>
                                              <Input
                                                type="text"
                                                placeholder="Chọn sản phẩm trong kho"
                                                value={
                                                  productSearchValues[itemIndex] !== undefined
                                                    ? productSearchValues[itemIndex]
                                                    : watchCombo(`items.${itemIndex}.inventoryProductId`)
                                                      ? inventoryProducts?.find(
                                                          (ip: any) => ip?.id === watchCombo(`items.${itemIndex}.inventoryProductId`)
                                                        )?.name || ""
                                                      : ""
                                                }
                                                onChange={(e) => {
                                                  const searchValue = e.target.value
                                                  setProductSearchValues(prev => ({ ...prev, [itemIndex]: searchValue }))
                                                  
                                                  // Luôn mở popover khi có text hoặc đang nhập
                                                  if (searchValue) {
                                                    setProductPopoverOpen(prev => ({ ...prev, [itemIndex]: true }))
                                                  }
                                                  
                                                  // Nếu xóa hết thì clear selection nhưng vẫn giữ popover mở
                                                  if (!searchValue) {
                                                    setValueCombo(`items.${itemIndex}.inventoryProductId`, "")
                                                    setProductSearchValues(prev => ({ ...prev, [itemIndex]: "" }))
                                                  }
                                                }}
                                                onFocus={() => {
                                                  // Tự động mở popover khi focus vào input
                                                  setProductPopoverOpen(prev => ({ ...prev, [itemIndex]: true }))
                                                }}
                                                className="h-9 pr-8"
                                              />
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setProductPopoverOpen(prev => ({ ...prev, [itemIndex]: !prev[itemIndex] }))
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center hover:bg-gray-100 rounded z-10"
                                              >
                                                <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                              </button>
                                              
                                              {/* Custom Dropdown với absolute positioning */}
                                              {productPopoverOpen[itemIndex] && (
                                                <div className="absolute z-50 w-full mt-1 rounded-md border bg-white max-h-[300px] overflow-y-auto">
                                                  {inventoryProducts?.filter((ip: any) => {
                                                    if (ip?.isActive === false) return false
                                                    const searchValue = productSearchValues[itemIndex]?.toLowerCase() || ""
                                                    if (!searchValue) return true
                                                    return ip?.name?.toLowerCase().includes(searchValue)
                                                  }).length === 0 ? (
                                                    <div className="p-4 text-center text-sm text-gray-500">
                                                      Không tìm thấy sản phẩm.
                                                    </div>
                                                  ) : (
                                                    <div className="p-1">
                                                      {inventoryProducts?.filter((ip: any) => {
                                                        if (ip?.isActive === false) return false
                                                        const searchValue = productSearchValues[itemIndex]?.toLowerCase() || ""
                                                        if (!searchValue) return true
                                                        return ip?.name?.toLowerCase().includes(searchValue)
                                                      })?.map((invProduct: any) => (
                                                        <div
                                                          key={invProduct?.id}
                                                          onClick={() => {
                                                            setValueCombo(`items.${itemIndex}.inventoryProductId`, invProduct?.id)
                                                            setProductSearchValues(prev => ({ ...prev, [itemIndex]: invProduct?.name }))
                                                            setProductPopoverOpen(prev => ({ ...prev, [itemIndex]: false }))
                                                          }}
                                                          className={cn(
                                                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-blue-50 hover:text-blue-900",
                                                            watchCombo(`items.${itemIndex}.inventoryProductId`) === invProduct?.id && "bg-blue-100 text-blue-900"
                                                          )}
                                                        >
                                                          <Check
                                                            className={cn(
                                                              "mr-2 h-4 w-4",
                                                              watchCombo(`items.${itemIndex}.inventoryProductId`) === invProduct?.id
                                                                ? "opacity-100"
                                                                : "opacity-0"
                                                            )}
                                                          />
                                                          {invProduct?.name}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <div className="col-span-12 md:col-span-3 space-y-2">
                                            <Label className="text-xs font-medium text-gray-700">Số lượng</Label>
                                            <Input
                                              type="text"
                                              placeholder="Số lượng"
                                              value={quantityInputValues[itemIndex] !== undefined ? quantityInputValues[itemIndex] : (watchCombo(`items.${itemIndex}.quantity`)?.toString() || "")}
                                              onChange={(e) => {
                                                const value = e.target.value
                                                // Chỉ cho phép số, cho phép rỗng để user có thể xóa hết
                                                const numbers = value.replace(/\D/g, '')
                                                // Cập nhật giá trị hiển thị
                                                setQuantityInputValues(prev => ({ ...prev, [itemIndex]: numbers }))
                                              }}
                                              onBlur={(e) => {
                                                const value = e.target.value
                                                const numbers = value.replace(/\D/g, '')
                                                // Kiểm tra lại sau khi user nhập xong
                                                const parsed = parseInt(numbers)
                                                if (!parsed || parsed < 1 || isNaN(parsed)) {
                                                  // Nếu không phải số hợp lệ hoặc <= 0, set về 1
                                                  setValueCombo(`items.${itemIndex}.quantity`, 1)
                                                  setQuantityInputValues(prev => {
                                                    const newValues = { ...prev }
                                                    delete newValues[itemIndex]
                                                    return newValues
                                                  })
                                                } else {
                                                  setValueCombo(`items.${itemIndex}.quantity`, parsed)
                                                  setQuantityInputValues(prev => {
                                                    const newValues = { ...prev }
                                                    delete newValues[itemIndex]
                                                    return newValues
                                                  })
                                                }
                                              }}
                                              className="h-9"
                                            />
                                          </div>
                                          <div className="col-span-12 md:col-span-2 flex justify-end items-end pb-1">
                                            {(comboItemFields.filter((_, idx) => !watchCombo(`items.${idx}.isGift`)).length > 1 || comboItemFields.filter((_, idx) => watchCombo(`items.${idx}.isGift`)).length > 0) && (
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeComboItem(itemIndex)}
                                                className="h-8 w-8 text-gray-400 hover:text-red-500"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>

                              {/* Sản phẩm tặng kèm */}
                              <div className="space-y-3 flex flex-col flex-1 min-h-0 border-t pt-4">
                                <div className="flex items-center justify-between flex-shrink-0">
                                  <Label className="text-sm font-semibold">Sản phẩm tặng kèm</Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => appendComboItem({ inventoryProductId: "", quantity: 1, isGift: true })}
                                  >
                                    <Plus className="mr-2 h-3 w-3" />
                                    Thêm sản phẩm
                                  </Button>
                                </div>
                                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 flex-1">
                                  {comboItemFields.map((field, itemIndex) => {
                                    const isGift = watchCombo(`items.${itemIndex}.isGift`) || false
                                    if (!isGift) return null
                                    
                                    return (
                                      <div key={field.id} className="flex gap-2 items-start p-4 border rounded-lg bg-green-50/50 hover:bg-green-100/50 transition-colors border-green-200">
                                        <div className="flex-1 grid grid-cols-12 gap-3">
                                          <div className="col-span-12 md:col-span-7 space-y-2">
                                            <Label className="text-xs font-medium text-gray-700">Sản phẩm</Label>
                                            <div className="relative product-search-dropdown" data-dropdown-item={itemIndex}>
                                              <Input
                                                type="text"
                                                placeholder="Chọn sản phẩm trong kho"
                                                value={
                                                  productSearchValues[itemIndex] !== undefined
                                                    ? productSearchValues[itemIndex]
                                                    : watchCombo(`items.${itemIndex}.inventoryProductId`)
                                                      ? inventoryProducts?.find(
                                                          (ip: any) => ip?.id === watchCombo(`items.${itemIndex}.inventoryProductId`)
                                                        )?.name || ""
                                                      : ""
                                                }
                                                onChange={(e) => {
                                                  const searchValue = e.target.value
                                                  setProductSearchValues(prev => ({ ...prev, [itemIndex]: searchValue }))
                                                  
                                                  // Luôn mở popover khi có text hoặc đang nhập
                                                  if (searchValue) {
                                                    setProductPopoverOpen(prev => ({ ...prev, [itemIndex]: true }))
                                                  }
                                                  
                                                  // Nếu xóa hết thì clear selection nhưng vẫn giữ popover mở
                                                  if (!searchValue) {
                                                    setValueCombo(`items.${itemIndex}.inventoryProductId`, "")
                                                    setProductSearchValues(prev => ({ ...prev, [itemIndex]: "" }))
                                                  }
                                                }}
                                                onFocus={() => {
                                                  // Tự động mở popover khi focus vào input
                                                  setProductPopoverOpen(prev => ({ ...prev, [itemIndex]: true }))
                                                }}
                                                className="h-9 pr-8"
                                              />
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setProductPopoverOpen(prev => ({ ...prev, [itemIndex]: !prev[itemIndex] }))
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center hover:bg-gray-100 rounded z-10"
                                              >
                                                <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                              </button>
                                              
                                              {/* Custom Dropdown với absolute positioning */}
                                              {productPopoverOpen[itemIndex] && (
                                                <div className="absolute z-50 w-full mt-1 rounded-md border bg-white max-h-[300px] overflow-y-auto">
                                                  {inventoryProducts?.filter((ip: any) => {
                                                    if (ip?.isActive === false) return false
                                                    const searchValue = productSearchValues[itemIndex]?.toLowerCase() || ""
                                                    if (!searchValue) return true
                                                    return ip?.name?.toLowerCase().includes(searchValue)
                                                  }).length === 0 ? (
                                                    <div className="p-4 text-center text-sm text-gray-500">
                                                      Không tìm thấy sản phẩm.
                                                    </div>
                                                  ) : (
                                                    <div className="p-1">
                                                      {inventoryProducts?.filter((ip: any) => {
                                                        if (ip?.isActive === false) return false
                                                        const searchValue = productSearchValues[itemIndex]?.toLowerCase() || ""
                                                        if (!searchValue) return true
                                                        return ip?.name?.toLowerCase().includes(searchValue)
                                                      })?.map((invProduct: any) => (
                                                        <div
                                                          key={invProduct?.id}
                                                          onClick={() => {
                                                            setValueCombo(`items.${itemIndex}.inventoryProductId`, invProduct?.id)
                                                            setProductSearchValues(prev => ({ ...prev, [itemIndex]: invProduct?.name }))
                                                            setProductPopoverOpen(prev => ({ ...prev, [itemIndex]: false }))
                                                          }}
                                                          className={cn(
                                                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-blue-50 hover:text-blue-900",
                                                            watchCombo(`items.${itemIndex}.inventoryProductId`) === invProduct?.id && "bg-blue-100 text-blue-900"
                                                          )}
                                                        >
                                                          <Check
                                                            className={cn(
                                                              "mr-2 h-4 w-4",
                                                              watchCombo(`items.${itemIndex}.inventoryProductId`) === invProduct?.id
                                                                ? "opacity-100"
                                                                : "opacity-0"
                                                            )}
                                                          />
                                                          {invProduct?.name}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <div className="col-span-12 md:col-span-3 space-y-2">
                                            <Label className="text-xs font-medium text-gray-700">Số lượng</Label>
                                            <Input
                                              type="text"
                                              placeholder="Số lượng"
                                              value={quantityInputValues[itemIndex] !== undefined ? quantityInputValues[itemIndex] : (watchCombo(`items.${itemIndex}.quantity`)?.toString() || "")}
                                              onChange={(e) => {
                                                const value = e.target.value
                                                // Chỉ cho phép số, cho phép rỗng để user có thể xóa hết
                                                const numbers = value.replace(/\D/g, '')
                                                // Cập nhật giá trị hiển thị
                                                setQuantityInputValues(prev => ({ ...prev, [itemIndex]: numbers }))
                                              }}
                                              onBlur={(e) => {
                                                const value = e.target.value
                                                const numbers = value.replace(/\D/g, '')
                                                // Kiểm tra lại sau khi user nhập xong
                                                const parsed = parseInt(numbers)
                                                if (!parsed || parsed < 1 || isNaN(parsed)) {
                                                  // Nếu không phải số hợp lệ hoặc <= 0, set về 1
                                                  setValueCombo(`items.${itemIndex}.quantity`, 1)
                                                  setQuantityInputValues(prev => {
                                                    const newValues = { ...prev }
                                                    delete newValues[itemIndex]
                                                    return newValues
                                                  })
                                                } else {
                                                  setValueCombo(`items.${itemIndex}.quantity`, parsed)
                                                  setQuantityInputValues(prev => {
                                                    const newValues = { ...prev }
                                                    delete newValues[itemIndex]
                                                    return newValues
                                                  })
                                                }
                                              }}
                                              className="h-9"
                                            />
                                          </div>
                                          <div className="col-span-12 md:col-span-2 flex justify-end items-end pb-1">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => removeComboItem(itemIndex)}
                                              className="h-8 w-8 text-gray-400 hover:text-red-500"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setIsAddComboOpen(false)
                                  resetCombo({ isActive: true, items: [] })
                                  setProductSearchValues({})
                                  setProductPopoverOpen({})
                                  setQuantityInputValues({})
                                }}
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

                      {/* Edit Combo Dialog */}
                      <Dialog open={isEditComboOpen} onOpenChange={(open) => {
                        setIsEditComboOpen(open)
                        if (!open) {
                          setEditingComboId(null)
                          resetCombo({ isActive: true, isPromotionActive: false, items: [] })
                          setProductSearchValues({})
                          setProductPopoverOpen({})
                          setQuantityInputValues({})
                        }
                      }}>
                        <DialogContent className="sm:max-w-[750px] max-h-[95vh] h-[90vh] flex flex-col">
                          <DialogHeader>
                            <DialogTitle className="text-lg font-semibold">Chỉnh sửa option</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleSubmitCombo((data) => {
                            if (!editingComboId) return
                            if (!data.items || data.items.length === 0) {
                              toast.error("Vui lòng thêm ít nhất 1 sản phẩm chính")
                              return
                            }
                            const mainProducts = data.items.filter(item => !item.isGift)
                            if (mainProducts.length === 0) {
                              toast.error("Vui lòng thêm ít nhất 1 sản phẩm chính")
                              return
                            }
                            for (const item of data.items) {
                              if (!item.inventoryProductId) {
                                toast.error("Vui lòng chọn đầy đủ sản phẩm")
                                return
                              }
                              if (!item.quantity || item.quantity < 1) {
                                toast.error("Số lượng sản phẩm phải lớn hơn 0")
                                return
                              }
                            }
                            updateComboMutation.mutate({ comboId: editingComboId, data })
                          })} className="flex flex-col flex-1 min-h-0 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="edit-combo-name">Tên option <span className="text-red-500">*</span></Label>
                                <Input
                                  id="edit-combo-name"
                                  {...registerCombo("name", { required: "Tên option là bắt buộc" })}
                                  placeholder="Nhập tên option"
                                />
                  </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-combo-price">Giá (VND) <span className="text-red-500">*</span></Label>
                                <Input
                                  id="edit-combo-price"
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
                            </div>

                            {/* Khuyến mãi */}
                            <div className="space-y-4 border-t pt-4">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={watchCombo("isPromotionActive") || false}
                                  onCheckedChange={(checked) => {
                                    setValueCombo("isPromotionActive", checked)
                                    if (!checked) {
                                      setValueCombo("promotionalPrice", undefined)
                                      setValueCombo("promotionStart", undefined)
                                      setValueCombo("promotionEnd", undefined)
                                    }
                                  }}
                                />
                                <Label className="text-sm font-semibold">Kích hoạt khuyến mãi</Label>
                              </div>

                              {watchCombo("isPromotionActive") && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-6 border-l-2 border-blue-200">
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-combo-promotional-price">Giá khuyến mãi (VND) <span className="text-red-500">*</span></Label>
                                    <Input
                                      id="edit-combo-promotional-price"
                                      placeholder="0"
                                      value={watchCombo("promotionalPrice") ? new Intl.NumberFormat("vi-VN").format(watchCombo("promotionalPrice") || 0) : ''}
                                      onChange={(e) => {
                                        const numbers = e.target.value.replace(/\D/g, '')
                                        const parsed = parseInt(numbers) || 0
                                        setValueCombo("promotionalPrice", parsed, { shouldValidate: true })
                                      }}
                                      onBlur={(e) => {
                                        const numbers = e.target.value.replace(/\D/g, '')
                                        const parsed = parseInt(numbers) || 0
                                        if (parsed > 0) {
                                          setValueCombo("promotionalPrice", parsed, { shouldValidate: true })
                                        }
                                      }}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-combo-promotion-start">Ngày bắt đầu</Label>
                                    <Input
                                      id="edit-combo-promotion-start"
                                      type="date"
                                      value={watchCombo("promotionStart") ? new Date(watchCombo("promotionStart")!).toISOString().split('T')[0] : ""}
                                      onChange={(e) => {
                                        const dateValue = e.target.value
                                        if (dateValue) {
                                          // Set time to start of day (00:00:00)
                                          const date = new Date(dateValue)
                                          date.setHours(0, 0, 0, 0)
                                          setValueCombo("promotionStart", date.toISOString())
                                        } else {
                                          setValueCombo("promotionStart", undefined)
                                        }
                                      }}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-combo-promotion-end">Ngày kết thúc</Label>
                                    <Input
                                      id="edit-combo-promotion-end"
                                      type="date"
                                      value={watchCombo("promotionEnd") ? new Date(watchCombo("promotionEnd")!).toISOString().split('T')[0] : ""}
                                      onChange={(e) => {
                                        const dateValue = e.target.value
                                        if (dateValue) {
                                          // Set time to end of day (23:59:59)
                                          const date = new Date(dateValue)
                                          date.setHours(23, 59, 59, 999)
                                          setValueCombo("promotionEnd", date.toISOString())
                                        } else {
                                          setValueCombo("promotionEnd", undefined)
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Option Items - Tái sử dụng phần form từ dialog thêm */}
                            <div className="space-y-6 border-t pt-4 flex flex-col flex-1 min-h-0">
                              {/* Sản phẩm chính */}
                              <div className="space-y-3 flex flex-col flex-1 min-h-0">
                                <div className="flex items-center justify-between flex-shrink-0">
                                  <Label className="text-sm font-semibold">Sản phẩm chính <span className="text-red-500">*</span></Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => appendComboItem({ inventoryProductId: "", quantity: 1, isGift: false })}
                                  >
                                    <Plus className="mr-2 h-3 w-3" />
                                    Thêm sản phẩm
                                  </Button>
                                </div>
                                <div ref={scrollContainerRef} className="space-y-3 overflow-y-auto max-h-[400px] pr-2 flex-1">
                                  {comboItemFields.map((field, itemIndex) => {
                                    const isGift = watchCombo(`items.${itemIndex}.isGift`) || false
                                    if (isGift) return null
                                    
                                    return (
                                      <div key={field.id} className="flex gap-2 items-start p-4 border rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                                        <div className="flex-1 grid grid-cols-12 gap-3">
                                          <div className="col-span-12 md:col-span-7 space-y-2">
                                            <Label className="text-xs font-medium text-gray-700">Sản phẩm</Label>
                                            <div className="relative product-search-dropdown" data-dropdown-item={itemIndex}>
                                              <Input
                                                type="text"
                                                placeholder="Chọn sản phẩm trong kho"
                                                value={
                                                  productSearchValues[itemIndex] !== undefined
                                                    ? productSearchValues[itemIndex]
                                                    : watchCombo(`items.${itemIndex}.inventoryProductId`)
                                                      ? inventoryProducts?.find(
                                                          (ip: any) => ip?.id === watchCombo(`items.${itemIndex}.inventoryProductId`)
                                                        )?.name || ""
                                                      : ""
                                                }
                                                onChange={(e) => {
                                                  const searchValue = e.target.value
                                                  setProductSearchValues(prev => ({ ...prev, [itemIndex]: searchValue }))
                                                  if (searchValue) {
                                                    setProductPopoverOpen(prev => ({ ...prev, [itemIndex]: true }))
                                                  }
                                                  if (!searchValue) {
                                                    setValueCombo(`items.${itemIndex}.inventoryProductId`, "")
                                                    setProductSearchValues(prev => ({ ...prev, [itemIndex]: "" }))
                                                  }
                                                }}
                                                onFocus={() => {
                                                  setProductPopoverOpen(prev => ({ ...prev, [itemIndex]: true }))
                                                }}
                                                className="h-9 pr-8"
                                              />
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setProductPopoverOpen(prev => ({ ...prev, [itemIndex]: !prev[itemIndex] }))
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center hover:bg-gray-100 rounded z-10"
                                              >
                                                <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                              </button>
                                              
                                              {productPopoverOpen[itemIndex] && (
                                                <div className="absolute z-50 w-full mt-1 rounded-md border bg-white max-h-[300px] overflow-y-auto">
                                                  {inventoryProducts?.filter((ip: any) => {
                                                    if (ip?.isActive === false) return false
                                                    const searchValue = productSearchValues[itemIndex]?.toLowerCase() || ""
                                                    if (!searchValue) return true
                                                    return ip?.name?.toLowerCase().includes(searchValue)
                                                  }).length === 0 ? (
                                                    <div className="p-4 text-center text-sm text-gray-500">
                                                      Không tìm thấy sản phẩm.
                                                    </div>
                                                  ) : (
                                                    <div className="p-1">
                                                      {inventoryProducts?.filter((ip: any) => {
                                                        if (ip?.isActive === false) return false
                                                        const searchValue = productSearchValues[itemIndex]?.toLowerCase() || ""
                                                        if (!searchValue) return true
                                                        return ip?.name?.toLowerCase().includes(searchValue)
                                                      })?.map((invProduct: any) => (
                                                        <div
                                                          key={invProduct?.id}
                                                          onClick={() => {
                                                            setValueCombo(`items.${itemIndex}.inventoryProductId`, invProduct?.id)
                                                            setProductSearchValues(prev => ({ ...prev, [itemIndex]: invProduct?.name }))
                                                            setProductPopoverOpen(prev => ({ ...prev, [itemIndex]: false }))
                                                          }}
                                                          className={cn(
                                                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-blue-50 hover:text-blue-900",
                                                            watchCombo(`items.${itemIndex}.inventoryProductId`) === invProduct?.id && "bg-blue-100 text-blue-900"
                                                          )}
                                                        >
                                                          <Check
                                                            className={cn(
                                                              "mr-2 h-4 w-4",
                                                              watchCombo(`items.${itemIndex}.inventoryProductId`) === invProduct?.id
                                                                ? "opacity-100"
                                                                : "opacity-0"
                                                            )}
                                                          />
                                                          {invProduct?.name}
                                                        </div>
                                                      ))}
                          </div>
                        )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <div className="col-span-12 md:col-span-3 space-y-2">
                                            <Label className="text-xs font-medium text-gray-700">Số lượng</Label>
                                            <Input
                                              type="text"
                                              placeholder="Số lượng"
                                              value={quantityInputValues[itemIndex] !== undefined ? quantityInputValues[itemIndex] : (watchCombo(`items.${itemIndex}.quantity`)?.toString() || "")}
                                              onChange={(e) => {
                                                const value = e.target.value
                                                const numbers = value.replace(/\D/g, '')
                                                setQuantityInputValues(prev => ({ ...prev, [itemIndex]: numbers }))
                                              }}
                                              onBlur={(e) => {
                                                const value = e.target.value
                                                const numbers = value.replace(/\D/g, '')
                                                const parsed = parseInt(numbers)
                                                if (!parsed || parsed < 1 || isNaN(parsed)) {
                                                  setValueCombo(`items.${itemIndex}.quantity`, 1)
                                                  setQuantityInputValues(prev => {
                                                    const newValues = { ...prev }
                                                    delete newValues[itemIndex]
                                                    return newValues
                                                  })
                                                } else {
                                                  setValueCombo(`items.${itemIndex}.quantity`, parsed)
                                                  setQuantityInputValues(prev => {
                                                    const newValues = { ...prev }
                                                    delete newValues[itemIndex]
                                                    return newValues
                                                  })
                                                }
                                              }}
                                              className="h-9"
                                            />
                                          </div>
                                          <div className="col-span-12 md:col-span-2 flex justify-end items-end pb-1">
                                            {(comboItemFields.filter((_, idx) => !watchCombo(`items.${idx}.isGift`)).length > 1 || comboItemFields.filter((_, idx) => watchCombo(`items.${idx}.isGift`)).length > 0) && (
                          <Button
                                                type="button"
                            variant="ghost"
                            size="icon"
                                                onClick={() => removeComboItem(itemIndex)}
                                                className="h-8 w-8 text-gray-400 hover:text-red-500"
                          >
                                                <Trash2 className="h-3 w-3" />
                          </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                        </div>

                              {/* Sản phẩm tặng kèm */}
                              <div className="space-y-3 flex flex-col flex-1 min-h-0 border-t pt-4">
                                <div className="flex items-center justify-between flex-shrink-0">
                                  <Label className="text-sm font-semibold">Sản phẩm tặng kèm</Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => appendComboItem({ inventoryProductId: "", quantity: 1, isGift: true })}
                                  >
                                    <Plus className="mr-2 h-3 w-3" />
                                    Thêm sản phẩm
                                  </Button>
                                </div>
                                <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2 flex-1">
                                  {comboItemFields.map((field, itemIndex) => {
                                    const isGift = watchCombo(`items.${itemIndex}.isGift`) || false
                                    if (!isGift) return null
                                    
                                    return (
                                      <div key={field.id} className="flex gap-2 items-start p-4 border rounded-lg bg-green-50/50 hover:bg-green-100/50 transition-colors border-green-200">
                                        <div className="flex-1 grid grid-cols-12 gap-3">
                                          <div className="col-span-12 md:col-span-7 space-y-2">
                                            <Label className="text-xs font-medium text-gray-700">Sản phẩm</Label>
                                            <div className="relative product-search-dropdown" data-dropdown-item={itemIndex}>
                                              <Input
                                                type="text"
                                                placeholder="Chọn sản phẩm trong kho"
                                                value={
                                                  productSearchValues[itemIndex] !== undefined
                                                    ? productSearchValues[itemIndex]
                                                    : watchCombo(`items.${itemIndex}.inventoryProductId`)
                                                      ? inventoryProducts?.find(
                                                          (ip: any) => ip?.id === watchCombo(`items.${itemIndex}.inventoryProductId`)
                                                        )?.name || ""
                                                      : ""
                                                }
                                                onChange={(e) => {
                                                  const searchValue = e.target.value
                                                  setProductSearchValues(prev => ({ ...prev, [itemIndex]: searchValue }))
                                                  if (searchValue) {
                                                    setProductPopoverOpen(prev => ({ ...prev, [itemIndex]: true }))
                                                  }
                                                  if (!searchValue) {
                                                    setValueCombo(`items.${itemIndex}.inventoryProductId`, "")
                                                    setProductSearchValues(prev => ({ ...prev, [itemIndex]: "" }))
                                                  }
                                                }}
                                                onFocus={() => {
                                                  setProductPopoverOpen(prev => ({ ...prev, [itemIndex]: true }))
                                                }}
                                                className="h-9 pr-8"
                                              />
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setProductPopoverOpen(prev => ({ ...prev, [itemIndex]: !prev[itemIndex] }))
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center hover:bg-gray-100 rounded z-10"
                                              >
                                                <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                              </button>
                                              
                                              {productPopoverOpen[itemIndex] && (
                                                <div className="absolute z-50 w-full mt-1 rounded-md border bg-white max-h-[300px] overflow-y-auto">
                                                  {inventoryProducts?.filter((ip: any) => {
                                                    if (ip?.isActive === false) return false
                                                    const searchValue = productSearchValues[itemIndex]?.toLowerCase() || ""
                                                    if (!searchValue) return true
                                                    return ip?.name?.toLowerCase().includes(searchValue)
                                                  }).length === 0 ? (
                                                    <div className="p-4 text-center text-sm text-gray-500">
                                                      Không tìm thấy sản phẩm.
                                                    </div>
                                                  ) : (
                                                    <div className="p-1">
                                                      {inventoryProducts?.filter((ip: any) => {
                                                        if (ip?.isActive === false) return false
                                                        const searchValue = productSearchValues[itemIndex]?.toLowerCase() || ""
                                                        if (!searchValue) return true
                                                        return ip?.name?.toLowerCase().includes(searchValue)
                                                      })?.map((invProduct: any) => (
                                                        <div
                                                          key={invProduct?.id}
                                                          onClick={() => {
                                                            setValueCombo(`items.${itemIndex}.inventoryProductId`, invProduct?.id)
                                                            setProductSearchValues(prev => ({ ...prev, [itemIndex]: invProduct?.name }))
                                                            setProductPopoverOpen(prev => ({ ...prev, [itemIndex]: false }))
                                                          }}
                                                          className={cn(
                                                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-blue-50 hover:text-blue-900",
                                                            watchCombo(`items.${itemIndex}.inventoryProductId`) === invProduct?.id && "bg-blue-100 text-blue-900"
                                                          )}
                                                        >
                                                          <Check
                                                            className={cn(
                                                              "mr-2 h-4 w-4",
                                                              watchCombo(`items.${itemIndex}.inventoryProductId`) === invProduct?.id
                                                                ? "opacity-100"
                                                                : "opacity-0"
                                                            )}
                                                          />
                                                          {invProduct?.name}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <div className="col-span-12 md:col-span-3 space-y-2">
                                            <Label className="text-xs font-medium text-gray-700">Số lượng</Label>
                                            <Input
                                              type="text"
                                              placeholder="Số lượng"
                                              value={quantityInputValues[itemIndex] !== undefined ? quantityInputValues[itemIndex] : (watchCombo(`items.${itemIndex}.quantity`)?.toString() || "")}
                                              onChange={(e) => {
                                                const value = e.target.value
                                                const numbers = value.replace(/\D/g, '')
                                                setQuantityInputValues(prev => ({ ...prev, [itemIndex]: numbers }))
                                              }}
                                              onBlur={(e) => {
                                                const value = e.target.value
                                                const numbers = value.replace(/\D/g, '')
                                                const parsed = parseInt(numbers)
                                                if (!parsed || parsed < 1 || isNaN(parsed)) {
                                                  setValueCombo(`items.${itemIndex}.quantity`, 1)
                                                  setQuantityInputValues(prev => {
                                                    const newValues = { ...prev }
                                                    delete newValues[itemIndex]
                                                    return newValues
                                                  })
                                                } else {
                                                  setValueCombo(`items.${itemIndex}.quantity`, parsed)
                                                  setQuantityInputValues(prev => {
                                                    const newValues = { ...prev }
                                                    delete newValues[itemIndex]
                                                    return newValues
                                                  })
                                                }
                                              }}
                                              className="h-9"
                                            />
                                          </div>
                                          <div className="col-span-12 md:col-span-2 flex justify-end items-end pb-1">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => removeComboItem(itemIndex)}
                                              className="h-8 w-8 text-gray-400 hover:text-red-500"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                          </div>

                            <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setIsEditComboOpen(false)
                                  setEditingComboId(null)
                                  resetCombo({ isActive: true, isPromotionActive: false, items: [] })
                                  setProductSearchValues({})
                                  setProductPopoverOpen({})
                                  setQuantityInputValues({})
                                }}
                              >
                                Hủy
                              </Button>
                              <Button type="submit" disabled={updateComboMutation.isPending}>
                                {updateComboMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Cập nhật
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                {activeCombos.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 whitespace-nowrap">STT</TableHead>
                          <TableHead className="whitespace-nowrap">Tên option</TableHead>
                          <TableHead className="whitespace-nowrap">Giá</TableHead>
                          <TableHead className="whitespace-nowrap">Sản phẩm chính</TableHead>
                          <TableHead className="whitespace-nowrap">Sản phẩm tặng</TableHead>
                          <TableHead className="whitespace-nowrap">Ngày bắt đầu</TableHead>
                          <TableHead className="whitespace-nowrap">Ngày kết thúc</TableHead>
                          <TableHead className="w-20 whitespace-nowrap">Hành động</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeCombos.map((combo, index) => {
                          const mainProducts = combo?.items?.filter(item => !item.isGift) || []
                          const giftProducts = combo?.items?.filter(item => item.isGift) || []
                          
                          return (
                            <TableRow key={combo?.id}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell className="font-semibold">{combo?.name}</TableCell>
                              <TableCell>
                              {combo?.promotionalPrice && combo?.isPromotionActive ? (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-500 line-through">
                                      {formatPrice(combo.price)}
                                    </span>
                                      <Badge variant="destructive" className="text-xs px-1.5 py-0 font-bold">
                                      -{Math.round(((combo.price - combo.promotionalPrice) / combo.price) * 100)}%
                                    </Badge>
                                  </div>
                                    <div className="text-base font-bold text-red-600">
                                    {formatPrice(combo.promotionalPrice)}
                                  </div>
                                </div>
                              ) : (
                                  <div className="text-base font-bold text-gray-900">
                                  {formatPrice(combo?.price || 0)}
                                </div>
                              )}
                              </TableCell>
                              <TableCell>
                                {mainProducts.length > 0 ? (
                                  <div className="space-y-1.5 max-w-md">
                                    {mainProducts.map((item, idx) => (
                                      <div key={idx} className="flex items-center gap-2 text-sm">
                                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                        <span className="font-medium">{item.inventoryProduct?.name}</span>
                                        <span className="text-gray-500">x {item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                            )}
                              </TableCell>
                              <TableCell>
                                {giftProducts.length > 0 ? (
                                  <div className="space-y-1.5 max-w-md">
                                    {giftProducts.map((item, idx) => (
                                      <div key={idx} className="flex items-center gap-2 text-sm">
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                                        <span className="font-medium">{item.inventoryProduct?.name}</span>
                                        <span className="text-gray-500">x {item.quantity}</span>
                      </div>
                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {combo?.promotionStart ? (
                                  <span className="text-sm">
                                    {new Date(combo.promotionStart).toLocaleDateString("vi-VN")}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {combo?.promotionEnd ? (
                                  <span className="text-sm">
                                    {new Date(combo.promotionEnd).toLocaleDateString("vi-VN")}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditCombo(combo)}
                                  className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-4">
                      <ShoppingBag className="h-10 w-10 text-gray-400" />
                    </div>
                    <p className="text-base font-semibold mb-2 text-gray-700">Chưa có option nào</p>
                    <p className="text-sm text-gray-400 mb-6">Thêm option đầu tiên để khách hàng có thể lựa chọn</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => setIsAddComboOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Thêm option đầu tiên
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Edit Basic Info Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Chỉnh sửa thông tin cơ bản</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitEdit((data) => {
              if (!data?.categoryId) {
                toast.error("Vui lòng chọn danh mục")
                return
              }
              updateMutation.mutate(data)
            })} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Tên sản phẩm <span className="text-red-500">*</span></Label>
                <Input
                  id="edit-name"
                  {...registerEdit("name", { required: "Tên sản phẩm là bắt buộc" })}
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
                    {categories?.map?.((category: any) => (
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

        {/* Edit Image & Description Dialog */}
        <Dialog open={isEditImageDescOpen} onOpenChange={(open) => {
          setIsEditImageDescOpen(open)
          if (!open && product) {
            resetImageDesc({
              image: product?.image || "",
              description: product?.description || "",
            })
            setImageUrl(product?.image || "")
          }
        }}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa hình ảnh & mô tả</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitImageDesc((data) => {
              updateImageDescMutation.mutate({
                ...data,
                oldImageUrl: product?.image || ""
              })
            })} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Form */}
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Hình ảnh sản phẩm</Label>
                    <ImageUpload
                      value={watchImageDesc("image") || ""}
                      onChange={(url) => {
                        setValueImageDesc("image", url)
                        setImageUrl(url)
                      }}
                      folder="product-images"
                      disabled={updateImageDescMutation.isPending}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-desc" className="text-sm font-semibold mb-2 block">
                      Mô tả sản phẩm
                    </Label>
                    <Textarea
                      id="edit-desc"
                      {...registerImageDesc("description")}
                      rows={12}
                      placeholder="Nhập mô tả sản phẩm (HTML được hỗ trợ)"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Bạn có thể sử dụng HTML để định dạng mô tả. Xem preview ở bên phải.
                    </p>
                  </div>
                </div>

                {/* Right Column - Preview */}
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <Label className="text-sm font-semibold">Preview</Label>
                    </div>
                    <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                      {/* Image Preview */}
                      <div className="mb-4">
                        <Label className="text-xs text-gray-500 mb-2 block">Hình ảnh:</Label>
                        {watchImageDesc("image") ? (
                          <div className="relative aspect-square w-full max-w-xs mx-auto rounded-lg overflow-hidden border border-gray-200">
                            <Image
                              src={watchImageDesc("image") || ""}
                              alt="Preview"
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="aspect-square w-full max-w-xs mx-auto rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                            <p className="text-sm text-gray-400">Chưa có hình ảnh</p>
                          </div>
                        )}
                      </div>

                      {/* Description Preview */}
                      <div>
                        <Label className="text-xs text-gray-500 mb-2 block">Mô tả:</Label>
                        {watchImageDesc("description") ? (
                          <div
                            className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none p-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[200px]"
                            dangerouslySetInnerHTML={{ __html: watchImageDesc("description") || "" }}
                          />
                        ) : (
                          <div className="text-sm text-gray-400 italic p-4 bg-gray-50 rounded-lg border border-gray-200 min-h-[200px] flex items-center justify-center">
                            Chưa có mô tả
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditImageDescOpen(false)
                    if (product) {
                      resetImageDesc({
                        image: product?.image || "",
                        description: product?.description || "",
                      })
                      setImageUrl(product?.image || "")
                    }
                  }}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={updateImageDescMutation.isPending}>
                  {updateImageDescMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cập nhật
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

