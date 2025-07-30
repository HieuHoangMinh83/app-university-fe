"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const OPTIONS = [
    "Hôm nay",
    "Trong tuần",
    "Trong tháng",
    "Tháng trước",
    "7 ngày gần đây",
    "30 ngày gần đây",
    "Tuỳ chọn",
] as const;

type Option = typeof OPTIONS[number];

export default function DateRangeSelector({
    onChange,
}: {
    onChange?: (range: { from?: Date; to?: Date }) => void;
}) {
    const [selected, setSelected] = useState<Option>("Hôm nay");
    const [from, setFrom] = useState<Date | undefined>();
    const [to, setTo] = useState<Date | undefined>();
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const handleSelect = (option: Option) => {
        setSelected(option);
        setShowDatePicker(option === "Tuỳ chọn");

        const now = new Date();
        let start: Date | undefined;
        let end: Date | undefined = new Date();

        switch (option) {
            case "Hôm nay":
                start = new Date(now.toDateString());
                break;
            case "Trong tuần": {
                const day = now.getDay(); // CN = 0
                const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                start = new Date(now);
                start.setDate(diff);
                break;
            }
            case "Trong tháng":
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case "Tháng trước":
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case "7 ngày gần đây":
                start = new Date(now);
                start.setDate(start.getDate() - 6);
                break;
            case "30 ngày gần đây":
                start = new Date(now);
                start.setDate(start.getDate() - 29);
                break;
            case "Tuỳ chọn":
                start = from;
                end = to;
                break;
        }

        setFrom(start);
        setTo(end);

        if (onChange) {
            onChange({ from: start, to: end });
        }
    };

    const handleConfirmCustomRange = () => {
        if (onChange) {
            onChange({ from, to });
        }
        setShowDatePicker(false);
    };

    return (
        <div className="flex items-center gap-3">
            {showDatePicker && (
                <Popover open={showDatePicker}  >
                    <PopoverTrigger asChild>
                        <span></span>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 mt-5 ml-3" align="start">
                        <Calendar
                            mode="range"
                            selected={{ from, to }}
                            defaultMonth={from ?? new Date()}
                            onSelect={(range) => {
                                if (range?.from && range?.to) {
                                    range.from.setHours(0, 0, 0, 0);
                                    range.to.setHours(23, 59, 59, 999);
                                    setFrom(range.from);
                                    setTo(range.to);
                                } else {
                                    setFrom(range?.from);
                                    setTo(undefined);
                                }
                            }}
                            numberOfMonths={2}
                            initialFocus
                            modifiers={{
                                range_middle: from && to ? {
                                    from: new Date(from.getTime() + 86400000),
                                    to: new Date(to.getTime() - 86400000),
                                } : undefined,
                            }}
                            classNames={{
                                range_middle: "bg-green-100 text-green-900",
                                range_start: "bg-green-500 text-white",
                                range_end: "bg-green-500 text-white",
                            }}
                        />



                        <div className="flex justify-end px-4 py-2">
                            <Button size="sm" onClick={handleConfirmCustomRange}>
                                Xác nhận
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            )}

            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>

                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                        <span className="rounded-full w-2 h-2 bg-green-500"></span>
                        <span>
                            {from && to ? (
                                from.toDateString() === to.toDateString()
                                    ? from.toLocaleDateString("vi-VN")
                                    : `${from.toLocaleDateString("vi-VN")} - ${to.toLocaleDateString("vi-VN")}`
                            ) : selected}
                        </span>
                        <ChevronDown className="h-4 w-4" />
                    </Button>


                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 z-[1000] bg-white ">
                    {OPTIONS.map((option) => (
                        <DropdownMenuItem
                            key={option}
                            onSelect={(event) => {
                                event.preventDefault(); // ngăn dropdown auto đóng
                                if (option === "Tuỳ chọn") {
                                    setSelected(option);
                                    setShowDatePicker(true); // mở lịch
                                } else {
                                    handleSelect(option);
                                    setShowDatePicker(false); // ẩn lịch
                                    setDropdownOpen(false);   // đóng dropdown
                                }
                            }}
                        >
                            {option}
                        </DropdownMenuItem>

                    ))}

                </DropdownMenuContent>
            </DropdownMenu>

        </div>
    );
}
