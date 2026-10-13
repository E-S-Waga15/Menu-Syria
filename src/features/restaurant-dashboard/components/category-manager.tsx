"use client";

import { useState } from "react";

import { ArrowDown, ArrowUp, Plus, Settings2, Trash2 } from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/client";
import type { MenuCategory } from "@/lib/types";

/**
 * Category CRUD for the dashboard's catalog manager — create, rename,
 * reorder, and delete (blocked while the category still holds items, so
 * nothing disappears silently).
 *
 * Reordering is staged locally: the arrows only move rows on screen, and the
 * owner has to confirm before anything is written — so a slipped click on a
 * live menu can never change what customers see.
 */
export function CategoryManager({
  labelled = false,
  categories,
  itemCountFor,
  onAdd,
  onRename,
  onDelete,
  onReorderCommit,
}: {
  /** show the action as a full labelled button (beside a section heading)
   * rather than the icon-only trigger used inside a crowded toolbar */
  labelled?: boolean;
  categories: MenuCategory[];
  itemCountFor: (categoryId: string) => number;
  onAdd: (name: string) => Promise<unknown> | void;
  onRename: (id: string, name: string) => Promise<unknown> | void;
  onDelete: (id: string) => Promise<unknown> | void;
  onReorderCommit: (orderedIds: string[]) => Promise<unknown> | void;
}) {
  const { t, lang } = useI18n();
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [stagedOrder, setStagedOrder] = useState<string[] | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"save" | "discard" | null>(
    null,
  );

  const savedOrder = [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => c.id);
  const order = stagedOrder ?? savedOrder;
  const sorted = order
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is MenuCategory => c !== undefined);
  const isDirty =
    stagedOrder !== null &&
    stagedOrder.some((id, index) => id !== savedOrder[index]);

  const moveLocal = (id: string, direction: "up" | "down") => {
    const index = order.indexOf(id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= order.length) return;
    const next = [...order];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    setStagedOrder(next);
  };

  const submitAdd = async () => {
    const name = newName.trim();
    if (!name || isAdding) return;
    setIsAdding(true);
    try {
      await onAdd(name);
      setNewName("");
    } catch {
      // onError already toasted — keep the typed name so it can be retried
    } finally {
      setIsAdding(false);
    }
  };

  const startRename = (category: MenuCategory) => {
    setRenamingId(category.id);
    setRenameValue(category.name[lang]);
  };

  const submitRename = async () => {
    const name = renameValue.trim();
    if (!renamingId || !name || isRenaming) {
      if (!name) setRenamingId(null);
      return;
    }
    setIsRenaming(true);
    try {
      await onRename(renamingId, name);
      setRenamingId(null);
    } catch {
      // onError already toasted — keep the field open to fix and retry
    } finally {
      setIsRenaming(false);
    }
  };

  const confirmDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } catch {
      // onError already toasted
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size={labelled ? "default" : "icon"}
            aria-label={t.dashboard.manageCategories}
          />
        }
      >
        <Settings2 className="size-4" />
        {labelled && t.dashboard.manageCategories}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.dashboard.manageCategories}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 px-4">
          {sorted.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t.dashboard.noCategories}
            </p>
          )}
          {sorted.map((category, index) => {
            const count = itemCountFor(category.id);
            return (
              <div
                key={category.id}
                className="flex items-center gap-1.5 rounded-xl border border-border/60 p-2"
              >
                {renamingId === category.id ? (
                  <Input
                    autoFocus
                    disabled={isRenaming}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitRename()}
                    onBlur={submitRename}
                    className="h-8 flex-1"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startRename(category)}
                    className="flex-1 truncate rounded-lg px-2 py-1 text-start text-sm font-semibold hover:bg-accent"
                  >
                    {category.name[lang]}
                  </button>
                )}

                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === 0}
                  aria-label={t.dashboard.moveUp}
                  onClick={() => moveLocal(category.id, "up")}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === sorted.length - 1}
                  aria-label={t.dashboard.moveDown}
                  onClick={() => moveLocal(category.id, "down")}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={count > 0 || deletingId === category.id}
                  loading={deletingId === category.id}
                  title={
                    count > 0 ? t.dashboard.cannotDeleteCategory : undefined
                  }
                  aria-label={t.common.delete}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => confirmDelete(category.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            );
          })}
        </div>

        {isDirty && (
          <div className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground">
              {t.dashboard.unsavedOrderChanges}
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmAction("discard")}
              >
                {t.dashboard.discardOrder}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setConfirmAction("save")}
              >
                {t.dashboard.saveOrder}
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 px-4 pb-4">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitAdd()}
            placeholder={t.dashboard.categoryName}
            className="h-10 flex-1"
          />
          <Button
            type="button"
            size="icon"
            loading={isAdding}
            aria-label={t.dashboard.addCategory}
            onClick={submitAdd}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </DialogContent>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "save"
                ? t.dashboard.confirmSaveOrderTitle
                : t.dashboard.confirmDiscardOrderTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "save"
                ? t.dashboard.confirmSaveOrderBody
                : t.dashboard.confirmDiscardOrderBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmAction(null)}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={confirmAction === "discard" ? "destructive" : "default"}
              loading={confirmAction === "save" && isSavingOrder}
              onClick={async () => {
                if (confirmAction === "save" && stagedOrder) {
                  setIsSavingOrder(true);
                  try {
                    await onReorderCommit(stagedOrder);
                  } catch {
                    // onError already toasted — keep the staged order and
                    // the confirm dialog so the owner can retry
                    setIsSavingOrder(false);
                    return;
                  }
                  setIsSavingOrder(false);
                }
                setStagedOrder(null);
                setConfirmAction(null);
              }}
            >
              {confirmAction === "save" ? t.common.save : t.dashboard.discardOrder}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
