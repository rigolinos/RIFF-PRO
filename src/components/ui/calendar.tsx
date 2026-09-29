// @ts-nocheck
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 pointer-events-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-base font-semibold text-gray-900 dark:text-white",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-gray-600 dark:text-gray-400 rounded-md w-10 font-semibold text-sm",
        row: "flex w-full mt-2",
        cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-brand dark:[&:has([aria-selected].day-outside)]:bg-brand [&:has([aria-selected])]:bg-brand dark:[&:has([aria-selected])]:bg-brand first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-10 w-10 p-0 font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 aria-selected:opacity-100"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-brand text-white hover:bg-brand hover:text-white focus:bg-brand focus:text-white font-bold shadow-md",
        day_today: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100 font-bold border-2 border-yellow-500 dark:border-yellow-400",
        day_outside:
          "day-outside text-gray-400 dark:text-gray-600 opacity-50 aria-selected:bg-brand dark:aria-selected:bg-brand aria-selected:text-gray-400 dark:aria-selected:text-gray-500 aria-selected:opacity-50",
        day_disabled: "text-gray-300 dark:text-gray-700 opacity-50 cursor-not-allowed",
        day_range_middle: "aria-selected:bg-brand dark:aria-selected:bg-brand aria-selected:text-gray-900 dark:aria-selected:text-white",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
