import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      className={cn("text-primary", className)}
      aria-hidden
    >
      <circle cx="32" cy="24" r="4.5" />
      <path d="M23.57 16.93A11 11 0 0 0 23.57 31.07" />
      <path d="M18.98 13.07A17 17 0 0 0 18.98 34.93" />
      <path d="M14.38 9.22A23 23 0 0 0 14.38 38.78" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-7" />
      <span className="font-reading text-xl font-medium tracking-tight">Millie</span>
    </span>
  );
}
