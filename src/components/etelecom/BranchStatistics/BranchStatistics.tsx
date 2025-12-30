"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, PhoneCall, Clock, Hash, User, CalendarIcon, PhoneOutgoing, PhoneIncoming, TrendingUp, TrendingDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useCallStats, useTimeSeriesData } from "@/services/etelecom/callStatsService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart } from 'recharts';

interface BranchStatisticsProps {
    from: string;
    to: string;
}

export default function BranchStatistics({ from, to }: BranchStatisticsProps) {

    const { data, isLoading } = useCallStats({ from, to });
    const { data: timeSeriesData, isLoading: timeSeriesLoading } = useTimeSeriesData({ from, to });

    const overview = data?.overview;
    const details = data?.details ?? [];
    const timeSeries = timeSeriesData?.timeSeries ?? [];
    const comparison = timeSeriesData?.comparison ?? [];

    // ✅ Safe data conversion helper
    const safeString = (value: any): string => {
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return value.toString();
        if (value && typeof value === 'object') {
            // Handle potential object with s, e, d keys (BigInt or similar)
            if ('s' in value || 'e' in value || 'd' in value) {
                return String(value);
            }
        }
        return '0';
    };

    const safeNumber = (value: any): number => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return Number(value) || 0;
        if (value && typeof value === 'object') {
            // Handle BigInt objects with s, e, d structure
            if ('s' in value && 'e' in value && 'd' in value) {
                // Convert BigInt to number
                const sign = value.s === 1 ? 1 : -1;
                const exponent = value.e;
                const digits = value.d;

                if (digits && digits.length > 0) {
                    // Convert digits array to number
                    let result = 0;
                    for (let i = 0; i < digits.length; i++) {
                        result += digits[i] * Math.pow(10, digits.length - 1 - i);
                    }

                    // Apply sign and exponent
                    result = sign * result * Math.pow(10, exponent - digits.length + 1);
                    return result;
                }
            }
        }
        return 0;
    };

    // ✅ Phân trang
    const [page, setPage] = useState(1);
    const pageSize = 8;
    const totalPages = Math.ceil(details.length / pageSize);
    const paginatedDetails = details.slice((page - 1) * pageSize, page * pageSize);

    // ✅ Animation states
    const [animatedCards, setAnimatedCards] = useState<boolean[]>([]);

    useEffect(() => {
        if (overview) {
            // Trigger animation for each card with delay
            const timer = setTimeout(() => {
                setAnimatedCards(Array(8).fill(true));
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [overview]);

    // ✅ Chart data preparation

    // ✅ Time series data for line charts
    const timeSeriesChartData = timeSeries
        .filter(item => item && item.date) // Filter out invalid items
        .map(item => {
            // Handle date format "DD/MM"
            let formattedDate = item.date;
            if (item.date.includes('/')) {
                const [day, month] = item.date.split('/');
                const currentYear = new Date().getFullYear();
                formattedDate = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }

            return {
                date: new Date(formattedDate).toLocaleDateString('vi-VN', {
                    month: 'short',
                    day: 'numeric'
                }),
                total_calls: Number(item.total_calls) || 0,
                successful_calls: Number(item.successful_calls) || 0,
                failed_calls: Number(item.failed_calls) || 0,
                answer_rate: Number(item.answer_rate) || 0,
                avg_duration: Number(item.avg_duration) || 0
            };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date

    // ✅ Comparison data for trend analysis
    const comparisonChartData = comparison
        .filter(item => item && item.period) // Filter out invalid items
        .map(item => ({
            period: item.period,
            total_calls: Number(item.total_calls) || 0,
            successful_calls: Number(item.successful_calls) || 0,
            failed_calls: Number(item.failed_calls) || 0,
            answer_rate: Number(item.answer_rate) || 0,
            avg_duration: Number(item.avg_duration) || 0,
            change_percent: Number(item.change_percent) || 0
        }));

    // ✅ Comparison data for table (newest first)
    const comparisonTableData = comparison
        .filter(item => item && item.period) // Filter out invalid items
        .map(item => ({
            period: item.period,
            total_calls: Number(item.total_calls) || 0,
            successful_calls: Number(item.successful_calls) || 0,
            failed_calls: Number(item.failed_calls) || 0,
            answer_rate: Number(item.answer_rate) || 0,
            avg_duration: Number(item.avg_duration) || 0,
            change_percent: Number(item.change_percent) || 0
        }))
        .sort((a, b) => {
            // Sort by period in reverse order (newest first) for table only
            // Simple string comparison for DD/MM format
            const getSortValue = (period: string) => {
                if (period.includes('/')) {
                    const parts = period.split('/');
                    if (parts.length === 2) {
                        // Format: DD/MM - convert to YYYYMMDD for sorting
                        const day = parseInt(parts[0]) || 0;
                        const month = parseInt(parts[1]) || 0;
                        return month * 100 + day; // MM * 100 + DD for proper sorting
                    }
                }
                // Fallback: use string comparison
                return period;
            };

            const aValue = getSortValue(a.period);
            const bValue = getSortValue(b.period);

            // Reverse order (newest first) for table
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return bValue - aValue;
            }
            return String(bValue).localeCompare(String(aValue));
        });

    // ✅ Chart data preparation for overview
    const chartData = [
        {
            name: 'Tổng cuộc gọi',
            value: safeNumber(overview?.total_calls),
            color: '#10b981'
        },
        {
            name: 'Cuộc gọi đi',
            value: safeNumber(overview?.successful_calls),
            color: '#3b82f6'
        },
        {
            name: 'Cuộc gọi đến',
            value: safeNumber(overview?.failed_calls),
            color: '#06b6d4'
        }
    ];

    const durationData = [
        {
            name: 'Thời lượng gọi đi',
            value: safeNumber(overview?.outgoing_duration) / 60,
            color: '#3b82f6'
        },
        {
            name: 'Thời lượng gọi đến',
            value: safeNumber(overview?.incoming_duration) / 60,
            color: '#10b981'
        }
    ];

    const answerRateData = [
        {
            name: 'Tỉ lệ nghe máy',
            value: safeNumber(overview?.answer_rate_percent),
            color: '#10b981'
        },
        {
            name: 'Không nghe máy',
            value: 100 - safeNumber(overview?.answer_rate_percent),
            color: '#f97316'
        }
    ];

    // ✅ Growth trend calculation - So sánh với khoảng thời gian ngay trước đó
    const growthTrend = timeSeriesChartData.length > 1 ? {
        // So sánh với ngày trước đó
        total_calls_growth: timeSeriesChartData.length >= 2 ?
            ((timeSeriesChartData[timeSeriesChartData.length - 1]?.total_calls || 0) - (timeSeriesChartData[timeSeriesChartData.length - 2]?.total_calls || 0)) /
            (timeSeriesChartData[timeSeriesChartData.length - 2]?.total_calls || 1) * 100 : 0,

        answer_rate_growth: timeSeriesChartData.length >= 2 ?
            (timeSeriesChartData[timeSeriesChartData.length - 1]?.answer_rate || 0) - (timeSeriesChartData[timeSeriesChartData.length - 2]?.answer_rate || 0) : 0,

        avg_duration_growth: timeSeriesChartData.length >= 2 ?
            ((timeSeriesChartData[timeSeriesChartData.length - 1]?.avg_duration || 0) - (timeSeriesChartData[timeSeriesChartData.length - 2]?.avg_duration || 0)) /
            (timeSeriesChartData[timeSeriesChartData.length - 2]?.avg_duration || 1) * 100 : 0
    } : null;
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="p-4 space-y-6 overflow-auto pb-[300px]">
            {/* ✅ Tổng quan với hiệu ứng */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {isLoading ? (
                    // Loading skeleton with shimmer effect
                    Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="bg-white border-0 rounded-lg p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <div className="h-4 animate-shimmer rounded w-24"></div>
                                    <div className="h-8 animate-shimmer rounded w-16"></div>
                                </div>
                                <div className="w-12 h-12 animate-shimmer rounded-full"></div>
                            </div>
                        </div>
                    ))
                ) : (
                    <>
                        <SummaryCard
                            title="Tổng máy nhánh"
                            value={safeString(overview?.active_extensions)}
                            icon={<Hash className="w-5 h-5" />}
                            color="blue"
                            isAnimated={animatedCards[0]}
                            delay={0}
                        />
                        <SummaryCard
                            title="Tổng cuộc gọi"
                            value={safeString(overview?.total_calls)}
                            icon={<Phone className="w-5 h-5" />}
                            color="green"
                            isAnimated={animatedCards[1]}
                            delay={1}
                        />
                        <SummaryCard
                            title="Cuộc gọi đi"
                            value={safeString(overview?.successful_calls)}
                            icon={<PhoneOutgoing className="w-5 h-5" />}
                            color="emerald"
                            isAnimated={animatedCards[2]}
                            delay={2}
                        />
                        <SummaryCard
                            title="Cuộc gọi đến"
                            value={safeString(overview?.failed_calls)}
                            icon={<PhoneIncoming className="w-5 h-5" />}
                            color="sky"
                            isAnimated={animatedCards[3]}
                            delay={3}
                        />
                        <SummaryCard
                            title="Tỉ lệ nghe máy"
                            value={`${safeNumber(overview?.answer_rate_percent)}%`}
                            icon={<User className="w-5 h-5" />}
                            color="yellow"
                            isAnimated={animatedCards[4]}
                            delay={4}
                        />
                        <SummaryCard
                            title="Thời lượng trung bình"
                            value={`${safeNumber(overview?.avg_duration_seconds)} giây`}
                            icon={<Clock className="w-5 h-5" />}
                            color="orange"
                            isAnimated={animatedCards[7]}
                            delay={7}
                        />
                        <SummaryCard
                            title="Thời lượng gọi đi"
                            value={`${(safeNumber(overview?.outgoing_duration) / 60).toFixed(0)} phút`}
                            icon={<PhoneOutgoing className="w-5 h-5" />}
                            color="emerald"
                            isAnimated={animatedCards[5]}
                            delay={5}
                        />
                        <SummaryCard
                            title="Thời lượng gọi đến"
                            value={`${(safeNumber(overview?.incoming_duration) / 60).toFixed(0)} phút`}
                            icon={<PhoneIncoming className="w-5 h-5" />}
                            color="sky"
                            isAnimated={animatedCards[6]}
                            delay={6}
                        />
                    </>
                )}
            </div>

            {/* ✅ Biểu đồ đường - Xu hướng theo thời gian */}
            {!timeSeriesLoading && timeSeriesChartData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Biểu đồ đường - Tổng cuộc gọi theo thời gian */}
                    <Card className="border-0 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Xu hướng cuộc gọi</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={timeSeriesChartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="total_calls"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, stroke: '#6366f1', strokeWidth: 2, fill: '#fff' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="successful_calls"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="failed_calls"
                                        stroke="#f59e0b"
                                        strokeWidth={3}
                                        dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2, fill: '#fff' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Biểu đồ vùng - Tỉ lệ nghe máy theo thời gian */}
                    <Card className="border-0 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tỉ lệ nghe máy theo thời gian</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <AreaChart data={timeSeriesChartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="answer_rate"
                                        stroke="#10b981"
                                        fill="#10b981"
                                        fillOpacity={0.3}
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Biểu đồ cột - So sánh hiệu suất theo thời gian */}

                </div>
            ) : !timeSeriesLoading && timeSeriesChartData.length === 0 ? (
                <Card className="border-0 bg-white shadow-sm">
                    <CardContent className="p-6">
                        <div className="text-center py-8">
                            <div className="text-gray-400 mb-4">
                                <Phone className="w-12 h-12 mx-auto" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">Chưa có dữ liệu xu hướng</h3>
                            <p className="text-gray-600">Dữ liệu xu hướng sẽ được hiển thị khi có đủ thông tin theo thời gian.</p>
                        </div>
                    </CardContent>
                </Card>
            ) : null}
            <Card className="border-0 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">So sánh hiệu suất theo thời gian</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={comparisonChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                            />
                            <Legend />
                            <Bar dataKey="total_calls" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="successful_calls" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            {/* ✅ Biểu đồ phát triển - Growth Analysis */}
            {!timeSeriesLoading && timeSeriesChartData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Growth Trend Cards */}
                    {growthTrend && (
                        <>
                            <Card className="border-0 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-800">Tăng trưởng cuộc gọi</h3>
                                        <div className={`p-2 rounded-full ${growthTrend.total_calls_growth > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {growthTrend.total_calls_growth > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                        </div>
                                    </div>
                                    <div className="text-3xl font-bold text-gray-900 mb-2">
                                        {growthTrend.total_calls_growth > 0 ? '+' : ''}{growthTrend.total_calls_growth.toFixed(1)}%
                                    </div>
                                    <p className="text-sm text-gray-600">So với ngày trước</p>
                                </CardContent>
                            </Card>

                            <Card className="border-0 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-800">Thay đổi tỉ lệ nghe máy</h3>
                                        <div className={`p-2 rounded-full ${growthTrend.answer_rate_growth > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {growthTrend.answer_rate_growth > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                        </div>
                                    </div>
                                    <div className="text-3xl font-bold text-gray-900 mb-2">
                                        {growthTrend.answer_rate_growth > 0 ? '+' : ''}{growthTrend.answer_rate_growth.toFixed(1)}%
                                    </div>
                                    <p className="text-sm text-gray-600">So với ngày trước</p>
                                </CardContent>
                            </Card>

                            <Card className="border-0 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-800">Thay đổi thời lượng TB</h3>
                                        <div className={`p-2 rounded-full ${growthTrend.avg_duration_growth > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {growthTrend.avg_duration_growth > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                        </div>
                                    </div>
                                    <div className="text-3xl font-bold text-gray-900 mb-2">
                                        {growthTrend.avg_duration_growth > 0 ? '+' : ''}{growthTrend.avg_duration_growth.toFixed(1)}%
                                    </div>
                                    <p className="text-sm text-gray-600">So với ngày trước</p>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            )}

            {/* ✅ Biểu đồ tổng quan */}
            {!isLoading && overview && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-chart-fade-in">
                    {/* Biểu đồ cột - Thống kê cuộc gọi */}
                    <Card className="border-0 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Thống kê cuộc gọi</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                    />
                                    <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Biểu đồ tròn - Tỉ lệ nghe máy */}
                    <Card className="border-0 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tỉ lệ nghe máy</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={answerRateData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {answerRateData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ✅ Biểu đồ thời lượng và phần trăm thay đổi */}
            {!timeSeriesLoading && comparisonChartData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Thời lượng gọi theo tháng */}
                    <Card className="border-0 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Thời lượng gọi theo tháng</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={comparisonChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="period" />
                                    <YAxis />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                    />
                                    <Bar dataKey="avg_duration" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Phần trăm thay đổi */}
                    <Card className="border-0 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Phần trăm thay đổi</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={comparisonChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="period" />
                                    <YAxis />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                    />
                                    <Bar dataKey="change_percent" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                                        {comparisonChartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.change_percent > 0 ? '#10b981' : '#ef4444'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
            )}



            {/* ✅ Bảng so sánh chi tiết */}
            {!timeSeriesLoading && comparisonChartData.length > 0 && (
                <Card className="border-0 bg-white shadow-sm">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Chi tiết so sánh hiệu suất</h3>
                        <div className="overflow-x-auto">
                            <Table className="bg-white text-sm">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Khoảng thời gian</TableHead>
                                        <TableHead className="text-center">Tổng cuộc gọi</TableHead>
                                        <TableHead className="text-center">Cuộc gọi thành công</TableHead>
                                        <TableHead className="text-center">Cuộc gọi thất bại</TableHead>
                                        <TableHead className="text-center">Tỉ lệ nghe máy</TableHead>
                                        <TableHead className="text-center">Thời lượng TB (giây)</TableHead>
                                        <TableHead className="text-center">Thay đổi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {comparisonTableData.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{item.period}</TableCell>
                                            <TableCell className="text-center">{item.total_calls}</TableCell>
                                            <TableCell className="text-center">{item.successful_calls}</TableCell>
                                            <TableCell className="text-center">{item.failed_calls}</TableCell>
                                            <TableCell className="text-center">{item.answer_rate.toFixed(1)}%</TableCell>
                                            <TableCell className="text-center">{item.avg_duration.toFixed(1)}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {item.change_percent > 0 ? (
                                                        <TrendingUp className="w-4 h-4 text-green-600" />
                                                    ) : (
                                                        <TrendingDown className="w-4 h-4 text-red-600" />
                                                    )}
                                                    <span className={`font-medium ${item.change_percent > 0 ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                        {item.change_percent > 0 ? '+' : ''}{item.change_percent.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}



            {/* ✅ Chi tiết theo nhân viên */}
            <div className="mt-6 border rounded-lg overflow-x-auto">
                <Table className="bg-white text-sm">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nhánh</TableHead>
                            <TableHead>Tên nhân viên</TableHead>
                            <TableHead>SDT</TableHead>
                            <TableHead className="text-center">Tổng cuộc gọi</TableHead>
                            <TableHead className="text-center">Cuộc gọi đi</TableHead>
                            <TableHead className="text-center">Cuộc gọi đến</TableHead>
                            <TableHead className="text-center">Tỉ lệ nghe máy</TableHead>
                            <TableHead className="text-center">Tổng thời lượng</TableHead>
                            <TableHead className="text-center">Gọi đi</TableHead>
                            <TableHead className="text-center">Gọi đến</TableHead>
                            <TableHead className="text-center">Trung bình</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center py-4">Đang tải dữ liệu...</TableCell>
                            </TableRow>
                        ) : (
                            paginatedDetails.map((d: any) => (
                                <TableRow key={d.staff_id}>
                                    <TableCell>{d.extension_number}</TableCell>
                                    <TableCell>{d.name}</TableCell>
                                    <TableCell>{d.phone}</TableCell>
                                    <TableCell className="text-center">{d.total_calls}</TableCell>
                                    <TableCell className="text-center">{d.outgoing_calls}</TableCell>
                                    <TableCell className="text-center">{d.incoming_calls}</TableCell>
                                    <TableCell className="text-center">{d.answer_rate_percent}%</TableCell>
                                    <TableCell className="text-center">{Number(d.total_duration_seconds)} giây</TableCell>
                                    <TableCell className="text-center">{Number(d.outgoing_duration)} giây</TableCell>
                                    <TableCell className="text-center">{Number(d.incoming_duration)} giây</TableCell>
                                    <TableCell className="text-center">{Number(d.avg_duration_seconds)} giây</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* ✅ Điều khiển phân trang */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 p-4 bg-white shadow-md border-t rounded-b-lg">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => {
                                return (
                                    p === 1 ||
                                    p === totalPages ||
                                    (p >= page - 1 && p <= page + 1)
                                );
                            })
                            .reduce((acc: (number | string)[], curr, i, arr) => {
                                if (i > 0 && curr - (arr[i - 1] as number) > 1) {
                                    acc.push("...");
                                }
                                acc.push(curr);
                                return acc;
                            }, [])
                            .map((item, idx) =>
                                item === "..." ? (
                                    <span key={idx} className="px-2 text-gray-500">
                                        ...
                                    </span>
                                ) : (
                                    <button
                                        key={idx}
                                        onClick={() => setPage(item as number)}
                                        className={`w-8 h-8 text-sm border rounded-full ${page === item
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "hover:bg-gray-100 text-gray-700"
                                            }`}
                                    >
                                        {item}
                                    </button>
                                )
                            )}
                    </div>
                )}

            </div>
        </div>
    );
}

function SummaryCard({ title, value, icon, color, isAnimated, delay }: {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    isAnimated: boolean;
    delay: number;
}) {
    const colorClasses: Record<string, string> = {
        blue: "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 border-blue-200 hover:from-blue-100 hover:to-blue-200",
        green: "bg-gradient-to-br from-green-50 to-green-100 text-green-600 border-green-200 hover:from-green-100 hover:to-green-200",
        emerald: "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 border-emerald-200 hover:from-emerald-100 hover:to-emerald-200",
        sky: "bg-gradient-to-br from-sky-50 to-sky-100 text-sky-600 border-sky-200 hover:from-sky-100 hover:to-sky-200",
        yellow: "bg-gradient-to-br from-yellow-50 to-yellow-100 text-yellow-600 border-yellow-200 hover:from-yellow-100 hover:to-yellow-200",
        orange: "bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600 border-orange-200 hover:from-orange-100 hover:to-orange-200",
        purple: "bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 border-purple-200 hover:from-purple-100 hover:to-purple-200",
        rose: "bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600 border-rose-200 hover:from-rose-100 hover:to-rose-200",
    };

    const pulseClasses: Record<string, string> = {
        blue: "animate-pulse-blue",
        green: "animate-pulse-green",
        emerald: "animate-pulse-emerald",
        sky: "animate-pulse-sky",
        yellow: "animate-pulse-yellow",
        orange: "animate-pulse-orange",
        purple: "animate-pulse-purple",
        rose: "animate-pulse-rose",
    };

    return (
        <Card className={`
            border-0 bg-white transition-all duration-500 ease-out
            hover:shadow-xl hover:scale-105 hover:-translate-y-1
            hover:ring-2 hover:ring-opacity-50
            ${isAnimated ? 'animate-fade-in-up' : 'opacity-0 translate-y-4'}
            group cursor-pointer
        `} style={{
                animationDelay: `${delay * 100}ms`,
                animationFillMode: 'forwards'
            }}>
            <CardContent className="p-6 relative overflow-hidden">
                {/* Background glow effect */}
                <div className={`
                    absolute inset-0 opacity-20 blur-xl rounded-full
                    ${pulseClasses[color]}
                    transition-all duration-300
                    group-hover:opacity-30 group-hover:blur-2xl
                `}></div>

                <div className="relative z-10">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-600 transition-colors duration-300 group-hover:text-gray-800">
                                {title}
                            </p>
                            <p className={`
                                text-2xl font-bold transition-all duration-500
                                ${isAnimated ? 'animate-count-up' : ''}
                                group-hover:text-gray-900
                            `} style={{
                                    animationDelay: `${(delay + 1) * 100}ms`,
                                    animationFillMode: 'forwards'
                                }}>
                                {value}
                            </p>
                        </div>
                        <div className={`
                            p-3 rounded-full border transition-all duration-300
                            ${colorClasses[color]}
                            hover:scale-110 hover:rotate-12
                            ${isAnimated ? 'animate-bounce-in' : ''}
                            group-hover:shadow-lg
                        `} style={{
                                animationDelay: `${(delay + 2) * 100}ms`,
                                animationFillMode: 'forwards'
                            }}>
                            {icon}
                        </div>
                    </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-16 h-16 opacity-10 transition-opacity duration-300 group-hover:opacity-20">
                    <div className={`w-full h-full rounded-full ${colorClasses[color].split(' ')[0]}`}></div>
                </div>

                {/* Hover overlay effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            </CardContent>
        </Card>
    );
}
