"use client"

import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { clientsApi, Client, CreateClientDto, UpdateClientDto } from "@/services/api/clients"
import { PaginatedResponse } from "@/services/api/types"
import { deleteImage, uploadImage } from "@/lib/supabase"
import { useForm } from "react-hook-form"
import { Pencil, Loader2, Eye, Plus, Search, Upload, X } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"
import { useRouter } from "next/navigation"

// Custom ImageUpload component without shadcn
function ImageUpload({ value, onChange, folder = "avatars", disabled, onDeleteOldImage }: {
  value?: string
  onChange: (url: string) => void
  folder?: string
  disabled?: boolean
  onDeleteOldImage?: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value || null)
  const [oldImageUrl, setOldImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value && value.includes('supabase.co')) {
      setOldImageUrl(value)
    }
  }, [value])

  useEffect(() => {
    return () => {
      if (oldImageUrl && onDeleteOldImage) {
        onDeleteOldImage(oldImageUrl)
      }
    }
  }, [oldImageUrl, onDeleteOldImage])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error("Vui lòng chọn file ảnh")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước ảnh không được vượt quá 5MB")
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    const previousImageUrl = oldImageUrl || (value && value.includes('supabase.co') ? value : null)
    
    setUploading(true)
    try {
      const url = await uploadImage(file, folder)
      
      if (previousImageUrl && previousImageUrl !== url) {
        await deleteImage(previousImageUrl)
      }
      
      setOldImageUrl(url)
      onChange(url)
      toast.success("Upload ảnh thành công")
    } catch (error: any) {
      toast.error(error?.message || "Upload ảnh thất bại")
      setPreview(value || null)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = async () => {
    const imageToDelete = oldImageUrl || (value && value.includes('supabase.co') ? value : null)
    if (imageToDelete) {
      await deleteImage(imageToDelete)
    }
    
    setPreview(null)
    setOldImageUrl(null)
    onChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 rounded-full border-2 border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <Upload className="h-6 w-6 text-gray-400" />
        )}
      </div>
      
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          style={{ display: "none" }}
          id="image-upload"
        />
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang upload...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Chọn ảnh
              </>
            )}
          </button>
          {preview && (
            <button
              type="button"
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={handleRemove}
              disabled={disabled || uploading}
            >
              <X className="h-4 w-4" />
              Xóa
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          JPG, PNG hoặc GIF (tối đa 5MB)
        </p>
      </div>
    </div>
  )
}

// Custom Modal component
function Modal({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-[500px] max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b px-6 py-4 z-10">
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function CustomersPage() {
  const router = useRouter()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [createOldImageUrl, setCreateOldImageUrl] = useState<string | null>(null)
  const [editOldImageUrl, setEditOldImageUrl] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const queryClient = useQueryClient()

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      setIsCreateOpen(false)
      resetCreateForm()
      setCreateOldImageUrl(null)
      toast.success("Tạo khách hàng mới thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Tạo khách hàng thất bại")
      if (createOldImageUrl) {
        deleteImage(createOldImageUrl)
        setCreateOldImageUrl(null)
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClientDto }) =>
      clientsApi.update(id, data),
    onSuccess: () => {
      if (editOldImageUrl && editOldImageUrl !== editAvatarUrl && editingClient?.avatar !== editAvatarUrl) {
        deleteImage(editOldImageUrl)
      }
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      setEditingClient(null)
      setIsEditOpen(false)
      setEditOldImageUrl(null)
      toast.success("Cập nhật thông tin khách hàng thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Cập nhật thất bại")
    },
  })

  const { register: registerCreate, handleSubmit: handleSubmitCreate, reset: resetCreateForm, watch: watchCreate, setValue: setValueCreate, formState: { errors: createErrors } } = useForm<CreateClientDto>({
    defaultValues: {
      avatar: ''
    }
  })
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<UpdateClientDto>({
    defaultValues: {
      avatar: ''
    }
  })

  const createAvatarUrl = watchCreate('avatar')
  const editAvatarUrl = watch('avatar')

  const onSubmitCreate = (data: CreateClientDto) => {
    createMutation.mutate(data)
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    const clientAvatar = client?.avatar || ""
    setEditOldImageUrl(clientAvatar && clientAvatar.includes('supabase.co') ? clientAvatar : null)
    reset({
      name: client?.name,
      phone: client?.phone,
      address: client?.address || "",
      avatar: clientAvatar,
    })
    setIsEditOpen(true)
  }

  const handleCreateDialogClose = (open: boolean) => {
    if (!open && createOldImageUrl) {
      deleteImage(createOldImageUrl)
      setCreateOldImageUrl(null)
    }
    setIsCreateOpen(open)
  }

  const handleEditDialogClose = (open: boolean) => {
    if (!open) {
      const currentAvatar = watch('avatar')
      if (currentAvatar && currentAvatar.includes('supabase.co') && currentAvatar !== editOldImageUrl) {
        deleteImage(currentAvatar)
      }
      setEditOldImageUrl(null)
    }
    setIsEditOpen(open)
  }

  const onSubmit = (data: UpdateClientDto) => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient?.id, data })
    }
  }

  // Extract clients array from response (handle both array and paginated response)
  const clientsArray = Array.isArray(clients) 
    ? clients 
    : ((clients as PaginatedResponse<Client>)?.data || [])
  const filteredClients = clientsArray.filter((client: Client) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      client?.name?.toLowerCase()?.includes(query) ||
      client?.phone?.toLowerCase()?.includes(query)
    )
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">Khách hàng</h1>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên hoặc số điện thoại..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="px-4 py-2 bg-blue-600 !text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Tạo khách hàng mới
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : filteredClients && filteredClients.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Khách hàng</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Số điện thoại</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Địa chỉ</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Trạng thái</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Điểm tích lũy</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Số đơn hàng</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Ngày tạo</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients?.length > 0 ? (
                      filteredClients?.map((client: Client) => (
                        <tr 
                          key={client?.id}
                          className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/customers/${client?.id}`)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                                {client?.avatar ? (
                                  <img src={client.avatar} alt={client?.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-gray-600 font-medium">
                                    {client?.name?.charAt?.(0)?.toUpperCase() || "K"}
                                  </span>
                                )}
                              </div>
                              <span className="font-medium text-gray-900">
                                {client?.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{client?.phone}</td>
                          <td className="py-3 px-4 text-gray-700">{client?.address || "-"}</td>
                          <td className="py-3 px-4 text-gray-700">
                            {client?.zaloId ? "-" : "Chưa đăng ký"}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-300 text-gray-700 bg-white">
                              {client?.point} điểm
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{client?._count?.orders || 0}</td>
                          <td className="py-3 px-4 text-gray-700">
                            {client?.createdAt ? new Date(client.createdAt).toLocaleDateString("vi-VN") : "-"}
                          </td>
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-2">
                              <Link href={`/customers/${client?.id}`} onClick={(e) => e.stopPropagation()}>
                                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                                  <Eye className="h-4 w-4" />
                                </button>
                              </Link>
                              <button
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEdit(client)
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-gray-500">
                          {searchQuery ? "Không tìm thấy khách hàng nào" : "Không có dữ liệu"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? "Không tìm thấy khách hàng nào" : "Chưa có khách hàng nào"}
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        <Modal
          open={isCreateOpen}
          onClose={() => handleCreateDialogClose(false)}
          title="Tạo khách hàng mới"
        >
          <form onSubmit={handleSubmitCreate(onSubmitCreate)} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 block">
                Ảnh đại diện
              </label>
              <ImageUpload
                value={createAvatarUrl}
                onChange={(url) => {
                  setValueCreate('avatar', url)
                  if (url && url.includes('supabase.co')) {
                    setCreateOldImageUrl(url)
                  }
                }}
                folder="client-avatars"
                disabled={createMutation.isPending}
              />
              <input
                type="hidden"
                {...registerCreate("avatar")}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="create-name" className="text-sm font-medium text-gray-700 block">
                Tên khách hàng <span className="text-red-500">*</span>
              </label>
              <input
                id="create-name"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                {...registerCreate("name", { required: "Tên khách hàng là bắt buộc" })}
                placeholder="Nhập tên khách hàng"
              />
              {createErrors.name && (
                <p className="text-sm text-red-500 mt-1">{createErrors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="create-phone" className="text-sm font-medium text-gray-700 block">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                id="create-phone"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                {...registerCreate("phone", { 
                  required: "Số điện thoại là bắt buộc",
                  pattern: {
                    value: /^(03|05|07|08|09)[0-9]{8}$/,
                    message: "Số điện thoại phải là 10 số, bắt đầu bằng 03, 05, 07, 08, 09"
                  }
                })}
                placeholder="0388888888"
              />
              {createErrors.phone && (
                <p className="text-sm text-red-500 mt-1">{createErrors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="create-address" className="text-sm font-medium text-gray-700 block">
                Địa chỉ
              </label>
              <input
                id="create-address"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                {...registerCreate("address")}
                placeholder="123 Đường ABC, Quận 1, TP.HCM"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setIsCreateOpen(false)}
                disabled={createMutation.isPending}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 !text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Tạo khách hàng
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Modal */}
        {editingClient && (
          <Modal
            open={isEditOpen}
            onClose={() => handleEditDialogClose(false)}
            title="Cập nhật thông tin khách hàng"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                  Ảnh đại diện
                </label>
                <ImageUpload
                  value={editAvatarUrl}
                  onChange={(url) => setValue('avatar', url)}
                  folder="client-avatars"
                  disabled={updateMutation.isPending}
                  onDeleteOldImage={(url) => {
                    if (url !== editOldImageUrl) {
                      deleteImage(url)
                    }
                  }}
                />
                <input
                  type="hidden"
                  {...register("avatar")}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-700 block">
                  Tên khách hàng <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  {...register("name", { required: "Tên khách hàng là bắt buộc" })}
                  placeholder="Nhập tên khách hàng"
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-gray-700 block">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  {...register("phone", { required: "Số điện thoại là bắt buộc" })}
                  placeholder="0388888888"
                />
                {errors.phone && (
                  <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="address" className="text-sm font-medium text-gray-700 block">
                  Địa chỉ
                </label>
                <input
                  id="address"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  {...register("address")}
                  placeholder="123 Đường ABC, Quận 1, TP.HCM"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setIsEditOpen(false)}
                  disabled={updateMutation.isPending}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 !text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Cập nhật
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  )
}
