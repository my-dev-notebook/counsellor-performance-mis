import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { requireUser } from "@/lib/auth/session";

export default async function ChangePasswordPage() {
    const user = await requireUser({ allowPasswordChange: true });

    return (
        <main
            data-component="ChangePasswordPage"
            className="flex flex-1 items-center justify-center bg-background px-4 py-12"
        >
            <div className="w-full max-w-sm space-y-6">
                <div className="text-center">
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">
                        {user.mustChangePassword ? "Set a new password" : "Change password"}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {user.mustChangePassword
                            ? "You are signed in with the default password. Choose your own before continuing."
                            : `Signed in as ${user.email}.`}
                    </p>
                </div>
                <ChangePasswordForm forced={user.mustChangePassword} />
            </div>
        </main>
    );
}
