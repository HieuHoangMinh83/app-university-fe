"use client"

import { useState, useEffect, ReactNode } from "react"
import { signOut, useSession } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import {
    BarChart,
    ChevronLeft,
    Bell,
    Menu,
    LogOut,
    User,
    Grid3x3,
    ChevronDown,
    Sparkles,
    Package,
    ShoppingBag,
    Ticket,
    Warehouse,
    Users,
    Shield,
    FolderTree,
    UserCircle,
    History,
    Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface DashboardLayoutProps {
    children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [isMobile, setIsMobile] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const pathname = usePathname()
    const router = useRouter()

    const { data: session } = useSession()
    
    const handleLogout = async () => {
        signOut({ callbackUrl: "/auth/login" });
    };

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768)
        }

        handleResize()
        window.addEventListener("resize", handleResize)

        return () => {
            window.removeEventListener("resize", handleResize)
        }
    }, [])

    if (!session) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <p className="text-gray-500">Đang tải...</p>
                </div>
            </div>
        )
    }

    // Chỉ hiển thị các menu có API tương ứng trong FULL_API_DOCUMENTATION.md
    const menuItems = [
        {
            section: "DASHBOARD",
            items: [
                { icon: BarChart, label: "Thống kê", href: "/" },
            ]
        },
        {
            section: "QUẢN LÝ",
            items: [
                { icon: ShoppingBag, label: "Quản lý Orders", href: "/orders" },
                { icon: UserCircle, label: "Khách hàng", href: "/customers" },
            ]
        },
        {
            section: "SẢN PHẨM",
            items: [
                { icon: Package, label: "Sản phẩm", href: "/products" },
                { icon: FolderTree, label: "Danh mục", href: "/categories" },
            ]
        },
        {
            section: "KHO BÃI",
            items: [
                    { icon: Warehouse, label: "Kho hàng", href: "/inventory" },
                { icon: Package, label: "Sản phẩm kho", href: "/inventory-products" },
                { icon: Plus, label: "Nhập kho", href: "/inventory-import" },
                { icon: History, label: "Lịch sử  kho bãi", href: "/inventory-transactions" },
            ]
        },
        {
            section: "NHÂN VIÊN & PHÂN QUYỀN",
            items: [
                { icon: Users, label: "Nhân viên", href: "/staff" },
                { icon: Shield, label: "Roles", href: "/roles" },
            ]
        },
        {
            section: "HỆ THỐNG",
            items: [
                { icon: Ticket, label: "Vouchers", href: "/vouchers" },
            ]
        },
    ]

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <div
                className={`${isMobile ? "fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out" : "w-[220px]"} ${isMobile && !sidebarOpen ? "-translate-x-full" : "translate-x-0"} bg-[#313c4a] text-white flex flex-col`}
            >
                {isMobile && (
                    <div className="flex justify-end p-4">
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="text-white hover:bg-white/10">
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                    </div>
                )}
                
                {/* Logo */}
                <div className="p-6 border-b border-white/10">
                    <h1 className="text-2xl font-bold">AURA BEAUTY</h1>
                </div>

                {/* Navigation */}
                <div className="flex-1 py-4 overflow-y-auto">
                    <nav className="space-y-2 pr-4 pl-1">
                        {menuItems.map((section, sectionIdx) => (
                            <div key={sectionIdx} className="mb-6">
                                <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 px-3">
                                    {section.section}
                                </div>
                                <div className="space-y-1">
                                    {section.items.map((item, itemIdx) => {
                                        const Icon = item.icon
                                        const isActive = pathname === item.href
                                        return (
                                            <Link
                                                key={itemIdx}
                                                href={item.href}
                                                className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors ${
                                                    isActive
                                                        ? "bg-blue-500/20 text-blue-200 border-l-4 border-blue-400"
                                                        : "text-white/80 hover:bg-white/10"
                                                }`}
                                                onClick={() => isMobile && setSidebarOpen(false)}
                                            >
                                                <Icon className="mr-3 h-5 w-5" />
                                                {item.label}
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>
                </div>

                {/* Hamburger Menu */}
                <div className="p-4 border-t border-white/10">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-full">
                        <Menu className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 flex items-center justify-between px-6 py-4">
                    <div className="flex items-center">
                        {isMobile && (
                            <Button variant="ghost" size="icon" className="mr-2" onClick={() => setSidebarOpen(true)}>
                                <Menu className="h-5 w-5" />
                            </Button>
                        )}
                        <Button variant="ghost" size="icon">
                            <Grid3x3 className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="flex items-center space-x-4">
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                        </Button>

                        <Button variant="ghost" size="icon">
                            <Sparkles className="h-5 w-5" />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 h-auto px-2 py-1.5">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={session?.staffInfo?.avatar || undefined} alt="User" />
                                        <AvatarFallback>
                                            {session?.staffInfo?.name?.charAt(0)?.toUpperCase() || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="text-left hidden md:block">
                                        <div className="text-sm font-medium">{session?.staffInfo?.name || "Người dùng"}</div>
                                        <div className="text-xs text-gray-500">
                                            {session?.staffInfo?.role ? `${session.staffInfo.role} - admin` : "admin"}
                                        </div>
                                    </div>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem>
                                    <User className="mr-2 h-4 w-4" />
                                    Profile
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Đăng xuất
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {children}
                </div>
            </div>
        </div>
    )
}

