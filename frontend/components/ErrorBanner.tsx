export default function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-brick bg-brick-soft p-3 text-sm text-brick">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn-quiet !py-1 !text-[13px]" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
