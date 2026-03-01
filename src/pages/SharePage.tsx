import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

/**
 * SharePage handles redirection for WhatsApp shared PDFs.
 * It takes a 'f' (file path) parameter and redirects to the Supabase Public URL
 * with a forced download parameter.
 */
export default function SharePage() {
    const [searchParams] = useSearchParams();
    const filePath = searchParams.get("f");

    useEffect(() => {
        if (filePath) {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            // Reconstruct the direct public download link
            const directUrl = `${supabaseUrl}/storage/v1/object/public/prescriptions/${filePath}?download=`;

            // Redirect immediately
            window.location.href = directUrl;
        }
    }, [filePath]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary mb-4">
                <span className="text-2xl text-primary-foreground">👁</span>
            </div>
            <h1 className="text-xl font-semibold mb-2">OptiCare Clinic</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p>Preparing your prescription for download...</p>
            </div>
            {!filePath && (
                <p className="mt-4 text-destructive">Invalid or missing prescription link.</p>
            )}
        </div>
    );
}
