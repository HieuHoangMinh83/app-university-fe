"use client"

import { useMemo, useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { inventoryProductsApi, InventoryProduct, UpdateInventoryProductDto } from "@/services/api/inventory-products"
import { categoriesApi, Category } from "@/services/api/categories"
import DashboardLayout from "@/components/dashboard-layout"
import {
  Breadcrumb,
  Button,
  Card,
  Col,
  Input,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Skeleton,
  Tabs,
  Select,
  Switch,
  Modal,
  Form,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import { ArrowLeftOutlined, ExclamationCircleOutlined, FileTextOutlined, EditOutlined, AppstoreOutlined, TagOutlined, CalendarOutlined, CheckCircleOutlined, SaveOutlined } from "@ant-design/icons"
import { toast } from "sonner"

const { Text } = Typography
type ItemsTab = "all" | "valid" | "expired"

export default function InventoryProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const productId = params?.id as string
  const [itemsTab, setItemsTab] = useState<ItemsTab>("all")
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm] = Form.useForm<UpdateInventoryProductDto>()

  const { data: product, isLoading } = useQuery<InventoryProduct>({
    queryKey: ["inventory-product-detail", productId],
    queryFn: () => inventoryProductsApi.getById(productId),
    enabled: !!productId,
  })

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

  const updateMutation = useMutation({
    mutationFn: (data: UpdateInventoryProductDto) => inventoryProductsApi.update(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-product-detail", productId] })
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] })
      setIsEditModalOpen(false)
      editForm.resetFields()
      toast.success("Cập nhật sản phẩm kho thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Cập nhật thất bại")
    },
  })

  const handleEdit = () => {
    if (product) {
      editForm.setFieldsValue({
        name: product.name || "",
        categoryId: product.categoryId || "",
        isActive: product.isActive ?? true,
        description: product.description || undefined,
      })
      setIsEditModalOpen(true)
    }
  }

  const handleCancel = () => {
    setIsEditModalOpen(false)
    editForm.resetFields()
  }

  const handleSave = () => {
    editForm.validateFields().then((values) => {
      updateMutation.mutate(values)
    })
  }

  const items = useMemo(() => {
    if (!product?.inventoryItems) return []
    if (itemsTab === "all") return product.inventoryItems

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return product.inventoryItems.filter((item) => {
      if (!item.expiryDate) return false
      const expiry = new Date(item.expiryDate)
      expiry.setHours(0, 0, 0, 0)
      const diff = expiry.getTime() - today.getTime()
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
      return itemsTab === "valid" ? days >= 0 : days < 0
    })
  }, [product, itemsTab])

  const itemColumns: ColumnsType<any> = [
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
      render: (expiryDate?: string) => {
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

  const totals = useMemo(() => {
    const items = product?.inventoryItems || []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let soonExpiring = 0
    let expired = 0
    let valid = 0
    let expiredQuantity = 0

    items.forEach((item) => {
      if (!item.expiryDate) return
      const expiry = new Date(item.expiryDate)
      expiry.setHours(0, 0, 0, 0)
      const diff = expiry.getTime() - today.getTime()
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
      if (days < 0) {
        expired += 1
        expiredQuantity += item.quantity || 0
      } else {
        valid += 1
        if (days <= 7) {
          soonExpiring += 1
        }
      }
    })

    return { soonExpiring, expired, valid, expiredQuantity }
  }, [product])

  const renderInfo = () => {
    if (isLoading) {
      return (
        <Card>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Skeleton active paragraph={{ rows: 1 }} />
            <Skeleton active paragraph={{ rows: 3 }} />
          </Space>
        </Card>
      )
    }

    if (!product) {
      return (
        <Card>
          <Text type="secondary">Không tìm thấy sản phẩm kho</Text>
        </Card>
      )
    }

    return (
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ width: "100%", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <Breadcrumb
              items={[
                { 
                  title: (
                    <span style={{ cursor: "pointer", transition: "color 0.2s" }} 
                          onMouseEnter={(e) => e.currentTarget.style.color = "#1890ff"}
                          onMouseLeave={(e) => e.currentTarget.style.color = "inherit"}>
                      Sản phẩm kho
                    </span>
                  ), 
                  onClick: () => router.push("/inventory-products") 
                },
                { title: product.name },
              ]}
            />
           
          </div>
          
        </Space>

        <Row gutter={[16, 16]} style={{ display: "flex", alignItems: "stretch" }}>
          <Col xs={24} md={14} style={{ display: "flex" }}>
            <Card
              title={
                <Space>
                  <FileTextOutlined style={{ color: "#1890ff" }} />
                  <span>Thông tin sản phẩm</span>
                </Space>
              }
              extra={
                <Button type="text" icon={<EditOutlined />} onClick={handleEdit}>
                  Chỉnh sửa
                </Button>
              }
              size="small"
              style={{ width: "100%", display: "flex", flexDirection: "column" }}
              bodyStyle={{ flex: 1, display: "flex", flexDirection: "column" }}
            >
              <Space direction="vertical" size={16} style={{ width: "100%" }}>
                <div>
                  <Space size={8} style={{ marginBottom: 8 }}>
                    <AppstoreOutlined style={{ color: "#1890ff" }} />
                    <Text strong>Tên sản phẩm</Text>
                  </Space>
                  <Input value={product.name} readOnly style={{ marginTop: 4 }} />
                </div>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <div>
                      <Space size={8} style={{ marginBottom: 8 }}>
                        <TagOutlined style={{ color: "#1890ff" }} />
                        <Text strong>Danh mục</Text>
                      </Space>
                      <Input value={product.category?.name || "-"} readOnly style={{ marginTop: 4 }} />
                    </div>
                  </Col>
                  <Col xs={24} md={12}>
                    <div>
                      <Space size={8} style={{ marginBottom: 8 }}>
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                        <Text strong>Trạng thái</Text>
                      </Space>
                      <Input
                        value={product.isActive ? "Hoạt động" : "Không hoạt động"}
                        readOnly
                        style={{ marginTop: 4 }}
                        suffix={
                          <Tag color={product.isActive ? "green" : "default"} style={{ marginRight: -4 }}>
                            {product.isActive ? "Hoạt động" : "Không hoạt động"}
                          </Tag>
                        }
                      />
                    </div>
                  </Col>
                </Row>
                <div>
                  <Space size={8} style={{ marginBottom: 8 }}>
                    <CalendarOutlined style={{ color: "#722ed1" }} />
                    <Text strong>Ngày tạo</Text>
                  </Space>
                  <Input
                    value={product.createdAt ? new Date(product.createdAt).toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                    readOnly
                    style={{ marginTop: 4 }}
                  />
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={10} style={{ display: "flex" }}>
            <Card 
              title="Tình trạng lô hàng" 
              size="small"
              style={{ width: "100%", display: "flex", flexDirection: "column" }}
              bodyStyle={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}
            >
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Statistic title="Lô sắp hết hạn" value={totals.soonExpiring} valueStyle={{ color: "#f97316" }} />
                </Col>
                <Col span={12}>
                  <Statistic title="Lô hết hạn" value={totals.expired} valueStyle={{ color: "#dc2626" }} />
                </Col>
                <Col span={12}>
                  <Statistic title="Lô còn hạn" value={totals.valid} valueStyle={{ color: "#16a34a" }} />
                </Col>
                <Col span={12}>
                  <Statistic title="SL hết hạn" value={totals.expiredQuantity} valueStyle={{ color: "#dc2626" }} />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Space>
    )
  }

  return (
    <DashboardLayout>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {renderInfo()}

        <Card>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Tabs
              activeKey={itemsTab}
              onChange={(key) => setItemsTab(key as ItemsTab)}
              items={[
                { key: "all", label: "Tất cả lô" },
                { key: "valid", label: "Còn hạn" },
                { key: "expired", label: "Hết hạn" },
              ]}
            />
            <Table
              columns={itemColumns}
              dataSource={items}
              rowKey="id"
              pagination={false}
              locale={{
                emptyText: isLoading ? "Đang tải..." : "Không có lô hàng",
              }}
              scroll={{ x: "max-content", y: 520 }}
            />
          </Space>
        </Card>
      </Space>

      <Modal
        title={
          <Space>
            <EditOutlined style={{ color: "#1890ff" }} />
            <span>Chỉnh sửa sản phẩm kho</span>
          </Space>
        }
        open={isEditModalOpen}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel} disabled={updateMutation.isPending}>
            Hủy
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={updateMutation.isPending}
          >
            Lưu
          </Button>,
        ]}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          style={{ marginTop: 24 }}
        >
          <Form.Item
            label={
              <Space size={8}>
                <AppstoreOutlined style={{ color: "#1890ff" }} />
                <span>Tên sản phẩm</span>
              </Space>
            }
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập tên sản phẩm" }]}
          >
            <Input placeholder="Nhập tên sản phẩm" />
          </Form.Item>

          <Form.Item
            label={
              <Space size={8}>
                <TagOutlined style={{ color: "#1890ff" }} />
                <span>Danh mục</span>
              </Space>
            }
            name="categoryId"
            rules={[{ required: true, message: "Vui lòng chọn danh mục" }]}
          >
            <Select
              placeholder="Chọn hoặc tìm kiếm danh mục"
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={categories.map((cat: Category) => ({
                label: cat.name,
                value: cat.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            label={
              <Space size={8}>
                <CheckCircleOutlined style={{ color: "#52c41a" }} />
                <span>Trạng thái</span>
              </Space>
            }
            name="isActive"
            valuePropName="checked"
          >
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Không hoạt động" />
          </Form.Item>

          <Form.Item
            label="Mô tả"
            name="description"
          >
            <Input.TextArea rows={4} placeholder="Nhập mô tả (tùy chọn)" />
          </Form.Item>
        </Form>
      </Modal>
    </DashboardLayout>
  )
}


