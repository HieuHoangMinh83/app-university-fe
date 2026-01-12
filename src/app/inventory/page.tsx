"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { inventoryProductsApi, InventoryProduct } from "@/services/api/inventory-products"
import { categoriesApi } from "@/services/api/categories"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Badge,
  Button,
  Card,
  Drawer,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Skeleton,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import { PlusOutlined, SearchOutlined, FilterOutlined, ExclamationCircleOutlined, EditOutlined } from "@ant-design/icons"

const { Title } = Typography

export default function InventoryPage() {
  const router = useRouter()
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"all" | "valid" | "expired">("all")
  const [expiryDate, setExpiryDate] = useState<string>("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  
  // Temporary filter states for drawer
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
        status: activeTab,
      }
      if (expiryDate) {
        params.expiryDate = expiryDate
      }
      if (categoryFilter !== "all") params.productId = categoryFilter
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
      const totalQuantity = product.inventoryItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
      
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
  const filteredProducts = useMemo(() => {
    if (!productsWithStats) return []
    
    let filtered = productsWithStats
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(query) ||
        product.category?.name?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      )
    }
    
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

  // Skeleton data for loading state
  const skeletonData = useMemo(() => {
    return Array.from({ length: 10 }, (_, index) => ({
      id: `skeleton-${index}`,
      name: '',
      category: null,
      totalQuantity: 0,
      validItems: [],
      expiredItems: [],
      allItems: [],
      isSkeleton: true
    }))
  }, [])

  // Initialize temp filters when drawer opens
  useEffect(() => {
    if (isFilterOpen) {
      setTempExpiryDate(expiryDate)
      setTempCategoryFilter(categoryFilter)
    }
  }, [isFilterOpen, expiryDate, categoryFilter])

  const columns: ColumnsType<InventoryProduct & { totalQuantity: number; validItems: any[]; expiredItems: any[]; allItems: any[] }> = useMemo(
    () => [
      {
        title: "STT",
        key: "stt",
        width: 60,
        align: "center",
        render: (_, record, index) => {
          if ((record as any).isSkeleton) {
            return <Skeleton.Input active size="small" style={{ width: 40 }} />
          }
          const currentPage = page || 1
          const currentPageSize = pageSize || 20
          return (currentPage - 1) * currentPageSize + index + 1
        },
      },
      {
        title: "Sản phẩm",
        dataIndex: "name",
        key: "name",
        render: (text, record) => {
          if ((record as any).isSkeleton) {
            return <Skeleton.Input active size="small" style={{ width: 150 }} />
          }
          return <span style={{ fontWeight: 500 }}>{text}</span>
        },
      },
      {
        title: "Danh mục",
        key: "category",
        render: (_, record) => {
          if ((record as any).isSkeleton) {
            return <Skeleton.Input active size="small" style={{ width: 100 }} />
          }
          return record?.category ? (
            <Tag>{record.category.name}</Tag>
          ) : (
            "-"
          )
        },
      },
      {
        title: "Tổng số lượng",
        key: "totalQuantity",
        align: "right",
        render: (_, record) => {
          if ((record as any).isSkeleton) {
            return <Skeleton.Input active size="small" style={{ width: 80 }} />
          }
          return <span style={{ fontWeight: 600 }}>{record.totalQuantity}</span>
        },
      },
      {
        title: activeTab === "valid" ? "Số lô còn hạn" : 
               activeTab === "expired" ? "Số lô hết hạn" : 
               "Số lô hàng",
        key: "batches",
        align: "center",
        render: (_, record) => {
          if ((record as any).isSkeleton) {
            return <Skeleton.Button active size="small" style={{ width: 60 }} />
          }
          if (activeTab === "valid") {
            return (
              <Badge count={record.validItems?.length || 0} showZero>
                <Tag color="green">{record.validItems?.length || 0}</Tag>
              </Badge>
            )
          } else if (activeTab === "expired") {
            return (
              <Badge count={record.expiredItems?.length || 0} showZero>
                <Tag color="red">{record.expiredItems?.length || 0}</Tag>
              </Badge>
            )
          } else {
            return record.allItems?.length || 0
          }
        },
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 140,
        fixed: "right",
        align: "center",
        render: (_, record) => {
          if ((record as any).isSkeleton) {
            return <Skeleton.Button active size="small" style={{ width: 100 }} />
          }
          return (
            <Button
              type="default"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedProductId(record.id)
              }}
            >
              Xem chi tiết
            </Button>
          )
        },
      },
    ],
    [activeTab, page, pageSize]
  )

  const detailColumns: ColumnsType<any> = [
    {
      title: "STT",
      key: "stt",
      width: 60,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      align: "right",
      render: (quantity) => <span style={{ fontWeight: 500 }}>{quantity}</span>,
    },
    {
      title: "Ngày hết hạn",
      dataIndex: "expiryDate",
      key: "expiryDate",
      render: (expiryDate: string) => {
        if (!expiryDate) return "-"
        const daysUntilExpiry = getDaysUntilExpiry(expiryDate)
        return (
          <Space>
            <span>{formatDate(expiryDate)}</span>
            {daysUntilExpiry <= 7 && daysUntilExpiry >= 0 && (
              <Tag color="orange" icon={<ExclamationCircleOutlined />}>
                {daysUntilExpiry} ngày
              </Tag>
            )}
            {daysUntilExpiry < 0 && (
              <Tag color="red">Đã hết hạn</Tag>
            )}
          </Space>
        )
      },
    },
    {
      title: "Mã session",
      dataIndex: "sessionCode",
      key: "sessionCode",
      render: (sessionCode: string) => (
        <Tag style={{ fontFamily: "monospace" }}>{sessionCode}</Tag>
      ),
    },
    {
      title: "Người nhập",
      key: "importedBy",
      render: (_, record) => record?.importedBy?.name || "-",
    },
    {
      title: "Ngày nhập",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt: string) => createdAt ? formatDate(createdAt) : "-",
    },
  ]

  const activeFilterCount = [expiryDate, categoryFilter !== "all"].filter(Boolean).length

  return (
    <DashboardLayout>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={3} style={{ margin: 0 }}>
            Quản lý kho
          </Title>
          <Link href="/inventory-import">
            <Button  icon={<PlusOutlined />}>
              Nhập kho
            </Button>
          </Link>
        </Space>

        <Card>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Tabs
              activeKey={activeTab}
              onChange={(key) => {
                setActiveTab(key as "all" | "valid" | "expired")
                setPage(1)
              }}
              items={[
                { key: "all", label: "Tất cả" },
                { key: "valid", label: "Còn hạn" },
                { key: "expired", label: "Hết hạn" },
              ]}
            />

            <Space style={{ width: "100%", flexWrap: "wrap" }} size={[12, 12]}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Tìm kiếm theo tên, mô tả hoặc danh mục..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ minWidth: 240, flex: 1 }}
              />
              <Button
                icon={<FilterOutlined />}
                onClick={() => setIsFilterOpen(true)}
              >
                Bộ lọc
                {activeFilterCount > 0 && (
                  <Badge count={activeFilterCount} style={{ marginLeft: 8 }} />
                )}
              </Button>
            </Space>

            <Table
              columns={columns}
              dataSource={isLoading ? (skeletonData as any) : (filteredProducts || [])}
              loading={false}
              rowKey={(record) => (record as any).isSkeleton ? (record as any).id : (record?.id || `inventory-${Math.random()}`)}
              scroll={{ x: "max-content", y: 550 }}
              onRow={(record) => ({
                onClick: (e) => {
                  const target = e.target as HTMLElement
                  if (
                    target.closest('button') ||
                    target.closest('.ant-popover') ||
                    target.closest('a') ||
                    (record as any).isSkeleton
                  ) {
                    return
                  }
                  setSelectedProductId(record.id)
                },
                style: { cursor: 'pointer' }
              })}
              pagination={
                !isLoading && paginationMeta?.totalPages
                  ? {
                      current: page,
                      total: paginationMeta.total,
                      pageSize: pageSize,
                      showSizeChanger: false,
                      showTotal: (total, range) =>
                        `Hiển thị ${range[0]}-${range[1]} / ${total} sản phẩm`,
                      onChange: (newPage) => setPage(newPage),
                    }
                  : false
              }
              locale={{
                emptyText:
                  searchQuery || expiryDate || categoryFilter !== "all"
                    ? "Không tìm thấy sản phẩm nào phù hợp"
                    : "Không có sản phẩm nào",
              }}
            />
          </Space>
        </Card>

        {/* Drawer cho bộ lọc */}
        <Drawer
          title="Bộ lọc"
          placement="right"
          onClose={() => setIsFilterOpen(false)}
          open={isFilterOpen}
          width={400}
        >
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Danh mục
              </label>
              <Select
                value={tempCategoryFilter}
                onChange={setTempCategoryFilter}
                style={{ width: "100%" }}
                options={[
                  { label: "Tất cả danh mục", value: "all" },
                  ...(categories || []).map((category) => ({
                    label: category?.name,
                    value: category?.id,
                  })),
                ]}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Mốc thời gian
              </label>
              <Input
                type="date"
                value={tempExpiryDate}
                onChange={(e) => setTempExpiryDate(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <Space style={{ width: "100%", justifyContent: "flex-end", marginTop: 24 }}>
              <Button
                onClick={() => {
                  setTempExpiryDate("")
                  setTempCategoryFilter("all")
                  setExpiryDate("")
                  setCategoryFilter("all")
                  setPage(1)
                }}
              >
                Xóa bộ lọc
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  setExpiryDate(tempExpiryDate)
                  setCategoryFilter(tempCategoryFilter)
                  setPage(1)
                  setIsFilterOpen(false)
                }}
              >
                Áp dụng
              </Button>
            </Space>
          </Space>
        </Drawer>

        {/* Modal chi tiết sản phẩm */}
        <Modal
          title={`Chi tiết: ${selectedProduct?.name || ""}`}
          open={!!selectedProductId}
          onCancel={() => setSelectedProductId(null)}
          footer={null}
          width={900}
          destroyOnClose
        >
          {selectedProduct ? (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Card size="small">
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 4 }}>Danh mục</div>
                      <div style={{ fontWeight: 500 }}>{selectedProduct.category?.name || "-"}</div>
                    </div>
                    <div>
                      <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 4 }}>Tổng số lượng</div>
                      <div style={{ fontWeight: 500 }}>
                        {selectedProduct.inventoryItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 4 }}>Số lô hàng</div>
                      <div style={{ fontWeight: 500 }}>{selectedProduct.inventoryItems?.length || 0}</div>
                    </div>
                    {selectedProduct.description && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 4 }}>Mô tả</div>
                        <div>{selectedProduct.description}</div>
                      </div>
                    )}
                  </div>
                </Space>
              </Card>

              <div>
                <Title level={5} style={{ marginBottom: 12 }}>
                  Danh sách lô hàng
                </Title>
                <Table
                  columns={detailColumns}
                  dataSource={selectedProduct.inventoryItems || []}
                  pagination={false}
                  rowKey="id"
                  size="small"
                />
              </div>
            </Space>
          ) : (
            <div style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>
              Không tìm thấy thông tin sản phẩm
            </div>
          )}
        </Modal>
      </Space>
    </DashboardLayout>
  )
}
