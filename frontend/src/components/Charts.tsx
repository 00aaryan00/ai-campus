import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type ChartProps = {
  title1: string;
  title2: string;
  data?: { name: string; value: number }[];
};

const defaultData = [
  { name: "Mon", value: 75 },
  { name: "Tue", value: 82 },
  { name: "Wed", value: 70 },
  { name: "Thu", value: 88 },
  { name: "Fri", value: 92 },
  { name: "Sat", value: 85 },
];

export default function Charts({ title1, title2, data }: ChartProps) {
  const baseData = data && data.length > 0 ? data : defaultData;
  const chartData = [...baseData];
  const isDaysData = chartData.some(d => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].includes(d.name));
  
  if (isDaysData && !chartData.find((d) => d.name === "Sat" || d.name === "Saturday")) {
    chartData.push({ name: "Sat", value: 85 });
  }
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const axisColor = isDark ? "#F8FAFC" : "#1E293B";
  const gridColor = isDark ? "#94A3B8" : "#64748B";
  const tooltipBg = isDark ? "#0D1526" : "#FFFFFF";
  const tooltipText = isDark ? "#FFFFFF" : "#0F172A";

  const barColors = isDark 
    ? ["#60A5FA", "#34D399", "#A78BFA", "#FBBF24", "#F472B6"] 
    : ["#C8952E", "#3B82F6", "#10B981", "#8B5CF6", "#EF4444"];

  const getBarColor = (index: number) => {
    if (chartData.length === 1) {
      // "last graph in hod give it some other colour you like will be the best in dark mode let it be yellow in light mode."
      return isDark ? "#A78BFA" : "#D97706"; // Purple in dark, dark-yellow/gold in light
    }
    return barColors[index % barColors.length];
  };

  return (
    <div className="text-slate-900 dark:text-white">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-hover rounded-2xl border border-slate-200/40 bg-white/80 p-4 dark:border-blue-500/10 dark:bg-[#111B44]/50">
          <h2 className="mb-4 text-lg font-black text-slate-900 dark:text-white">
            {title1}
          </h2>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />

              <XAxis
                dataKey="name"
                tick={{ fill: axisColor, fontSize: 13, fontWeight: 700 }}
                axisLine={{ stroke: axisColor }}
                tickLine={{ stroke: axisColor }}
              />

              <YAxis
                tick={{ fill: axisColor, fontSize: 13, fontWeight: 700 }}
                axisLine={{ stroke: axisColor }}
                tickLine={{ stroke: axisColor }}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  color: tooltipText,
                  border: `1px solid ${gridColor}`,
                  borderRadius: "12px",
                }}
                labelStyle={{ color: tooltipText }}
              />

              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-hover rounded-2xl border border-slate-200/40 bg-white/80 p-4 dark:border-blue-500/10 dark:bg-[#111B44]/50">
          <h2 className="mb-4 text-lg font-black text-slate-900 dark:text-white">
            {title2}
          </h2>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />

              <XAxis
                dataKey="name"
                tick={{ fill: axisColor, fontSize: 13, fontWeight: 700 }}
                axisLine={{ stroke: axisColor }}
                tickLine={{ stroke: axisColor }}
              />

              <YAxis
                tick={{ fill: axisColor, fontSize: 13, fontWeight: 700 }}
                axisLine={{ stroke: axisColor }}
                tickLine={{ stroke: axisColor }}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  color: tooltipText,
                  border: `1px solid ${gridColor}`,
                  borderRadius: "12px",
                }}
                labelStyle={{ color: tooltipText }}
              />

              <Line
                type="monotone"
                dataKey="value"
                stroke={isDark ? "#60A5FA" : "#0F3460"}
                strokeWidth={4}
                dot={{
                  fill: isDark ? "#3B82F6" : "#C8952E",
                  r: 5,
                  strokeWidth: 2,
                  stroke: isDark ? "#60A5FA" : "#0F3460",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}