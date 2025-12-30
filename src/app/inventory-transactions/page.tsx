"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { inventoryTransactionsApi, InventoryTransaction, TransactionType } from "@/services/api/inventory-transactions"
import { inventoryProductsApi } from "@/services/api/inventory-products"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Search, ArrowDownCircle, ArrowUpCircle, Filter, X, Package } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"

export default function InventoryTransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "IMPORT" | "EXPORT">("all")
  const [productFilter, setProductFilter] = useState<string>("all")
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  
  // Temporary filter states for dialog
  const [tempProductFilter, setTempProductFilter] = useState<string>("all")

  const { data: transactionsResponse, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["inventory-transactions", activeTab, productFilter, page, pageSize],
    queryFn: () => {
      const params: any = { page, pageSize }
      if (activeTab !== "all") {
        params.type = activeTab as TransactionType
      }
      if (productFilter !== "all") {
        params.productId = productFilter
      }
      return inventoryTransactionsApi.getAll(params)
    },
  })

  // Extract transactions array from paginated or non-paginated response
  const transactions = useMemo(() => {
    if (!transactionsResponse) return undefined
    if (Array.isArray(transactionsResponse)) return transactionsResponse
    if ('data' in transactionsResponse && Array.isArray(transactionsResponse.data)) {
      return transactionsResponse.data
    }
    return []
  }, [transactionsResponse])

  const pagination = useMemo(() => {
    if (!transactionsResponse) return undefined
    if (Array.isArray(transactionsResponse)) return undefined
    if ('meta' in transactionsResponse) return transactionsResponse.meta
    return undefined
  }, [transactionsResponse])

  // Get all products for filter dropdown
  const { data: allProductsResponse } = useQuery({
    queryKey: ["inventory-products-all"],
    queryFn: () => inventoryProductsApi.getAll(),
  })

  const allProducts = useMemo(() => {
    if (!allProductsResponse) return []
    if (Array.isArray(allProductsResponse)) return allProductsResponse
    if ('data' in allProductsResponse && Array.isArray(allProductsResponse.data)) {
      return allProductsResponse.data
    }
    return []
  }, [allProductsResponse])

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (productFilter !== "all") count++
    return count
  }, [productFilter])

  // Initialize temp filters when dialog opens
  const handleFilterOpen = (open: boolean) => {
    setIsFilterOpen(open)
    if (open) {
      setTempProductFilter(productFilter)
    }
  }

  // Apply filters
  const handleApplyFilters = () => {
    setProductFilter(tempProductFilter)
    setIsFilterOpen(false)
    setPage(1)
  }

  // Clear all filters
  const handleClearFilters = () => {
    setTempProductFilter("all")
    setProductFilter("all")
    setIsFilterOpen(false)
    setPage(1)
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

  const formatDateOnly = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("vi-VN")
  }

  // Filter transactions based on search query
  const filteredTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return []
    
    return transactions.filter((transaction) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          transaction.sessionCode?.toLowerCase().includes(query) ||
          transaction.session?.description?.toLowerCase().includes(query) ||
          transaction.inventoryItem?.inventoryProduct?.name?.toLowerCase().includes(query) ||
          transaction.performedBy?.name?.toLowerCase().includes(query) ||
          transaction.performedBy?.phone?.toLowerCase().includes(query) ||
          false
        if (!matchesSearch) return false
      }
      
      return true
    })
  }, [transactions, searchQuery])

  // Get selected transaction for detail view
  const selectedTransaction = useMemo(() => {
    if (!selectedTransactionId || !Array.isArray(transactions)) return null
    return transactions.find(t => t.id === selectedTransactionId) || null
  }, [selectedTransactionId, transactions])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Lịch sử Nhập/Xuất Kho</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle>Danh sách Giao dịch</CardTitle>
              <Tabs value={activeTab} onValueChange={(v) => {
                setActiveTab(v as "all" | "IMPORT" | "EXPORT")
                setPage(1)
              }}>
                <TabsList>
                  <TabsTrigger value="all">Tất cả</TabsTrigger>
                  <TabsTrigger value="IMPORT">
                    <ArrowDownCircle className="mr-2 h-4 w-4" />
                    Nhập kho
                  </TabsTrigger>
                  <TabsTrigger value="EXPORT">
                    <ArrowUpCircle className="mr-2 h-4 w-4" />
                    Xuất kho
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo mã session, mô tả, sản phẩm, người thực hiện..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Dialog open={isFilterOpen} onOpenChange={handleFilterOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="relative">
                      <Filter className="mr-2 h-4 w-4" />
                      Bộ lọc
                      {activeFiltersCount > 0 && (
                        <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Bộ lọc</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="filter-product">Sản phẩm</Label>
                        <Select value={tempProductFilter} onValueChange={setTempProductFilter}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Chọn sản phẩm" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả sản phẩm</SelectItem>
                            {allProducts.map((product) => (
                              <SelectItem key={product?.id} value={product?.id}>
                                {product?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {activeFiltersCount > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {productFilter !== "all" && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              Sản phẩm: {allProducts.find(p => p?.id === productFilter)?.name}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => {
                                  setTempProductFilter("all")
                                  setProductFilter("all")
                                }}
                              />
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button variant="outline" onClick={handleClearFilters}>
                        Xóa bộ lọc
                      </Button>
                      <Button onClick={handleApplyFilters}>
                        Áp dụng
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã Session</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead>Số lượng</TableHead>
                      <TableHead>Ngày hết hạn</TableHead>
                      <TableHead>Người thực hiện</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions && filteredTransactions.length > 0 ? (
                      filteredTransactions.map((transaction) => (
                        <TableRow 
                          key={transaction.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => setSelectedTransactionId(transaction.id)}
                        >
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {transaction.sessionCode}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={transaction.type === "IMPORT" ? "default" : "destructive"}>
                              {transaction.type === "IMPORT" ? "Nhập kho" : "Xuất kho"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-gray-400" />
                              {transaction.inventoryItem?.inventoryProduct?.name || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={transaction.type === "IMPORT" ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                              {transaction.type === "IMPORT" ? "+" : "-"}
                              {transaction.quantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            {formatDateOnly(transaction.inventoryItem?.expiryDate || null)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{transaction.performedBy?.name || "-"}</span>
                              {transaction.performedBy?.phone && (
                                <span className="text-xs text-gray-500">{transaction.performedBy.phone}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDate(transaction.createdAt)}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTransactionId(transaction.id)}
                            >
                              Xem chi tiết
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          {searchQuery || activeTab !== "all" || productFilter !== "all"
                            ? "Không tìm thấy giao dịch nào"
                            : "Không có giao dịch nào"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                      Hiển thị {(pagination.page - 1) * pagination.pageSize + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} trong tổng số {pagination.total} giao dịch
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={pagination.page <= 1}
                      >
                        Trước
                      </Button>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">
                          Trang {pagination.page} / {pagination.totalPages}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                        disabled={pagination.page >= pagination.totalPages}
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                )}

                {/* Dialog chi tiết transaction */}
                <Dialog open={!!selectedTransactionId} onOpenChange={(open) => !open && setSelectedTransactionId(null)}>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div className="relative">
                      <DialogHeader>
                        <DialogTitle>
                          Chi tiết Giao dịch: {selectedTransaction?.sessionCode}
                        </DialogTitle>
                      </DialogHeader>
                      {selectedTransaction ? (
                        <div className="space-y-4 mt-4">
                          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                              <Label className="text-sm text-gray-500">Loại giao dịch</Label>
                              <div className="mt-1">
                                <Badge variant={selectedTransaction.type === "IMPORT" ? "default" : "destructive"}>
                                  {selectedTransaction.type === "IMPORT" ? "Nhập kho" : "Xuất kho"}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500">Mã Session</Label>
                              <div className="mt-1 font-medium">
                                <Badge variant="outline" className="font-mono">
                                  {selectedTransaction.sessionCode}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500">Sản phẩm</Label>
                              <div className="mt-1 font-medium">
                                {selectedTransaction.inventoryItem?.inventoryProduct?.name || "-"}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500">Số lượng</Label>
                              <div className={`mt-1 font-medium ${selectedTransaction.type === "IMPORT" ? "text-green-600" : "text-red-600"}`}>
                                {selectedTransaction.type === "IMPORT" ? "+" : "-"}
                                {selectedTransaction.quantity}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500">Ngày hết hạn</Label>
                              <div className="mt-1 font-medium">
                                {formatDateOnly(selectedTransaction.inventoryItem?.expiryDate || null)}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500">Thời gian tạo</Label>
                              <div className="mt-1 font-medium">
                                {formatDate(selectedTransaction.createdAt)}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500">Người thực hiện</Label>
                              <div className="mt-1">
                                <div className="flex flex-col">
                                  <span className="font-medium">{selectedTransaction.performedBy?.name || "-"}</span>
                                  {selectedTransaction.performedBy?.phone && (
                                    <span className="text-xs text-gray-500">{selectedTransaction.performedBy.phone}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {selectedTransaction.orderItem && (
                              <div>
                                <Label className="text-sm text-gray-500">Đơn hàng</Label>
                                <div className="mt-1 font-medium">
                                  #{selectedTransaction.orderItem.order?.id?.slice(0, 8)} - {selectedTransaction.orderItem.order?.client?.name}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Session Info */}
                          {selectedTransaction.session && (
                            <div>
                              <h3 className="font-semibold mb-3">Thông tin Session</h3>
                              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                  <Label className="text-sm text-gray-500">Mô tả</Label>
                                  <div className="mt-1">{selectedTransaction.session.description || "-"}</div>
                                </div>
                                <div>
                                  <Label className="text-sm text-gray-500">Ghi chú</Label>
                                  <div className="mt-1">{selectedTransaction.session.notes || "-"}</div>
                                </div>
                                <div>
                                  <Label className="text-sm text-gray-500">Thời gian tạo session</Label>
                                  <div className="mt-1 font-medium">
                                    {formatDate(selectedTransaction.session.createdAt)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {selectedTransaction.notes && (
                            <div>
                              <h3 className="font-semibold mb-3">Ghi chú</h3>
                              <div className="p-4 bg-gray-50 rounded-lg">
                                {selectedTransaction.notes}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          Không tìm thấy thông tin giao dịch
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
