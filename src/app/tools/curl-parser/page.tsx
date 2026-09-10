import { CurlParser } from "@/components/tools/CurlParser";

export default function CurlParserPage() {
    return (
        <div
            data-component="CurlParserPage"
            className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8"
        >
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Curl Parser</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Paste a curl command to break it down into its method, URL, query params, headers, cookies, and
                    body.
                </p>
            </div>
            <CurlParser />
        </div>
    );
}
