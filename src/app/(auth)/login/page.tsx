import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const user = await getCurrentUser();
    if (user) redirect("/");
    const params = await searchParams;
    const next = typeof params.next === "string" ? params.next : "/";

    return (
        <main data-component="LoginPage" className="flex flex-1 items-center justify-center bg-background px-4 py-12">
            <div className="w-full max-w-sm space-y-6">
                <div className="text-center">
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">Counsellor Performance MIS</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Sign in with your Bennett email.</p>
                </div>
                <LoginForm next={next} />
            </div>
        </main>
    );
}
