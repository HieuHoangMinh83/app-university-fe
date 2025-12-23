"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { inventoryProductsApi, InventoryProduct } from "@/services/api/inventory-products"
import DashboardLayout from "@/components/dashboard-layout"
import {
  Breadcrumb,
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Skeleton,
  Tabs,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import { ArrowLeftOutlined, ExclamationCircleOutlined, FileTextOutlined, EditOutlined } from "@ant-design/icons"

const { Title, Text } = Typography
type ItemsTab = "all" | "valid" | "expired"

export default function InventoryProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params?.id as string
  const [itemsTab, setItemsTab] = useState<ItemsTab>("all")

  const { data: product, isLoading } = useQuery<InventoryProduct>({
    queryKey: ["inventory-product-detail", productId],
    queryFn: () => inventoryProductsApi.getById(productId),
    enabled: !!productId,
  })

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
      <Card>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Space style={{ width: "100%", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <Breadcrumb
                items={[
                  { title: "Sản phẩm kho", onClick: () => router.push("/inventory-products") },
                  { title: product.name },
                ]}
              />
              <Space align="center" size={8} style={{ marginTop: 8 }}>
                <FileTextOutlined style={{ color: "#1890ff" }} />
                <Title level={4} style={{ margin: 0 }}>
                  Thông tin sản phẩm
                </Title>
              </Space>
            </div>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/inventory-products")}>
                Quay lại
              </Button>
              <Button type="primary" icon={<EditOutlined />} disabled>
                Chỉnh sửa
              </Button>
            </Space>
          </Space>

          <Card size="small" bodyStyle={{ padding: 16 }}>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Text strong>Tên sản phẩm</Text>
                <Input value={product.name} readOnly />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Danh mục</Text>
                <Input value={product.category?.name || "-"} readOnly />
              </Col>
              <Col xs={24} md={12}>
                <Text strong>Trạng thái</Text>
                <Input
                  value={product.isActive ? "Hoạt động" : "Không hoạt động"}
                  readOnly
                  suffix={
                    <Tag color={product.isActive ? "green" : "default"} style={{ marginRight: -4 }}>
                      {product.isActive ? "Hoạt động" : "Không hoạt động"}
                    </Tag>
                  }
                />
              </Col>
              <Col span={24}>
                <Text strong>Ngày tạo</Text>
                <Input
                  value={product.createdAt ? new Date(product.createdAt).toLocaleDateString("vi-VN") : "-"}
                  readOnly
                />
              </Col>
            </Row>
          </Card>

          <Card size="small" title="Tình trạng lô hàng">
            <Row gutter={[12, 12]}>
              <Col xs={12} md={6}>
                <Statistic title="Lô sắp hết hạn" value={totals.soonExpiring} valueStyle={{ color: "#f97316" }} />
              </Col>
              <Col xs={12} md={6}>
                <Statistic title="Lô hết hạn" value={totals.expired} valueStyle={{ color: "#dc2626" }} />
              </Col>
              <Col xs={12} md={6}>
                <Statistic title="Lô còn hạn" value={totals.valid} valueStyle={{ color: "#16a34a" }} />
              </Col>
              <Col xs={12} md={6}>
                <Statistic title="SL hết hạn" value={totals.expiredQuantity} valueStyle={{ color: "#dc2626" }} />
              </Col>
            </Row>
          </Card>
        </Space>
      </Card>
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
    </DashboardLayout>
  )
}


