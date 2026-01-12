"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { inventoryApi, SessionWithTransactions } from "@/services/api/inventory"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Search, ArrowDownCircle, ArrowUpCircle, Package } from "lucide-react"
import DashboardLayout from "@/components/dashboard-layout"
import { Label } from "@/components/ui/label"

export default function InventoryTransactionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"all" | "IMPORT" | "EXPORT">("all")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [selectedSession, setSelectedSession] = useState<SessionWithTransactions | null>(null)

  const { data: sessionsResponse, isLoading } = useQuery({
    queryKey: ["inventory-sessions-with-transactions", activeTab, page, pageSize],
    queryFn: () => {
      const params: any = { page, pageSize }
      if (activeTab !== "all") {
        params.type = activeTab as "IMPORT" | "EXPORT"
      }
      return inventoryApi.getSessionsWithTransactions(params)
    },
  })

  const sessions = useMemo(() => {
    if (!sessionsResponse) return []
    return sessionsResponse.data || []
  }, [sessionsResponse])

  const pagination = useMemo(() => {
    if (!sessionsResponse) return undefined
    return sessionsResponse.meta
  }, [sessionsResponse])

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

  // Filter sessions based on search query
  const filteredSessions = useMemo(() => {
    if (!Array.isArray(sessions)) return []
    
    return sessions.filter((session) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          session.code?.toLowerCase().includes(query) ||
          session.description?.toLowerCase().includes(query) ||
          session.notes?.toLowerCase().includes(query) ||
          session.createdBy?.name?.toLowerCase().includes(query) ||
          session.createdBy?.phone?.toLowerCase().includes(query) ||
          session.order?.client?.name?.toLowerCase().includes(query) ||
          session.transactions?.some(t => 
            t.inventoryItem?.inventoryProduct?.name?.toLowerCase().includes(query) ||
            t.performedBy?.name?.toLowerCase().includes(query)
          ) ||
          false
        if (!matchesSearch) return false
      }
      
      return true
    })
  }, [sessions, searchQuery])


  return (
    <DashboardLayout>
      <div className="space-y-6">
       

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle>Lịch sử Nhập/Xuất Kho</CardTitle>
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
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
                      <TableHead>Số lượng giao dịch</TableHead>
                      <TableHead>Người tạo</TableHead>
                      <TableHead>Đơn hàng</TableHead>
                      <TableHead>Thời gian tạo</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions && filteredSessions.length > 0 ? (
                      filteredSessions.map((session) => (
                        <TableRow 
                          key={session.code}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => setSelectedSession(session)}
                        >
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {session.code}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={session.type === "IMPORT" ? "default" : "destructive"}>
                              {session.type === "IMPORT" ? "Nhập kho" : "Xuất kho"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {session.description || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {session._count?.transactions || session.transactions?.length || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {session.createdBy ? (
                              <div className="flex flex-col">
                                <span className="font-medium">{session.createdBy.name}</span>
                                {session.createdBy.phone && (
                                  <span className="text-xs text-gray-500">{session.createdBy.phone}</span>
                                )}
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {session.order ? (
                              <div className="flex flex-col">
                                <span className="font-medium">#{session.order.id.slice(0, 8)}</span>
                                <span className="text-xs text-gray-500">{session.order.client.name}</span>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {formatDate(session.createdAt)}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSession(session)}
                            >
                              Xem chi tiết
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          {searchQuery || activeTab !== "all"
                            ? "Không tìm thấy session nào"
                            : "Không có session nào"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                      Hiển thị {(pagination.page - 1) * pagination.pageSize + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} trong tổng số {pagination.total} session
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

                {/* Dialog chi tiết session */}
                <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div className="relative">
                      <DialogHeader>
                        <DialogTitle>
                          Chi tiết Session: {selectedSession?.code}
                        </DialogTitle>
                      </DialogHeader>
                      {selectedSession ? (
                        <div className="space-y-4 mt-4">
                          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                              <Label className="text-sm text-gray-500">Loại session</Label>
                              <div className="mt-1">
                                <Badge variant={selectedSession.type === "IMPORT" ? "default" : "destructive"}>
                                  {selectedSession.type === "IMPORT" ? "Nhập kho" : "Xuất kho"}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500">Mã Session</Label>
                              <div className="mt-1 font-medium">
                                <Badge variant="outline" className="font-mono">
                                  {selectedSession.code}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500">Mô tả</Label>
                              <div className="mt-1">{selectedSession.description || "-"}</div>
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500">Ghi chú</Label>
                              <div className="mt-1">{selectedSession.notes || "-"}</div>
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500">Số lượng giao dịch</Label>
                              <div className="mt-1 font-medium">
                                {selectedSession._count?.transactions || selectedSession.transactions?.length || 0}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm text-gray-500">Thời gian tạo</Label>
                              <div className="mt-1 font-medium">
                                {formatDate(selectedSession.createdAt)}
                              </div>
                            </div>
                            {selectedSession.createdBy && (
                              <div>
                                <Label className="text-sm text-gray-500">Người tạo</Label>
                                <div className="mt-1">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{selectedSession.createdBy.name}</span>
                                    {selectedSession.createdBy.phone && (
                                      <span className="text-xs text-gray-500">{selectedSession.createdBy.phone}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            {selectedSession.order && (
                              <div>
                                <Label className="text-sm text-gray-500">Đơn hàng</Label>
                                <div className="mt-1">
                                  <div className="flex flex-col">
                                    <span className="font-medium">#{selectedSession.order.id.slice(0, 8)}</span>
                                    <span className="text-xs text-gray-500">{selectedSession.order.client.name}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Transactions List */}
                          {selectedSession.transactions && selectedSession.transactions.length > 0 && (
                            <div>
                              <h3 className="font-semibold mb-3">Danh sách giao dịch</h3>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Sản phẩm</TableHead>
                                    <TableHead>Số lượng</TableHead>
                                    <TableHead>Ngày hết hạn</TableHead>
                                    <TableHead>Người thực hiện</TableHead>
                                    <TableHead>Thời gian</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {selectedSession.transactions.map((transaction) => (
                                    <TableRow key={transaction.id}>
                                      <TableCell>
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
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
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
