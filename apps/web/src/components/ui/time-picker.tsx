"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/lib/cn";

interface TimePickerProps {
  value?: string; // HH:MM
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 - 20:00
const MINUTES = [0, 15, 30, 45];

export function TimePicker({
  value,
  onChange,
  placeholder = "Pilih jam",
  disabled,
  required,
  id: inputId,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Scroll to selected time when opened
  React.useEffect(() => {
    if (open && value && scrollRef.current) {
      const selected = scrollRef.current.querySelector("[data-selected=true]");
      if (selected) {
        selected.scrollIntoView({ block: "center", behavior: "instant" });
      }
    }
  }, [open, value]);

  function handleSelect(hour: number, minute: number) {
    const hh = String(hour).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");
    onChange(`${hh}:${mm}`);
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
          <Clock className="size-[18px] shrink-0 text-[#64748B]" />
          <span className="flex-1 text-left">{value || placeholder}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className={cn(
            "z-50 w-[280px] rounded-[14px] border border-[#E2E8F0] bg-white p-3",
            "shadow-[0_12px_24px_rgba(15,23,42,0.12)]",
            "animate-in fade-in-0 zoom-in-[0.98] slide-in-from-top-1",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98]",
          )}
        >
          <div
            ref={scrollRef}
            className="max-h-[280px] overflow-y-auto rounded-[10px]"
          >
            <div className="grid grid-cols-4 gap-1.5 p-0.5">
              {HOURS.map((hour) =>
                MINUTES.map((minute) => {
                  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
                  const isSelected = value === timeStr;
                  return (
                    <button
                      key={timeStr}
                      type="button"
                      data-selected={isSelected}
                      onClick={() => handleSelect(hour, minute)}
                      className={cn(
                        "rounded-[8px] px-2 py-2.5 text-[13px] font-medium transition-all duration-[180ms] cursor-pointer",
                        isSelected
                          ? "bg-[#2563EB] text-white shadow-sm"
                          : "text-[#0F172A] hover:bg-[#F1F5F9]",
                      )}
                    >
                      {timeStr}
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
