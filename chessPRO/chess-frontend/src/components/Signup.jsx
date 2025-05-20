"use client";

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    ChevronRight,
    Eye,
    EyeOff,
    Lock,
    Key,
    Mail,
    CastleIcon as ChessKnight,
    RocketIcon as ChessRook,
    Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Signup() {
    const { signup } = useAuth();

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Re-validate whenever data or checkbox changes
    useEffect(() => {
        const newErrors = {};
        if (formData.username.trim().length < 3) {
            newErrors.username = "Username must be at least 3 characters";
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            newErrors.email = "Please enter a valid email address";
        }
        if (formData.password.length < 8) {
            newErrors.password = "Password must be at least 8 characters";
        }
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        setErrors(newErrors);
        setIsFormValid(
            Object.keys(newErrors).length === 0 &&
                formData.username.trim() &&
                formData.email.trim() &&
                formData.password &&
                formData.confirmPassword &&
                agreeToTerms
        );
    }, [formData, agreeToTerms]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const togglePasswordVisibility = (field) => {
        if (field === "password") setShowPassword((p) => !p);
        else setShowConfirmPassword((p) => !p);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid) return;

        setIsSubmitting(true);
        try {
            await signup(formData);
        } catch (err) {
            setErrors((prev) => ({
                ...prev,
                form: "Signup failed. Please try again.",
            }));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-900 relative overflow-hidden">
            {/* Blurred chess‐pattern overlay */}
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
                    backgroundPosition: "0 0,0 20px,20px -20px,-20px 0",
                    filter: "blur(3px)",
                }}
            />

            {/* Signup Card */}
            <div className="w-full max-w-md p-8 mx-4 bg-gray-800/80 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 relative z-10 transform transition-all hover:-translate-y-1">
                {/* Logo */}
                <div className="flex items-center justify-center mb-4">
                    <ChessKnight className="w-10 h-10 text-teal-500 mr-2" />
                    <h1 className="text-3xl font-bold text-white">ChessPRO</h1>
                </div>

                <h2 className="text-xl text-center font-medium text-gray-200 mb-6">
                    Create your account
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Username */}
                    <div className="space-y-1">
                        <div className="relative">
                            <ChessRook className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Username"
                                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 pl-10 pr-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-gray-500 transition-all"
                            />
                        </div>
                        {errors.username && (
                            <p className="text-red-400 text-sm pl-2">
                                {errors.username}
                            </p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Email"
                                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 pl-10 pr-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-gray-500 transition-all"
                            />
                        </div>
                        {errors.email && (
                            <p className="text-red-400 text-sm pl-2">
                                {errors.email}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Password"
                                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 pl-10 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-gray-500 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    togglePasswordVisibility("password")
                                }
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
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

                    {/* Confirm Password */}
                    <div className="space-y-1">
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm Password"
                                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 pl-10 pr-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 hover:border-gray-500 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    togglePasswordVisibility("confirm")
                                }
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-red-400 text-sm pl-2">
                                {errors.confirmPassword}
                            </p>
                        )}
                    </div>

                    {/* Terms */}
                    <div className="flex items-start mt-4">
                        <input
                            id="terms"
                            type="checkbox"
                            checked={agreeToTerms}
                            onChange={() => setAgreeToTerms((t) => !t)}
                            className="mt-1 w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-teal-500 focus:ring-2 text-teal-500"
                        />
                        <label
                            htmlFor="terms"
                            className="ml-3 text-sm text-gray-300"
                        >
                            I agree to the{" "}
                            <Link
                                to="/terms"
                                className="text-teal-400 hover:text-teal-300 hover:underline"
                            >
                                Terms & Conditions
                            </Link>
                        </label>
                    </div>

                    {/* General form error */}
                    {errors.form && (
                        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-2 rounded-lg">
                            {errors.form}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={!isFormValid || isSubmitting}
                        className={`w-full flex items-center justify-center font-medium py-3 px-4 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 ${
                            isFormValid && !isSubmitting
                                ? "bg-teal-500 hover:bg-teal-600 text-white hover:-translate-y-1"
                                : "bg-gray-600 text-gray-300 cursor-not-allowed"
                        }`}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                                Signing Up...
                            </>
                        ) : (
                            <>
                                Sign Up
                                <ChevronRight className="ml-2 h-5 w-5" />
                            </>
                        )}
                    </button>
                </form>

                {/* Already have an account */}
                <div className="mt-6 text-center border-t border-gray-700 pt-6">
                    <p className="text-gray-400">
                        Already have an account?{" "}
                        <Link
                            to="/login"
                            className="text-teal-400 hover:text-teal-300 hover:underline font-medium"
                        >
                            Log In
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
