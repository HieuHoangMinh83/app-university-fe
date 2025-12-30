"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { usersApi, User, CreateUserDto } from "@/services/api/users"
import { rolesApi } from "@/services/api/roles"
import { useForm } from "react-hook-form"
import { Plus, Trash2, Loader2, Users } from "lucide-react"
import { toast } from "sonner"
import DashboardLayout from "@/components/dashboard-layout"

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
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Tạo tài khoản nhân viên
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Danh sách nhân viên</h2>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : users?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700 w-[300px]">Nhân viên</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Số điện thoại</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Vai trò</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Trạng thái</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Ngày tạo</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700 w-[100px]">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.map((user) => {
                      const roleName = typeof user?.role === "string" 
                        ? user.role 
                        : user?.role?.name || "N/A";
                      const roleDisplay = roleName.charAt(0).toUpperCase() + roleName.slice(1).toLowerCase();
                      
                      return (
                        <tr key={user?.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full border-2 border-gray-200 overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                {user?.avatar ? (
                                  <img src={user.avatar} alt={user?.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-white font-semibold">
                                    {user?.name?.charAt?.(0)?.toUpperCase() || "U"}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{user?.name}</div>
                                <div className="text-xs text-gray-500">ID: {user?.id?.slice(0, 8)}...</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono text-sm text-gray-700">{user?.phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              roleName.toLowerCase() === "admin" 
                                ? "bg-blue-500 text-white" 
                                : "border border-gray-300 text-gray-700 bg-white"
                            }`}>
                              {roleDisplay}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user?.isActive 
                                ? "bg-green-500 text-white" 
                                : "bg-gray-200 text-gray-700"
                            }`}>
                              {user?.isActive ? "Hoạt động" : "Không hoạt động"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-700">
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
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                              onClick={() => handleDelete(user?.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
          </div>
        </div>

        {/* Create Modal */}
        <Modal
          open={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Tạo tài khoản nhân viên mới"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-700 block mb-1">
                Tên nhân viên <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                {...register("name", { required: "Tên nhân viên là bắt buộc" })}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="text-sm font-medium text-gray-700 block mb-1">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label htmlFor="password" className="text-sm font-medium text-gray-700 block mb-1">
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label htmlFor="role" className="text-sm font-medium text-gray-700 block mb-1">
                Vai trò <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                {...register("role", { required: "Vai trò là bắt buộc" })}
              >
                <option value="admin">Admin</option>
                <option value="guest">Guest</option>
              </select>
              {errors.role && (
                <p className="text-sm text-red-500 mt-1">{errors.role.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="avatar" className="text-sm font-medium text-gray-700 block mb-1">
                Avatar URL
              </label>
              <input
                id="avatar"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                {...register("avatar")}
                placeholder="https://..."
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Tạo tài khoản
            </button>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  )
}
