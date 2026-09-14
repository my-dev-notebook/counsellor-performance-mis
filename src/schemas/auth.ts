import { z } from "zod";

export const LoginInput = z.object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const PASSWORD_MIN_LENGTH = 8;

export const ChangePasswordInput = z
    .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(PASSWORD_MIN_LENGTH),
        confirmPassword: z.string(),
    })
    .refine((v) => v.newPassword === v.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });
export type ChangePasswordInput = z.infer<typeof ChangePasswordInput>;
