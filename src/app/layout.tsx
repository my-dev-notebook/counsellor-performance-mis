import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, Poppins } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

// Self-hosted through next/font; the design tokens (`--font-ui`, `--font-mono`) read these variables.
const poppins = Poppins({
    variable: "--font-poppins",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
    variable: "--font-jetbrains-mono",
    subsets: ["latin"],
    weight: ["400", "500"],
});

export const metadata: Metadata = {
    title: "Counsellor Performance — Advanced MIS",
    description: "Live counsellor performance dashboard by month, backed by the database.",
};

/**
 * Applies stored UI choices before first paint: the theme (with nothing stored, `<html>` carries no `data-theme` and
 * the tokens follow `prefers-color-scheme`) and whether the sidebar was collapsed (see `AppShell`).
 */
const UI_INIT_SCRIPT = `(function(){try{var d=document.documentElement,t=localStorage.getItem("theme");if(t==="dark"||t==="light")d.setAttribute("data-theme",t);if(localStorage.getItem("sidebar")==="collapsed")d.setAttribute("data-sidebar","collapsed")}catch(e){}})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html
            lang="en"
            data-component="RootLayout"
            suppressHydrationWarning
            className={`${poppins.variable} ${jetbrainsMono.variable} h-full antialiased`}
        >
            <body className="flex min-h-full flex-col">
                <Script
                    id="ui-init"
                    strategy="beforeInteractive"
                    dangerouslySetInnerHTML={{ __html: UI_INIT_SCRIPT }}
                />
                <ThemeProvider>{children}</ThemeProvider>
            </body>
        </html>
    );
}
