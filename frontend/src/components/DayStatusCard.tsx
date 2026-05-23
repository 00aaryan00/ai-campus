export const getCurrentDayStatus = () => {
  const today = new Date();

  const dayName = today.toLocaleDateString("en-US", {
    weekday: "long",
  });

  const fullDate = today.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const isSunday = dayName === "Sunday";

  return {
    dayName,
    fullDate,
    isWorkingDay: !isSunday,
    status: isSunday ? "Leave Day" : "Working Day",
    message: isSunday ? "Weekly Holiday" : "Regular Academic Day",
  };
};

export default function DayStatusCard() {
  const dayStatus = getCurrentDayStatus();

  return (
    <div className="card-hover rounded-3xl border border-slate-200/60 bg-white/90 p-6 text-slate-900 shadow-card backdrop-blur-xl dark:border-blue-500/10 dark:bg-[#0C1330] dark:text-white">
      <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
        Today
      </p>

      <h2 className="mt-2 font-display text-3xl font-black text-slate-900 dark:text-white">
        {dayStatus.dayName}
      </h2>

      <p className="mt-2 text-base font-medium text-slate-500 dark:text-slate-400">
        📅 {dayStatus.fullDate}
      </p>

      <div className="mt-4 rounded-2xl bg-gold-50 dark:bg-blue-900/20 px-4 py-3 text-gold-700 dark:text-blue-300 dark:bg-blue-500/10 dark:text-blue-300">
        <p className="font-black text-lg">{dayStatus.status}</p>
        <p className="text-base">{dayStatus.message}</p>
      </div>
    </div>
  );
}
