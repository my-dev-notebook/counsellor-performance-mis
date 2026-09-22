import { redirect } from "next/navigation";
import { LoginScene } from "@/components/auth/constellation/LoginScene";
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
            <LoginScene>
                <LoginForm next={next} />
            </LoginScene>
        </div>
    );
}
