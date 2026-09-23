import Link from "next/link";

/** Yearly / Monthly segmented switch shown in the dashboard page header. */
export function DashboardSwitch({ active }: { active: "monthly" | "yearly" }) {
    return (
        <div data-component="DashboardSwitch" className="segmented" role="tablist" aria-label="Dashboard period">
            <Link href="/yearly" role="tab" aria-selected={active === "yearly"}>
                Yearly
            </Link>
            <Link href="/" role="tab" aria-selected={active === "monthly"}>
                Monthly
            </Link>
        </div>
    );
}
