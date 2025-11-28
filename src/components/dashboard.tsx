"use client"

import { useQuery } from "@tanstack/react-query"
import {
    Users,
    Package,
    Ticket,
    ShoppingBag,
    FolderTree,
    Warehouse,
    Shield,
    UserCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import DashboardLayout from "@/components/dashboard-layout"
import { useSession } from "next-auth/react"
import Link from "next/link"

export default function Dashboard({ serverSession }: { serverSession?: any }) {
    const { data: session } = useSession()

    // Mock data for chart
    const chartData = [
        { name: "T2", orders: 4 },
        { name: "T3", orders: 5 },
        { name: "T4", orders: 6 },
        { name: "T5", orders: 7 },
        { name: "T6", orders: 5 },
        { name: "T7", orders: 8 },
        { name: "CN", orders: 6 },
    ]

    // Quick actions data - chỉ hiển thị các actions có page tương ứng
    const quickActions = [
        { icon: Package, label: "Danh sách dịch vụ", color: "bg-orange-500", href: "/products" },
        { icon: FolderTree, label: "Danh sách danh mục", color: "bg-blue-500", href: "/categories" },
        { icon: ShoppingBag, label: "Quản lý đơn hàng", color: "bg-green-500", href: "/orders" },
        { icon: UserCircle, label: "Khách hàng", color: "bg-cyan-500", href: "/customers" },
        { icon: Ticket, label: "Coupon & voucher", color: "bg-pink-500", href: "/vouchers" },
        { icon: Warehouse, label: "Kho hàng", color: "bg-purple-500", href: "/inventory" },
        { icon: Users, label: "Danh sách nhân viên", color: "bg-teal-500", href: "/staff" },
        { icon: Shield, label: "Quản lý Roles", color: "bg-indigo-500", href: "/roles" },
    ]

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Statistics Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Tổng số chi nhánh</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">18</div>
                            <div className="h-12 mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={[{ value: 18 }, { value: 20 }, { value: 18 }]}>
                                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Tổng số đặt hẹn</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">5,942</div>
                            <div className="h-12 mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={[{ value: 5900 }, { value: 6000 }, { value: 5942 }]}>
                                        <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Tổng số khách hàng</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">8,766</div>
                            <div className="h-12 mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={[{ value: 8700 }, { value: 8800 }, { value: 8766 }]}>
                                        <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Dịch vụ & sản phẩm</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">943</div>
                            <div className="h-12 mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={[{ value: 940 }, { value: 950 }, { value: 943 }]}>
                                        <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions and News Section */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Quick Actions */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Thao tác nhanh</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {quickActions.map((action, index) => {
                                        const Icon = action.icon
                                        return (
                                            <Link
                                                key={index}
                                                href={action.href || "#"}
                                                className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <div className={`${action.color} p-3 rounded-lg mb-2`}>
                                                    <Icon className="h-6 w-6 text-white" />
                                                </div>
                                                <span className="text-xs text-center font-medium">{action.label}</span>
                                            </Link>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* News Section */}
                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Bản tin Aura Group</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-8 text-gray-500">
                                    Chưa có thông báo!
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Chart Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Thống kê order mới</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 text-sm text-gray-600 text-center">
                            Số order mỗi ngày của {session?.staffInfo?.name || "SG - Quận 10"}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    )
}
