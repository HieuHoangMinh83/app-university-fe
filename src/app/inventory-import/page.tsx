"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { inventoryApi, InventoryItem, ImportInventoryDto, ImportInventoryItemDto } from "@/services/api/inventory"
import { inventoryProductsApi } from "@/services/api/inventory-products"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2, ArrowLeft, Package, Trash2, ChevronLeft, ChevronRight, ChevronsUpDown, Check } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface ImportItem {
  id: string // Unique ID để tracking item
  productId: string
  quantity: number
  expiryDate: string
  notes?: string
  productName?: string // Lưu tên sản phẩm để hiển thị trong dialog
  categoryName?: string // Lưu tên danh mục để hiển thị trong dialog
}

export default function InventoryImportPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  const { data: inventoryProductsResponse, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["inventory-products", page, pageSize],
    queryFn: () => inventoryProductsApi.getAll({ page, pageSize }),
  })

  // Extract inventoryProducts array and pagination meta from paginated or non-paginated response
  const { inventoryProducts, paginationMeta } = useMemo(() => {
    if (!inventoryProductsResponse) return { inventoryProducts: undefined, paginationMeta: undefined }
    
    if (Array.isArray(inventoryProductsResponse)) {
      return { inventoryProducts: inventoryProductsResponse, paginationMeta: undefined }
    }
    
    if ('data' in inventoryProductsResponse && Array.isArray(inventoryProductsResponse.data)) {
      return {
        inventoryProducts: inventoryProductsResponse.data,
        paginationMeta: 'meta' in inventoryProductsResponse ? inventoryProductsResponse.meta : undefined
      }
    }
    
    return { inventoryProducts: [], paginationMeta: undefined }
  }, [inventoryProductsResponse])


  const importMutation = useMutation({
    mutationFn: inventoryApi.import,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      queryClient.invalidateQueries({ queryKey: ["inventory", "expiring-soon"] })
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] })
      queryClient.invalidateQueries({ queryKey: ["inventory-sessions"] })
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Nhập kho thất bại"
      toast.error(errorMessage)
      throw error // Re-throw để có thể catch trong onSubmitImport
    },
  })


  const [importItems, setImportItems] = useState<ImportItem[]>([])
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [sessionDescription, setSessionDescription] = useState("")
  const [productSearchValues, setProductSearchValues] = useState<Record<string, string>>({})
  const [productPopoverOpen, setProductPopoverOpen] = useState<Record<string, boolean>>({})
  const [quantityInputValues, setQuantityInputValues] = useState<Record<string, string>>({})
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const addImportItem = () => {
    const newId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setImportItems([{
      id: newId,
      productId: "",
      quantity: 1,
      expiryDate: "",
      notes: "",
    }, ...importItems])
  }

  const removeImportItem = (id: string) => {
    setImportItems(importItems.filter(item => item.id !== id))
    // Xóa search values và popover state cho item bị xóa
    setProductSearchValues(prev => {
      const newValues = { ...prev }
      delete newValues[id]
      return newValues
    })
    setProductPopoverOpen(prev => {
      const newOpen = { ...prev }
      delete newOpen[id]
      return newOpen
    })
    setQuantityInputValues(prev => {
      const newValues = { ...prev }
      delete newValues[id]
      return newValues
    })
  }

  const updateImportItem = (id: string, field: keyof ImportItem, value: any) => {
    const itemIndex = importItems.findIndex(item => item.id === id)
    if (itemIndex === -1) return
    
    const updated = [...importItems]
    updated[itemIndex] = { ...updated[itemIndex], [field]: value }
    setImportItems(updated)
  }

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const dropdownContainer = target.closest('[data-dropdown-item]')
      if (!dropdownContainer) {
        setProductPopoverOpen({})
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Scroll dropdown vào view khi mở
  useEffect(() => {
    Object.keys(productPopoverOpen).forEach((itemId) => {
      if (productPopoverOpen[itemId]) {
        const dropdownElement = dropdownRefs.current[itemId]
        if (dropdownElement) {
          // Scroll dropdown container vào view với một chút offset
          setTimeout(() => {
            dropdownElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'nearest',
              inline: 'nearest'
            })
            // Scroll thêm một chút xuống
            const tableContainer = dropdownElement.closest('.overflow-auto')
            if (tableContainer) {
              tableContainer.scrollBy({ top: 120  , behavior: 'smooth' })
            }
          }, 100)
        }
      }
    })
  }, [productPopoverOpen])

  // Sync productSearchValues với item.productId khi item thay đổi
  // CHỈ sync khi productId có giá trị và searchValue chưa được set
  useEffect(() => {
    importItems.forEach((item) => {
      if (item.productId) {
        const product = Array.isArray(inventoryProducts) 
          ? inventoryProducts.find(p => String(p.id) === String(item.productId))
          : undefined
        if (product?.name) {
          setProductSearchValues(prev => {
            // Chỉ update nếu:
            // 1. Chưa có giá trị cho item này, HOẶC
            // 2. Giá trị hiện tại khác với tên sản phẩm (để sync lại nếu cần)
            // KHÔNG update nếu user đang search (có giá trị khác với tên sản phẩm)
            const currentValue = prev[item.id]
            const shouldUpdate = !currentValue || currentValue === product.name
            if (shouldUpdate) {
              return { ...prev, [item.id]: product.name }
            }
            return prev
          })
        }
      } else {
        // Nếu productId bị clear, chỉ clear searchValue nếu nó đang hiển thị tên sản phẩm đã chọn
        // (không clear nếu user đang search)
        setProductSearchValues(prev => {
          const currentValue = prev[item.id]
          if (currentValue) {
            // Kiểm tra xem currentValue có phải là tên của sản phẩm nào không
            const isProductName = Array.isArray(inventoryProducts) && 
              inventoryProducts.some(p => p.name === currentValue)
            if (isProductName) {
              // Nếu là tên sản phẩm, clear nó
              const newValues = { ...prev }
              delete newValues[item.id]
              return newValues
            }
          }
          return prev
        })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importItems.map(item => `${item.id}-${item.productId}`).join(','), inventoryProducts])


  // Validate và mở modal xác nhận
  const onSubmitImport = () => {
    if (!importItems || importItems.length === 0) {
      toast.error("Vui lòng thêm ít nhất một sản phẩm để nhập kho")
      return
    }

    // Validate từng item
    for (let i = 0; i < importItems.length; i++) {
      const item = importItems[i]
      
      // Validate productId
      const productIdStr = String(item.productId || "").trim()
      if (!productIdStr || productIdStr === "") {
        toast.error(`Vui lòng chọn sản phẩm cho sản phẩm #${i + 1}`)
        return
      }
      
      // Validate quantity
      if (!item.quantity || item.quantity <= 0) {
        toast.error(`Số lượng phải lớn hơn 0 cho sản phẩm #${i + 1}`)
        return
      }
      
      // Validate quantity là integer
      if (!Number.isInteger(item.quantity)) {
        toast.error(`Số lượng phải là số nguyên cho sản phẩm #${i + 1}`)
        return
      }
      
      // Kiểm tra sản phẩm có yêu cầu ngày hết hạn không
      const product = Array.isArray(inventoryProducts) 
        ? inventoryProducts.find(p => String(p.id) === String(item.productId))
        : undefined
      const hasExpiryDate = product?.hasExpiryDate ?? true // Mặc định là true
      
      // Validate expiryDate chỉ khi sản phẩm có yêu cầu hạn sử dụng
      if (hasExpiryDate) {
        if (!item.expiryDate || item.expiryDate.trim() === "") {
          toast.error(`Vui lòng nhập ngày hết hạn cho sản phẩm #${i + 1}`)
          return
        }

        // Validate expiryDate format và không được trong quá khứ
        const expiryDate = new Date(item.expiryDate)
        if (isNaN(expiryDate.getTime())) {
          toast.error(`Ngày hết hạn không hợp lệ cho sản phẩm #${i + 1}`)
          return
        }
        
        expiryDate.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        if (expiryDate < today) {
          toast.error(`Ngày hết hạn phải sau hoặc bằng ngày hiện tại cho sản phẩm #${i + 1}`)
          return
        }
      }
    }

    // Mở modal xác nhận
    setIsConfirmDialogOpen(true)
  }

  // Gửi request cuối cùng sau khi xác nhận
  const handleConfirmImport = async () => {
    // Format tất cả items và gửi cùng lúc
    const importData: ImportInventoryDto = {
      sessionDescription: sessionDescription.trim() || "",
      items: importItems.map((item) => {
        // Kiểm tra sản phẩm có yêu cầu ngày hết hạn không
        const product = Array.isArray(inventoryProducts) 
          ? inventoryProducts.find(p => String(p.id) === String(item.productId))
          : undefined
        const hasExpiryDate = product?.hasExpiryDate ?? true // Mặc định là true
        
        // Format expiryDate: chỉ gửi date string YYYY-MM-DD, không có time
        // item.expiryDate đã là format YYYY-MM-DD từ input type="date"
        const itemData: ImportInventoryItemDto = {
          productId: String(item.productId).trim(), // Đảm bảo là string và không có khoảng trắng
          quantity: Math.floor(Number(item.quantity)), // Đảm bảo là integer
          notes: item.notes?.trim() || undefined,
        }
        
        // Chỉ thêm expiryDate nếu sản phẩm có hạn sử dụng và có giá trị
        if (hasExpiryDate && item.expiryDate) {
          itemData.expiryDate = item.expiryDate
        }
        
        return itemData
      })
    }

    try {
      await importMutation.mutateAsync(importData)
      
      // Reset form sau khi nhập xong
      setImportItems([])
      setSessionDescription("")
      setIsConfirmDialogOpen(false)
      setProductSearchValues({})
      setProductPopoverOpen({})
      setQuantityInputValues({})
      toast.success(`Đã nhập ${importItems.length} sản phẩm thành công`)
    } catch (error) {
      // Error đã được xử lý trong mutation onError
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
      

        {/* Import Form */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Danh sách sản phẩm nhập kho</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addImportItem}
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm sản phẩm
              </Button>
            </div>
            {/* Pagination Info */}
            {paginationMeta && (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span>
                  Hiển thị {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, paginationMeta.total)} trong tổng số {paginationMeta.total} sản phẩm
                </span>
                {paginationMeta.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1 || isLoadingProducts}
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
                      disabled={page >= paginationMeta.totalPages || isLoadingProducts}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {importItems.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 mb-4">Chưa có sản phẩm nào</p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addImportItem}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm sản phẩm đầu tiên
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table className="min-h-[250px] max-h-[500px]">
                    <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead className="w-12">STT</TableHead>
                          <TableHead>Sản phẩm <span className="text-red-500">*</span></TableHead>
                          <TableHead className="w-32">Số lượng <span className="text-red-500">*</span></TableHead>
                          <TableHead className="w-40">Ngày hết hạn <span className="text-red-500">*</span></TableHead>
                          <TableHead>Ghi chú</TableHead>
                          <TableHead className="w-20">Hành động</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                      {importItems.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div 
                              ref={(el) => { dropdownRefs.current[item.id] = el }}
                              className="relative product-search-dropdown" 
                              data-dropdown-item={item.id}
                            >
                              <Input
                                type="text"
                                placeholder="Chọn sản phẩm trong kho"
                                value={
                                  productSearchValues[item.id] !== undefined
                                    ? productSearchValues[item.id]
                                    : item.productId
                                      ? (Array.isArray(inventoryProducts) ? inventoryProducts.find(p => String(p.id) === String(item.productId))?.name : undefined) || ""
                                      : ""
                                }
                                onChange={(e) => {
                                  const searchValue = e.target.value
                                  
                                  // Luôn cập nhật search value để hiển thị
                                  setProductSearchValues(prev => ({ ...prev, [item.id]: searchValue }))
                                  
                                  // Mở popover khi có text - chỉ mở dropdown này, đóng các dropdown khác
                                  if (searchValue) {
                                    setProductPopoverOpen({ [item.id]: true })
                                  }
                                  
                                  // CHỈ clear productId nếu user xóa hết text VÀ đang trong quá trình search
                                  // KHÔNG clear nếu đã chọn sản phẩm và user đang edit text
                                  // Nếu searchValue rỗng và không có productId đã chọn, thì mới clear
                                  if (!searchValue && !item.productId) {
                                    updateImportItem(item.id, "productId", "")
                                    updateImportItem(item.id, "productName", undefined)
                                    updateImportItem(item.id, "categoryName", undefined)
                                  }
                                }}
                                onFocus={() => {
                                  // Chỉ mở dropdown này, đóng các dropdown khác
                                  setProductPopoverOpen({ [item.id]: true })
                                }}
                                className="h-9 pr-8"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Chỉ mở dropdown này, đóng các dropdown khác
                                  setProductPopoverOpen(prev => ({ [item.id]: !prev[item.id] }))
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center hover:bg-gray-100 rounded z-10"
                              >
                                <ChevronsUpDown className="h-4 w-4 opacity-50" />
                              </button>
                              
                              {/* Custom Dropdown với absolute positioning */}
                              {productPopoverOpen[item.id] && (
                                <div className="absolute z-50 w-full mt-1 rounded-md border bg-white shadow-lg max-h-[300px] overflow-y-auto">
                                  {isLoadingProducts ? (
                                    <div className="flex items-center justify-center p-4">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                  ) : Array.isArray(inventoryProducts) && inventoryProducts.filter((ip: any) => {
                                    if (ip?.isActive === false) return false
                                    const searchValue = productSearchValues[item.id]?.toLowerCase() || ""
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
                                        const searchValue = productSearchValues[item.id]?.toLowerCase() || ""
                                        if (!searchValue) return true
                                        return ip?.name?.toLowerCase().includes(searchValue)
                                      })?.map((product: any) => (
                                        <div
                                          key={product?.id}
                                          onClick={() => {
                                            // Đảm bảo productId luôn là string
                                            const productId = product?.id ? String(product.id) : ""
                                            
                                            // Update tất cả fields cùng lúc để đảm bảo consistency
                                            const updatedItems = importItems.map(i => 
                                              i.id === item.id 
                                                ? {
                                                    ...i,
                                                    productId: productId,
                                                    productName: product?.name,
                                                    categoryName: product?.category?.name
                                                  }
                                                : i
                                            )
                                            setImportItems(updatedItems)
                                            
                                            // Set search value và đóng popover
                                            setProductSearchValues(prev => ({ ...prev, [item.id]: product?.name || "" }))
                                            setProductPopoverOpen(prev => ({ ...prev, [item.id]: false }))
                                          }}
                                          className={cn(
                                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-blue-50 hover:text-blue-900",
                                            String(item.productId) === String(product?.id) && "bg-blue-100 text-blue-900"
                                          )}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              String(item.productId) === String(product?.id)
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                          />
                                          {product?.name}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              placeholder="Số lượng"
                              value={quantityInputValues[item.id] !== undefined ? quantityInputValues[item.id] : (item.quantity?.toString() || "")}
                              onChange={(e) => {
                                const value = e.target.value
                                // Chỉ cho phép số, cho phép rỗng để user có thể xóa hết
                                const numbers = value.replace(/\D/g, '')
                                // Cập nhật giá trị hiển thị
                                setQuantityInputValues(prev => ({ ...prev, [item.id]: numbers }))
                              }}
                              onBlur={(e) => {
                                const value = e.target.value
                                const numbers = value.replace(/\D/g, '')
                                // Kiểm tra lại sau khi user nhập xong
                                const parsed = parseInt(numbers)
                                if (!parsed || parsed < 1 || isNaN(parsed)) {
                                  // Nếu không phải số hợp lệ hoặc <= 0, set về 1
                                  updateImportItem(item.id, "quantity", 1)
                                  setQuantityInputValues(prev => {
                                    const newValues = { ...prev }
                                    delete newValues[item.id]
                                    return newValues
                                  })
                                } else {
                                  updateImportItem(item.id, "quantity", parsed)
                                  setQuantityInputValues(prev => {
                                    const newValues = { ...prev }
                                    delete newValues[item.id]
                                    return newValues
                                  })
                                }
                              }}
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const selectedProduct = Array.isArray(inventoryProducts) 
                                ? inventoryProducts.find(p => String(p.id) === String(item.productId))
                                : undefined
                              const hasExpiryDate = selectedProduct?.hasExpiryDate ?? true // Mặc định là true
                              const isDisabled = !item.productId || !hasExpiryDate
                              
                              return (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="w-full">
                                        <Input
                                          type="date"
                                          min={new Date().toISOString().slice(0, 10)}
                                          value={item.expiryDate}
                                          onChange={(e) => updateImportItem(item.id, "expiryDate", e.target.value)}
                                          disabled={isDisabled}
                                          className="h-9"
                                          placeholder="Ngày hết hạn"
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    {isDisabled && (
                                      <TooltipContent>
                                        <p>
                                          {!item.productId 
                                            ? "Vui lòng chọn sản phẩm trước" 
                                            : "Sản phẩm này không có hạn sử dụng"}
                                        </p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              )
                            })()}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              placeholder="Ghi chú (tùy chọn)"
                              value={item.notes || ""}
                              onChange={(e) => updateImportItem(item.id, "notes", e.target.value)}
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            {importItems.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeImportItem(item.id)}
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {importItems.length > 0 && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setImportItems([])
                      setProductSearchValues({})
                      setProductPopoverOpen({})
                      setQuantityInputValues({})
                      toast.info("Đã xóa tất cả sản phẩm")
                    }}
                    disabled={importMutation.isPending}
                  >
                    Xóa tất cả
                  </Button>
                  <Button type="button" onClick={onSubmitImport} disabled={importMutation.isPending}>
                    {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Nhập kho ({importItems.length} sản phẩm)
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dialog xác nhận nhập kho */}
        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Xác nhận nhập kho</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="sessionDescription">
                  Mô tả cho lần nhập kho này
                </Label>
                <Textarea
                  id="sessionDescription"
                  className="mt-2"
                  placeholder="Ví dụ: Nhập kho lô 10/12, Nhập từ nhà cung cấp ABC..."
                  rows={3}
                  value={sessionDescription}
                  onChange={(e) => setSessionDescription(e.target.value)}
                />
              </div>

              <div>
                <Label className="mb-3 block">Thông tin sản phẩm sẽ nhập ({importItems.length} sản phẩm)</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>STT</TableHead>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Danh mục</TableHead>
                        <TableHead>Số lượng</TableHead>
                        <TableHead>Ngày hết hạn</TableHead>
                        <TableHead>Ghi chú</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importItems.map((item, index) => {
                        // Ưu tiên dùng thông tin đã lưu, nếu không có thì tìm trong danh sách hiện tại
                        const productName = item.productName || (Array.isArray(inventoryProducts) ? inventoryProducts.find(p => String(p.id) === String(item.productId))?.name : undefined) || `ID: ${item.productId}`
                        const categoryName = item.categoryName || (Array.isArray(inventoryProducts) ? inventoryProducts.find(p => String(p.id) === String(item.productId))?.category?.name : undefined) || "-"
                        return (
                          <TableRow key={item.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium">
                              {productName}
                            </TableCell>
                            <TableCell>
                              {categoryName}
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              {item.expiryDate 
                                ? new Date(item.expiryDate).toLocaleDateString("vi-VN")
                                : "-"}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {item.notes || "-"}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsConfirmDialogOpen(false)
                  setSessionDescription("")
                }}
                disabled={importMutation.isPending}
              >
                Hủy
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Xác nhận nhập kho
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

