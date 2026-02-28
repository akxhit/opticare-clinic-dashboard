import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";

interface PermanentlyDeletePatientDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    patientName: string;
}

export function PermanentlyDeletePatientDialog({
    isOpen,
    onClose,
    onConfirm,
    patientName,
}: PermanentlyDeletePatientDialogProps) {
    const [confirmationText, setConfirmationText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirm = async () => {
        if (confirmationText !== "DELETE") return;

        setIsDeleting(true);
        try {
            await onConfirm();
            onClose();
        } finally {
            setIsDeleting(false);
            setConfirmationText("");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-destructive mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        <DialogTitle>Permanently Delete Patient?</DialogTitle>
                    </div>
                    <DialogDescription className="space-y-4 pt-2">
                        <p className="font-medium text-foreground">
                            Are you sure you want to delete <span className="font-bold underline">{patientName}</span>?
                        </p>
                        <p className="text-sm text-muted-foreground bg-destructive/5 p-3 rounded border border-destructive/20">
                            <span className="font-semibold text-destructive">Warning:</span> This action cannot be undone.
                            It will permanently erase this patient and <strong>ALL</strong> of their associated visits,
                            medical notes, and prescriptions from the database.
                        </p>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    <Label htmlFor="delete-confirm" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Type <span className="text-foreground font-mono">DELETE</span> to confirm
                    </Label>
                    <Input
                        id="delete-confirm"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        placeholder="DELETE"
                        className="border-destructive/30 focus-visible:ring-destructive"
                    />
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={confirmationText !== "DELETE" || isDeleting}
                        className="font-semibold"
                    >
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Deletion
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
