"use client";

import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    CastleIcon as ChessKnight,
    Search,
    Menu,
    X,
    ChevronDown,
    Bell,
    Home,
    Zap,
    Target,
    Users,
    BookOpen,
    User,
    Settings,
    Trophy,
    LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function NavBar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const navRef = useRef(null);
    const menuRef = useRef(null);

    // scroll effect
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // click outside to close
    useEffect(() => {
        const handler = (e) => {
            if (navRef.current && !navRef.current.contains(e.target)) {
                setMobileOpen(false);
            }
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    const navLinks = [
        { to: "/", icon: Home, label: "Home" },
        { to: "/play", icon: Zap, label: "Play" },
        { to: "/learn", icon: BookOpen, label: "Learn" },
        { to: "/puzzles", icon: Target, label: "Puzzles" },
        { to: "/community", icon: Users, label: "Community" },
    ];

    return (
        <nav
            ref={navRef}
            className={`fixed top-0 left-0 right-0 z-50 px-6 py-3 flex items-center justify-between transition-all duration-300 ${
                scrolled
                    ? "bg-gray-900/95 backdrop-blur-md shadow-lg"
                    : "bg-gray-900"
            }`}
        >
            {/* Brand */}
            <Link
                to="/"
                className="flex items-center text-white hover:text-teal-400"
            >
                <ChessKnight className="h-8 w-8 text-teal-400" />
                <span className="ml-2 text-xl font-bold">ChessPRO</span>
            </Link>

            {/* Desktop Links + Search */}
            <div className="hidden md:flex md:items-center md:space-x-6">
                {navLinks.map(({ to, icon: Icon, label }) => (
                    <Link
                        key={to}
                        to={to}
                        className="flex items-center text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                        <Icon className="w-4 h-4 mr-1" />
                        {label}
                    </Link>
                ))}

                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-500" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search players..."
                        className="bg-gray-800/70 border border-gray-700 focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 pr-3 py-2 rounded-md text-sm text-gray-300 placeholder-gray-500"
                    />
                </div>
            </div>

            {/* Desktop User */}
            <div
                className="hidden md:flex md:items-center md:space-x-4"
                ref={menuRef}
            >
                {user ? (
                    <>
                        <button className="relative p-1 text-gray-400 hover:text-white">
                            <Bell className="h-6 w-6" />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full ring-2 ring-gray-900" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setUserMenuOpen((o) => !o);
                            }}
                            className="flex items-center space-x-2 focus:outline-none"
                        >
                            <div className="relative">
                                <img
                                    src={user.avatar || "/placeholder.svg"}
                                    alt={user.name || user.email}
                                    className="h-8 w-8 rounded-full border-2 border-teal-500"
                                />
                                {user.online && (
                                    <span className="absolute bottom-0 right-0 block h-2 w-2 bg-green-500 rounded-full border-2 border-gray-900" />
                                )}
                            </div>
                            <div className="text-right hidden lg:block">
                                <div className="text-white text-sm font-medium">
                                    {user.name || user.email}
                                </div>
                                {user.rating && (
                                    <div className="text-teal-400 text-xs">
                                        {user.rating} ELO
                                    </div>
                                )}
                            </div>
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        </button>

                        {userMenuOpen && (
                            <div
                                className="absolute right-6 mt-2 w-48 bg-gray-800 ring-1 ring-black ring-opacity-5 rounded-md shadow-lg py-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Link
                                    to={`/profile/${user.username}`}
                                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                                >
                                    <User className="w-4 h-4 mr-2" /> Profile
                                </Link>
                                <Link
                                    to="/stats"
                                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                                >
                                    <Trophy className="w-4 h-4 mr-2" /> Stats
                                </Link>
                                <Link
                                    to="/settings"
                                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                                >
                                    <Settings className="w-4 h-4 mr-2" />{" "}
                                    Settings
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex w-full items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                                >
                                    <LogOut className="w-4 h-4 mr-2" /> Sign out
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex space-x-2">
                        <Link
                            to="/login"
                            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                        >
                            Log in
                        </Link>
                        <Link
                            to="/signup"
                            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-500"
                        >
                            Sign up
                        </Link>
                    </div>
                )}
            </div>

            {/* Mobile Toggle */}
            <div className="flex md:hidden items-center">
                <button
                    onClick={() => setMobileOpen((o) => !o)}
                    className="p-2 text-gray-400 hover:text-white focus:outline-none"
                >
                    {mobileOpen ? (
                        <X className="h-6 w-6" />
                    ) : (
                        <Menu className="h-6 w-6" />
                    )}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-gray-800 shadow-lg">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {navLinks.map(({ to, icon: Icon, label }) => (
                            <Link
                                key={to}
                                to={to}
                                className="flex items-center text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md"
                            >
                                <Icon className="w-5 h-5 mr-2" />
                                {label}
                            </Link>
                        ))}
                        <div className="px-3 py-2">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search players..."
                                    className="bg-gray-700 border border-gray-600 focus:ring-teal-500 focus:border-teal-500 block w-full pl-10 pr-3 py-2 rounded-md text-gray-300 placeholder-gray-500"
                                />
                            </div>
                        </div>
                    </div>

                    {user ? (
                        <div className="pt-4 pb-3 border-t border-gray-700 px-5 space-y-1">
                            <Link
                                to={`/profile/${user.username}`}
                                className="flex items-center text-gray-300 hover:bg-gray-700 px-3 py-2 rounded-md"
                            >
                                <User className="w-5 h-5 mr-2" />
                                Profile
                            </Link>
                            <Link
                                to="/stats"
                                className="flex items-center text-gray-300 hover:bg-gray-700 px-3 py-2 rounded-md"
                            >
                                <Trophy className="w-5 h-5 mr-2" />
                                Stats
                            </Link>
                            <Link
                                to="/settings"
                                className="flex items-center text-gray-300 hover:bg-gray-700 px-3 py-2 rounded-md"
                            >
                                <Settings className="w-5 h-5 mr-2" />
                                Settings
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center text-gray-300 hover:bg-gray-700 px-3 py-2 rounded-md"
                            >
                                <LogOut className="w-5 h-5 mr-2" />
                                Sign out
                            </button>
                        </div>
                    ) : (
                        <div className="pt-4 pb-3 border-t border-gray-700 px-5 flex flex-col space-y-2">
                            <Link
                                to="/login"
                                className="w-full py-2 text-center text-white bg-gray-700 rounded hover:bg-gray-600"
                            >
                                Log in
                            </Link>
                            <Link
                                to="/signup"
                                className="w-full py-2 text-center text-white bg-teal-600 rounded hover:bg-teal-500"
                            >
                                Sign up
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </nav>
    );
}
    