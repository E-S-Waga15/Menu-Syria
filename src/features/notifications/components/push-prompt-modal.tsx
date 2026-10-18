"use client";

import { useEffect, useState } from "react";

import { BellRing } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHydratedSession } from "@/features/auth/use-hydrated-session";
import { enablePushNotifications } from "@/features/notifications/lib/push";
import { useI18n } from "@/i18n/client";
import { toast } from "@/lib/toast";

/** Once dismissed (or enabled, or failed) this device isn't asked again —
 * the notifications page's own banner stays as a standing, lower-friction
 * way to turn it on later. */
const DISMISSED_KEY = "menu-syria-push-prompt-dismissed";

/**
 * A one-time modal asking a signed-in visitor to turn on browser
 * notifications — mounted once, globally (`AppProviders`), so it reaches
 * every role's dashboard and the public storefront alike without each shell
 * wiring it in separately. Shows at most once per device: skipped entirely
 * if permission has already been decided (granted or denied — the browser
 * won't re-prompt either way) or if this device already dismissed it once.
 */
export function PushNotificationsPromptModal() {
  const { t } = useI18n();
  const { session, hydrated } = useHydratedSession();
  const [open, setOpen] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (!hydrated || !session) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // a short delay so this isn't the very first thing a visitor sees —
    // let the page they came for render first
    const timer = setTimeout(() => setOpen(true), 2500);
    return () => clearTimeout(timer);
  }, [hydrated, session]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setOpen(false);
  };

  const enable = async () => {
    setEnabling(true);
    try {
      const granted = await enablePushNotifications();
      localStorage.setItem(DISMISSED_KEY, "1");
      toast[granted ? "success" : "error"](
        granted ? t.notifications.pushEnabled : t.notifications.pushEnableFailed,
      );
    } finally {
      setEnabling(false);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BellRing className="size-5" />
          </div>
          <DialogTitle>{t.notifications.pushModalTitle}</DialogTitle>
          <DialogDescription>{t.notifications.pushModalBody}</DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={dismiss}>
            {t.notifications.pushModalDismiss}
          </Button>
          <Button className="flex-1" loading={enabling} onClick={() => void enable()}>
            {t.notifications.pushPromptAction}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
