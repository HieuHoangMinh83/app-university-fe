"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { inventoryTransactionsApi, InventoryTransaction, TransactionType } from "@/services/api/inventory-transactions"
import { inventoryApi, InventorySession } from "@/services/api/inventory"
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
import { Loader2, Search, ArrowDownCircle, ArrowUpCircle, Filter, X, Layers } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"

export default function InventoryTransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "IMPORT" | "EXPORT">("all")
  const [productFilter, setProductFilter] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [selectedSessionCode, setSelectedSessionCode] = useState<string | null>(null)
  
  // Temporary filter states for dialog
  const [tempProductFilter, setTempProductFilter] = useState<string>("all")
  const [tempStartDate, setTempStartDate] = useState<string>("")
  const [tempEndDate, setTempEndDate] = useState<string>("")

  const { data: sessionsResponse, isLoading: isLoadingSessions } = useQuery({
    queryKey: ["inventory-sessions", activeTab, startDate, endDate],
    queryFn: () => {
      const params: any = {}
      if (activeTab !== "all") {
        params.type = activeTab as TransactionType
      }
      return inventoryApi.getSessions(params)
    },
  })

  // Extract sessions array from paginated or non-paginated response
  const sessions = useMemo(() => {
    if (!sessionsResponse) return undefined
    if (Array.isArray(sessionsResponse)) return sessionsResponse
    if ('data' in sessionsResponse && Array.isArray(sessionsResponse.data)) {
      return sessionsResponse.data
    }
    return []
  }, [sessionsResponse])

  // Lấy chi tiết session khi click - sử dụng dữ liệu từ sessions nếu có, nếu không thì fetch từ API
  const selectedSession = useMemo(() => {
    if (!selectedSessionCode || !sessions) return null
    return sessions.find(s => (s as any).code === selectedSessionCode || s.id === selectedSessionCode) || null
  }, [selectedSessionCode, sessions])

  const { data: sessionDetailFromApi, isLoading: isLoadingSessionDetail } = useQuery({
    queryKey: ["inventory-session-detail", selectedSessionCode],
    queryFn: async () => {
      if (!selectedSessionCode || !selectedSession?.id) return null
      // Chỉ fetch từ API nếu session không có transactions hoặc transactions rỗng
      if (!selectedSession.transactions || selectedSession.transactions.length === 0) {
        return inventoryApi.getSessionById(selectedSession.id)
      }
      return null
    },
    enabled: !!selectedSessionCode && !!selectedSession?.id && (!selectedSession.transactions || selectedSession.transactions.length === 0),
  })

  // Ưu tiên dùng dữ liệu từ sessions, nếu không có thì dùng từ API
  const sessionDetail = selectedSession?.transactions && selectedSession.transactions.length > 0 
    ? selectedSession 
    : sessionDetailFromApi || selectedSession

  // Count active filters (không tính activeTab)
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (productFilter !== "all") count++
    if (startDate) count++
    if (endDate) count++
    return count
  }, [productFilter, startDate, endDate])

  // Initialize temp filters when dialog opens
  const handleFilterOpen = (open: boolean) => {
    setIsFilterOpen(open)
    if (open) {
      setTempProductFilter(productFilter)
      setTempStartDate(startDate)
      setTempEndDate(endDate)
    }
  }

  // Apply filters
  const handleApplyFilters = () => {
    setProductFilter(tempProductFilter)
    setStartDate(tempStartDate)
    setEndDate(tempEndDate)
    setIsFilterOpen(false)
  }

  // Clear all filters
  const handleClearFilters = () => {
    setTempProductFilter("all")
    setTempStartDate("")
    setTempEndDate("")
    setProductFilter("all")
    setStartDate("")
    setEndDate("")
    setIsFilterOpen(false)
  }

  const { data: inventoryProductsResponse } = useQuery({
    queryKey: ["inventory-products"],
    queryFn: () => inventoryProductsApi.getAll(),
  })

  // Extract inventoryProducts array from paginated or non-paginated response
  const inventoryProducts = useMemo(() => {
    if (!inventoryProductsResponse) return undefined
    if (Array.isArray(inventoryProductsResponse)) return inventoryProductsResponse
    if ('data' in inventoryProductsResponse && Array.isArray(inventoryProductsResponse.data)) {
      return inventoryProductsResponse.data
    }
    return []
  }, [inventoryProductsResponse])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDateOnly = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN")
  }

  // Filter sessions based on search query
  const filteredSessions = useMemo(() => {
    if (!Array.isArray(sessions)) return []
    
    return sessions.filter((session) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const sessionCode = (session as any).code || session.id || ""
        const matchesSearch =
          sessionCode.toLowerCase().includes(query) ||
          session.description?.toLowerCase().includes(query) ||
          session.createdBy?.name?.toLowerCase().includes(query) ||
          session.createdBy?.phone?.toLowerCase().includes(query) ||
          session.transactions?.some(t => 
            t.inventoryItem?.inventoryProduct?.name?.toLowerCase().includes(query)
          ) ||
          false
        if (!matchesSearch) return false
      }
      
      // Product filter
      if (productFilter !== "all") {
        const hasProduct =           session.transactions?.some(t => 
            t.inventoryItem?.inventoryProduct?.id === productFilter
          )
        if (!hasProduct) return false
      }
      
      // Date filter
      if (startDate) {
        const sessionDate = new Date(session.createdAt)
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        if (sessionDate < start) return false
      }
      
      if (endDate) {
        const sessionDate = new Date(session.createdAt)
        const end = new Date(endDate + "T23:59:59")
        if (sessionDate > end) return false
      }
      
      return true
    })
  }, [sessions, searchQuery, productFilter, startDate, endDate])

  // Tạo tóm tắt session (trả về JSX)
  const getSessionSummary = (session: InventorySession) => {
    if (!session.transactions || session.transactions.length === 0) {
      return <span className="text-gray-400">-</span>
    }
    
    // Nhóm theo sản phẩm và tính tổng số lượng
    const productMap = new Map<string, { name: string; quantity: number }>()
    
    session.transactions.forEach(transaction => {
      const productId = transaction.inventoryItem?.inventoryProduct?.id || ""
      const productName = transaction.inventoryItem?.inventoryProduct?.name || "Không xác định"
      const quantity = transaction.quantity || 0
      
      if (productId && productMap.has(productId)) {
        const existing = productMap.get(productId)!
        existing.quantity += quantity
      } else if (productId) {
        productMap.set(productId, { name: productName, quantity })
      }
    })
    
    // Tạo danh sách sản phẩm
    const productList = Array.from(productMap.values())
    
    return (
      <div className="flex flex-col gap-1">
        {productList.map((p, index) => (
          <span key={index} className="text-sm">
            {p.name} x {p.quantity}
          </span>
        ))}
      </div>
    )
  }


  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Lịch sử Nhập/Xuất Kho</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle>Danh sách Sessions</CardTitle>
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "IMPORT" | "EXPORT")}>
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
                    placeholder="Tìm kiếm theo mã session, mô tả, người tạo, sản phẩm..."
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
                            {Array.isArray(inventoryProducts) && inventoryProducts.map((product) => (
                              <SelectItem key={product?.id} value={product?.id}>
                                {product?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="filter-startDate">Từ ngày</Label>
                          <Input
                            id="filter-startDate"
                            type="date"
                            value={tempStartDate}
                            onChange={(e) => setTempStartDate(e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="filter-endDate">Đến ngày</Label>
                          <Input
                            id="filter-endDate"
                            type="date"
                            value={tempEndDate}
                            onChange={(e) => setTempEndDate(e.target.value)}
                            className="mt-2"
                            min={tempStartDate || undefined}
                          />
                        </div>
                      </div>

                      {activeFiltersCount > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {productFilter !== "all" && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              Sản phẩm: {Array.isArray(inventoryProducts) ? inventoryProducts.find(p => p?.id === productFilter)?.name : ""}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => {
                                  setTempProductFilter("all")
                                  setProductFilter("all")
                                }}
                              />
                            </Badge>
                          )}
                          {startDate && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              Từ: {new Date(startDate).toLocaleDateString("vi-VN")}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => {
                                  setTempStartDate("")
                                  setStartDate("")
                                }}
                              />
                            </Badge>
                          )}
                          {endDate && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              Đến: {new Date(endDate).toLocaleDateString("vi-VN")}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => {
                                  setTempEndDate("")
                                  setEndDate("")
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
            {isLoadingSessions ? (
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
                      <TableHead>Mô tả</TableHead>
                      <TableHead>Tóm tắt</TableHead>
                      <TableHead>Người tạo</TableHead>
                      <TableHead>Thời gian tạo</TableHead>
                      <TableHead>Số lô hàng</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions && filteredSessions.length > 0 ? (
                      filteredSessions.map((session) => {
                        const sessionCode = (session as any).code || session.id || ""
                        return (
                          <TableRow 
                            key={sessionCode}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => setSelectedSessionCode(sessionCode)}
                          >
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {sessionCode}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={session.type === "IMPORT" ? "default" : "destructive"}>
                                {session.type === "IMPORT" ? "Nhập kho" : "Xuất kho"}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {session.description || "-"}
                            </TableCell>
                            <TableCell className="max-w-[300px]">
                              {getSessionSummary(session)}
                            </TableCell>
                            <TableCell>
                              {session.createdBy?.name || "-"}
                            </TableCell>
                            <TableCell>
                              {formatDate(session.createdAt)}
                            </TableCell>
                            <TableCell>
                              {session._count?.transactions || session.transactions?.length || 0}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedSessionCode(sessionCode)}
                              >
                                Xem chi tiết
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          {searchQuery || activeTab !== "all" || productFilter !== "all" || startDate || endDate
                            ? "Không tìm thấy session nào"
                            : "Không có session nào"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                  {/* Dialog chi tiết session */}
                  <Dialog open={!!selectedSessionCode} onOpenChange={(open) => !open && setSelectedSessionCode(null)}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <div className="relative">
                        <DialogHeader>
                          <DialogTitle>
                            Chi tiết Session: {selectedSessionCode}
                          </DialogTitle>
                        </DialogHeader>
                        {isLoadingSessionDetail ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : sessionDetail ? (
                          <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                              <Label className="text-sm text-gray-500">Người tạo</Label>
                              <div className="mt-1 font-medium">
                                {sessionDetail.createdBy?.name || "-"}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500">Thời gian tạo</Label>
                              <div className="mt-1 font-medium">
                                {formatDate(sessionDetail.createdAt)}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500">Số lượng lô hàng</Label>
                              <div className="mt-1 font-medium">
                                {sessionDetail.transactions?.length || 0}
                              </div>
                            </div>
                            {sessionDetail.description && (
                              <div>
                                <Label className="text-sm text-gray-500">Mô tả</Label>
                                <div className="mt-1">{sessionDetail.description}</div>
                              </div>
                            )}
                            {sessionDetail.notes && (
                              <div className="col-span-2">
                                <Label className="text-sm text-gray-500">Ghi chú</Label>
                                <div className="mt-1">{sessionDetail.notes}</div>
                              </div>
                            )}
                          </div>

                          <div>
                            <h3 className="font-semibold mb-3">Danh sách giao dịch</h3>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>STT</TableHead>
                                  <TableHead>Sản phẩm</TableHead>
                                  <TableHead>Danh mục</TableHead>
                                  <TableHead>Số lượng</TableHead>
                                  <TableHead>Ngày hết hạn</TableHead>
                                  <TableHead>Người thực hiện</TableHead>
                                  <TableHead>Ghi chú</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sessionDetail.transactions && sessionDetail.transactions.length > 0 ? (
                                  sessionDetail.transactions.map((transaction, index) => {
                                    const productId = transaction.inventoryItem?.inventoryProduct?.id
                                    const product = Array.isArray(inventoryProducts) ? inventoryProducts.find(p => p.id === productId) : undefined
                                    return (
                                      <TableRow key={transaction.id}>
                                        <TableCell className="font-medium">
                                          {index + 1}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                          {transaction.inventoryItem?.inventoryProduct?.name || "-"}
                                        </TableCell>
                                        <TableCell>
                                          {product?.category?.name || "-"}
                                        </TableCell>
                                        <TableCell>
                                          <span className={transaction.type === "IMPORT" ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                                            {transaction.type === "IMPORT" ? "+" : "-"}
                                            {transaction.quantity}
                                          </span>
                                        </TableCell>
                                        <TableCell>
                                          {transaction.inventoryItem?.expiryDate
                                            ? formatDateOnly(transaction.inventoryItem.expiryDate)
                                            : "-"}
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
                                          <span className="text-sm text-gray-600 max-w-[200px] truncate block">
                                            {transaction.notes || "-"}
                                          </span>
                                        </TableCell>
                                      </TableRow>
                                    )
                                  })
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                                      Không có transaction nào
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              Không tìm thấy thông tin session
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

