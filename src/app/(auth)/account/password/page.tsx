import { AuthCard } from "@/components/auth/AuthCard";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { requireUser } from "@/lib/auth/session";

export default async function ChangePasswordPage() {
    const user = await requireUser({ allowPasswordChange: true });

    return (
        <div data-component="ChangePasswordPage" className="contents">
            <AuthCard
                title={user.mustChangePassword ? "Set a new password" : "Change password"}
                sub={
                    user.mustChangePassword
                        ? "You are signed in with the default password. Choose your own before continuing."
                        : `Signed in as ${user.email}.`
                }
            >
                <ChangePasswordForm forced={user.mustChangePassword} />
            </AuthCard>
        </div>
    );
}
