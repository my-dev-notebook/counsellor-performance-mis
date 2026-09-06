import type { ReactNode } from "react";
import { ReportsSidebar } from "@/components/reports/ReportsSidebar";

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return (
    <div data-component="ReportsLayout" className="flex min-h-full flex-1 bg-zinc-50">
      <ReportsSidebar />
      <div className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
