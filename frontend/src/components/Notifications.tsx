type NotificationsProps = {
  department?: string;
};

const departmentNotifications: Record<string, string[]> = {
  cse: [
    "💻 CSE AI Lab scheduled today",
    "📢 CSE faculty report pending",
    "✅ CSE student leave request updated",
  ],
  ece: [
    "📡 ECE Digital Systems session scheduled",
    "📢 ECE lab report pending",
    "✅ ECE leave request updated",
  ],
  eee: [
    "⚡ EEE Power Systems class scheduled",
    "📢 EEE machines lab report pending",
    "✅ EEE leave request updated",
  ],
  mech: [
    "⚙️ MECH CAD Lab scheduled",
    "📢 MECH workshop report pending",
    "✅ MECH leave request updated",
  ],
};

export default function Notifications({ department }: NotificationsProps) {
  const notifications = department
    ? departmentNotifications[department] || departmentNotifications.cse
    : [
        "📢 New assignment uploaded",
        "📅 Exam scheduled for tomorrow",
        "✅ Leave request approved",
      ];

  return (
    <div className="card-hover rounded-2xl border border-slate-200/60 bg-white p-6 shadow-card dark:border-blue-500/10 dark:bg-[#0C1330]">
      <h2 className="mb-3 text-xl font-bold text-gold-600 dark:text-blue-400">
        Notifications
      </h2>

      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
        {notifications.map((note, i) => (
          <li
            key={i}
            className="card-hover rounded-xl bg-slate-50 px-3 py-2 dark:bg-[#111B44]"
          >
            • {note}
          </li>
        ))}
      </ul>
    </div>
  );
}