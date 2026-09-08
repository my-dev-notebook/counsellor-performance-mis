import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Poppins } from "next/font/google";
import Script from "next/script";
import { NavBar } from "@/components/NavBar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

const poppins = Poppins({
    variable: "--font-poppins",
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
    title: "Counsellor Performance — Advanced MIS",
    description: "Live counsellor performance dashboard by month, backed by the database.",
};

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html
            lang="en"
            data-component="RootLayout"
            data-theme="light"
            suppressHydrationWarning
            className={`${poppins.variable} h-full antialiased`}
        >
            <body className="flex min-h-full flex-col">
                <Script
                    id="theme-init"
                    strategy="beforeInteractive"
                    dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
                />
                <ThemeProvider>
                    <NavBar />
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
