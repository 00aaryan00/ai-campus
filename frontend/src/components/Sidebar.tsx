// import { NavLink } from "react-router-dom";
// import { LayoutDashboard, Users, BookOpen, BarChart, X } from "lucide-react";

// const menu = [
//   { name: "Student", path: "/student", icon: <LayoutDashboard size={18} /> },
//   { name: "Faculty", path: "/faculty", icon: <Users size={18} /> },
//   { name: "HOD", path: "/hod", icon: <BookOpen size={18} /> },
//   { name: "Principal", path: "/principal", icon: <BarChart size={18} /> },
// ];

// interface SidebarProps {
//   open: boolean;
//   setOpen: (value: boolean) => void;
// }

// export default function Sidebar({ open, setOpen }: SidebarProps) {
//   return (
//     <>
//       <div
//         className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#060D1F] border-r border-gray-800 p-6 transform transition-transform duration-300
//         ${open ? "translate-x-0" : "-translate-x-full"}
//         md:translate-x-0 md:static md:flex md:flex-col`}
//       >
//         <div className="flex items-center justify-between md:block">
//           <h1 className="text-2xl font-bold text-blue-400 mb-0 md:mb-10">
//             AI Classroom
//           </h1>

//           <button
//             onClick={() => setOpen(false)}
//             className="md:hidden text-white"
//           >
//             <X size={22} />
//           </button>
//         </div>

//         <nav className="flex flex-col gap-3 mt-8 md:mt-0">
//           {menu.map((item) => (
//             <NavLink
//               key={item.name}
//               to={item.path}
//               onClick={() => setOpen(false)}
//               className={({ isActive }) =>
//                 `flex items-center gap-3 p-3 rounded-xl transition ${
//                   isActive
//                     ? "bg-blue-500 text-white shadow-lg"
//                     : "hover:bg-white/10 text-gray-300"
//                 }`
//               }
//             >
//               {item.icon}
//               {item.name}
//             </NavLink>
//           ))}
//         </nav>

//         <div className="mt-auto text-xs text-gray-500 pt-8">
//           © 2026 AI Classroom
//         </div>
//       </div>

//       {open && (
//         <div
//           className="fixed inset-0 bg-black/50 z-40 md:hidden"
//           onClick={() => setOpen(false)}
//         />
//       )}
//     </>
//   );
// }



























import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, BookOpen, BarChart, X } from "lucide-react";
import logo from "../assets/logo.png";

const menu = [
  { name: "Student", path: "/student", icon: <LayoutDashboard size={18} /> },
  { name: "Faculty", path: "/faculty", icon: <Users size={18} /> },
  { name: "HOD", path: "/hod", icon: <BookOpen size={18} /> },
  { name: "Principal", path: "/principal", icon: <BarChart size={18} /> },
];

interface SidebarProps {
  open: boolean;
  setOpen: (value: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-navy-950 border-r border-navy-800 p-6 transform transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:static md:flex md:flex-col`}
      >
        <div className="flex items-center justify-between md:block">
          {/* Logo & Title Container */}
          <div className="flex items-center gap-3 mb-0 md:mb-10">
            <div className="w-16 h-16 shrink-0 bg-white rounded-xl flex items-center justify-center overflow-hidden">
              <img
                src={logo}
                alt="AI Classroom"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-black font-display text-gold-500">
              AI Classroom
            </h1>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="md:hidden text-white"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex flex-col gap-3 mt-8">
          {menu.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 transition ${
                  isActive
                    ? "border-l-4 border-gold-500 bg-navy-800 text-gold-400 rounded-r-xl"
                    : "hover:bg-white/5 text-slate-400 rounded-xl"
                }`
              }
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto text-xs text-navy-400 pt-8">
          © 2026 AI Classroom
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
