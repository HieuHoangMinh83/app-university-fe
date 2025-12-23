"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { clientsApi, Client, CreateClientDto, UpdateClientDto } from "@/services/api/clients"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ImageUpload } from "@/components/ui/image-upload"
import { deleteImage } from "@/lib/supabase"
import { useForm } from "react-hook-form"
import { Pencil, Loader2, Eye, Plus, Search } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function CustomersPage() {
  const router = useRouter()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [createOldImageUrl, setCreateOldImageUrl] = useState<string | null>(null) // Lưu URL ảnh đã upload trong form create
  const [editOldImageUrl, setEditOldImageUrl] = useState<string | null>(null) // Lưu URL ảnh cũ trong form edit
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
      setCreateOldImageUrl(null) // Reset old image URL
      toast.success("Tạo khách hàng mới thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Tạo khách hàng thất bại")
      // Xóa ảnh đã upload nếu tạo thất bại
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
      // Xóa ảnh cũ nếu đã thay đổi
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

  // Xử lý khi đóng dialog create mà không submit
  const handleCreateDialogClose = (open: boolean) => {
    if (!open && createOldImageUrl) {
      // Xóa ảnh đã upload nếu hủy form
      deleteImage(createOldImageUrl)
      setCreateOldImageUrl(null)
    }
    setIsCreateOpen(open)
  }

  // Xử lý khi đóng dialog edit mà không submit
  const handleEditDialogClose = (open: boolean) => {
    if (!open) {
      // Xóa ảnh mới đã upload nếu hủy form (chỉ xóa ảnh mới upload, giữ ảnh cũ)
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

  // Filter clients based on search query
  const clientsArray = Array.isArray(clients) ? clients : []
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Khách hàng</CardTitle>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo tên hoặc số điện thoại..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Dialog open={isCreateOpen} onOpenChange={handleCreateDialogClose}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Tạo khách hàng mới
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader className="pb-4 border-b">
                      <DialogTitle className="text-xl font-semibold">Tạo khách hàng mới</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmitCreate(onSubmitCreate)} className="space-y-5 pt-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Ảnh đại diện
                        </Label>
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
                        <Label htmlFor="create-name" className="text-sm font-medium">
                          Tên khách hàng <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="create-name"
                          className="h-10"
                          {...registerCreate("name", { required: "Tên khách hàng là bắt buộc" })}
                          placeholder="Nhập tên khách hàng"
                        />
                        {createErrors.name && (
                          <p className="text-sm text-red-500 mt-1">{createErrors.name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-phone" className="text-sm font-medium">
                          Số điện thoại <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="create-phone"
                          className="h-10"
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
                        <Label htmlFor="create-address" className="text-sm font-medium">
                          Địa chỉ
                        </Label>
                        <Input
                          id="create-address"
                          className="h-10"
                          {...registerCreate("address")}
                          placeholder="123 Đường ABC, Quận 1, TP.HCM"
                        />
                      </div>
                      <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateOpen(false)}
                          disabled={createMutation.isPending}
                        >
                          Hủy
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending}>
                          {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Tạo khách hàng
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredClients && filteredClients.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Số điện thoại</TableHead>
                    <TableHead>Địa chỉ</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Điểm tích lũy</TableHead>
                    <TableHead>Số đơn hàng</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients?.length > 0 ? (
                    filteredClients?.map((client: Client) => (
                    <TableRow 
                      key={client?.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/customers/${client?.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={client?.avatar || undefined} alt={client?.name} />
                            <AvatarFallback>
                              {client?.name?.charAt?.(0)?.toUpperCase() || "K"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {client?.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{client?.phone}</TableCell>
                      <TableCell>{client?.address || "-"}</TableCell>
                      <TableCell>
                        {client?.zaloId ? "-" : "Chưa đăng ký"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{client?.point} điểm</Badge>
                      </TableCell>
                      <TableCell>{client?._count?.orders || 0}</TableCell>
                      <TableCell>
                        {client?.createdAt ? new Date(client.createdAt).toLocaleDateString("vi-VN") : "-"}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Link href={`/customers/${client?.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(client)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        {searchQuery ? "Không tìm thấy khách hàng nào" : "Không có dữ liệu"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? "Không tìm thấy khách hàng nào" : "Chưa có khách hàng nào"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        {editingClient && (
          <Dialog open={isEditOpen} onOpenChange={handleEditDialogClose}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader className="pb-4 border-b">
                <DialogTitle className="text-xl font-semibold">Cập nhật thông tin khách hàng</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Ảnh đại diện
                  </Label>
                  <ImageUpload
                    value={editAvatarUrl}
                    onChange={(url) => setValue('avatar', url)}
                    folder="client-avatars"
                    disabled={updateMutation.isPending}
                    onDeleteOldImage={(url) => {
                      // Xóa ảnh cũ khi component unmount (nếu không submit)
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
                  <Label htmlFor="name" className="text-sm font-medium">
                    Tên khách hàng <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    className="h-10"
                    {...register("name", { required: "Tên khách hàng là bắt buộc" })}
                    placeholder="Nhập tên khách hàng"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Số điện thoại <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    className="h-10"
                    {...register("phone", { required: "Số điện thoại là bắt buộc" })}
                    placeholder="0388888888"
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium">
                    Địa chỉ
                  </Label>
                  <Input
                    id="address"
                    className="h-10"
                    {...register("address")}
                    placeholder="123 Đường ABC, Quận 1, TP.HCM"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditOpen(false)}
                    disabled={updateMutation.isPending}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cập nhật
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  )
}

