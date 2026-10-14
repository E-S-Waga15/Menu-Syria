"use client";

import { useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Download, FileText } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useAuthStore } from "@/features/auth/store";
import { getMyRestaurant } from "@/features/restaurant-dashboard/services";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import { qrFileName } from "@/lib/qr-filename";
import { toast } from "@/lib/toast";

export function QrPanel() {
  const { t, lang } = useI18n();
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const isStore = useAuthStore((s) => s.session?.businessType) === "store";

  const { data: restaurant } = useQuery({
    queryKey: queryKeys.me.business,
    queryFn: getMyRestaurant,
  });

  if (!restaurant) return <LoadingSpinner />;

  const menuUrl = `${window.location.origin}/${restaurant.slug}/menu`;
  const kindWord = isStore ? t.common.storeWord : t.common.restaurantWord;

  const copyLink = async () => {
    await navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    toast.success(t.common.copied);
    setTimeout(() => setCopied(false), 1500);
  };

  const getCanvas = () =>
    qrWrapRef.current?.querySelector("canvas") as HTMLCanvasElement | null;

  const downloadPng = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = qrFileName([kindWord, restaurant.name[lang], "qr"]);
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const downloadPdf = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html dir="${lang === "ar" ? "rtl" : "ltr"}">
        <head><title>${kindWord} ${restaurant.name[lang]} — QR</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;gap:16px">
          <h1 style="margin:0">${restaurant.name[lang]}</h1>
          <img src="${dataUrl}" width="360" height="360" />
          <p style="color:#666">${menuUrl}</p>
          <script>window.onload = () => setTimeout(() => window.print(), 300)</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      {/* QR generator */}
      <section className="rounded-2xl border border-border/60 bg-card p-6 md:p-8">
        <h2 className="font-heading text-lg font-bold">
          {t.dashboard.qrTitle}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t.dashboard.qrBody}
        </p>

        <div className="mt-6 flex flex-col items-center gap-6">
          <div
            ref={qrWrapRef}
            className="rounded-3xl border-2 border-primary/15 bg-white p-5"
          >
            <QRCodeCanvas
              value={menuUrl}
              size={240}
              level="H"
              fgColor="#191c1d"
              bgColor="#ffffff"
              {...(typeof restaurant.logoUrl === "string" &&
              restaurant.logoUrl.trim()
                ? {
                    imageSettings: {
                      src: restaurant.logoUrl,
                      height: 48,
                      width: 48,
                      excavate: true,
                      crossOrigin: "anonymous" as const,
                    },
                  }
                : {})}
            />
          </div>

          <div className="w-full rounded-xl bg-surface-container-low p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-muted-foreground">
                {t.dashboard.qrLinkLabel}
              </p>
              <button
                type="button"
                aria-label={t.common.copy}
                onClick={() => void copyLink()}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-surface-container-high"
              >
                {copied ? (
                  <Check className="size-4 text-success" />
                ) : (
                  <Copy className="size-4 text-muted-foreground" />
                )}
              </button>
            </div>
            <div
              dir="ltr"
              className="mt-3 rounded-lg border border-border/60 bg-card px-3.5 py-2.5 text-center font-mono text-sm break-all text-foreground/80"
            >
              {menuUrl}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Button
              className="h-13 flex-1 gap-2 rounded-xl text-base font-bold"
              onClick={downloadPng}
            >
              <Download className="size-5" />
              {t.dashboard.downloadPng}
            </Button>
            <Button
              variant="outline"
              className="h-13 flex-1 gap-2 rounded-xl text-base font-bold"
              onClick={downloadPdf}
            >
              <FileText className="size-5" />
              {t.dashboard.downloadPdf}
            </Button>
          </div>
        </div>
      </section>

      {/* live phone preview */}
      <section className="rounded-2xl border border-border/60 bg-card p-6 md:p-8">
        <h2 className="font-heading text-lg font-bold">
          {t.dashboard.preview}
        </h2>
        <div className="mt-6 flex justify-center">
          {/* the frame's interior must match a real phone's CSS width
              (~375-390px) — a narrower box squeezes the page below any
              real device's viewport and makes a genuinely responsive page
              wrap/overflow here without that ever happening on an actual
              phone */}
          <div className="relative w-[25rem] overflow-hidden rounded-[2.6rem] border-[10px] border-[#191c1d] bg-background dark:border-black">
            {/* notch */}
            <div className="absolute inset-x-0 top-0 z-10 flex justify-center">
              <div className="h-6 w-32 rounded-b-2xl bg-[#191c1d] dark:bg-black" />
            </div>
            <iframe
              title={t.dashboard.preview}
              src={menuUrl}
              className="h-[36rem] w-full"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
