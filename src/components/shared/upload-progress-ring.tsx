/** A 0-100% circular progress ring overlaid on an image thumbnail while it
 * uploads — an indefinite spinner can't tell a slow connection from a stuck
 * one, this can. */
export function UploadProgressRing({ percent }: { percent: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/55">
      <svg className="size-9 -rotate-90" viewBox="0 0 36 36">
        <circle
          cx="18"
          cy="18"
          r={radius}
          className="fill-none stroke-white/30"
          strokeWidth="4"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          className="fill-none stroke-white transition-[stroke-dashoffset] duration-200"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-white">{percent}%</span>
    </div>
  );
}
