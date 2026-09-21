"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { FiKey, FiLogOut } from "react-icons/fi";
import { Popover } from "@/components/Popover";
import type { SidebarUser } from "@/components/Sidebar";
import { initials } from "@/components/shell/nav";
import { logoutAction } from "@/app/(auth)/actions";
import { roleLabel } from "@/lib/auth/permissions";

/** The avatar button in the app header; opens a menu with the signed-in user's name, role, password link and sign-out. */
export function UserMenu({ user }: { user: SidebarUser }) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const role = roleLabel(user.roleName);
    const close = () => {
        setOpen(false);
    };

    return (
        <div data-component="UserMenu" className="contents">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => {
                    setOpen((v) => !v);
                }}
                aria-label={`Account menu for ${user.name}`}
                aria-haspopup="menu"
                aria-expanded={open}
                className="btn btn-ghost btn-icon rounded-full"
            >
                <span className="avatar" aria-hidden>
                    {initials(user.name)}
                </span>
            </button>
            <Popover anchorRef={buttonRef} open={open} onClose={close} align="end">
                <div role="menu" className="menu w-56">
                    <div className="user-row">
                        <span className="avatar" aria-hidden>
                            {initials(user.name)}
                        </span>
                        <div className="who">
                            <div className="n">{user.name}</div>
                            <div className="r">{user.teamName ? `${role} · ${user.teamName}` : role}</div>
                        </div>
                    </div>
                    <hr className="menu-sep" />
                    <Link href="/account/password" role="menuitem" className="menu-item" onClick={close}>
                        <FiKey aria-hidden />
                        Change password
                    </Link>
                    <form action={logoutAction}>
                        <button type="submit" role="menuitem" className="menu-item">
                            <FiLogOut aria-hidden />
                            Sign out
                        </button>
                    </form>
                </div>
            </Popover>
        </div>
    );
}
