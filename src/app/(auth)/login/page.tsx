import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
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
        <div data-component="LoginPage" className="contents">
            <AuthCard title="Sign in">
                <LoginForm next={next} />
            </AuthCard>
        </div>
    );
}
