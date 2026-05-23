import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Users, BookOpen, BarChart3 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type Role = "student" | "faculty" | "hod" | "principal";

export default function RoleSelection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hodBranch, setHodBranch] = useState("cse");

  const handleSelect = (role: Role) => {
    localStorage.setItem("role", role);

    if (role === "hod") {
      localStorage.setItem("hodBranch", hodBranch);
    }

    navigate(`/${role}`);
  };

  const roles = [
    {
      key: "student" as Role,
      title: "Student",
      icon: <Users size={26} />,
      desc: "View attendance, assignments, marks, progress, and academic insights.",
    },
    {
      key: "faculty" as Role,
      title: "Faculty",
      icon: <BookOpen size={26} />,
      desc: "Manage classes, monitor student activity, and review performance.",
    },
    {
      key: "hod" as Role,
      title: "HOD",
      icon: <BarChart3 size={26} />,
      desc: "Track department analytics, faculty insights, and academic reports.",
    },
    {
      key: "principal" as Role,
      title: "Principal",
      icon: <GraduationCap size={26} />,
      desc: "Access institution-wide performance, summaries, and key insights.",
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass w-full max-w-5xl p-8 md:p-10"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-yellow-400 text-black mb-4"
          >
            <GraduationCap size={28} />
          </motion.div>

          <h1 className="text-3xl md:text-4xl font-bold text-yellow-400">
            Select Your Role
          </h1>

          <p className="text-gray-300 mt-3">
            {user?.email ? `Signed in as ${user.email}` : "Choose a role to continue"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role, index) => (
            <motion.button
              key={role.key}
              initial={{ opacity: 0, y: 45 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.12 }}
              whileHover={{ y: -12, scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(role.key)}
              className="glass text-left p-6 border border-white/10"
            >
              <div className="flex items-center gap-3 mb-4 text-yellow-400">
                {role.icon}
                <h2 className="text-2xl font-semibold">{role.title}</h2>
              </div>

              <p className="text-gray-300">{role.desc}</p>

              {role.key === "hod" && (
                <select
                  value={hodBranch}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setHodBranch(e.target.value)}
                  className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-yellow-400"
                >
                  <option className="text-black" value="cse">CSE HOD</option>
                  <option className="text-black" value="ece">ECE HOD</option>
                  <option className="text-black" value="eee">EEE HOD</option>
                  <option className="text-black" value="mech">MECH HOD</option>
                </select>
              )}
            </motion.button>
          ))}
        </div>

        <p className="text-center text-sm text-gray-300 mt-8">
          <Link to="/" className="hover:text-yellow-400">
            Back to Home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
