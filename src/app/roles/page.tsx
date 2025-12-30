"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { rolesApi, Role, CreateRoleDto } from "@/services/api/roles"
import { useForm } from "react-hook-form"
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react"
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

export default function RolesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const queryClient = useQueryClient()

  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: rolesApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: rolesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      setIsCreateOpen(false)
      toast.success("Tạo role thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Tạo role thất bại")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateRoleDto }) =>
      rolesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      setEditingRole(null)
      toast.success("Cập nhật role thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Cập nhật role thất bại")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] })
      toast.success("Xóa role thành công")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Xóa role thất bại")
    },
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateRoleDto>()

  const onSubmit = (data: CreateRoleDto) => {
    if (editingRole) {
      updateMutation.mutate({ id: editingRole.id, data })
    } else {
      createMutation.mutate(data)
    }
    reset()
  }

  const handleEdit = (role: Role) => {
    setEditingRole(role)
    reset({ name: role?.name })
  }

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa role này?")) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Quản lý Roles</h1>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Tạo role mới
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Danh sách roles</h2>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Tên role</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Số người dùng</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles?.length > 0 ? (
                      roles?.map((role) => (
                        <tr key={role?.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-300 text-gray-700 bg-white">
                              {role?.name}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{role?.users?.length || 0}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                onClick={() => handleEdit(role)}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                                onClick={() => handleDelete(role?.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center py-8 text-gray-500">
                          Không có dữ liệu
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        <Modal
          open={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Tạo role mới"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-700 block mb-1">
                Tên role <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                {...register("name", { required: "Tên role là bắt buộc" })}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Tạo
            </button>
          </form>
        </Modal>

        {/* Edit Modal */}
        {editingRole && (
          <Modal
            open={!!editingRole}
            onClose={() => setEditingRole(null)}
            title="Cập nhật role"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="text-sm font-medium text-gray-700 block mb-1">
                  Tên role <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-name"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  {...register("name", { required: "Tên role là bắt buộc" })}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Cập nhật
              </button>
            </form>
          </Modal>
        )}
      </div>
    </DashboardLayout>
  )
}
