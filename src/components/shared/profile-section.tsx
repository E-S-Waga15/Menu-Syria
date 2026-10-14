"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { Pencil } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PendingChangesBar } from "@/components/shared/pending-changes-bar";
import type { useI18n } from "@/i18n/client";

/**
 * Tracks which `ProfileSection` cards on a page currently have unsaved
 * edits in progress, by a stable id each one registers itself under. A Set
 * rather than one shared boolean because more than one card can be mid-edit
 * at once; a page can read the combined "is anything dirty" state from this
 * instead of each section having to know about tabs or navigation itself.
 * Optional — a `ProfileSection` with no provider above it (a page that only
 * has the one card) just skips the cross-section tracking.
 */
const EditingGuardContext = createContext<{
  registerEditing: (id: string, editing: boolean) => void;
} | null>(null);

export { EditingGuardContext };

export function useRegisterEditing(id: string, editing: boolean) {
  const ctx = useContext(EditingGuardContext);
  useEffect(() => {
    ctx?.registerEditing(id, editing);
    return () => ctx?.registerEditing(id, false);
  }, [ctx, id, editing]);
}

/**
 * Card wrapper shared by every editable profile section (business settings,
 * agent profile): a title, an "Edit" trigger while at rest, and — once the
 * section is being edited — a floating save/discard bar (the same fixed
 * pill the storefront cart uses) instead of a quiet dropdown item, because
 * an edit here changes what's shown elsewhere the moment it's saved. Both
 * Save and Discard go through their own confirm dialog first.
 */
export function ProfileSection({
  title,
  icon: Icon,
  editing,
  onEdit,
  onSave,
  onCancel,
  editable = true,
  children,
  t,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  editing: boolean;
  onEdit: () => void;
  onSave: () => Promise<void> | void;
  onCancel: () => void;
  editable?: boolean;
  children: ReactNode;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const [confirmAction, setConfirmAction] = useState<"save" | "discard" | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  useRegisterEditing(title, editable && editing);

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
          <Icon className="size-5 text-primary" />
          {title}
        </h2>
        {editable && !editing && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t.common.edit}
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>
      <div className="mt-5">{children}</div>

      {editable && editing && (
        <PendingChangesBar
          message={t.dashboard.unsavedChanges}
          saveLabel={t.dashboard.saveChanges}
          discardLabel={t.dashboard.discardChanges}
          onSave={() => setConfirmAction("save")}
          onDiscard={() => setConfirmAction("discard")}
        />
      )}

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "save"
                ? t.dashboard.confirmSaveChangesTitle
                : t.dashboard.confirmDiscardChangesTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "save"
                ? t.dashboard.confirmSaveChangesBody
                : t.dashboard.confirmDiscardChangesBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmAction(null)}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={confirmAction === "discard" ? "destructive" : "default"}
              loading={confirmAction === "save" && isSaving}
              onClick={async () => {
                if (confirmAction === "save") {
                  setIsSaving(true);
                  try {
                    await onSave();
                  } catch {
                    // the mutation's own onError already toasted — stay in
                    // editing mode with the confirm dialog closed so the
                    // owner can fix and retry from the section itself
                    setIsSaving(false);
                    setConfirmAction(null);
                    return;
                  }
                  setIsSaving(false);
                } else {
                  onCancel();
                }
                setConfirmAction(null);
              }}
            >
              {confirmAction === "save"
                ? t.common.save
                : t.dashboard.discardChanges}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
