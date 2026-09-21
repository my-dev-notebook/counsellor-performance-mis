"use client";

import { useRef, useState, type ReactNode } from "react";
import {
    FiAlertTriangle,
    FiBell,
    FiBellOff,
    FiCheck,
    FiCheckCircle,
    FiRefreshCw,
    FiTrendingUp,
    FiUserPlus,
    FiXCircle,
} from "react-icons/fi";
import { Popover } from "@/components/Popover";
import { Tooltip } from "@/components/Tooltip";

type Tone = "good" | "warn" | "bad" | "info" | "neutral";
type Tab = "unread" | "cleared";

interface Notification {
    id: string;
    tone: Tone;
    icon: ReactNode;
    title: string;
    detail: string;
    when: string;
    /** "Today" / "Earlier" — the panel groups by this, in first-seen order. */
    group: string;
    cleared: boolean;
}

/**
 * Placeholder feed until notifications are stored server-side. The shapes match the design system's
 * notification panel: import results, discrepancies, audit flags, account and integration events.
 */
const PLACEHOLDER: Notification[] = [
    {
        id: "import-sep",
        tone: "good",
        icon: <FiCheckCircle aria-hidden />,
        title: "September import finished",
        detail: "31 entries created, 14 updated. 3 rows were skipped.",
        when: "2 min",
        group: "Today",
        cleared: false,
    },
    {
        id: "discrepancies",
        tone: "warn",
        icon: <FiAlertTriangle aria-hidden />,
        title: "3 discrepancies need review",
        detail: "Stored totals differ from daily admissions for Karan Mehta, Neha Gupta and Vikram Singh.",
        when: "1 h",
        group: "Today",
        cleared: false,
    },
    {
        id: "audit-low",
        tone: "bad",
        icon: <FiXCircle aria-hidden />,
        title: "Vikram Singh scored 44% on an audit",
        detail: "Below the 60% threshold. Coaching flag raised for Charlie.",
        when: "3 h",
        group: "Today",
        cleared: false,
    },
    {
        id: "joined",
        tone: "info",
        icon: <FiUserPlus aria-hidden />,
        title: "Tanvi Desai joined Bravo",
        detail: "Account created from the import. Set-password email sent.",
        when: "Yesterday",
        group: "Earlier",
        cleared: true,
    },
    {
        id: "alpha-97",
        tone: "good",
        icon: <FiTrendingUp aria-hidden />,
        title: "Alpha reached 97% for September",
        detail: "Best team this month. Priya Sharma leads at 115%.",
        when: "Yesterday",
        group: "Earlier",
        cleared: true,
    },
    {
        id: "token",
        tone: "neutral",
        icon: <FiRefreshCw aria-hidden />,
        title: "Meritto token refreshed",
        detail: "Next refresh due 3 Oct.",
        when: "2 d",
        group: "Earlier",
        cleared: true,
    },
];

/** Items in their existing order, bucketed by group label. */
function groupBy(items: Notification[]): [string, Notification[]][] {
    const groups = new Map<string, Notification[]>();
    for (const item of items) {
        const bucket = groups.get(item.group);
        if (bucket) bucket.push(item);
        else groups.set(item.group, [item]);
    }
    return [...groups.entries()];
}

/**
 * Bell in the app header with the unread count; opens the notification panel. Two tabs: Unread (clicking
 * an item clears it) and Cleared. State is local for now — placeholder data, nothing is persisted.
 */
export function NotificationsMenu() {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<Tab>("unread");
    const [items, setItems] = useState(PLACEHOLDER);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const unread = items.filter((n) => !n.cleared);
    const shown = tab === "unread" ? unread : items.filter((n) => n.cleared);
    const badge = unread.length > 99 ? "99+" : String(unread.length);

    const clear = (id: string) => {
        setItems((all) => all.map((n) => (n.id === id ? { ...n, cleared: true } : n)));
    };
    const clearAll = () => {
        setItems((all) => all.map((n) => ({ ...n, cleared: true })));
    };

    return (
        <div data-component="NotificationsMenu" className="contents">
            <Tooltip content="Notifications">
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => {
                        setOpen((v) => !v);
                    }}
                    aria-label={
                        unread.length === 0 ? "Notifications" : `Notifications, ${String(unread.length)} unread`
                    }
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    className="btn btn-ghost btn-icon bell"
                >
                    <FiBell aria-hidden />
                    {unread.length > 0 && (
                        <span className="dot" aria-hidden>
                            {badge}
                        </span>
                    )}
                </button>
            </Tooltip>
            <Popover
                anchorRef={buttonRef}
                open={open}
                onClose={() => {
                    setOpen(false);
                }}
                align="end"
                maxHeight={560}
                className="p-0"
            >
                <div className="notif-panel">
                    <div className="notif-head">
                        <h3>Notifications</h3>
                        <div className="segmented" role="tablist" aria-label="Notification filter">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={tab === "unread"}
                                onClick={() => {
                                    setTab("unread");
                                }}
                            >
                                Unread
                                {unread.length > 0 && <span className="ink-3 ml-1">{unread.length}</span>}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={tab === "cleared"}
                                onClick={() => {
                                    setTab("cleared");
                                }}
                            >
                                Cleared
                            </button>
                        </div>
                    </div>
                    {shown.length === 0 ? (
                        <div className="empty">
                            <span className="icon">
                                <FiBellOff aria-hidden />
                            </span>
                            <span className="title">
                                {tab === "unread" ? "You’re all caught up" : "Nothing cleared yet"}
                            </span>
                            <p>
                                {tab === "unread"
                                    ? "Imports, discrepancies and audit flags will show up here."
                                    : "Notifications you clear move here."}
                            </p>
                        </div>
                    ) : (
                        groupBy(shown).map(([group, list]) => (
                            <div key={group}>
                                <div className="notif-group">{group}</div>
                                {list.map((n) => (
                                    <button
                                        key={n.id}
                                        type="button"
                                        onClick={
                                            n.cleared
                                                ? undefined
                                                : () => {
                                                      clear(n.id);
                                                  }
                                        }
                                        title={n.cleared ? undefined : "Clear"}
                                        className={`notif ${n.cleared ? "cleared" : "unread"}`}
                                    >
                                        <span className={`ic ${n.tone}`}>{n.icon}</span>
                                        <span>
                                            <span className="t block">{n.title}</span>
                                            <span className="d block">{n.detail}</span>
                                        </span>
                                        <span className="when">{n.when}</span>
                                    </button>
                                ))}
                            </div>
                        ))
                    )}
                    {tab === "unread" && unread.length > 0 && (
                        <div className="notif-foot">
                            <button type="button" onClick={clearAll} className="btn btn-link btn-sm">
                                <FiCheck aria-hidden />
                                Clear all
                            </button>
                        </div>
                    )}
                </div>
            </Popover>
        </div>
    );
}
