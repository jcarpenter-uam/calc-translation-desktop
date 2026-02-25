function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function AdminSection({ className, children }) {
  return <div className={cn("w-full max-w-4xl mx-auto", className)}>{children}</div>;
}

export function AdminCard({ className, children }) {
  return (
    <div
      className={cn(
        "rounded-lg shadow border border-zinc-200 dark:border-zinc-700",
        className,
      )}
    >
      {children}
    </div>
  );
}
