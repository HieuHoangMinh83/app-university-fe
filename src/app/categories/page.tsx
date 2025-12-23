"use client"

import { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { categoriesApi, Category, CreateCategoryDto } from "@/services/api/categories"
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"
import { useRouter } from "next/navigation"
import { 
  Table, 
  Popover, 
  Button, 
  Space, 
  Card, 
  Modal, 
  Input, 
  Form,
  Spin,
  Skeleton
} from "antd"
import type { ColumnsType } from "antd/es/table"
import { PlusOutlined, EditOutlined } from "@ant-design/icons"

export default function CategoriesPage() {
  const router = useRouter()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const queryClient = useQueryClient()

  const { data: categoriesResponse, isLoading } = useQuery({
    queryKey: ["categories", page, pageSize],
    queryFn: () => categoriesApi.getAll({ page, pageSize }),
  })

  // Extract categories array and pagination meta from paginated or non-paginated response
  const { categories, paginationMeta } = useMemo(() => {
    if (!categoriesResponse) return { categories: undefined, paginationMeta: undefined }
    if (Array.isArray(categoriesResponse)) return { categories: categoriesResponse, paginationMeta: undefined }
    if ('data' in categoriesResponse && Array.isArray(categoriesResponse.data)) {
      return {
        categories: categoriesResponse.data,
        paginationMeta: 'meta' in categoriesResponse ? categoriesResponse.meta : undefined
      }
    }
    return { categories: [], paginationMeta: undefined }
  }, [categoriesResponse])

  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setIsCreateOpen(false)
      createForm.resetFields()
      toast.success("Tạo danh mục thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Tạo danh mục thất bại")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCategoryDto }) =>
      categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setEditingCategory(null)
      editForm.resetFields()
      toast.success("Cập nhật danh mục thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Cập nhật danh mục thất bại")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      toast.success("Xóa danh mục thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Xóa danh mục thất bại")
    },
  })

  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
  }

  // Set giá trị mặc định vào form khi editingCategory thay đổi
  useEffect(() => {
    if (editingCategory) {
      editForm.setFieldsValue({
        name: editingCategory?.name || "",
        description: editingCategory?.description || "",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCategory])

  const handleCreateSubmit = (values: CreateCategoryDto) => {
    createMutation.mutate(values)
  }

  const handleEditSubmit = (values: CreateCategoryDto) => {
    if (editingCategory?.id) {
      updateMutation.mutate({ id: editingCategory.id, data: values })
    }
  }

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa danh mục này?")) {
      deleteMutation.mutate(id)
    }
  }

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!categories) return []

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return categories.filter((category) => {
        return (
          category?.name?.toLowerCase()?.includes(query) ||
          category?.description?.toLowerCase()?.includes(query) ||
          category?.inventoryProductNames?.some(name => name.toLowerCase().includes(query)) ||
          category?.storeProductNames?.some(name => name.toLowerCase().includes(query)) ||
          category?.comboNames?.some(name => name.toLowerCase().includes(query))
        )
      })
    }

    return categories
  }, [categories, searchQuery])

  // Skeleton data for loading state
  const skeletonData = useMemo(() => {
    return Array.from({ length: 10 }, (_, index) => ({
      id: `skeleton-${index}`,
      name: '',
      description: '',
      inventoryProductNames: [],
      storeProductNames: [],
      createdAt: '',
      isSkeleton: true
    }))
  }, [])

  // Ant Design Table columns
  const columns: ColumnsType<Category> = useMemo(() => [
    {
      title: "STT",
      key: "stt",
      width: 60,
      fixed: "left",
      align: "center",
      render: (_, record, index) => {
        if ((record as any).isSkeleton) {
          return <Skeleton.Input active size="small" style={{ width: 40 }} />
        }
        // Nếu có search query, STT bắt đầu từ 1
        if (searchQuery) {
          return index + 1
        }
        // Nếu không có search, STT dựa trên pagination
        const currentPage = page || 1
        const currentPageSize = pageSize || 20
        return (currentPage - 1) * currentPageSize + index + 1
      },
    },
    {
      title: "Tên danh mục",
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (text, record) => {
        if ((record as any).isSkeleton) {
          return <Skeleton.Input active size="small" style={{ width: 150 }} />
        }
        return text
      },
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      width: 250,
      ellipsis: true,
      render: (text, record) => {
        if ((record as any).isSkeleton) {
          return <Skeleton.Input active size="small" style={{ width: 200 }} />
        }
        return text || "-"
      },
    },
    {
      title: "Sản phẩm kho",
      key: "inventoryProductNames",
      width: 200,
      render: (_, record) => {
        if ((record as any).isSkeleton) {
          return <Skeleton.Button active size="small" style={{ width: 100 }} />
        }
        return record?.inventoryProductNames && record.inventoryProductNames.length > 0 ? (
          <Popover
            title="Sản phẩm kho"
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
            placement="bottom"
            content={
              <Table
                dataSource={record.inventoryProductNames.map((name, idx) => ({
                  key: idx,
                  stt: idx + 1,
                  name: name,
                }))}
                columns={[
                  {
                    title: "STT",
                    dataIndex: "stt",
                    key: "stt",
                    width: 60,
                    align: "center",
                  },
                  {
                    title: "Tên sản phẩm",
                    dataIndex: "name",
                    key: "name",
                  },
                ]}
                pagination={false}
                size="small"
                scroll={{ y: 200 }}
                style={{ width: 400 }}
                onRow={(record) => ({
                  onClick: () => {
                    router.push(`/inventory-products?search=${encodeURIComponent(record.name)}`)
                  },
                  style: { cursor: 'pointer' }
                })}
              />
            }
            trigger="click"
          >
            <Button 
              size="small" 
              type="default"
              onClick={(e) => e.stopPropagation()}
            >
              {record.inventoryProductNames.length} sản phẩm
            </Button>
          </Popover>
        ) : (
          <Button 
            size="small" 
            disabled
            onClick={(e) => e.stopPropagation()}
          >
            {record?.inventoryProductNames?.length || 0} sản phẩm
          </Button>
        )
      },
    },
    {
      title: "Sản phẩm cửa hàng",
      key: "storeProductNames",
      className: "whitespace-nowrap",
      width: 200,
      render: (_, record) => {
        if ((record as any).isSkeleton) {
          return <Skeleton.Button active size="small" style={{ width: 100 }} />
        }
        return record?.storeProductNames && record.storeProductNames.length > 0 ? (
          <Popover
            title="Sản phẩm cửa hàng"
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
            placement="bottom"
            content={
              <Table
                dataSource={record.storeProductNames.map((name, idx) => ({
                  key: idx,
                  stt: idx + 1,
                  name: name,
                }))}
                columns={[
                  {
                    title: "STT",
                    dataIndex: "stt",
                    key: "stt",
                    width: 60,
                    align: "center",
                  },
                  {
                    title: "Tên sản phẩm",
                    dataIndex: "name",
                    key: "name",
                  },
                ]}
                pagination={false}
                size="small"
                scroll={{ y: 200 }}
                style={{ width: 400 }}
                onRow={(record) => ({
                  onClick: () => {
                    router.push(`/products?search=${encodeURIComponent(record.name)}`)
                  },
                  style: { cursor: 'pointer' }
                })}
              />
            }
            trigger="click"
          >
            <Button 
              size="small" 
              type="default"
              onClick={(e) => e.stopPropagation()}
            >
              {record.storeProductNames.length} sản phẩm
            </Button>
          </Popover>
        ) : (
          <Button 
            size="small" 
            disabled
            onClick={(e) => e.stopPropagation()}
          >
            {record?.storeProductNames?.length || 0} sản phẩm
          </Button>
        )
      },
    },
    {
      title: "Ngày tạo",
      key: "createdAt",
      width: 120,
      render: (_, record) => {
        if ((record as any).isSkeleton) {
          return <Skeleton.Input active size="small" style={{ width: 80 }} />
        }
        return record?.createdAt ? new Date(record.createdAt).toLocaleDateString("vi-VN") : "-"
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_, record) => {
        if ((record as any).isSkeleton) {
          return <Skeleton.Button active size="small" style={{ width: 60 }} />
        }
        return (
          <Button
            type="text"
            icon={<EditOutlined style={{ color: 'inherit', fontSize: '18px' }} />}
            style={{ 
              minWidth: '80px',
              fontSize: '16px',
            }}
            className="edit-button-hover"
            onClick={(e) => {
              e.stopPropagation()
              handleEdit(record)
            }}
          />
        )
      },
    },
  ], [searchQuery, page, pageSize, router])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card
          title="Danh sách danh mục"
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsCreateOpen(true)}
            >
              Tạo danh mục mới
            </Button>
          }
        >
          <div className="mb-4">
            <Input
              placeholder="Tìm kiếm theo tên, mô tả hoặc sản phẩm..."
              prefix={<Search className="h-4 w-4 text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </div>
          <div style={{ minHeight: '600px', minWidth: '1000px', width: '100%' }}>
            <Table
                columns={columns}
                dataSource={isLoading ? skeletonData : (filteredCategories || [])}
                rowKey={(record) => (record as any).isSkeleton ? (record as any).id : (record?.id || record?.name || `category-${Math.random()}`)}
                scroll={{ x: 'max-content', y: 550 }}
                pagination={false}
                locale={{
                  emptyText: searchQuery ? "Không tìm thấy danh mục nào" : "Không có dữ liệu"
                }}
                style={{ width: '100%', minWidth: '1000px' }}
              />
          </div>
          {/* Pagination Controls */}
          {!isLoading && paginationMeta && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-500">
                Hiển thị {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, paginationMeta.total)} trong tổng số {paginationMeta.total} danh mục
              </div>
              {paginationMeta.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="default"
                    size="small"
                    icon={<ChevronLeft className="h-4 w-4" />}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-sm">Trang</span>
                    <Input
                      type="text"
                      value={page}
                      onChange={(e) => {
                        const value = parseInt(e.target.value)
                        if (isNaN(value) || value < 1) {
                          setPage(1)
                        } else if (value > paginationMeta.totalPages) {
                          setPage(paginationMeta.totalPages)
                        } else {
                          setPage(value)
                        }
                      }}
                      onBlur={(e) => {
                        const value = parseInt(e.target.value)
                        if (isNaN(value) || value < 1) {
                          setPage(1)
                        } else if (value > paginationMeta.totalPages) {
                          setPage(paginationMeta.totalPages)
                        }
                      }}
                      style={{ width: '60px', textAlign: 'center' }}
                      size="small"
                    />
                    <span className="text-sm">/ {paginationMeta.totalPages}</span>
                  </div>
                  <Button
                    type="default"
                    size="small"
                    icon={<ChevronRight className="h-4 w-4" />}
                    onClick={() => setPage(p => Math.min(paginationMeta.totalPages, p + 1))}
                    disabled={page >= paginationMeta.totalPages || isLoading}
                  />
                </div>
              )}
            </div>
          )}
         
        </Card>

        {/* Create Modal */}
        <Modal
          title="Tạo danh mục mới"
          open={isCreateOpen}
          centered
          onCancel={() => {
            setIsCreateOpen(false)
            createForm.resetFields()
          }}
          footer={null}
        >
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreateSubmit}
          >
            <Form.Item
              name="name"
              label={
                <>
                  Tên danh mục <span className="text-red-500">*</span>
                </>
              }
              rules={[{ required: true, message: "Tên danh mục là bắt buộc" }]}
            >
              <Input placeholder="Nhập tên danh mục" />
            </Form.Item>
            <Form.Item
              name="description"
              label="Mô tả"
            >
              <Input.TextArea
                rows={3}
                placeholder="Nhập mô tả"
              />
            </Form.Item>
            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={createMutation.isPending}
                >
                  Tạo
                </Button>
                <Button onClick={() => {
                  setIsCreateOpen(false)
                  createForm.resetFields()
                }}>
                  Hủy
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Edit Modal */}
        <Modal
          title="Cập nhật danh mục"
          open={!!editingCategory}
          centered
          onCancel={() => {
            setEditingCategory(null)
            editForm.resetFields()
          }}
          footer={null}
        >
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleEditSubmit}
          >
            <Form.Item
              name="name"
              label={
                <>
                  Tên danh mục <span className="text-red-500">*</span>
                </>
              }
              rules={[{ required: true, message: "Tên danh mục là bắt buộc" }]}
            >
              <Input placeholder="Nhập tên danh mục" />
            </Form.Item>
            <Form.Item
              name="description"
              label="Mô tả"
            >
              <Input.TextArea
                rows={3}
                placeholder="Nhập mô tả"
              />
            </Form.Item>
            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={updateMutation.isPending}
                >
                  Cập nhật
                </Button>
                <Button onClick={() => {
                  setEditingCategory(null)
                  editForm.resetFields()
                }}>
                  Hủy
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}

