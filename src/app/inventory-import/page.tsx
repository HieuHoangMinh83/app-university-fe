"use client"

import { useState, useMemo } from "react"
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
import { Plus, Loader2, ArrowLeft, Package, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"

interface ImportItem {
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

  const addImportItem = () => {
    setImportItems([{
      productId: "",
      quantity: 1,
      expiryDate: "",
      notes: "",
    }, ...importItems])
  }

  const removeImportItem = (index: number) => {
    setImportItems(importItems.filter((_, i) => i !== index))
  }

  const updateImportItem = (index: number, field: keyof ImportItem, value: any) => {
    const updated = [...importItems]
    updated[index] = { ...updated[index], [field]: value }
    setImportItems(updated)
  }


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
      if (!item.productId || item.productId.trim() === "") {
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
      
      // Validate expiryDate
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

    // Mở modal xác nhận
    setIsConfirmDialogOpen(true)
  }

  // Gửi request cuối cùng sau khi xác nhận
  const handleConfirmImport = async () => {
    // Format tất cả items và gửi cùng lúc
    const importData: ImportInventoryDto = {
      sessionDescription: sessionDescription.trim() || "",
      items: importItems.map((item) => {
        // Format expiryDate: chỉ gửi date string YYYY-MM-DD, không có time
        // item.expiryDate đã là format YYYY-MM-DD từ input type="date"
        return {
          productId: String(item.productId).trim(), // Đảm bảo là string và không có khoảng trắng
          quantity: Math.floor(Number(item.quantity)), // Đảm bảo là integer
          expiryDate: item.expiryDate, // Date string YYYY-MM-DD
          notes: item.notes?.trim() || undefined,
        }
      })
    }

    try {
      await importMutation.mutateAsync(importData)
      
      // Reset form sau khi nhập xong
      setImportItems([])
      setSessionDescription("")
      setIsConfirmDialogOpen(false)
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/inventory">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Nhập kho</h1>
            </div>
          </div>
        </div>

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
                <div className="space-y-4">
                  {importItems.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <Badge variant="outline">Sản phẩm #{index + 1}</Badge>
                        {importItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeImportItem(index)}
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label>Sản phẩm <span className="text-red-500">*</span></Label>
                            <Select
                              value={item.productId}
                              onValueChange={(value) => {
                                const product = Array.isArray(inventoryProducts) ? inventoryProducts.find(p => p.id === value) : undefined
                                updateImportItem(index, "productId", value)
                                updateImportItem(index, "productName", product?.name)
                                updateImportItem(index, "categoryName", product?.category?.name)
                              }}
                            >
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Chọn sản phẩm" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                {isLoadingProducts ? (
                                  <div className="flex items-center justify-center p-4">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  </div>
                                ) : Array.isArray(inventoryProducts) && inventoryProducts.length > 0 ? (
                                  <>
                                    {inventoryProducts.map((product) => (
                                      <SelectItem key={product?.id} value={product?.id}>
                                        {product?.name}
                                      </SelectItem>
                                    ))}
                                  </>
                                ) : (
                                  <div className="p-4 text-sm text-gray-500 text-center">
                                    Không có sản phẩm nào
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Số lượng <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              className="mt-2"
                              placeholder="Nhập số lượng"
                              min={1}
                              step={1}
                              value={item.quantity || ""}
                              onChange={(e) => updateImportItem(index, "quantity", parseInt(e.target.value) || 1)}
                            />
                          </div>

                          <div>
                            <Label>Ngày hết hạn <span className="text-red-500">*</span></Label>
                            <Input
                              type="date"
                              className="mt-2"
                              min={new Date().toISOString().slice(0, 10)}
                              value={item.expiryDate}
                              onChange={(e) => updateImportItem(index, "expiryDate", e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Ghi chú</Label>
                          <Textarea
                            className="mt-2"
                            placeholder="Ghi chú về sản phẩm này (tùy chọn)"
                            rows={2}
                            value={item.notes || ""}
                            onChange={(e) => updateImportItem(index, "notes", e.target.value)}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {importItems.length > 0 && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setImportItems([])
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
                        const productName = item.productName || (Array.isArray(inventoryProducts) ? inventoryProducts.find(p => p.id === item.productId)?.name : undefined) || `ID: ${item.productId}`
                        const categoryName = item.categoryName || (Array.isArray(inventoryProducts) ? inventoryProducts.find(p => p.id === item.productId)?.category?.name : undefined) || "-"
                        return (
                          <TableRow key={index}>
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

