"use client";

import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/lib/cn";

interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal",
  disabled,
  required,
  id: inputId,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = value ? new Date(value + "T00:00:00") : undefined;

  function handleSelect(date: Date | undefined) {
    if (date) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      onChange(`${yyyy}-${mm}-${dd}`);
    }
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          id={inputId}
          type="button"
          disabled={disabled}
          aria-required={required}
          className={cn(
            "inline-flex h-[42px] w-full items-center gap-2.5 rounded-[10px] border bg-white px-3.5 text-[14px] font-normal transition-all duration-[180ms]",
            "border-[#E2E8F0] hover:border-[#CBD5E1]",
            "focus:border-[#2563EB] focus:outline-none focus:ring-[4px] focus:ring-[rgba(37,99,235,0.12)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-[#94A3B8]",
            value && "text-[#0F172A]",
          )}
        >
          <CalendarDays className="size-[18px] shrink-0 text-[#64748B]" />
          <span className="flex-1 text-left">
            {selectedDate
              ? format(selectedDate, "dd MMMM yyyy", { locale: id })
              : placeholder}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className={cn(
            "z-50 rounded-[14px] border border-[#E2E8F0] bg-white p-4",
            "shadow-[0_12px_24px_rgba(15,23,42,0.12)]",
            "animate-in fade-in-0 zoom-in-[0.98] slide-in-from-top-1",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98]",
          )}
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            locale={id}
            showOutsideDays
            classNames={{
              months: "flex flex-col gap-4",
              month: "space-y-4",
              month_caption: "flex justify-center relative items-center h-9 text-[14px] font-semibold text-[#0F172A]",
              nav: "flex items-center absolute inset-x-0 justify-between",
              button_previous: cn(
                "size-8 inline-flex items-center justify-center rounded-[10px]",
                "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]",
                "transition-colors duration-[180ms]",
              ),
              button_next: cn(
                "size-8 inline-flex items-center justify-center rounded-[10px]",
                "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]",
                "transition-colors duration-[180ms]",
              ),
              month_grid: "w-full border-collapse",
              weekdays: "flex mb-1",
              weekday: "w-10 text-center text-[12px] font-medium text-[#64748B]",
              week: "flex w-full",
              day: "h-10 w-10 text-center text-[13px] p-0 relative",
              day_button: cn(
                "h-9 w-9 mx-auto p-0 font-normal rounded-[10px]",
                "inline-flex items-center justify-center",
                "hover:bg-[#F1F5F9] focus:bg-[#F1F5F9]",
                "transition-colors duration-[180ms] cursor-pointer",
              ),
              selected: cn(
                "bg-[#2563EB] text-white font-medium rounded-[10px]",
                "hover:bg-[#1D4ED8]",
              ),
              today: "bg-[#EFF6FF] text-[#2563EB] font-semibold rounded-[10px]",
              outside: "text-[#CBD5E1]",
              disabled: "text-[#CBD5E1] cursor-not-allowed",
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
