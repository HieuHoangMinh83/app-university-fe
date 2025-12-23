"use client"

import { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { clientsApi, ClientVoucher, RedeemVoucherDto } from "@/services/api/clients"
import { Order, ordersApi, CreateOrderDto } from "@/services/api/orders"
import { productsApi, Product } from "@/services/api/products"
import { vouchersApi, Voucher, CreateVoucherDto, VoucherType } from "@/services/api/vouchers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Loader2, ArrowLeft, Phone, MapPin, Gift, Calendar, User, ShoppingBag, TrendingUp, ChevronRight, Receipt, Plus, Trash2, Minus, ChevronsUpDown, Check, Sparkles, Coins } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { toast } from "sonner"

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const clientId = params.id as string
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false)
  const [isCreateVoucherOpen, setIsCreateVoucherOpen] = useState(false)
  const [isRedeemVoucherOpen, setIsRedeemVoucherOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("orders")
  const [quantityInputValues, setQuantityInputValues] = useState<Record<number, string>>({})
  const [productSearchValues, setProductSearchValues] = useState<Record<number, string>>({})
  const [productPopoverOpen, setProductPopoverOpen] = useState<Record<number, boolean>>({})
  const [comboSearchValues, setComboSearchValues] = useState<Record<number, string>>({})
  const [comboPopoverOpen, setComboPopoverOpen] = useState<Record<number, boolean>>({})
  const [voucherSearchValue, setVoucherSearchValue] = useState("")
  const [voucherPopoverOpen, setVoucherPopoverOpen] = useState(false)

  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => clientsApi.getById(clientId),
    enabled: !!clientId,
  })

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.getAll(),
  })

  const { data: vouchers, isLoading: isLoadingRedeemableVouchers } = useQuery({
    queryKey: ["redeemableVouchers"],
    queryFn: () => {
      console.log("[React Query] Fetching redeemable vouchers...");
      return vouchersApi.getRedeemableList();
    },
    enabled: true,
  })

  const { data: clientVouchers, isLoading: isLoadingClientVouchers } = useQuery({
    queryKey: ["clientVouchers", clientId],
    queryFn: () => {
      console.log("[React Query] Fetching client vouchers for clientId:", clientId);
      return clientsApi.getClientVouchers(clientId);
    },
    enabled: !!clientId,
  })

  // Orders are included in the client response
  const orders = client?.orders || []

  // Debug: Log khi data thay đổi
  useEffect(() => {
    console.log("[Debug] clientId:", clientId);
    console.log("[Debug] vouchers:", vouchers);
    console.log("[Debug] clientVouchers:", clientVouchers);
    console.log("[Debug] isLoadingRedeemableVouchers:", isLoadingRedeemableVouchers);
    console.log("[Debug] isLoadingClientVouchers:", isLoadingClientVouchers);
  }, [clientId, vouchers, clientVouchers, isLoadingRedeemableVouchers, isLoadingClientVouchers])

  // Get all products with active combos
  const productsWithCombos = useMemo(() => {
    if (!Array.isArray(products)) return []
    return products.filter((product: Product) => 
      product?.combos && Array.isArray(product.combos) && product.combos.some((combo) => combo?.isActive)
    )
  }, [products])

  // Extended form type to include productId temporarily
  interface OrderFormItem {
    productId?: string
    comboId: string
    quantity: number
  }

  interface OrderFormData {
    items: OrderFormItem[]
    clientVoucherId?: string
  }

  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors } } = useForm<OrderFormData>({
    defaultValues: {
      items: [],
      clientVoucherId: undefined,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  })

  const createOrderMutation = useMutation({
    mutationFn: (data: CreateOrderDto) => ordersApi.create(data, clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", clientId] })
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      setIsCreateOrderOpen(false)
      reset({ items: [], clientVoucherId: undefined })
      setQuantityInputValues({})
      setProductSearchValues({})
      setProductPopoverOpen({})
      setComboSearchValues({})
      setComboPopoverOpen({})
      toast.success("Tạo đơn hàng thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Tạo đơn hàng thất bại")
    },
  })

  // Voucher form
  const { register: registerVoucher, handleSubmit: handleSubmitVoucher, reset: resetVoucher, watch: watchVoucher, setValue: setValueVoucher, formState: { errors: errorsVoucher } } = useForm<CreateVoucherDto>({
    defaultValues: {
      type: "FIXED",
      isActive: true,
      isRedeemable: true,
      quantity: 0,
    }
  })

  const { control: controlRedeem, handleSubmit: handleSubmitRedeem, reset: resetRedeem, watch: watchRedeem, formState: { errors: errorsRedeem } } = useForm<RedeemVoucherDto>({
    defaultValues: {
      voucherId: "",
    },
  })

  const voucherType = watchVoucher("type")

  const createVoucherMutation = useMutation({
    mutationFn: (data: CreateVoucherDto) => vouchersApi.create({ ...data, isActive: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vouchers"] })
      setIsCreateVoucherOpen(false)
      resetVoucher({
        type: "FIXED",
        isActive: true,
        isRedeemable: true,
        quantity: 0,
      })
      toast.success("Tạo voucher thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Tạo voucher thất bại")
    },
  })

  const redeemVoucherMutation = useMutation({
    mutationFn: (data: RedeemVoucherDto) => clientsApi.redeemVoucher(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", clientId] })
      queryClient.invalidateQueries({ queryKey: ["clientVouchers", clientId] })
      setIsRedeemVoucherOpen(false)
      resetRedeem()
      toast.success("Đổi voucher thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Đổi voucher thất bại")
    },
  })

  const onSubmitVoucher = (data: CreateVoucherDto) => {
    createVoucherMutation.mutate({ ...data, isActive: true })
  }

  const onSubmitRedeem = (data: RedeemVoucherDto) => {
    redeemVoucherMutation.mutate(data)
  }

  // Sync search values when productId or comboId changes
  useEffect(() => {
    fields.forEach((field, index) => {
      const productId = watch(`items.${index}.productId`)
      const comboId = watch(`items.${index}.comboId`)
      
      // Sync product search value
      if (productId) {
        const selectedProduct = productsWithCombos.find((p: Product) => p.id === productId)
        if (selectedProduct && productSearchValues[index] !== selectedProduct.name) {
          setProductSearchValues(prev => ({ ...prev, [index]: selectedProduct.name }))
        }
      } else if (productSearchValues[index]) {
        // Clear if productId is cleared
        setProductSearchValues(prev => {
          const newValues = { ...prev }
          delete newValues[index]
          return newValues
        })
      }
      
      // Sync combo search value
      if (comboId && productId) {
        const selectedProduct = productsWithCombos.find((p: Product) => p.id === productId)
        const availableCombos = selectedProduct?.combos?.filter((c) => c?.isActive) || []
        const selectedCombo = availableCombos.find((c) => c.id === comboId)
        if (selectedCombo && comboSearchValues[index] !== selectedCombo.name) {
          setComboSearchValues(prev => ({ ...prev, [index]: selectedCombo.name }))
        }
      } else if (comboSearchValues[index]) {
        // Clear if comboId is cleared
        setComboSearchValues(prev => {
          const newValues = { ...prev }
          delete newValues[index]
          return newValues
        })
      }
    })
  }, [fields, watch, productsWithCombos, productSearchValues, comboSearchValues])

  // Sync voucher search value when voucherId changes
  useEffect(() => {
    if (isRedeemVoucherOpen && vouchers) {
      const voucherId = watchRedeem("voucherId")
      if (voucherId) {
        const selectedVoucher = Array.isArray(vouchers) 
          ? vouchers.find((v: Voucher) => v.id === voucherId)
          : null
        if (selectedVoucher && voucherSearchValue !== selectedVoucher.name) {
          setVoucherSearchValue(selectedVoucher.name)
        }
      } else if (voucherSearchValue) {
        setVoucherSearchValue("")
      }
    }
  }, [watchRedeem("voucherId"), vouchers, isRedeemVoucherOpen, voucherSearchValue])


  // Close voucher dropdown when clicking outside
  useEffect(() => {
    if (!voucherPopoverOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-voucher-dropdown]')) {
        setVoucherPopoverOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [voucherPopoverOpen])

  const onSubmitOrder = (data: OrderFormData) => {
    if (!data.items || data.items.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 combo")
      return
    }
    
    // Validate all items have comboId
    for (const item of data.items) {
      if (!item.comboId) {
        toast.error("Vui lòng chọn đầy đủ combo cho tất cả sản phẩm")
        return
      }
      if (!item.quantity || item.quantity < 1) {
        toast.error("Số lượng phải lớn hơn 0")
        return
      }
    }
    
    // Convert to CreateOrderDto format
    // Theo README, khi tạo order phải dùng clientVoucherId (id của ClientVoucher)
    const orderData: CreateOrderDto = {
      items: data.items.map(item => ({
        comboId: item.comboId,
        quantity: item.quantity,
      })),
      clientVoucherId: data.clientVoucherId,
    }
    
    createOrderMutation.mutate(orderData)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price)
  }

  // Watch items to trigger recalculation - watch entire form to catch all changes
  const formValues = watch()
  const watchedItems = formValues.items || []
  const watchedClientVoucherId = formValues.clientVoucherId
  
  // Calculate order total price
  const orderTotal = useMemo(() => {
    const items = watchedItems
    
    // Calculate subtotal using reduce
    const subtotal = items.reduce((sum: number, item: OrderFormItem) => {
      if (!item.comboId || !item.quantity) return sum
      
      // Find the combo price
      const product = productsWithCombos.find((p: Product) => p.id === item.productId)
      const combo = product?.combos?.find((c) => c.id === item.comboId && c.isActive)
      
      if (combo) {
        const comboPrice = combo.isPromotionActive && combo.promotionalPrice 
          ? combo.promotionalPrice 
          : combo.price
        return sum + (comboPrice * item.quantity)
      }
      
      return sum
    }, 0)

    // Calculate voucher discount
    const selectedClientVoucher = Array.isArray(clientVouchers) 
      ? clientVouchers.find((cv: ClientVoucher) => cv.id === watchedClientVoucherId && cv.isActive && !cv.isUsed)
      : null

    let discount = 0
    if (selectedClientVoucher?.voucher) {
      const voucher = selectedClientVoucher.voucher
      if (voucher.type === "PERCENT") {
        discount = (subtotal * (voucher.percent || 0)) / 100
        if (voucher.hasMaxPrice && voucher.maxPrice && discount > voucher.maxPrice) {
          discount = voucher.maxPrice
        }
      } else {
        discount = voucher.price || 0
      }
    }

    const total = Math.max(0, subtotal - discount)

    return {
      subtotal,
      discount,
      total,
      clientVoucher: selectedClientVoucher,
    }
  }, [formValues, watchedItems, watchedClientVoucherId, productsWithCombos, clientVouchers])

  // Auto-clear selected voucher if it no longer meets conditions
  useEffect(() => {
    const selectedClientVoucherId = watch("clientVoucherId")
    if (!selectedClientVoucherId || !Array.isArray(clientVouchers)) return
    
    const selectedClientVoucher = clientVouchers.find(
      (cv: ClientVoucher) => cv.id === selectedClientVoucherId && cv.isActive && !cv.isUsed
    )
    
    if (!selectedClientVoucher?.voucher) {
      // Voucher not found or invalid, clear it
      setValue("clientVoucherId", undefined)
      return
    }
    
    const voucher = selectedClientVoucher.voucher
    // Check if voucher still meets minApply requirement
    if (voucher.minApply && voucher.minApply > 0 && orderTotal.subtotal < voucher.minApply) {
      setValue("clientVoucherId", undefined)
      toast.info(`Voucher "${voucher.name}" không còn phù hợp với đơn hàng ${formatPrice(orderTotal.subtotal)}. Yêu cầu đơn hàng tối thiểu ${formatPrice(voucher.minApply)}.`)
    }
  }, [orderTotal.subtotal, clientVouchers, watch("clientVoucherId"), setValue])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      PENDING: "secondary",
      PAID: "default",
      CANCELLED: "destructive",
    }
    const labels: Record<string, string> = {
      PENDING: "Chờ xử lý",
      PAID: "Đã thanh toán",
      CANCELLED: "Đã hủy",
    }
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>
  }

  if (isLoadingClient) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">Không tìm thấy khách hàng</p>
          <Link href="/customers">
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
      <div className="space-y-6 w-full">
        {/* Main Card Container */}
        <Card className="shadow-sm border-gray-200">
          <div className="p-6 pb-3">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/customers" className="text-gray-600 text-lg hover:text-gray-900">
                    Quản lý khách hàng
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-6 w-6" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <span className="text-blue-500 font-medium text-lg">Chi tiết khách hàng</span>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Card 1: Thông tin khách hàng */}
              <Card className="shadow-md border-gray-200 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    Thông tin khách hàng
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                    <Avatar className="h-20 w-20 border-2 border-gray-200">
                      <AvatarImage src={client?.avatar || undefined} alt={client?.name} />
                      <AvatarFallback className="text-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                        {client?.name?.charAt?.(0)?.toUpperCase() || "K"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{client?.name}</h2>
                      <p className="text-sm text-gray-500 mt-1">ID: {client?.id?.slice?.(0, 8)}...</p>
                    </div>
                  </div>

                  <form className="space-y-6">
                    {/* Phone */}
                    <div className="space-y-2">
                      <Label htmlFor="client-phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-blue-600" />
                        Số điện thoại
                      </Label>
                      <Input
                        id="client-phone"
                        value={client?.phone || ""}
                        readOnly
                        className="bg-gray-50 border-gray-200 text-gray-900 cursor-default"
                      />
                    </div>

                    {/* Address */}
                    {client?.address && (
                      <div className="space-y-2">
                        <Label htmlFor="client-address" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          Địa chỉ
                        </Label>
                        <Input
                          id="client-address"
                          value={client?.address || ""}
                          readOnly
                          className="bg-gray-50 border-gray-200 text-gray-900 cursor-default"
                        />
                      </div>
                    )}

                    {/* Points and Status Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="client-points" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Gift className="h-4 w-4 text-green-600" />
                          Điểm tích lũy
                        </Label>
                        <div className="bg-gray-50 border-gray-200 rounded-md px-3 py-2">
                          <Badge variant="outline" className="text-base font-semibold">
                            {client?.point || 0} điểm
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="client-status" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <User className="h-4 w-4 text-purple-600" />
                          Trạng thái
                        </Label>
                        <div className="bg-gray-50 border-gray-200 rounded-md px-3 py-2">
                          {client?.zaloId ? (
                            <Badge variant="default" className="text-sm">Đã đăng ký</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-sm">Chưa đăng ký</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Created Date */}
                    <div className="space-y-2">
                      <Label htmlFor="client-created" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        Ngày tạo
                      </Label>
                      <Input
                        id="client-created"
                        value={
                          client?.createdAt
                            ? new Date(client.createdAt).toLocaleDateString("vi-VN", {
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

              {/* Card 2: Thống kê */}
              <Card className="shadow-md border-gray-200 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                    Thống kê
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-6">
                    <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <ShoppingBag className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 font-medium">Tổng số đơn hàng</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{orders?.length || 0}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Receipt className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 font-medium">Tổng giá trị đơn hàng</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">
                              {orders?.reduce?.((sum: number, order: Order) => sum + (order?.totalPrice || 0), 0)
                                ? formatPrice(
                                    orders.reduce((sum: number, order: Order) => sum + (order?.totalPrice || 0), 0)
                                  )
                                : formatPrice(0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Gift className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 font-medium">Số lượt quay</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{client?.spinCount || 0}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Orders and Vouchers List with Tabs */}
            <Card className="shadow-md border-gray-200 overflow-hidden">
              <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-0">
                    <TabsList className="inline-flex h-auto items-center justify-start rounded-none bg-transparent p-0 gap-6">
                      <TabsTrigger 
                        value="orders" 
                        className="flex items-center gap-2 rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 text-sm font-medium text-gray-600 transition-none data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 data-[state=active]:shadow-none hover:text-gray-900"
                      >
                        <Receipt className="h-4 w-4" />
                        Đơn hàng
                        {orders && orders.length > 0 && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {orders.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger 
                        value="vouchers" 
                        className="flex items-center gap-2 rounded-none border-b-2 border-transparent bg-transparent px-0 py-3 text-sm font-medium text-gray-600 transition-none data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 data-[state=active]:shadow-none hover:text-gray-900"
                      >
                        <Gift className="h-4 w-4" />
                        Voucher
                        {clientVouchers && Array.isArray(clientVouchers) && clientVouchers.length > 0 && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {clientVouchers.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                    <div className="flex gap-2">
                      {activeTab === "orders" && (
                        <Button
                          size="sm"
                          className="gap-2 shadow-sm bg-blue-600 hover:bg-blue-700"
                          onClick={() => setIsCreateOrderOpen(true)}
                        >
                          <Plus className="h-4 w-4" />
                          Tạo đơn hàng
                        </Button>
                      )}
                      {activeTab === "vouchers" && (
                        <Button
                          size="sm"
                          className="gap-2 shadow-sm bg-green-600 hover:bg-green-700"
                          onClick={() => setIsRedeemVoucherOpen(true)}
                        >
                          <Plus className="h-4 w-4" />
                          Đổi voucher
                        </Button>
                      )}
                    </div>
                  </div>

                  <TabsContent value="orders" className="mt-4">
                    {isLoadingClient ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : orders && orders.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Mã đơn hàng</TableHead>
                              <TableHead>Trạng thái</TableHead>
                              <TableHead>Số sản phẩm</TableHead>
                              <TableHead>Tổng tiền</TableHead>
                              <TableHead>Ngày tạo</TableHead>
                              <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orders?.map((order: Order) => (
                              <TableRow key={order?.id}>
                                <TableCell className="font-medium">
                                  #{order?.id?.slice?.(0, 8)}...
                                </TableCell>
                                <TableCell>{order?.status && getStatusBadge(order.status)}</TableCell>
                                <TableCell>{order?.items?.length || 0}</TableCell>
                                <TableCell className="font-medium">
                                  {order?.totalPrice ? formatPrice(order.totalPrice) : "-"}
                                </TableCell>
                                <TableCell>
                                  {order?.createdAt
                                    ? new Date(order.createdAt).toLocaleDateString("vi-VN")
                                    : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Link href={`/orders/${order?.id}`}>
                                    <Button variant="ghost" size="sm">
                                      Xem chi tiết
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-16 text-gray-500">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-4 shadow-sm">
                          <Receipt className="h-10 w-10 text-gray-400" />
                        </div>
                        <p className="text-base font-semibold mb-2 text-gray-700">Chưa có đơn hàng nào</p>
                        <p className="text-sm text-gray-400">Khách hàng này chưa có đơn hàng nào</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="vouchers" className="mt-4">
                    {isLoadingClientVouchers ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : clientVouchers && Array.isArray(clientVouchers) && clientVouchers.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Tên voucher</TableHead>
                              <TableHead>Mô tả</TableHead>
                              <TableHead>Loại</TableHead>
                              <TableHead>Giá trị</TableHead>
                              <TableHead>Trạng thái</TableHead>
                              <TableHead>Ngày đổi</TableHead>
                              <TableHead>Hạn sử dụng</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {clientVouchers.map((clientVoucher: ClientVoucher) => (
                              <TableRow key={clientVoucher.id}>
                                <TableCell className="font-medium">{clientVoucher.voucher?.name}</TableCell>
                                <TableCell className="max-w-[300px]">
                                  <div className="text-sm text-gray-600 line-clamp-2">
                                    {clientVoucher.voucher?.description || (
                                      <span className="text-gray-400 italic">
                                        Giảm {clientVoucher.voucher?.type === "FIXED" 
                                          ? formatPrice(clientVoucher.voucher?.price || 0)
                                          : `${clientVoucher.voucher?.percent}%${clientVoucher.voucher?.hasMaxPrice && clientVoucher.voucher?.maxPrice ? ` (tối đa ${formatPrice(clientVoucher.voucher.maxPrice)})` : ""}`
                                        }
                                        {clientVoucher.voucher?.minApply && clientVoucher.voucher.minApply > 0 
                                          ? ` cho đơn từ ${formatPrice(clientVoucher.voucher.minApply)}`
                                          : " cho mọi đơn hàng"
                                        }
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={clientVoucher.voucher?.type === "FIXED" ? "default" : "secondary"}>
                                    {clientVoucher.voucher?.type === "FIXED" ? "Cố định" : "Phần trăm"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {clientVoucher.voucher?.type === "FIXED" 
                                    ? formatPrice(clientVoucher.voucher?.price || 0)
                                    : `${clientVoucher.voucher?.percent}%${clientVoucher.voucher?.hasMaxPrice && clientVoucher.voucher?.maxPrice ? ` (tối đa ${formatPrice(clientVoucher.voucher.maxPrice)})` : ""}`
                                  }
                                </TableCell>
                                <TableCell>
                                  <Badge variant={clientVoucher.isUsed ? "secondary" : "default"}>
                                    {clientVoucher.isUsed ? "Đã sử dụng" : "Chưa sử dụng"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {clientVoucher.createdAt 
                                    ? new Date(clientVoucher.createdAt).toLocaleDateString("vi-VN")
                                    : "-"}
                                </TableCell>
                                <TableCell>
                                  {clientVoucher.voucher?.useEnd 
                                    ? new Date(clientVoucher.voucher.useEnd).toLocaleDateString("vi-VN")
                                    : "Không giới hạn"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-16 text-gray-500">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-4 shadow-sm">
                          <Gift className="h-10 w-10 text-gray-400" />
                        </div>
                        <p className="text-base font-semibold mb-2 text-gray-700">Chưa có voucher nào</p>
                        <p className="text-sm text-gray-400">Khách hàng này chưa đổi voucher nào</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Create Order Dialog */}
        <Dialog open={isCreateOrderOpen} onOpenChange={(open) => {
          setIsCreateOrderOpen(open)
          if (!open) {
            reset({ items: [], clientVoucherId: undefined })
            setQuantityInputValues({})
            setProductSearchValues({})
            setProductPopoverOpen({})
            setComboSearchValues({})
            setComboPopoverOpen({})
          }
        }}>
          <DialogContent className="sm:max-w-[1000px] max-h-[95vh] min-h-[750px] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-center">Tạo đơn hàng mới</DialogTitle>
              <DialogDescription className="text-center">
                Thêm sản phẩm và combo vào đơn hàng cho khách hàng này
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmitOrder)} className="space-y-4">
              {/* Order Items */}
              <div className="space-y-4 ">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Sản phẩm <span className="text-red-500">*</span></Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ productId: "", comboId: "", quantity: 1 })}
                  >
                    <Plus className="mr-2 h-3 w-3" />
                    Thêm sản phẩm
                  </Button>
                </div>

                <div className="space-y-3 h-[350px] overflow-y-auto" id="order-items-scroll-container">
                  {fields.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                      <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>Chưa có sản phẩm nào</p>
                      <p className="text-sm mt-1">Nhấn &quot;Thêm sản phẩm&quot; để bắt đầu</p>
                    </div>
                  ) : (
                    fields.map((field, index) => {
                      const selectedProductId = watch(`items.${index}.productId`)
                      const selectedProduct = productsWithCombos.find((p: Product) => p.id === selectedProductId)
                      const availableCombos = selectedProduct?.combos?.filter((combo) => combo?.isActive) || []
                      
                      return (
                        <div key={field.id} data-item-index={index} className="p-4 border rounded-lg bg-gray-50/50">
                          <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-12 md:col-span-4 space-y-2">
                              <Label className="text-xs font-medium text-gray-700">Sản phẩm</Label>
                              <div className="relative">
                                <Input
                                  placeholder="Tìm kiếm sản phẩm"
                                  value={
                                    productSearchValues[index] !== undefined
                                      ? productSearchValues[index]
                                      : selectedProductId
                                        ? selectedProduct?.name || ""
                                        : ""
                                  }
                                  onChange={(e) => {
                                    const searchValue = e.target.value
                                    setProductSearchValues(prev => ({ ...prev, [index]: searchValue }))
                                    
                                    // Luôn mở popover khi có text hoặc đang nhập
                                    if (searchValue) {
                                      setProductPopoverOpen(prev => ({ ...prev, [index]: true }))
                                    }
                                    
                                    // Nếu xóa hết thì clear selection nhưng vẫn giữ popover mở
                                    if (!searchValue) {
                                      setValue(`items.${index}.productId`, "", { 
                                        shouldValidate: true,
                                        shouldDirty: true,
                                        shouldTouch: true
                                      })
                                      setValue(`items.${index}.comboId`, "", { 
                                        shouldValidate: true,
                                        shouldDirty: true,
                                        shouldTouch: true
                                      })
                                      setProductSearchValues(prev => ({ ...prev, [index]: "" }))
                                      setComboSearchValues(prev => ({ ...prev, [index]: "" }))
                                    }
                                  }}
                                  onFocus={() => {
                                    // Tự động mở popover khi focus vào input
                                    setProductPopoverOpen(prev => ({ ...prev, [index]: true }))
                                  }}
                                  className="h-9 pr-8"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setProductPopoverOpen(prev => ({ ...prev, [index]: !prev[index] }))
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center hover:bg-gray-100 rounded z-10 cursor-pointer"
                                >
                                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                </button>
                                
                                {/* Custom Dropdown với absolute positioning */}
                                {productPopoverOpen[index] && (
                                  <div className="absolute z-50 w-full mt-1 rounded-md border bg-white shadow-lg max-h-[300px] overflow-y-auto">
                                    {productsWithCombos.filter((product: Product) => {
                                      const searchValue = productSearchValues[index]?.toLowerCase() || ""
                                      if (!searchValue) return true
                                      return product?.name?.toLowerCase().includes(searchValue)
                                    }).length === 0 ? (
                                      <div className="p-4 text-center text-sm text-gray-500">
                                        Không tìm thấy sản phẩm.
                                      </div>
                                    ) : (
                                      <div className="p-1">
                                        {productsWithCombos.filter((product: Product) => {
                                          const searchValue = productSearchValues[index]?.toLowerCase() || ""
                                          if (!searchValue) return true
                                          return product?.name?.toLowerCase().includes(searchValue)
                                        }).map((product: Product) => (
                                          <div
                                            key={product.id}
                                            onClick={() => {
                                              setValue(`items.${index}.productId`, product.id, { 
                                                shouldValidate: true,
                                                shouldDirty: true,
                                                shouldTouch: true
                                              })
                                              setValue(`items.${index}.comboId`, "", { 
                                                shouldValidate: true,
                                                shouldDirty: true,
                                                shouldTouch: true
                                              })
                                              setProductSearchValues(prev => ({ ...prev, [index]: product.name }))
                                              setProductPopoverOpen(prev => ({ ...prev, [index]: false }))
                                              setComboSearchValues(prev => ({ ...prev, [index]: "" }))
                                              // Auto scroll to the item row in the scroll container
                                              setTimeout(() => {
                                                const scrollContainer = document.getElementById('order-items-scroll-container')
                                                const itemElement = document.querySelector(`[data-item-index="${index}"]`)
                                                if (scrollContainer && itemElement) {
                                                  const containerRect = scrollContainer.getBoundingClientRect()
                                                  const itemRect = itemElement.getBoundingClientRect()
                                                  const scrollTop = scrollContainer.scrollTop
                                                  const itemOffsetTop = itemRect.top - containerRect.top + scrollTop
                                                  
                                                  scrollContainer.scrollTo({
                                                    top: itemOffsetTop - 20, // Offset 20px from top
                                                    behavior: 'smooth'
                                                  })
                                                }
                                              }, 150)
                                            }}
                                            className={cn(
                                              "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-blue-50 hover:text-blue-900",
                                              selectedProductId === product.id && "bg-blue-100 text-blue-900"
                                            )}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedProductId === product.id
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              )}
                                            />
                                            {product.name}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <input
                                type="hidden"
                                {...register(`items.${index}.productId`, { required: "Vui lòng chọn sản phẩm" })}
                              />
                              {errors.items?.[index]?.productId && (
                                <p className="text-xs text-red-500 mt-1">{errors.items[index]?.productId?.message}</p>
                              )}
                            </div>
                            <div className="col-span-12 md:col-span-3 space-y-2">
                              <Label className="text-xs font-medium text-gray-700">Combo</Label>
                              <div className="relative">
                                <Input
                                  placeholder={!selectedProductId ? "Chọn sản phẩm trước" : availableCombos.length === 0 ? "Không có combo" : "Tìm kiếm combo"}
                                  value={
                                    comboSearchValues[index] !== undefined
                                      ? comboSearchValues[index]
                                      : watch(`items.${index}.comboId`)
                                        ? availableCombos.find((c) => c.id === watch(`items.${index}.comboId`))?.name || ""
                                        : ""
                                  }
                                  onChange={(e) => {
                                    const searchValue = e.target.value
                                    setComboSearchValues(prev => ({ ...prev, [index]: searchValue }))
                                    
                                    // Luôn mở popover khi có text hoặc đang nhập
                                    if (searchValue) {
                                      setComboPopoverOpen(prev => ({ ...prev, [index]: true }))
                                    }
                                    
                                    // Nếu xóa hết thì clear selection nhưng vẫn giữ popover mở
                                    if (!searchValue) {
                                      setValue(`items.${index}.comboId`, "", { 
                                        shouldValidate: true,
                                        shouldDirty: true,
                                        shouldTouch: true
                                      })
                                      setComboSearchValues(prev => ({ ...prev, [index]: "" }))
                                    }
                                  }}
                                  onFocus={() => {
                                    // Tự động mở popover khi focus vào input
                                    if (selectedProductId && availableCombos.length > 0) {
                                      setComboPopoverOpen(prev => ({ ...prev, [index]: true }))
                                    }
                                  }}
                                  disabled={!selectedProductId || availableCombos.length === 0}
                                  className="h-9 pr-8"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (selectedProductId && availableCombos.length > 0) {
                                      setComboPopoverOpen(prev => ({ ...prev, [index]: !prev[index] }))
                                    }
                                  }}
                                  disabled={!selectedProductId || availableCombos.length === 0}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center hover:bg-gray-100 rounded z-10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                </button>
                                
                                {/* Custom Dropdown với absolute positioning */}
                                {comboPopoverOpen[index] && selectedProductId && availableCombos.length > 0 && (
                                  <div className="absolute z-50 w-full mt-1 rounded-md border bg-white shadow-lg max-h-[300px] overflow-y-auto">
                                    {availableCombos.filter((combo) => {
                                      const searchValue = comboSearchValues[index]?.toLowerCase() || ""
                                      if (!searchValue) return true
                                      return combo?.name?.toLowerCase().includes(searchValue)
                                    }).length === 0 ? (
                                      <div className="p-4 text-center text-sm text-gray-500">
                                        Không tìm thấy combo.
                                      </div>
                                    ) : (
                                      <div className="p-1">
                                        {availableCombos.filter((combo) => {
                                          const searchValue = comboSearchValues[index]?.toLowerCase() || ""
                                          if (!searchValue) return true
                                          return combo?.name?.toLowerCase().includes(searchValue)
                                        }).map((combo) => (
                                          <div
                                            key={combo.id}
                                            onClick={() => {
                                              setValue(`items.${index}.comboId`, combo.id, { 
                                                shouldValidate: true,
                                                shouldDirty: true,
                                                shouldTouch: true
                                              })
                                              setComboSearchValues(prev => ({ ...prev, [index]: combo.name }))
                                              setComboPopoverOpen(prev => ({ ...prev, [index]: false }))
                                              // Auto scroll to the item row in the scroll container
                                              setTimeout(() => {
                                                const scrollContainer = document.getElementById('order-items-scroll-container')
                                                const itemElement = document.querySelector(`[data-item-index="${index}"]`)
                                                if (scrollContainer && itemElement) {
                                                  const containerRect = scrollContainer.getBoundingClientRect()
                                                  const itemRect = itemElement.getBoundingClientRect()
                                                  const scrollTop = scrollContainer.scrollTop
                                                  const itemOffsetTop = itemRect.top - containerRect.top + scrollTop
                                                  
                                                  scrollContainer.scrollTo({
                                                    top: itemOffsetTop - 20, // Offset 20px from top
                                                    behavior: 'smooth'
                                                  })
                                                }
                                              }, 150)
                                            }}
                                            className={cn(
                                              "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-blue-50 hover:text-blue-900",
                                              watch(`items.${index}.comboId`) === combo.id && "bg-blue-100 text-blue-900"
                                            )}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                watch(`items.${index}.comboId`) === combo.id
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              )}
                                            />
                                            <div className="flex-1">
                                              <div>{combo.name}</div>
                                              <div className="text-xs text-gray-500">
                                                {combo.isPromotionActive && combo.promotionalPrice
                                                  ? formatPrice(combo.promotionalPrice)
                                                  : formatPrice(combo.price)}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <input
                                type="hidden"
                                {...register(`items.${index}.comboId`, { required: "Vui lòng chọn combo" })}
                              />
                              {errors.items?.[index]?.comboId && (
                                <p className="text-xs text-red-500 mt-1">{errors.items[index]?.comboId?.message}</p>
                              )}
                            </div>
                            <div className="col-span-12 md:col-span-2 space-y-2">
                              <Label className="text-xs font-medium text-gray-700">Số lượng</Label>
                              <Input
                                type="text"
                                placeholder="Số lượng"
                                value={quantityInputValues[index] !== undefined ? quantityInputValues[index] : (watch(`items.${index}.quantity`)?.toString() || "")}
                                onChange={(e) => {
                                  const value = e.target.value
                                  // Chỉ cho phép số, cho phép rỗng để user có thể xóa hết
                                  const numbers = value.replace(/\D/g, '')
                                  // Cập nhật giá trị hiển thị
                                  setQuantityInputValues(prev => ({ ...prev, [index]: numbers }))
                                  // Update form value immediately for real-time calculation
                                  if (numbers) {
                                    const parsed = parseInt(numbers)
                                    if (parsed && parsed >= 1 && !isNaN(parsed)) {
                                      setValue(`items.${index}.quantity`, parsed, { 
                                        shouldValidate: true,
                                        shouldDirty: true,
                                        shouldTouch: true
                                      })
                                    } else if (!numbers) {
                                      // Clear if empty
                                      setValue(`items.${index}.quantity`, 0, { 
                                        shouldValidate: true,
                                        shouldDirty: true,
                                        shouldTouch: true
                                      })
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = e.target.value
                                  const numbers = value.replace(/\D/g, '')
                                  // Kiểm tra lại sau khi user nhập xong
                                  const parsed = parseInt(numbers)
                                  if (!parsed || parsed < 1 || isNaN(parsed)) {
                                    // Nếu không phải số hợp lệ hoặc <= 0, set về 1
                                    setValue(`items.${index}.quantity`, 1, { 
                                      shouldValidate: true,
                                      shouldDirty: true,
                                      shouldTouch: true
                                    })
                                    setQuantityInputValues(prev => {
                                      const newValues = { ...prev }
                                      delete newValues[index]
                                      return newValues
                                    })
                                  } else {
                                    setValue(`items.${index}.quantity`, parsed, { 
                                      shouldValidate: true,
                                      shouldDirty: true,
                                      shouldTouch: true
                                    })
                                    setQuantityInputValues(prev => {
                                      const newValues = { ...prev }
                                      delete newValues[index]
                                      return newValues
                                    })
                                  }
                                }}
                                className="h-9"
                              />
                              <input
                                type="hidden"
                                {...register(`items.${index}.quantity`, {
                                  required: "Số lượng là bắt buộc",
                                  min: { value: 1, message: "Số lượng phải lớn hơn 0" },
                                  valueAsNumber: true,
                                })}
                              />
                              {errors.items?.[index]?.quantity && (
                                <p className="text-xs text-red-500 mt-1">{errors.items[index]?.quantity?.message}</p>
                              )}
                            </div>
                            <div className="col-span-12 md:col-span-2 space-y-2 text-center">
                              <Label className="text-xs font-medium text-gray-700">Giá</Label>
                              {watch(`items.${index}.comboId`) ? (() => {
                                const selectedCombo = availableCombos.find((c) => c.id === watch(`items.${index}.comboId`))
                                if (!selectedCombo) {
                                  return (
                                    <div className="h-9 flex items-center text-sm text-gray-400">
                                      Chọn combo
                                    </div>
                                  )
                                }
                                const comboPrice = selectedCombo.isPromotionActive && selectedCombo.promotionalPrice 
                                  ? selectedCombo.promotionalPrice 
                                  : selectedCombo.price
                                const quantity = watch(`items.${index}.quantity`) || 0
                                const totalPrice = comboPrice * quantity
                                return (
                                  <div className="h-9 flex items-center justify-center w-full">
                                    <span className="text-sm font-semibold text-green-600">
                                      {formatPrice(totalPrice)}
                                    </span>
                                  </div>
                                )
                              })() : (
                                <div className="h-9 flex items-center text-sm text-gray-400">
                                  Chọn combo
                                </div>
                              )}
                            </div>
                            <div className="col-span-12 md:col-span-1 flex items-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  remove(index)
                                  // Update quantityInputValues after remove
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
                                  // Update productSearchValues after remove
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
                                  // Update productPopoverOpen after remove
                                  setProductPopoverOpen(prev => {
                                    const newValues: Record<number, boolean> = {}
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
                                  // Update comboSearchValues after remove
                                  setComboSearchValues(prev => {
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
                                  // Update comboPopoverOpen after remove
                                  setComboPopoverOpen(prev => {
                                    const newValues: Record<number, boolean> = {}
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
                                }}
                                className="h-9 w-9 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Voucher Selection */}
              {fields.length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <Label htmlFor="clientVoucher">Voucher trong ví (tùy chọn)</Label>
                  {(() => {
                    // Filter vouchers based on order subtotal and minApply condition
                    const availableClientVouchers = Array.isArray(clientVouchers) 
                      ? clientVouchers.filter((cv: ClientVoucher) => {
                          if (!cv?.isActive || cv?.isUsed) return false
                          const voucher = cv.voucher
                          if (!voucher) return false
                          // Check if order subtotal meets minApply requirement
                          if (voucher.minApply && voucher.minApply > 0) {
                            return orderTotal.subtotal >= voucher.minApply
                          }
                          return true
                        })
                      : []
                    
                    const selectedClientVoucherId = watch("clientVoucherId")
                    const selectedClientVoucher = selectedClientVoucherId 
                      ? availableClientVouchers.find((cv: ClientVoucher) => cv.id === selectedClientVoucherId)
                      : null
                    
                    // If voucher is selected, only show preview card
                    if (selectedClientVoucher) {
                      return (
                        <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                                <Gift className="h-5 w-5 text-purple-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 mb-1.5">
                                  {selectedClientVoucher.voucher?.name}
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed mb-2">
                                  {selectedClientVoucher.voucher?.description || (
                                    <>
                                      Giảm {selectedClientVoucher.voucher?.type === "FIXED" 
                                        ? formatPrice(selectedClientVoucher.voucher?.price || 0)
                                        : `${selectedClientVoucher.voucher?.percent}%${selectedClientVoucher.voucher?.hasMaxPrice && selectedClientVoucher.voucher?.maxPrice ? ` (tối đa ${formatPrice(selectedClientVoucher.voucher.maxPrice)})` : ""}`
                                      }
                                      {selectedClientVoucher.voucher?.minApply && selectedClientVoucher.voucher.minApply > 0 
                                        ? ` cho đơn từ ${formatPrice(selectedClientVoucher.voucher.minApply)}`
                                        : " cho mọi đơn hàng"
                                      }
                                    </>
                                  )}
                                </p>
                               
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setValue("clientVoucherId", undefined)}
                                className="h-10 w-10 text-gray-400 hover:text-red-500 flex-shrink-0 cursor-pointer"
                              >
                                <Trash2 className="h-10 w-10" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    }
                    
                    // If no voucher selected, show select input or empty state
                    return availableClientVouchers.length === 0 ? (
                      <div className="p-3 border border-dashed rounded-lg bg-gray-50 text-center text-sm text-gray-500">
                        {orderTotal.subtotal === 0 
                          ? "Thêm sản phẩm vào đơn hàng để xem voucher khả dụng"
                          : Array.isArray(clientVouchers) && clientVouchers.filter((cv: ClientVoucher) => cv?.isActive && !cv?.isUsed).length > 0
                            ? `Không có voucher nào phù hợp với đơn hàng ${formatPrice(orderTotal.subtotal)}. Voucher yêu cầu đơn hàng tối thiểu cao hơn.`
                            : "Không có voucher trong ví."
                        }
                      </div>
                    ) : (
                      <Select
                        value={watch("clientVoucherId") || undefined}
                        onValueChange={(value) => {
                          setValue("clientVoucherId", value || undefined)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn voucher trong ví (tùy chọn)" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[350px]">
                          {availableClientVouchers.map((clientVoucher: ClientVoucher) => (
                            <SelectItem 
                              key={clientVoucher.id} 
                              value={clientVoucher.id}
                              className="px-0 py-0 h-auto cursor-pointer"
                            >
                              <div className="flex items-start gap-3 w-full p-3 cursor-pointer">
                                <Gift className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900 text-base mb-1">
                                    {clientVoucher.voucher?.name}
                                  </div>
                                  <p className="text-sm text-gray-600 leading-relaxed">
                                    {clientVoucher.voucher?.description || (
                                      <>
                                        Giảm {clientVoucher.voucher?.type === "FIXED" 
                                          ? formatPrice(clientVoucher.voucher?.price || 0)
                                          : `${clientVoucher.voucher?.percent}%${clientVoucher.voucher?.hasMaxPrice && clientVoucher.voucher?.maxPrice ? ` (tối đa ${formatPrice(clientVoucher.voucher.maxPrice)})` : ""}`
                                        }
                                        {clientVoucher.voucher?.minApply && clientVoucher.voucher.minApply > 0 
                                          ? ` cho đơn từ ${formatPrice(clientVoucher.voucher.minApply)}`
                                          : " cho mọi đơn hàng"
                                        }
                                      </>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  })()}
                </div>
              )}

              {/* Order Total */}
              {fields.length > 0 && (
                <div className="border-t pt-4 space-y-3">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Tổng tiền:</span>
                      <span className="font-medium">{formatPrice(orderTotal.subtotal)}</span>
                    </div>
                    {orderTotal.clientVoucher?.voucher && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Giảm giá ({orderTotal.clientVoucher.voucher.name}):
                        </span>
                        <span className="font-medium text-green-600">
                          -{formatPrice(orderTotal.discount)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                      <span className="text-base font-semibold text-gray-900">Tổng cộng:</span>
                      <span className="text-lg font-bold text-blue-600">
                        {formatPrice(orderTotal.total)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOrderOpen(false)
                    reset({ items: [], clientVoucherId: undefined })
                  }}
                  disabled={createOrderMutation.isPending}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={createOrderMutation.isPending}>
                  {createOrderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Tạo đơn hàng
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create Voucher Dialog */}
        <Dialog open={isCreateVoucherOpen} onOpenChange={(open) => {
          setIsCreateVoucherOpen(open)
          if (!open) {
            resetVoucher({
              type: "FIXED",
              isActive: true,
              isRedeemable: true,
              quantity: 0,
            })
          }
        }}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-center">Tạo voucher mới</DialogTitle>
              <DialogDescription className="text-center">
                Tạo voucher mới để khách hàng có thể sử dụng hoặc đổi bằng điểm
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitVoucher(onSubmitVoucher)} className="space-y-4">
              <div>
                <Label htmlFor="voucher-name">Tên voucher <span className="text-red-500">*</span></Label>
                <Input
                  id="voucher-name"
                  {...registerVoucher("name", { required: "Tên voucher là bắt buộc" })}
                />
                {errorsVoucher.name && (
                  <p className="text-sm text-red-500 mt-1">{errorsVoucher.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="voucher-description">Mô tả</Label>
                <Textarea
                  id="voucher-description"
                  {...registerVoucher("description")}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="voucher-type">Loại voucher <span className="text-red-500">*</span></Label>
                <Select
                  value={voucherType}
                  onValueChange={(value: VoucherType) => setValueVoucher("type", value)}
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
                  <Label htmlFor="voucher-price">Giá giảm (VND) <span className="text-red-500">*</span></Label>
                  <Input
                    id="voucher-price"
                    type="number"
                    {...registerVoucher("price", { 
                      required: "Giá giảm là bắt buộc",
                      valueAsNumber: true,
                      min: { value: 1, message: "Giá giảm phải lớn hơn 0" }
                    })}
                  />
                  {errorsVoucher.price && (
                    <p className="text-sm text-red-500 mt-1">{errorsVoucher.price.message}</p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="voucher-percent">Phần trăm giảm (%) <span className="text-red-500">*</span></Label>
                    <Input
                      id="voucher-percent"
                      type="number"
                      {...registerVoucher("percent", { 
                        required: "Phần trăm giảm là bắt buộc",
                        valueAsNumber: true,
                        min: { value: 1, message: "Phần trăm phải từ 1-100" },
                        max: { value: 100, message: "Phần trăm không được vượt quá 100" }
                      })}
                    />
                    {errorsVoucher.percent && (
                      <p className="text-sm text-red-500 mt-1">{errorsVoucher.percent.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="voucher-maxPrice">Giảm tối đa (VND)</Label>
                    <Input
                      id="voucher-maxPrice"
                      type="number"
                      {...registerVoucher("maxPrice", { valueAsNumber: true })}
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="voucher-minApply">Giá trị đơn hàng tối thiểu (VND)</Label>
                <Input
                  id="voucher-minApply"
                  type="number"
                  {...registerVoucher("minApply", { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="voucher-quantity">Số lượng</Label>
                <Input
                  id="voucher-quantity"
                  type="number"
                  {...registerVoucher("quantity", { valueAsNumber: true, min: 0 })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="voucher-isRedeemable"
                  {...registerVoucher("isRedeemable")}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="voucher-isRedeemable">Cho phép đổi điểm</Label>
              </div>

              {watchVoucher("isRedeemable") && (
                <div>
                  <Label htmlFor="voucher-pointsRequired">Điểm cần để đổi <span className="text-red-500">*</span></Label>
                  <Input
                    id="voucher-pointsRequired"
                    type="number"
                    {...registerVoucher("pointsRequired", { 
                      required: watchVoucher("isRedeemable") ? "Điểm cần để đổi là bắt buộc khi cho phép đổi điểm" : false,
                      valueAsNumber: true, 
                      min: { value: 1, message: "Điểm cần để đổi phải lớn hơn 0" }
                    })}
                  />
                  {errorsVoucher.pointsRequired && (
                    <p className="text-sm text-red-500 mt-1">{errorsVoucher.pointsRequired.message}</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateVoucherOpen(false)
                    resetVoucher({
                      type: "FIXED",
                      isActive: true,
                      isRedeemable: true,
                      quantity: 0,
                    })
                  }}
                  disabled={createVoucherMutation.isPending}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={createVoucherMutation.isPending}>
                  {createVoucherMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Tạo voucher
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Redeem Voucher Dialog */}
        <Dialog open={isRedeemVoucherOpen} onOpenChange={(open) => {
          setIsRedeemVoucherOpen(open)
          if (!open) {
            resetRedeem()
            setVoucherSearchValue("")
            setVoucherPopoverOpen(false)
          }
        }}>
          <DialogContent className="sm:max-w-[750px] max-h-[90vh] min-h-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                  <Gift className="h-5 w-5 text-purple-600" />
                </div>
                Đổi voucher cho khách hàng
              </DialogTitle>
              <DialogDescription>
                Chọn voucher để đổi bằng điểm tích lũy của khách hàng
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitRedeem(onSubmitRedeem)} className="space-y-6">
              {/* Points Display Card */}
              {client && (
                <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <Coins className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Điểm tích lũy hiện tại</p>
                          <p className="text-2xl font-bold text-amber-700 mt-1">
                            {client.point || 0} <span className="text-base font-normal">điểm</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-amber-600">
                        <Sparkles className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Voucher Selection */}
              <div className="space-y-3">
                <Label htmlFor="redeem-voucherId" className="text-base font-semibold flex items-center gap-2">
                  <Gift className="h-4 w-4 text-purple-600" />
                  Chọn voucher <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="voucherId"
                  control={controlRedeem}
                  rules={{ required: "Vui lòng chọn voucher" }}
                  render={({ field }) => {
                    const availableVouchers = Array.isArray(vouchers) 
                      ? vouchers.filter((v: Voucher) => (v.pointsRequired || 0) <= (client?.point || 0))
                      : []
                    
                    const unavailableVouchers = Array.isArray(vouchers) 
                      ? vouchers.filter((v: Voucher) => (v.pointsRequired || 0) > (client?.point || 0))
                      : []
                    
                    // Filter vouchers by search value
                    const filteredVouchers = availableVouchers.filter((voucher: Voucher) => {
                      const searchValue = voucherSearchValue?.toLowerCase() || ""
                      if (!searchValue) return true
                      return voucher?.name?.toLowerCase().includes(searchValue)
                    })
                    
                    const selectedVoucher = availableVouchers.find((v: Voucher) => v.id === field.value)
                    
                    return (
                      <div className="space-y-3">
                        <div className="relative" data-voucher-dropdown>
                          <Input
                            placeholder="Tìm kiếm voucher theo tên"
                            value={
                              voucherSearchValue !== undefined
                                ? voucherSearchValue
                                : field.value && selectedVoucher
                                  ? selectedVoucher.name
                                  : ""
                            }
                            onChange={(e) => {
                              const searchValue = e.target.value
                              setVoucherSearchValue(searchValue)
                              
                              // Luôn mở popover khi có text hoặc đang nhập
                              if (searchValue) {
                                setVoucherPopoverOpen(true)
                              }
                              
                              // Nếu xóa hết thì clear selection nhưng vẫn giữ popover mở
                              if (!searchValue) {
                                field.onChange("")
                                setVoucherSearchValue("")
                              }
                            }}
                            onFocus={() => {
                              // Tự động mở popover khi focus vào input
                              setVoucherPopoverOpen(true)
                            }}
                            className="w-full h-12 border-2 border-gray-200 hover:border-purple-300 focus:border-purple-500 pr-10"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setVoucherPopoverOpen(prev => !prev)
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center hover:bg-gray-100 rounded z-10 cursor-pointer"
                          >
                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                          </button>
                          
                          {/* Custom Dropdown với absolute positioning */}
                          {voucherPopoverOpen && (
                            <div className="absolute z-50 w-full mt-1 rounded-md border bg-white shadow-lg max-h-[400px] overflow-y-auto">
                              {filteredVouchers.length > 0 ? (
                                <div className="p-2 space-y-1.5">
                                  {filteredVouchers.map((voucher: Voucher) => (
                                    <div
                                      key={voucher.id}
                                      onClick={() => {
                                        field.onChange(voucher.id)
                                        setVoucherSearchValue(voucher.name)
                                        setVoucherPopoverOpen(false)
                                      }}
                                      className={cn(
                                        "group relative flex items-start gap-3 w-full p-3 rounded-lg border border-transparent hover:border-purple-200 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/50 transition-all duration-200 cursor-pointer",
                                        field.value === voucher.id && "border-purple-300 bg-gradient-to-r from-purple-50/50 to-pink-50/50"
                                      )}
                                    >
                                      {/* Icon với gradient background */}
                                      <div className="flex-shrink-0 p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg group-hover:from-purple-200 group-hover:to-pink-200 transition-colors duration-200">
                                        <Gift className="h-5 w-5 text-purple-600" />
                                      </div>
                                      
                                      {/* Nội dung voucher */}
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-gray-900 text-base leading-tight flex items-center gap-2 mb-1.5">
                                          {voucher.name}
                                          {field.value === voucher.id && (
                                            <Check className="h-4 w-4 text-purple-600" />
                                          )}
                                        </div>
                                        
                                        {/* Mô tả gom các thông tin */}
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                          Giảm {voucher.type === "FIXED" 
                                            ? formatPrice(voucher.price || 0)
                                            : `${voucher.percent}%${voucher.hasMaxPrice && voucher.maxPrice ? ` (tối đa ${formatPrice(voucher.maxPrice)})` : ""}`
                                          }
                                          {voucher.minApply && voucher.minApply > 0 
                                            ? ` cho đơn từ ${formatPrice(voucher.minApply)}`
                                            : " cho mọi đơn hàng"
                                          }
                                        </p>
                                      </div>
                                      
                                      {/* Điểm cần thiết */}
                                      <div className="flex-shrink-0 flex flex-col items-center gap-1">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
                                          <Coins className="h-4 w-4 text-amber-600" />
                                          <span className="text-amber-700 font-bold text-sm">{voucher.pointsRequired || 0}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : availableVouchers.length > 0 ? (
                                <div className="px-6 py-12 text-center">
                                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-3">
                                    <Gift className="h-8 w-8 text-gray-400" />
                                  </div>
                                  <p className="text-sm font-medium text-gray-700 mb-1">
                                    Không tìm thấy voucher
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Thử tìm kiếm với từ khóa khác
                                  </p>
                                </div>
                              ) : Array.isArray(vouchers) && vouchers.length > 0 ? (
                                <div className="px-6 py-12 text-center">
                                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-4 shadow-sm">
                                    <Gift className="h-10 w-10 text-gray-400" />
                                  </div>
                                  <p className="text-base font-semibold text-gray-800 mb-2">
                                    Không có voucher nào phù hợp
                                  </p>
                                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 mt-3">
                                    <Coins className="h-4 w-4 text-amber-600" />
                                    <p className="text-sm text-amber-700">
                                      Cần thêm {unavailableVouchers.length > 0 && unavailableVouchers[0]?.pointsRequired ? `${unavailableVouchers[0].pointsRequired - (client?.point || 0)} điểm` : "nhiều điểm hơn"} để đổi voucher
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="px-6 py-12 text-center">
                                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-4 shadow-sm">
                                    {isLoadingRedeemableVouchers ? (
                                      <Loader2 className="h-10 w-10 text-gray-400 animate-spin" />
                                    ) : (
                                      <Gift className="h-10 w-10 text-gray-400" />
                                    )}
                                  </div>
                                  <p className="text-base font-semibold text-gray-800 mb-1">
                                    {isLoadingRedeemableVouchers ? "Đang tải voucher..." : "Không có voucher nào"}
                                  </p>
                                  {!isLoadingRedeemableVouchers && (
                                    <p className="text-sm text-gray-500 mt-2">
                                      Hiện tại chưa có voucher nào khả dụng
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Selected Voucher Preview */}
                        {field.value && availableVouchers.find((v: Voucher) => v.id === field.value) && (
                          <Card className="mt-3 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
                            <CardContent className="p-4">
                              {(() => {
                                const selectedVoucher = availableVouchers.find((v: Voucher) => v.id === field.value)
                                if (!selectedVoucher) return null
                                return (
                                  <div className="flex items-start gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                                      <Gift className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-semibold text-gray-900 mb-1.5">{selectedVoucher.name}</div>
                                      <p className="text-sm text-gray-600 leading-relaxed mb-2">
                                        Giảm {selectedVoucher.type === "FIXED" 
                                          ? formatPrice(selectedVoucher.price || 0)
                                          : `${selectedVoucher.percent}%${selectedVoucher.hasMaxPrice && selectedVoucher.maxPrice ? ` (tối đa ${formatPrice(selectedVoucher.maxPrice)})` : ""}`
                                        }
                                        {selectedVoucher.minApply && selectedVoucher.minApply > 0 
                                          ? ` cho đơn từ ${formatPrice(selectedVoucher.minApply)}`
                                          : " cho mọi đơn hàng"
                                        }
                                      </p>
                                      <div className="flex items-center gap-1.5 text-sm">
                                        <Coins className="h-4 w-4 text-amber-600" />
                                        <span className="text-amber-700 font-medium">{selectedVoucher.pointsRequired || 0} điểm</span>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })()}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )
                  }}
                />
                {errorsRedeem.voucherId && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="h-4 w-4 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs">!</span>
                    </div>
                    <span>{errorsRedeem.voucherId.message}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsRedeemVoucherOpen(false)
                    resetRedeem()
                  }}
                  disabled={redeemVoucherMutation.isPending}
                  className="min-w-[100px]"
                >
                  Hủy
                </Button>
                <Button 
                  type="submit" 
                  disabled={redeemVoucherMutation.isPending}
                  className="min-w-[140px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {redeemVoucherMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Gift className="mr-2 h-4 w-4" />
                      Đổi voucher
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

