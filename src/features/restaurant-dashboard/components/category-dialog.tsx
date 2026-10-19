"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/shared/field-error";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  categoryFormSchema,
  type CategoryFormValues,
} from "@/features/restaurant-dashboard/schemas";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { uploadImageWithProgress } from "@/lib/api/upload";
import { toast } from "@/lib/toast";
import type { MenuCategory } from "@/lib/types";

/**
 * Add/edit panel for a single category — name plus an optional photo, both
 * saved together in one submit. Reached from the categories page's "add"
 * button and from each card's own edit action.
 */
export function CategoryDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: MenuCategory | null;
  onSave: (values: {
    name: string;
    imageUrl?: string;
  }) => Promise<void> | void;
}) {
  const { t, lang } = useI18n();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema(t.validation)),
    defaultValues: { name: "" },
    mode: "onTouched",
  });

  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);

  // Re-seed whenever a different category (or a fresh "add") is opened,
  // during render rather than an effect.
  const [seededFor, setSeededFor] = useState<{
    editing: MenuCategory | null;
    open: boolean;
  } | null>(null);
  if (seededFor?.editing !== editing || seededFor?.open !== open) {
    setSeededFor({ editing, open });
    reset({ name: editing?.name[lang] ?? "" });
    setImageUrl(editing?.imageUrl);
  }

  const pickImage = (file: File | null) => {
    if (!file) return;
    setUploading(true);
    uploadImageWithProgress(file, "categories")
      .then(({ url }) => setImageUrl(url))
      .catch((error: unknown) => {
        toast.error(
          error instanceof ApiError ? error.message : t.common.saveFailed,
        );
      })
      .finally(() => setUploading(false));
  };

  const submit = async (values: CategoryFormValues) => {
    if (uploading) {
      toast.error(t.dashboard.imageStillUploading);
      return;
    }
    await onSave({ name: values.name, imageUrl });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {editing ? t.common.edit : t.dashboard.addCategory}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} noValidate>
          <div className="space-y-4 px-4 pb-2">
            <div className="space-y-1.5">
              <Label htmlFor="category-name">{t.dashboard.categoryName}</Label>
              <Input
                id="category-name"
                autoFocus
                placeholder={t.dashboard.categoryName}
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              <FieldError message={errors.name?.message} />
            </div>

            <div className="space-y-1.5">
              <Label>
                {t.dashboard.categoryImage}
                <span className="ms-1 text-muted-foreground">
                  ({t.common.optional})
                </span>
              </Label>
              <div className="relative">
                <FileDropzone
                  // remounts whenever the picked image actually changes —
                  // FileDropzone only ever reads `previewUrl` once, on mount
                  key={`${editing?.id ?? "new"}-${imageUrl ?? "none"}`}
                  label={t.dashboard.categoryImage}
                  previewUrl={imageUrl}
                  onFile={pickImage}
                />
                {uploading && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/70">
                    <LoadingSpinner className="min-h-0" />
                  </span>
                )}
                {imageUrl && !uploading && (
                  <button
                    type="button"
                    aria-label={t.dashboard.removeImage}
                    onClick={() => setImageUrl(undefined)}
                    className="absolute top-2 end-2 flex size-7 items-center justify-center rounded-full bg-card text-muted-foreground ring-2 ring-background hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="px-4 pb-4">
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={uploading}
              className="w-full shadow-glow"
            >
              {uploading ? t.dashboard.imageStillUploading : t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
