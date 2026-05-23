import { Bell, User, Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

interface NavbarProps {
  setSidebarOpen: (value: boolean) => void;
}

export default function Navbar({ setSidebarOpen }: NavbarProps) {
  const { role, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="glass flex justify-between items-center px-4 md:px-6 py-4 mb-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden"
        >
          <Menu size={22} />
        </button>

        <div>
          <h2 className="text-lg md:text-2xl font-semibold">Dashboard Overview</h2>
          <p className="text-xs md:text-sm text-gray-400">
            Welcome back to AI Classroom
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="relative cursor-pointer hidden sm:block">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 bg-red-500 text-xs px-1 rounded-full">
            3
          </span>
        </div>

        <div className="flex items-center gap-2">
          <User size={20} />
          <div className="text-xs md:text-sm hidden sm:block">
            <p className="font-medium">{user?.email || "User"}</p>
            <p className="text-gray-400 capitalize">{role}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="bg-blue-500 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-blue-400 transition text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}