"use client";

import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
    ChevronRight,
    Eye,
    EyeOff,
    Lock,
    CastleIcon as ChessKnight,
    PianoIcon as ChessPawn,
} from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword((prev) => !prev);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!formData.username.trim())
            newErrors.username = "Username or email is required";
        if (!formData.password) newErrors.password = "Password is required";
        else if (formData.password.length < 6)
            newErrors.password = "Password must be at least 6 characters";

        if (Object.keys(newErrors).length) {
            setErrors(newErrors);
            return;
        }
        login(formData);
    };

    const googleAuth = () => {
        window.location.href =
            "https://chessproapi.rishikpuneetm.xyz/auth/google";
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-900 relative overflow-hidden">
            {/* Chess pattern overlay with slight blur */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: `
            linear-gradient(45deg, #ffffff 25%, transparent 25%),
            linear-gradient(-45deg, #ffffff 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #ffffff 75%),
            linear-gradient(-45deg, transparent 75%, #ffffff 75%)
          `,
                    backgroundSize: "40px 40px",
                    backgroundPosition: "0 0, 0 20px, 20px -20px, -20px 0px",
                    filter: "blur(3px)",
                }}
            />

            {/* Login Card with stronger backdrop blur */}
            <div className="w-full max-w-md p-8 mx-4 bg-gray-800/80 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 relative z-10 transform transition-all hover:-translate-y-1">
                {/* Logo */}
                <div className="flex items-center justify-center mb-8">
                    <ChessKnight className="w-10 h-10 text-teal-500 mr-2" />
                    <h1 className="text-3xl font-bold text-white">ChessPRO</h1>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Username */}
                    <div className="space-y-2">
                        <div className="relative">
                            <ChessPawn className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Username or Email"
                                aria-label="Username or Email"
                                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 pl-10 pr-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-500 transition-all"
                            />
                        </div>
                        {errors.username && (
                            <p className="text-red-400 text-sm pl-2">
                                {errors.username}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Password"
                                aria-label="Password"
                                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 pl-10 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-500 transition-all"
                            />
                            <button
                                type="button"
                                onClick={togglePasswordVisibility}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-red-400 text-sm pl-2">
                                {errors.password}
                            </p>
                        )}
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
                    >
                        Log In
                        <ChevronRight className="ml-2 h-5 w-5" />
                    </button>

                    {/* Forgot */}
                    <div className="text-center">
                        <Link
                            to="/forgot-password"
                            className="text-sm text-gray-400 hover:text-teal-400 hover:underline transition-colors"
                        >
                            Forgot Password?
                        </Link>
                    </div>
                </form>

                {/* Or divider */}
                <div className="flex items-center my-6">
                    <hr className="flex-grow border-gray-600" />
                    <span className="mx-3 text-gray-400">or</span>
                    <hr className="flex-grow border-gray-600" />
                </div>

                {/* Google Auth */}
                <div className="text-center">
                    <button
                        onClick={googleAuth}
                        className="w-full bg-white text-gray-800 font-medium py-3 px-4 rounded-lg hover:bg-gray-200 transition-all duration-300 flex items-center justify-center"
                    >
                        <FaGoogle className="h-5 w-5 mr-2" />
                        Log in with Google
                    </button>
                </div>

                {/* Sign Up */}
                <div className="mt-8 text-center border-t border-gray-700 pt-6">
                    <p className="text-gray-400">
                        Don&apos;t have an account?{" "}
                        <Link
                            to="/signup"
                            className="text-teal-400 hover:text-teal-300 hover:underline font-medium transition-colors"
                        >
                            Sign Up
                        </Link>
                    </p>
                </div>

                {/* Decorative knight */}
                <div className="absolute -bottom-6 -right-6 text-gray-700 opacity-10">
                    <ChessKnight className="w-24 h-24" />
                </div>
            </div>
        </div>
    );
}
