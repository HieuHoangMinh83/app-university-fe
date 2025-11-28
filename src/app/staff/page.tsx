"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { usersApi, User, CreateUserDto } from "@/services/api/users"
import { rolesApi } from "@/services/api/roles"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useForm } from "react-hook-form"
import { Plus, Pencil, Trash2, Loader2, Users } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"

export default function UsersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: usersApi.getAll,
  })

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: rolesApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setIsCreateOpen(false)
      toast.success("Tạo tài khoản nhân viên thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Tạo tài khoản thất bại")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("Xóa nhân viên thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Xóa nhân viên thất bại")
    },
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateUserDto>({
    defaultValues: {
      role: "guest",
    }
  })

  const onSubmit = (data: CreateUserDto) => {
    createMutation.mutate(data)
    reset()
  }

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa nhân viên này?")) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Quản lý Nhân viên</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tạo tài khoản nhân viên
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo tài khoản nhân viên mới</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="name">Tên nhân viên *</Label>
                  <Input
                    id="name"
                    {...register("name", { required: "Tên nhân viên là bắt buộc" })}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Số điện thoại *</Label>
                  <Input
                    id="phone"
                    {...register("phone", { 
                      required: "Số điện thoại là bắt buộc",
                      pattern: {
                        value: /^(03|05|07|08|09)[0-9]{8}$/,
                        message: "Số điện thoại phải là 10 số, bắt đầu bằng 03, 05, 07, 08, 09"
                      }
                    })}
                    placeholder="0388888888"
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">Mật khẩu *</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register("password", { 
                      required: "Mật khẩu là bắt buộc",
                      minLength: {
                        value: 6,
                        message: "Mật khẩu phải có ít nhất 6 ký tự"
                      }
                    })}
                  />
                  {errors.password && (
                    <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="role">Vai trò *</Label>
                  <Select
                    {...register("role", { required: "Vai trò là bắt buộc" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn vai trò" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="guest">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-red-500 mt-1">{errors.role.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="avatar">Avatar URL</Label>
                  <Input
                    id="avatar"
                    {...register("avatar")}
                    placeholder="https://..."
                  />
                </div>

                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Tạo tài khoản
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách nhân viên</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : users?.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Nhân viên</TableHead>
                      <TableHead>Số điện thoại</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead className="text-right w-[100px]">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => {
                      const roleName = typeof user?.role === "string" 
                        ? user.role 
                        : user?.role?.name || "N/A";
                      const roleDisplay = roleName.charAt(0).toUpperCase() + roleName.slice(1).toLowerCase();
                      
                      return (
                        <TableRow key={user?.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-gray-200">
                                <AvatarImage src={user?.avatar || undefined} alt={user?.name} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                                  {user?.name?.charAt?.(0)?.toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-gray-900">{user?.name}</div>
                                <div className="text-xs text-gray-500">ID: {user?.id?.slice(0, 8)}...</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-sm">{user?.phone}</div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={roleName.toLowerCase() === "admin" ? "default" : "outline"}
                              className={
                                roleName.toLowerCase() === "admin" 
                                  ? "bg-blue-500 hover:bg-blue-600" 
                                  : ""
                              }
                            >
                              {roleDisplay}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={user?.isActive ? "default" : "secondary"}
                              className={
                                user?.isActive 
                                  ? "bg-green-500 hover:bg-green-600 text-white" 
                                  : "bg-gray-200 text-gray-700"
                              }
                            >
                              {user?.isActive ? "Hoạt động" : "Không hoạt động"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {user?.createdAt 
                                ? new Date(user.createdAt).toLocaleDateString("vi-VN", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit"
                                  })
                                : "-"}
                            </div>
                            {user?.createdAt && (
                              <div className="text-xs text-gray-500">
                                {new Date(user.createdAt).toLocaleTimeString("vi-VN", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(user?.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                </div>
                <p className="text-gray-500 font-medium">Chưa có nhân viên nào</p>
                <p className="text-sm text-gray-400 mt-1">Nhấn nút "Tạo tài khoản nhân viên" để thêm mới</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
