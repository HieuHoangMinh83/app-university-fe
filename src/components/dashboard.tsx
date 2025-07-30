"use client"

import { useState, useEffect } from "react"
import { signOut, useSession, getSession } from "next-auth/react"
import Image from "next/image"
import {
    BarChart,
    ChevronLeft,
    ChevronDown,
    Bell,
    Home,
    CalendarIcon,
    MessageSquare,
    Star,
    Award,
    CreditCard,
    Utensils,
    Menu,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import axios, { AxiosResponse } from "axios"
import BranchStatistics from "./etelecom/BranchStatistics/BranchStatistics"
import DateRangeSelector from "./etelecom/DateRangeSelector/DateRangeSelector"
async function fetchData(url: string, body: any) {
    // You can await here
    try {
        const response: AxiosResponse = await axios.post(url, {}, body);

        return response.data;
    } catch (error: any) {
        return {
            statusCode: error?.response?.data?.statusCode ?? 400,
            error: error?.response?.data?.error ?? "error",
            message: error?.response?.data?.message ?? "message",
        };
    }
}
const OPTIONS = ["Revenue", "Pancake", "Etelecom", "ZNS"];
export default function Dashboard({ serverSession }: { serverSession?: any }) {
    const [activeSection, setActiveSection] = useState("dashboard")
    const [isMobile, setIsMobile] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [from, setFrom] = useState(() =>
        new Date().toISOString().split("T")[0] + "T00:00:00.000Z"
    );
    const [to, setTo] = useState(() =>
        new Date().toISOString().split("T")[0] + "T23:59:59.999Z"
    );

    const { data: session, status } = useSession()
    const handleLogout = async () => {
        const response = await fetchData(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/logout`,
            {
                headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                },
            }
        ); //token
        //call api by token =>user

        if (response.error) {
            alert(response.message);
        } else {
            signOut();
        }
    };
    const [selected, setSelected] = useState("Etelecom");

    const handleSelect = (option: string) => {
        setSelected(option);
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

    // Debug session data
    useEffect(() => {
        const debugSession = async () => {
            const sessionData = await getSession()
        }
        debugSession()
    }, [])

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Mobile Sidebar Toggle */}

            <div
                className={`${isMobile ? "fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out" : "w-[220px]"} ${isMobile && !sidebarOpen ? "-translate-x-full" : "translate-x-0"} bg-white border-r border-gray-200 flex flex-col`}
            >
                {isMobile && (
                    <div className="flex justify-end p-4">
                        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                    </div>
                )}
                <div className="p-4 border-b border-gray-200 flex items-center gap-2">
                    <img className="h-10 w-10" src="https://scontent.fhan4-5.fna.fbcdn.net/v/t39.30808-6/482226772_668005812418768_7591729642698125569_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeE_FiUaElAmsZ-jq69_NyOdiPN_xqDdRamI83_GoN1FqWzrUn3k2XAvuKdJncfx6v9Vzy6Wjm61iKvjTIJMYiOC&_nc_ohc=kuX5Mp_fHEkQ7kNvwGAVDBy&_nc_oc=AdlPP9tsjFqu6n3D9YwqFVWnv1_NjusLQNg3t2ZNmdMZ1qjKE8FSMJZgJgNJKKa2uH4&_nc_zt=23&_nc_ht=scontent.fhan4-5.fna&_nc_gid=uEOnaAAxqNvDYqyOjH5Jkg&oh=00_AfSWfeGwgGgVYsN0nkqosWoUmJb3wSjkfxjxxqfscb4hQg&oe=688E5A2F" alt="" />
                    <h1 className="text-[20px] font-semibold "> AURA GROUP</h1>
                </div>
                <div className="flex-1 py-4 overflow-y-auto">
                    <nav className="space-y-1 px-2">
                        <button
                            onClick={() => setActiveSection("dashboard")}
                            className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-r-md ${activeSection === "dashboard" ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                        >
                            <BarChart className="mr-3 h-5 w-5" />
                            Dashboard
                        </button>
                        <button
                            onClick={() => setActiveSection("check-in-out")}
                            className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-r-md ${activeSection === "check-in-out" ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                        >
                            <CalendarIcon className="mr-3 h-5 w-5" />
                            Check In-Out
                        </button>
                        <button
                            onClick={() => setActiveSection("rooms")}
                            className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-r-md ${activeSection === "rooms" ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                        >
                            <Home className="mr-3 h-5 w-5" />
                            Rooms
                        </button>
                        <button
                            onClick={() => setActiveSection("messages")}
                            className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-r-md ${activeSection === "messages" ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                        >
                            <MessageSquare className="mr-3 h-5 w-5" />
                            Messages
                        </button>
                        <button
                            onClick={() => setActiveSection("customer-review")}
                            className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-r-md ${activeSection === "customer-review" ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                        >
                            <Star className="mr-3 h-5 w-5" />
                            Customer Review
                        </button>
                        <button
                            onClick={() => setActiveSection("billing")}
                            className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-r-md ${activeSection === "billing" ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                        >
                            <CreditCard className="mr-3 h-5 w-5" />
                            Billing System
                        </button>
                        <button
                            onClick={() => setActiveSection("food-delivery")}
                            className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-r-md ${activeSection === "food-delivery" ? "text-blue-600 bg-blue-50 border-l-4 border-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                        >
                            <Utensils className="mr-3 h-5 w-5" />
                            Food Delivery
                        </button>

                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 flex items-center justify-between px-4 py-4 md:px-6">
                    <div className="flex items-center">
                        {isMobile && (
                            <Button variant="ghost" size="icon" className="mr-2" onClick={() => setSidebarOpen(true)}>
                                <Menu className="h-5 w-5" />
                            </Button>
                        )}
                        <h1 className="text-xl font-semibold text-gray-800">
                            {{
                                dashboard: "Dashboard",
                                "check-in-out": "Check In-Out",
                                rooms: "Rooms",
                                messages: "Messages",
                                "customer-review": "Customer Review",
                                billing: "Billing System",
                                "food-delivery": "Food Delivery",
                            }[activeSection] || "Premium Version"}
                        </h1>

                    </div>



                    <div className="flex items-center space-x-4 relative z-50">
                        {/* Dropdown chọn nhanh (nếu vẫn giữ) */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="flex items-center gap-2 px-3 py-2 h-auto"
                                >
                                    <span className="hidden md:inline">{selected}</span>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="z-50 bg-white shadow-md border rounded-md cursor-pointer w-[160px] "
                            >
                                {OPTIONS.filter((opt) => opt !== selected).map((option) => (
                                    <DropdownMenuItem key={option} onSelect={() => handleSelect(option)}>
                                        {option}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Notification bell */}
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
                        </Button>

                        {/* Avatar Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={session?.staffInfo?.avatar} alt="User" />
                                        <AvatarFallback>U</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="z-50 bg-white shadow-md w-[100px] mr-[2px] mt-2">
                                <DropdownMenuItem onSelect={() => console.log("Profile")}>Profile</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => console.log("Settings")}>Settings</DropdownMenuItem>
                                <DropdownMenuItem onSelect={handleLogout}>Logout</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>
                <div className="flex justify-start bg-white px-4 py-2">

                    {activeSection === "dashboard" && (
                        <div className="hidden md:block">
                            <DateRangeSelector
                                onChange={({ from, to }) => {
                                    // Gọi API hoặc truyền xuống props
                                    if (from) from.setHours(0, 0, 0, 0);
                                    if (to) to.setHours(23, 59, 59, 999);
                                    console.log("FROM:", from?.toLocaleString());
                                    console.log("TO:", to?.toLocaleString())


                                    setFrom(from?.toISOString() ?? "");
                                    setTo(to?.toISOString() ?? "");
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Main Content Area - Hiển thị thông tin session */}
                <BranchStatistics from={from} to={to} />

            </div>
        </div>
    )
} 