"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  inventoryProductsApi,
  InventoryProduct,
  CreateInventoryProductDto,
  UpdateInventoryProductDto,
} from "@/services/api/inventory-products"
import { categoriesApi, Category } from "@/services/api/categories"
import DashboardLayout from "@/components/dashboard-layout"
import {
  Badge,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Skeleton,
  Tabs,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import {
  PlusOutlined,
  EditOutlined,
  SearchOutlined,
  FilterOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons"
import { toast } from "sonner"

const { Title } = Typography

type ItemsTab = "all" | "valid" | "expired"

export default function InventoryProductsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailTab, setDetailTab] = useState<ItemsTab>("all")
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [tempCategoryFilter, setTempCategoryFilter] = useState<string>("all")
  const [tempStatusFilter, setTempStatusFilter] = useState<string>("all")

  const [createForm] = Form.useForm<CreateInventoryProductDto>()
  const [editForm] = Form.useForm<UpdateInventoryProductDto>()

  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ["inventory-products", page, pageSize, categoryFilter, statusFilter],
    queryFn: async () => {
      const params: { page?: number; pageSize?: number; categoryId?: string; status?: string } = {
        page,
        pageSize,
      }
      if (categoryFilter !== "all") params.categoryId = categoryFilter
      if (statusFilter !== "all") params.status = statusFilter
      const resp = await inventoryProductsApi.getAll(params)
      // Debug API response shape
      // eslint-disable-next-line no-console
      console.log("inventory-products response", resp)
      return resp
    },
  })

  const { products, paginationMeta } = useMemo(() => {
    if (!productsResponse) return { products: undefined, paginationMeta: undefined }
    if (Array.isArray(productsResponse)) return { products: productsResponse, paginationMeta: undefined }

    // Trường hợp API trả { data: { data: [...], meta: {...} } }
    if ("data" in productsResponse && productsResponse.data && "data" in productsResponse.data) {
      const inner = productsResponse.data as any
      if (Array.isArray(inner.data)) {
        return {
          products: inner.data,
          paginationMeta: inner.meta,
        }
      }
    }

    // Trường hợp API trả { data: [...], meta: {...} }
    if ("data" in productsResponse && Array.isArray((productsResponse as any).data)) {
      return {
        products: (productsResponse as any).data,
        paginationMeta: "meta" in productsResponse ? (productsResponse as any).meta : undefined,
      }
    }

    return { products: [], paginationMeta: undefined }
  }, [productsResponse])

  const { data: categoriesResponse } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.getAll(),
  })

  const categories = useMemo(() => {
    if (!categoriesResponse) return []
    if (Array.isArray(categoriesResponse)) return categoriesResponse
    if ("data" in categoriesResponse && categoriesResponse.data && "data" in categoriesResponse.data) {
      const inner = (categoriesResponse as any).data
      if (Array.isArray(inner.data)) return inner.data
    }
    if ("data" in categoriesResponse && Array.isArray((categoriesResponse as any).data)) {
      return (categoriesResponse as any).data
    }
    return []
  }, [categoriesResponse])

  const createMutation = useMutation({
    mutationFn: (data: CreateInventoryProductDto) => inventoryProductsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] })
      setIsCreateOpen(false)
      createForm.resetFields()
      toast.success("Tạo sản phẩm kho thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Tạo sản phẩm kho thất bại")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInventoryProductDto }) =>
      inventoryProductsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] })
      setEditingProduct(null)
      setIsEditOpen(false)
      editForm.resetFields()
      toast.success("Cập nhật sản phẩm kho thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Cập nhật thất bại")
    },
  })

  const filteredProducts = useMemo(() => {
    if (!products) return []
    let data: InventoryProduct[] = products as InventoryProduct[]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      data = data.filter(
        (p: InventoryProduct) =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category?.name?.toLowerCase().includes(q)
      )
    }
    if (categoryFilter !== "all") {
      data = data.filter((p: InventoryProduct) => p.categoryId === categoryFilter)
    }
    if (statusFilter !== "all") {
      data = data.filter((p: InventoryProduct) => (statusFilter === "active" ? p.isActive : !p.isActive))
    }
    return data
  }, [products, searchQuery, categoryFilter, statusFilter])

  const skeletonData = useMemo(
    () =>
      Array.from({ length: 10 }, (_, index) => ({
        id: `skeleton-${index}`,
        name: "",
        category: null,
        isActive: true,
        inventoryItems: [],
        isSkeleton: true,
      })),
    []
  )

  const getStatusTag = (isActive?: boolean) => (
    <Tag color={isActive ? "green" : "default"}>{isActive ? "Hoạt động" : "Không hoạt động"}</Tag>
  )

  const columns: ColumnsType<InventoryProduct> = useMemo(
    () => [
      {
        title: "Tên sản phẩm",
        dataIndex: "name",
        key: "name",
        render: (text, record) =>
          (record as any).isSkeleton ? (
            <Skeleton.Input active size="small" style={{ width: 160 }} />
          ) : (
            <span style={{ fontWeight: 500 }}>{text}</span>
          ),
      },
      {
        title: "Danh mục",
        key: "category",
        render: (_, record) =>
          (record as any).isSkeleton ? (
            <Skeleton.Input active size="small" style={{ width: 120 }} />
          ) : record?.category ? (
            <Tag>{record.category.name}</Tag>
          ) : (
            "-"
          ),
      },
      {
        title: "Trạng thái",
        dataIndex: "isActive",
        key: "isActive",
        render: (isActive: boolean, record) =>
          (record as any).isSkeleton ? (
            <Skeleton.Button active size="small" style={{ width: 100 }} />
          ) : (
            getStatusTag(isActive)
          ),
      },
      {
        title: "Ngày tạo",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (createdAt?: string, record?: any) =>
          record?.isSkeleton ? (
            <Skeleton.Input active size="small" style={{ width: 90 }} />
          ) : createdAt ? (
            new Date(createdAt).toLocaleDateString("vi-VN")
          ) : (
            "-"
          ),
      },
      {
        title: "Thao tác",
        key: "actions",
        width: 200,
        align: "center",
        render: (_, record) =>
          (record as any).isSkeleton ? (
            <Skeleton.Button active size="small" style={{ width: 140 }} />
          ) : (
            <Space>
              <Button
                type="default"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingProduct(record)
                  setIsEditOpen(true)
                  editForm.setFieldsValue({
                    name: record.name,
                    description: record.description || undefined,
                    categoryId: record.categoryId,
                    isActive: record.isActive,
                  })
                }}
              >
                Sửa
              </Button>
            </Space>
          ),
      },
    ],
    [editForm]
  )

  const activeFilterCount = [categoryFilter !== "all", statusFilter !== "all"].filter(Boolean).length

  const detailItems = useMemo(() => {
    if (!selectedProduct?.inventoryItems) return []
    if (detailTab === "all") return selectedProduct.inventoryItems
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return selectedProduct.inventoryItems.filter((item) => {
      if (!item.expiryDate) return false
      const expiry = new Date(item.expiryDate)
      expiry.setHours(0, 0, 0, 0)
      const diff = expiry.getTime() - today.getTime()
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
      return detailTab === "valid" ? days >= 0 : days < 0
    })
  }, [selectedProduct, detailTab])

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
      render: (q: number) => <span style={{ fontWeight: 500 }}>{q}</span>,
    },
    {
      title: "Ngày hết hạn",
      dataIndex: "expiryDate",
      key: "expiryDate",
      render: (expiryDate: string) => {
        if (!expiryDate) return "-"
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const expiry = new Date(expiryDate)
        expiry.setHours(0, 0, 0, 0)
        const diff = expiry.getTime() - today.getTime()
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
        return (
          <Space>
            <span>{new Date(expiryDate).toLocaleDateString("vi-VN")}</span>
            {days <= 7 && days >= 0 && (
              <Tag color="orange" icon={<ExclamationCircleOutlined />}>
                {days} ngày
              </Tag>
            )}
            {days < 0 && <Tag color="red">Đã hết hạn</Tag>}
          </Space>
        )
      },
    },
    {
      title: "Mã session",
      dataIndex: "sessionCode",
      key: "sessionCode",
      render: (code: string) => <Tag style={{ fontFamily: "monospace" }}>{code}</Tag>,
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
      render: (createdAt: string) => (createdAt ? new Date(createdAt).toLocaleDateString("vi-VN") : "-"),
    },
  ]

  return (
    <DashboardLayout>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={3} style={{ margin: 0 }}>
            Sản phẩm kho
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)}>
            Tạo sản phẩm kho
          </Button>
        </Space>

        <Card>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Space style={{ width: "100%", flexWrap: "wrap" }} size={[12, 12]}>
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="Tìm kiếm theo tên, mô tả hoặc danh mục..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ minWidth: 240, flex: 1 }}
              />
              <Select
                value={categoryFilter}
                onChange={(value) => {
                  setCategoryFilter(value)
                  setPage(1)
                }}
                style={{ minWidth: 200 }}
                options={[
                  { label: "Tất cả danh mục", value: "all" },
                  ...categories.map((c: Category) => ({ label: c?.name, value: c?.id })),
                ]}
              />
              <Select
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value)
                  setPage(1)
                }}
                style={{ minWidth: 180 }}
                options={[
                  { label: "Tất cả trạng thái", value: "all" },
                  { label: "Hoạt động", value: "active" },
                  { label: "Không hoạt động", value: "inactive" },
                ]}
              />
              <Button icon={<FilterOutlined />} onClick={() => setIsFilterOpen(true)}>
                Bộ lọc
                {activeFilterCount > 0 && <Badge count={activeFilterCount} style={{ marginLeft: 8 }} />}
              </Button>
            </Space>

            <Table
              columns={columns}
              dataSource={isLoading ? (skeletonData as any) : filteredProducts}
              loading={false}
              rowKey={(record) => (record as any).isSkeleton ? (record as any).id : record?.id || `inv-${Math.random()}`}
              scroll={{ x: "max-content", y: 550 }}
              onRow={(record) => ({
                onClick: (e) => {
                  const target = e.target as HTMLElement
                  if (target.closest("button") || target.closest("a") || (record as any).isSkeleton) return
                  router.push(`/inventory-products/${(record as InventoryProduct).id}`)
                },
                style: { cursor: "pointer" },
              })}
              pagination={
                !isLoading
                  ? {
                      current: page,
                      total: paginationMeta?.total ?? filteredProducts.length,
                      pageSize: pageSize,
                      showSizeChanger: false,
                      showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} / ${total} sản phẩm`,
                      onChange: (newPage) => setPage(newPage),
                    }
                  : false
              }
              locale={{
                emptyText:
                  searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                    ? "Không tìm thấy sản phẩm nào"
                    : "Không có dữ liệu",
              }}
            />
          </Space>
        </Card>

        <Drawer
          title="Bộ lọc"
          placement="right"
          onClose={() => setIsFilterOpen(false)}
          open={isFilterOpen}
          width={360}
        >
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 6 }}>Danh mục</div>
              <Select
                value={tempCategoryFilter}
                onChange={setTempCategoryFilter}
                style={{ width: "100%" }}
                options={[
                  { label: "Tất cả danh mục", value: "all" },
                  ...categories.map((c: Category) => ({ label: c?.name, value: c?.id })),
                ]}
              />
            </div>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 6 }}>Trạng thái</div>
              <Select
                value={tempStatusFilter}
                onChange={setTempStatusFilter}
                style={{ width: "100%" }}
                options={[
                  { label: "Tất cả trạng thái", value: "all" },
                  { label: "Hoạt động", value: "active" },
                  { label: "Không hoạt động", value: "inactive" },
                ]}
              />
            </div>
            <Space style={{ width: "100%", justifyContent: "flex-end", marginTop: 16 }}>
              <Button
                onClick={() => {
                  setTempCategoryFilter("all")
                  setTempStatusFilter("all")
                  setCategoryFilter("all")
                  setStatusFilter("all")
                  setPage(1)
                }}
              >
                Xóa bộ lọc
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  setCategoryFilter(tempCategoryFilter)
                  setStatusFilter(tempStatusFilter)
                  setPage(1)
                  setIsFilterOpen(false)
                }}
              >
                Áp dụng
              </Button>
            </Space>
          </Space>
        </Drawer>

        <Modal
          title="Tạo sản phẩm kho"
          open={isCreateOpen}
          onCancel={() => {
            setIsCreateOpen(false)
            createForm.resetFields()
          }}
          footer={null}
          destroyOnClose
        >
          <Form
            layout="vertical"
            form={createForm}
            initialValues={{ isActive: true }}
            onFinish={(values) => createMutation.mutate(values)}
          >
            <Form.Item
              label={
                <>
                  Tên sản phẩm <span style={{ color: "red" }}>*</span>
                </>
              }
              name="name"
              rules={[{ required: true, message: "Tên sản phẩm là bắt buộc" }]}
            >
              <Input placeholder="Nhập tên sản phẩm" />
            </Form.Item>

            <Form.Item label="Mô tả" name="description">
              <Input.TextArea rows={3} placeholder="Mô tả sản phẩm" />
            </Form.Item>

            <Form.Item
              label={
                <>
                  Danh mục <span style={{ color: "red" }}>*</span>
                </>
              }
              name="categoryId"
              rules={[{ required: true, message: "Danh mục là bắt buộc" }]}
            >
              <Select
                placeholder="Chọn danh mục"
                options={categories.map((c: Category) => ({ label: c?.name, value: c?.id }))}
              />
            </Form.Item>

            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setIsCreateOpen(false)
                  createForm.resetFields()
                }}
              >
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
                Tạo sản phẩm
              </Button>
            </Space>
          </Form>
        </Modal>

        <Modal
          title="Chỉnh sửa sản phẩm kho"
          open={isEditOpen}
          onCancel={() => {
            setIsEditOpen(false)
            setEditingProduct(null)
            editForm.resetFields()
          }}
          footer={null}
          destroyOnClose
        >
          <Form
            layout="vertical"
            form={editForm}
            initialValues={{}}
            onFinish={(values) => {
              if (editingProduct?.id) {
                updateMutation.mutate({ id: editingProduct.id, data: values })
              }
            }}
          >
            <Form.Item
              label={
                <>
                  Tên sản phẩm <span style={{ color: "red" }}>*</span>
                </>
              }
              name="name"
              rules={[{ required: true, message: "Tên sản phẩm là bắt buộc" }]}
            >
              <Input placeholder="Nhập tên sản phẩm" />
            </Form.Item>

            <Form.Item label="Mô tả" name="description">
              <Input.TextArea rows={3} placeholder="Mô tả sản phẩm" />
            </Form.Item>

            <Form.Item
              label={
                <>
                  Danh mục <span style={{ color: "red" }}>*</span>
                </>
              }
              name="categoryId"
              rules={[{ required: true, message: "Danh mục là bắt buộc" }]}
            >
              <Select
                placeholder="Chọn danh mục"
                options={categories.map((c: Category) => ({ label: c?.name, value: c?.id }))}
              />
            </Form.Item>

            <Form.Item label="Trạng thái" name="isActive" valuePropName="checked">
              <Select
                options={[
                  { label: "Hoạt động", value: true },
                  { label: "Không hoạt động", value: false },
                ]}
              />
            </Form.Item>

            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                onClick={() => {
                  setIsEditOpen(false)
                  setEditingProduct(null)
                  editForm.resetFields()
                }}
              >
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
                Lưu
              </Button>
            </Space>
          </Form>
        </Modal>

        <Modal
          title={selectedProduct ? `Chi tiết: ${selectedProduct.name}` : "Chi tiết sản phẩm kho"}
          open={isDetailOpen}
          onCancel={() => {
            setIsDetailOpen(false)
            setSelectedProduct(null)
            setDetailTab("all")
          }}
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
                      <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 4 }}>Trạng thái</div>
                      {getStatusTag(selectedProduct.isActive)}
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

              <Tabs
                activeKey={detailTab}
                onChange={(key) => setDetailTab(key as ItemsTab)}
                items={[
                  { key: "all", label: "Tất cả lô" },
                  { key: "valid", label: "Còn hạn" },
                  { key: "expired", label: "Hết hạn" },
                ]}
              />

              <Table
                columns={detailColumns}
                dataSource={detailItems}
                pagination={false}
                rowKey="id"
                size="small"
                locale={{ emptyText: "Không có lô hàng nào" }}
              />
            </Space>
          ) : (
            <div style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>Không có dữ liệu</div>
          )}
        </Modal>
      </Space>
    </DashboardLayout>
  )
}

