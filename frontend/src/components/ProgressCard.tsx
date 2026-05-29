export default function ProgressCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="card-hover rounded-2xl border border-slate-200/60 hover:border-gold-500 bg-white p-6 shadow-card dark:border-blue-500/10 dark:bg-[#0C1330] transition-all">
      <h3 className="mb-2 text-sm text-slate-500 dark:text-slate-400">
        {label}
      </h3>

      <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-gold-600 to-gold-400 dark:from-blue-600 dark:to-blue-400 shadow-sm shadow-gold-600/15"
          style={{ width: `${value}%` }}
        />
      </div>

      <p className="mt-2 font-display text-3xl font-black text-gold-500 dark:text-blue-300">
        {value}%
      </p>
    </div>
  );
}