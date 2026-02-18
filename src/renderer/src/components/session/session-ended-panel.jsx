export default function SessionEndedPanel({
  variant = "full",
  topTextRef,
  title,
  description,
  children,
}) {
  if (variant === "compact") {
    return (
      <div
        ref={topTextRef}
        className="mt-4 p-4 rounded-lg bg-white/80 dark:bg-zinc-800/80 text-center flex flex-col items-center gap-3"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={topTextRef}
      className="mt-8 mb-8 mx-4 sm:mx-0 p-6 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-sm text-center"
    >
      <div className="flex flex-col items-center justify-center space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md leading-snug">
          {description}
        </p>

        <div className="pt-2">{children}</div>
      </div>
    </div>
  );
}
