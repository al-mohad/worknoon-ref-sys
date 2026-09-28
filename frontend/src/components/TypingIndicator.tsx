export function TypingIndicator({ label = 'Checking your order' }: { label?: string }) {
  return (
    <div className="flex justify-start" role="status" aria-label={label}>
      <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
        <span className="flex gap-1" aria-hidden="true">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
        </span>
        <span>{label}...</span>
      </div>
    </div>
  );
}
