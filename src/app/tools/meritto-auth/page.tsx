import { MerittoAuth } from "@/components/tools/MerittoAuth";

export default function MerittoAuthPage() {
    return (
        <div
            data-component="MerittoAuthPage"
            className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8"
        >
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Meritto Auth</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Paste a curl captured from the Meritto application manager to connect this app to your Meritto
                    session.
                </p>
            </div>
            <MerittoAuth />
        </div>
    );
}
