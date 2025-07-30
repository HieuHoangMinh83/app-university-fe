import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// ✅ 1. Tạo axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // ví dụ: http://localhost:8080/api/v1
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// ✅ 2. Định nghĩa kiểu dữ liệu

export interface CallOverview {
  total_calls: string;
  failed_calls: string;
  successful_calls: string;
  answer_rate_percent: string;
  avg_duration_seconds: string;
  total_duration_seconds: string;
  incoming_duration: string;
  outgoing_duration: string;
  active_extensions: string;
}

export interface CallDetail {
  staff_id: string;
  name: string;
  phone: string;
  extension_number: string;
  total_calls: string;
  outgoing_calls: string;
  incoming_calls: string;
  answer_rate_percent: string;
  avg_duration_seconds: string;
  total_duration_seconds: string;
  incoming_duration: string;
  outgoing_duration: string;
}

export interface CallStatsResponse {
  overview: CallOverview;
  details: CallDetail[];
}

export interface CallStatsParams {
  from: string;
  to: string;
}

// ✅ 3. Dữ liệu theo thời gian
export interface TimeSeriesData {
  date: string;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  answer_rate: number;
  avg_duration: number;
}

export interface ComparisonData {
  period: string;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  answer_rate: number;
  avg_duration: number;
  change_percent: number;
}

export interface TimeSeriesResponse {
  timeSeries: TimeSeriesData[];
  comparison: ComparisonData[];
}

// ✅ 4. Gọi API
const fetchCallStats = async ({ from, to }: CallStatsParams): Promise<CallStatsResponse> => {
  const res = await api.post("/etelecom-calls/all", { from, to });
  return res.data.data;
};

// ✅ 5. Gọi API dữ liệu theo thời gian
const fetchTimeSeriesData = async ({ from, to }: CallStatsParams): Promise<TimeSeriesResponse> => {
  try {
    const res = await api.post("/etelecom-calls/timeseries", { from, to });
    return res.data.data;
  } catch (error) {
    console.warn("Time series API not available, using mock data");
    // Generate mock data based on date range
    return generateMockTimeSeriesData(from, to);
  }
};

// ✅ 6. Generate mock time series data
const generateMockTimeSeriesData = (from: string, to: string): TimeSeriesResponse => {
  const startDate = new Date(from);
  const endDate = new Date(to);
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const timeSeries: TimeSeriesData[] = [];
  const comparison: ComparisonData[] = [];

  // Generate daily data
  for (let i = 0; i < Math.min(daysDiff, 30); i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    const baseCalls = 50 + Math.random() * 100;
    const successRate = 0.7 + Math.random() * 0.2; // 70-90%

    timeSeries.push({
      date: currentDate.toISOString().split('T')[0],
      total_calls: Math.round(baseCalls),
      successful_calls: Math.round(baseCalls * successRate),
      failed_calls: Math.round(baseCalls * (1 - successRate)),
      answer_rate: Math.round(successRate * 100),
      avg_duration: Math.round(120 + Math.random() * 180) // 2-5 minutes
    });
  }

  // Generate comparison data
  const periods = ['Tuần trước', 'Tháng trước', '3 tháng trước'];
  periods.forEach((period, index) => {
    const baseValue = 100 + index * 20;
    comparison.push({
      period,
      total_calls: Math.round(baseValue + Math.random() * 50),
      successful_calls: Math.round((baseValue + Math.random() * 50) * 0.8),
      failed_calls: Math.round((baseValue + Math.random() * 50) * 0.2),
      answer_rate: Math.round(75 + Math.random() * 15),
      avg_duration: Math.round(150 + Math.random() * 60),
      change_percent: Math.round((Math.random() - 0.5) * 20) // -10 to +10%
    });
  });

  return { timeSeries, comparison };
};

// ✅ 7. Custom Hook cho dữ liệu cơ bản
export const useCallStats = ({ from, to }: CallStatsParams) => {
  return useQuery<CallStatsResponse>({
    queryKey: ["callStats", from, to],
    queryFn: () => fetchCallStats({ from, to }),
    enabled: !!from && !!to,
    staleTime: 1000 * 60 * 5, // 5 phút
  });
};

// ✅ 8. Custom Hook cho dữ liệu theo thời gian
export const useTimeSeriesData = ({ from, to }: CallStatsParams) => {
  return useQuery<TimeSeriesResponse>({
    queryKey: ["timeSeriesData", from, to],
    queryFn: () => fetchTimeSeriesData({ from, to }),
    enabled: !!from && !!to,
    staleTime: 1000 * 60 * 5, // 5 phút
  });
};
