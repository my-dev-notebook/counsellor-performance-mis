import Link from "next/link";

/** Monthly / Yearly segmented switch shown in the dashboard page header. */
export function DashboardSwitch({ active }: { active: "monthly" | "yearly" }) {
    return (
        <div data-component="DashboardSwitch" className="segmented" role="tablist" aria-label="Dashboard period">
            <Link href="/" role="tab" aria-selected={active === "monthly"}>
                Monthly
            </Link>
            <Link href="/yearly" role="tab" aria-selected={active === "yearly"}>
                Yearly
            </Link>
        </div>
    );
}
