import type { ReactNode } from "react";

/**
 * Stat tile (`.kpi`): label row with an optional trailing icon, the value, and an optional foot line for
 * captions, deltas or a sparkline.
 */
export function Kpi({
    label,
    value,
    foot,
    icon,
    hero = false,
    small = false,
    className = "",
}: {
    label: ReactNode;
    value: ReactNode;
    foot?: ReactNode;
    icon?: ReactNode;
    /** Larger value for the one headline number on a page. */
    hero?: boolean;
    /** Smaller value for dense tiles (e.g. band counts). */
    small?: boolean;
    className?: string;
}) {
    return (
        <div data-component="Kpi" className={`kpi ${hero ? "kpi-hero" : ""} ${className}`}>
            <div className="kpi-label">
                <span>{label}</span>
                {icon}
            </div>
            <div className={`kpi-value t-num ${small ? "sm" : ""}`}>{value}</div>
            {foot !== undefined && <div className="kpi-foot">{foot}</div>}
        </div>
    );
}
