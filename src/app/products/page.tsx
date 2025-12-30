"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { productsApi, Product, CreateProductDto } from "@/services/api/products"
import { categoriesApi } from "@/services/api/categories"
import DashboardLayout from "@/components/dashboard-layout"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  Badge,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popover,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import { DownOutlined, EditOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons"
import { ImageUpload } from "@/components/ui/image-upload"
import { deleteImage } from "@/lib/supabase"

const { Title } = Typography

interface CreateProductSimpleDto {
  name: string
  description?: string
  categoryId?: string
  isActive?: boolean
  spinCount?: number
  image?: string
}

const formatCurrency = (value?: number) => {
  if (!value) return "0"
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value)
}

const getTotalItems = (product?: Product) => {
  return (
    product?.combos?.reduce((sum, combo) => {
      return sum + (combo?.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0)
    }, 0) || 0
  )
}

export default function ProductsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [createProductImageUrl, setCreateProductImageUrl] = useState<string | null>(null)
  const [createForm] = Form.useForm<CreateProductSimpleDto>()

  useEffect(() => {
    const searchParam = searchParams.get("search")
    if (searchParam) {
      setSearchQuery(searchParam)
    }
  }, [searchParams])

  const { data: productsResponse, isLoading } = useQuery({
    queryKey: ["products", page, pageSize, categoryFilter, statusFilter],
    queryFn: () => {
      const params: { page?: number; pageSize?: number; categoryId?: string; status?: string } = {
        page,
        pageSize,
      }
      if (categoryFilter !== "all") {
        params.categoryId = categoryFilter
      }
      if (statusFilter !== "all") {
        params.status = statusFilter
      }
      return productsApi.getPaginated(params)
    },
  })

  const { products, paginationMeta } = useMemo(() => {
    if (!productsResponse) return { products: undefined, paginationMeta: undefined }
    if (Array.isArray(productsResponse)) return { products: productsResponse, paginationMeta: undefined }
    if ("data" in productsResponse && Array.isArray(productsResponse.data)) {
      return {
        products: productsResponse.data,
        paginationMeta: "meta" in productsResponse ? productsResponse.meta : undefined,
      }
    }
    return { products: [], paginationMeta: undefined }
  }, [productsResponse])

  const { data: categoriesResponse } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.getAll(),
  })

  const categories = useMemo(() => {
    if (!categoriesResponse) return undefined
    if (Array.isArray(categoriesResponse)) return categoriesResponse
    if ("data" in categoriesResponse && Array.isArray(categoriesResponse.data)) {
      return categoriesResponse.data
    }
    return []
  }, [categoriesResponse])

  const createMutation = useMutation({
    mutationFn: async (data: CreateProductSimpleDto) => {
      const productData: CreateProductDto = {
        ...data,
        categoryId: data.categoryId || "",
      }
      return productsApi.create(productData)
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      setIsCreateOpen(false)
      createForm.resetFields()
      if (createProductImageUrl) {
        deleteImage(createProductImageUrl)
      }
      setCreateProductImageUrl(null)
      toast.success("Tạo sản phẩm thành công. Vui lòng thêm combo.")
      if (product?.id) {
        router.push(`/products/${product.id}?addCombo=true`)
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Tạo sản phẩm thất bại")
      if (createProductImageUrl) {
        deleteImage(createProductImageUrl)
        setCreateProductImageUrl(null)
      }
    },
  })


  const filteredProducts = useMemo(() => {
    if (!products) return []
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return products.filter((product) => {
        return (
          product?.name?.toLowerCase()?.includes(query) ||
          product?.description?.toLowerCase()?.includes(query) ||
          product?.category?.name?.toLowerCase()?.includes(query)
        )
      })
    }
    return products
  }, [products, searchQuery])

  // Skeleton data for loading state
  const skeletonData = useMemo(() => {
    return Array.from({ length: 10 }, (_, index) => ({
      id: `skeleton-${index}`,
      name: '',
      category: null,
      combos: [],
      isActive: false,
      createdAt: '',
      isSkeleton: true
    }))
  }, [])

  const handleCreateFinish = (values: CreateProductSimpleDto) => {
    const image = createForm.getFieldValue("image") as string | undefined
    const payload: CreateProductSimpleDto = {
      ...values,
      image,
      isActive: true, // mặc định kích hoạt
    }
    if (!values?.categoryId) {
      toast.error("Vui lòng chọn danh mục")
      return
    }
    createMutation.mutate(payload)
  }

  const handleCreateCancel = () => {
    setIsCreateOpen(false)
    createForm.resetFields()
    if (createProductImageUrl) {
                          deleteImage(createProductImageUrl)
                        }
    setCreateProductImageUrl(null)
  }

  const columns: ColumnsType<Product> = useMemo(
    () => [
      {
        title: "Tên sản phẩm",
        dataIndex: "name",
        key: "name",
        render: (text, record) => {
          if ((record as any).isSkeleton) {
            return <Skeleton.Input active size="small" style={{ width: 150 }} />
          }
          return (
            <Button
              type="link"
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/products/${record?.id}`)
              }}
              style={{ padding: 0 }}
            >
              {text}
            </Button>
          )
        },
      },
      {
        title: "Danh mục",
        dataIndex: "category",
        key: "category",
        render: (_, record) => {
          if ((record as any).isSkeleton) {
            return <Skeleton.Input active size="small" style={{ width: 100 }} />
          }
          return record?.category?.name || "-"
        },
      },
      {
        title: "Tổng sản phẩm",
        key: "totalItems",
        render: (_, record) => {
          if ((record as any).isSkeleton) {
            return <Skeleton.Input active size="small" style={{ width: 60 }} />
          }
          return getTotalItems(record)
        },
      },
      {
        title: "Combo",
        key: "combo",
        render: (_, record) => {
          if ((record as any).isSkeleton) {
            return <Skeleton.Button active size="small" style={{ width: 80 }} />
          }
          const activeCombos = record?.combos?.filter((combo) => combo?.isActive) || []
          if (!activeCombos.length) return <span style={{ color: "#9ca3af" }}>0 combo</span>

          return (
            <Popover
              placement="bottomLeft"
              content={
                <div style={{ maxHeight: 420, overflowY: "auto" }}>
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {activeCombos.map((combo) => (
                      <Card
                        key={combo?.id}
                        size="small"
                        style={{ borderColor: "#e5e7eb" }}
                        bodyStyle={{ padding: 12 }}
                      >
                        <Space style={{ width: "100%", justifyContent: "space-between" }}>
                          <span style={{ fontWeight: 600 }}>{combo?.name}</span>
                          {combo?.isPromotionActive && <Badge color="red" text="Khuyến mãi" />}
                        </Space>
                        <div style={{ marginTop: 6, fontWeight: 600, color: combo?.isPromotionActive ? "#dc2626" : "#111827" }}>
                          {combo?.promotionalPrice && combo?.isPromotionActive ? (
                            <Space>
                              <span style={{ textDecoration: "line-through", color: "#6b7280", fontWeight: 500 }}>
                                {formatCurrency(combo?.price)}
                              </span>
                              <span>{formatCurrency(combo?.promotionalPrice)}</span>
                            </Space>
                          ) : (
                            formatCurrency(combo?.price)
                          )}
                        </div>
                        {combo?.items && combo.items.length > 0 && (
                          <div style={{ marginTop: 8, fontSize: 12, color: "#374151" }}>
                            {combo.items.map((item, idx) => (
                              <div key={`${combo?.id}-${idx}`} style={{ display: "flex", gap: 6 }}>
                                <span style={{ color: item.isGift ? "#16a34a" : "#2563eb" }}>•</span>
                                <span style={{ flex: 1 }}>{item.inventoryProduct?.name}</span>
                                <span>x{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {(combo?.promotionStart || combo?.promotionEnd) && (
                          <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                            {combo?.promotionStart && (
                              <div>Bắt đầu: {new Date(combo.promotionStart).toLocaleDateString("vi-VN")}</div>
                            )}
                            {combo?.promotionEnd && (
                              <div>Kết thúc: {new Date(combo.promotionEnd).toLocaleDateString("vi-VN")}</div>
                            )}
                          </div>
                        )}
                      </Card>
                    ))}
                  </Space>
                </div>
              }
              trigger="click"
            >
              <Button
                size="small"
                onClick={(e) => e.stopPropagation()}
                icon={<DownOutlined style={{ fontSize: 12 }} />}
              >
                {activeCombos.length} combo
              </Button>
            </Popover>
          )
        },
      },
      {
        title: "Trạng thái",
        dataIndex: "isActive",
        key: "isActive",
        render: (isActive: boolean, record) => {
          if ((record as any).isSkeleton) {
            return <Skeleton.Button active size="small" style={{ width: 100 }} />
          }
          return <Tag color={isActive ? "green" : "default"}>{isActive ? "Hoạt động" : "Không hoạt động"}</Tag>
        },
      },
      {
        title: "Ngày tạo",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (createdAt: string | undefined, record: Product) => {
          if ((record as any).isSkeleton) {
            return <Skeleton.Input active size="small" style={{ width: 80 }} />
          }
          return createdAt ? new Date(createdAt).toLocaleDateString("vi-VN") : "-"
        },
      },
      {
        title: "Thao tác",
        key: "actions",
        fixed: "right",
        width: 140,
        align: "center",
        render: (_, record) => {
          if ((record as any).isSkeleton) {
            return <Skeleton.Button active size="small" style={{ width: 100 }} />
          }
          return (
            <Button
              type="default"
              icon={<EditOutlined />}
              style={{ minWidth: 100, display: "inline-flex", justifyContent: "center" }}
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/products/${record?.id}`)
              }}
            >
              Sửa
            </Button>
          )
        },
      },
    ],
    [router]
  )


  return (
    <DashboardLayout>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={3} style={{ margin: 0 }}>
            Quản lý Sản phẩm
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)}>
            Tạo sản phẩm mới
                  </Button>
        </Space>

        <Card>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Space
              style={{ width: "100%", flexWrap: "wrap" }}
              size={[12, 12]}
            >
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
                  ...(categories || []).map((category) => ({
                    label: category?.name,
                    value: category?.id,
                  })),
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
            </Space>

            <Table
              columns={columns}
              dataSource={isLoading ? (skeletonData as any) : (filteredProducts || [])}
              loading={false}
              rowKey={(record) => (record as any).isSkeleton ? (record as any).id : (record?.id || `product-${Math.random()}`)}
              scroll={{ x: "max-content", y: 550 }}
              onRow={(record) => ({
                onClick: (e) => {
                  // Không chuyển trang nếu click vào button, popover hoặc link
                  const target = e.target as HTMLElement
                  if (
                    target.closest('button') ||
                    target.closest('.ant-popover') ||
                    target.closest('a') ||
                    (record as any).isSkeleton
                  ) {
                    return
                  }
                  router.push(`/products/${record?.id}`)
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
                        ``,
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
      </Space>

      <Modal
        title="Tạo sản phẩm mới"
        open={isCreateOpen}
        onCancel={handleCreateCancel}
        footer={null}
        destroyOnClose
        centered
      >
        <Form
          layout="vertical"
          form={createForm}
          initialValues={{}}
          onFinish={handleCreateFinish}
        >
          <Form.Item label="Ảnh sản phẩm">
            <ImageUpload
              value={createForm.getFieldValue("image") || ""}
              onChange={(url) => {
                if (createProductImageUrl && createProductImageUrl !== url) {
                  deleteImage(createProductImageUrl)
                }
                createForm.setFieldsValue({ image: url })
                setCreateProductImageUrl(url)
              }}
              folder="product-images"
              disabled={createMutation.isPending}
            />
          </Form.Item>

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
              options={(categories || []).map((category) => ({
                label: category?.name,
                value: category?.id,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>

          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 12, marginTop: 8 }}>
            <span style={{ color: "#1d4ed8", fontSize: 13 }}>
              <strong>Lưu ý:</strong> Sau khi tạo, bạn sẽ được chuyển đến trang chi tiết để thêm combo và sản phẩm trong kho.
                  </span>
          </div>

          <Space style={{ width: "100%", justifyContent: "flex-end", marginTop: 16 }}>
            <Button onClick={handleCreateCancel}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
              Tạo sản phẩm
                  </Button>
          </Space>
        </Form>
      </Modal>
    </DashboardLayout>
  )
}

