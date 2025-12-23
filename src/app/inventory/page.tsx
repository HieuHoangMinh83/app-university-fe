"use client"

import { useQuery } from "@tanstack/react-query"
import { inventoryProductsApi, InventoryProduct } from "@/services/api/inventory-products"
import { categoriesApi } from "@/services/api/categories"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, AlertTriangle, Plus, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"
import { useState, useMemo } from "react"

export default function InventoryPage() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "valid" | "expired">("all")
  const [expiryDate, setExpiryDate] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  
  // Temporary filter states for dialog
  const [tempExpiryDate, setTempExpiryDate] = useState<string>("")
  const [tempCategoryFilter, setTempCategoryFilter] = useState<string>("all")
  
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ["inventory-items", page, pageSize, expiryDate, categoryFilter, activeTab],
    queryFn: () => {
      const params: { groupByProduct?: boolean; expiryDate?: string; productId?: string; page?: number; pageSize?: number; status?: "all" | "valid" | "expired" } = {
        groupByProduct: true,
        page,
        pageSize,
        status: activeTab, // Gửi status từ tab hiện tại
      }
      // Chỉ gửi 1 parameter ngày thay vì from và to
      if (expiryDate) {
        params.expiryDate = expiryDate
      }
      if (categoryFilter !== "all") params.productId = categoryFilter // Note: API có thể không hỗ trợ categoryId, cần filter ở client
      return inventoryProductsApi.getItems(params)
    },
  })

  // Extract products array and pagination meta from paginated or non-paginated response
  const { products, paginationMeta } = useMemo(() => {
    if (!productsResponse) return { products: undefined, paginationMeta: undefined }
    if (Array.isArray(productsResponse)) return { products: productsResponse, paginationMeta: undefined }
    if ('data' in productsResponse && Array.isArray(productsResponse.data)) {
      return {
        products: productsResponse.data,
        paginationMeta: 'meta' in productsResponse ? productsResponse.meta : undefined
      }
    }
    return { products: [], paginationMeta: undefined }
  }, [productsResponse])

  const { data: categoriesResponse } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.getAll(),
  })

  // Extract categories array from paginated or non-paginated response
  const categories = useMemo(() => {
    if (!categoriesResponse) return undefined
    if (Array.isArray(categoriesResponse)) return categoriesResponse
    if ('data' in categoriesResponse && Array.isArray(categoriesResponse.data)) {
      return categoriesResponse.data
    }
    return []
  }, [categoriesResponse])

  const selectedProduct = useMemo(() => {
    if (!selectedProductId || !products) return null
    return products.find(p => p.id === selectedProductId) || null
  }, [selectedProductId, products])

  // Tính tổng số lượng và phân loại items theo trạng thái hết hạn
  const productsWithStats = useMemo(() => {
    if (!products) return []
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return products.map(product => {
      // API trả về inventoryItems đã được sắp xếp theo ngày hết hạn (sớm nhất trước)
      const totalQuantity = product.inventoryItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
      
      // Phân loại items thành valid và expired
      const validItems = product.inventoryItems?.filter(item => {
        if (!item.expiryDate) return false
        const expiryDate = new Date(item.expiryDate)
        expiryDate.setHours(0, 0, 0, 0)
        return expiryDate >= today
      }) || []
      
      const expiredItems = product.inventoryItems?.filter(item => {
        if (!item.expiryDate) return false
        const expiryDate = new Date(item.expiryDate)
        expiryDate.setHours(0, 0, 0, 0)
        return expiryDate < today
      }) || []
      
      // Nếu có filter theo ngày, lọc items theo ngày đó
      let filteredValidItems = validItems
      let filteredExpiredItems = expiredItems
      
      if (expiryDate) {
        const filterDate = new Date(expiryDate)
        filterDate.setHours(0, 0, 0, 0)
        
        filteredValidItems = validItems.filter(item => {
          if (!item.expiryDate) return false
          const itemExpiryDate = new Date(item.expiryDate)
          itemExpiryDate.setHours(0, 0, 0, 0)
          return itemExpiryDate.getTime() === filterDate.getTime()
        })
        
        filteredExpiredItems = expiredItems.filter(item => {
          if (!item.expiryDate) return false
          const itemExpiryDate = new Date(item.expiryDate)
          itemExpiryDate.setHours(0, 0, 0, 0)
          return itemExpiryDate.getTime() === filterDate.getTime()
        })
      }
      
      return {
        ...product,
        totalQuantity,
        validItems: filteredValidItems,
        expiredItems: filteredExpiredItems,
        allItems: product.inventoryItems || [],
      }
    })
  }, [products, expiryDate])

  // Filter products based on search query and category
  // Note: Filter by status (tab) đã được xử lý ở API
  const filteredProducts = useMemo(() => {
    if (!productsWithStats) return []
    
    let filtered = productsWithStats
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(query) ||
        product.category?.name?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      )
    }
    
    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter(product => product.categoryId === categoryFilter)
    }
    
    return filtered
  }, [productsWithStats, searchQuery, categoryFilter])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN")
  }

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }


  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          {/* Tabs ở trên cùng của Card */}
          <div className="pb-0">
            <Tabs value={activeTab} onValueChange={(v) => {
              setActiveTab(v as "all" | "valid" | "expired")
              setPage(1) // Reset về trang đầu khi đổi tab
            }}>
              <TabsList>
                <TabsTrigger value="all">Tất cả</TabsTrigger>
                <TabsTrigger value="valid">Còn hạn</TabsTrigger>
                <TabsTrigger value="expired">Hết hạn</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle>Danh sách sản phẩm kho</CardTitle>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo tên, mô tả hoặc danh mục..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Sheet open={isFilterOpen} onOpenChange={(open) => {
                  setIsFilterOpen(open)
                  if (open) {
                    // Initialize temp filters when dialog opens
                    setTempExpiryDate(expiryDate)
                    setTempCategoryFilter(categoryFilter)
                  }
                }}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full md:w-auto">
                      <Filter className="mr-2 h-4 w-4" />
                      Bộ lọc
                      {(expiryDate || categoryFilter !== "all") && (
                        <Badge variant="secondary" className="ml-2">
                          {[expiryDate, categoryFilter !== "all"].filter(Boolean).length}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-md">
                    <SheetHeader>
                      <SheetTitle>Bộ lọc</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-6 mt-6">
                      <div>
                        <Label htmlFor="filter-category" className="text-base font-semibold mb-2 block">Danh mục</Label>
                        <Select value={tempCategoryFilter} onValueChange={setTempCategoryFilter}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Chọn danh mục" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Tất cả danh mục</SelectItem>
                            {Array.isArray(categories) && categories.map((category) => (
                              <SelectItem key={category?.id} value={category?.id}>
                                {category?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="expiry-date" className="text-base font-semibold mb-2 block">Ngày hết hạn</Label>
                        <Input
                          id="expiry-date"
                          type="date"
                          value={tempExpiryDate}
                          onChange={(e) => setTempExpiryDate(e.target.value)}
                          className="mt-2"
                        />
                      </div>
                      <div className="flex gap-3 pt-4 border-t">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setTempExpiryDate("")
                            setTempCategoryFilter("all")
                            setExpiryDate("")
                            setCategoryFilter("all")
                            setPage(1) // Reset về trang đầu khi xóa filter
                            setIsFilterOpen(false)
                          }}
                        >
                          Xóa bộ lọc
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={() => {
                            setExpiryDate(tempExpiryDate)
                            setCategoryFilter(tempCategoryFilter)
                            setPage(1) // Reset về trang đầu khi áp dụng filter
                            setIsFilterOpen(false)
                          }}
                        >
                          Áp dụng
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
                <Link href="/inventory-import">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nhập kho
                  </Button>
                </Link>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                      <TableRow>
                        <TableHead>STT</TableHead>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Danh mục</TableHead>
                        <TableHead>Tổng số lượng</TableHead>
                        <TableHead>
                          {activeTab === "valid" ? "Số lô còn hạn" : 
                           activeTab === "expired" ? "Số lô hết hạn" : 
                           "Số lô hàng"}
                        </TableHead>
                        <TableHead>Thao tác</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts && filteredProducts.length > 0 ? (
                      filteredProducts.map((product, index) => {
                        return (
                          <TableRow 
                            key={product.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => setSelectedProductId(product.id)}
                          >
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium">
                              {product.name}
                            </TableCell>
                            <TableCell>
                              {product.category ? (
                                <Badge variant="outline">{product.category.name}</Badge>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">{product.totalQuantity}</TableCell>
                            <TableCell>
                              {activeTab === "valid" ? (
                                <Badge variant="default" className="bg-green-500">
                                  {product.validItems?.length || 0}
                                </Badge>
                              ) : activeTab === "expired" ? (
                                <Badge variant="destructive">
                                  {product.expiredItems?.length || 0}
                                </Badge>
                              ) : (
                                product.allItems?.length || 0
                              )}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedProductId(product.id)}
                              >
                                Xem chi tiết
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          {searchQuery || expiryDate || categoryFilter !== "all"
                            ? "Không tìm thấy sản phẩm nào phù hợp" 
                            : "Không có sản phẩm nào"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {/* Pagination Controls */}
                {paginationMeta && paginationMeta.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      Hiển thị {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, paginationMeta.total)} trong tổng số {paginationMeta.total} sản phẩm
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || isLoading}
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
                        disabled={page >= paginationMeta.totalPages || isLoading}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

            {/* Dialog chi tiết sản phẩm */}
            <Dialog open={!!selectedProductId} onOpenChange={(open) => !open && setSelectedProductId(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Chi tiết: {selectedProduct?.name}
                  </DialogTitle>
                </DialogHeader>
                {selectedProduct ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label className="text-sm text-gray-500">Danh mục</Label>
                        <div className="mt-1 font-medium">
                          {selectedProduct.category?.name || "-"}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Tổng số lượng</Label>
                        <div className="mt-1 font-medium">
                          {selectedProduct.inventoryItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-500">Số lô hàng</Label>
                        <div className="mt-1 font-medium">
                          {selectedProduct.inventoryItems?.length || 0}
                        </div>
                      </div>
                      {selectedProduct.description && (
                        <div className="col-span-2">
                          <Label className="text-sm text-gray-500">Mô tả</Label>
                          <div className="mt-1">{selectedProduct.description}</div>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Danh sách lô hàng</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>STT</TableHead>
                            <TableHead>Số lượng</TableHead>
                            <TableHead>Ngày hết hạn</TableHead>
                            <TableHead>Mã session</TableHead>
                            <TableHead>Người nhập</TableHead>
                            <TableHead>Ngày nhập</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedProduct.inventoryItems && selectedProduct.inventoryItems.length > 0 ? (
                            selectedProduct.inventoryItems.map((item, index) => {
                              const daysUntilExpiry = item.expiryDate ? getDaysUntilExpiry(item.expiryDate) : null
                              return (
                                <TableRow key={item.id}>
                                  <TableCell>{index + 1}</TableCell>
                                  <TableCell className="font-medium">{item.quantity}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {item.expiryDate ? formatDate(item.expiryDate) : "-"}
                                      {daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry >= 0 && (
                                        <Badge variant="destructive" className="text-xs">
                                          <AlertTriangle className="h-3 w-3 mr-1" />
                                          {daysUntilExpiry} ngày
                                        </Badge>
                                      )}
                                      {daysUntilExpiry !== null && daysUntilExpiry < 0 && (
                                        <Badge variant="destructive">Đã hết hạn</Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="font-mono text-xs">
                                      {item.sessionCode}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{item.importedBy?.name || "-"}</TableCell>
                                  <TableCell>{item.createdAt ? formatDate(item.createdAt) : "-"}</TableCell>
                                </TableRow>
                              )
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                                Không có lô hàng nào
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Không tìm thấy thông tin sản phẩm
                  </div>
                )}
              </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
