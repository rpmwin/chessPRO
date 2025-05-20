import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
// import { Logout } from "lucide-react";

export default function NavBar() {
    const { user, logout } = useAuth();
    const nav = useNavigate();

    const handleLogout = () => {
        logout();
        nav("/login", { replace: true });
    };

    return (
        <nav className="bg-gray-900 text-gray-100 px-6 py-3 flex justify-between items-center shadow-md">
            <Link to="/" className="text-xl font-bold hover:text-white">
                ChessPRO
            </Link>
            {user && (
                <div className="flex items-center space-x-4">
                    <span className="text-sm">{user.name || user.email}</span>
                    <button
                        onClick={handleLogout}
                        className="p-1 rounded hover:bg-gray-700 transition"
                        title="Logout"
                    >
                        {/* <Logout className="w-5 h-5 text-gray-300 hover:text-white" /> */}
                    </button>
                </div>
            )}
        </nav>
    );
}
