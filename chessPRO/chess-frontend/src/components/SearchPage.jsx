"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
    Search,
    CastleIcon as ChessKnight,
    PianoIcon as ChessPawn,
} from "lucide-react";

export default function SearchPage() {
    const [username, setUsername] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();

        // Reset error state
        setError("");

        // Validate input
        if (!username.trim()) {
            setError("Please enter a Chess.com Username");
            toast.error("Please enter a Chess.com Username");
            return;
        }

        // Show loading state
        setIsSubmitting(true);

        // Simulate API check (remove this in production)
        setTimeout(() => {
            // Navigate to profile page
            navigate(`/profile/${username.trim()}`);
            setIsSubmitting(false);
        }, 500);
    };

    return (
        <div className="min-h-screen w-full bg-gray-900 flex flex-col items-center justify-center px-4 sm:px-6 relative overflow-hidden">
            {/* Chess pattern overlay */}
            <div
                className="absolute inset-0 opacity-2"
                style={{
                    backgroundImage: `
            linear-gradient(45deg, #ffffff 25%, transparent 25%),
            linear-gradient(-45deg, #ffffff 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #ffffff 75%),
            linear-gradient(-45deg, transparent 75%, #ffffff 75%)
          `,
                    backgroundSize: "40px 40px",
                    backgroundPosition: "0 0, 0 20px, 20px -20px, -20px 0px",
                }}
            />

            {/* Decorative chess pieces */}
            <div className="absolute -bottom-16 -left-16 text-gray-800 opacity-10">
                <ChessKnight className="w-64 h-64" />
            </div>
            <div className="absolute -top-16 -right-16 text-gray-800 opacity-10 transform rotate-45">
                <ChessKnight className="w-64 h-64" />
            </div>

            {/* Content container */}
            <div className="w-full max-w-3xl z-10 flex flex-col items-center">
                {/* Logo */}
                <div className="flex items-center mb-6">
                    <ChessKnight className="w-10 h-10 text-teal-500 mr-2" />
                    <h1 className="text-3xl font-bold text-white">ChessPRO</h1>
                </div>

                {/* Hero section */}
                <div className="text-center mb-10">
                    <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                        Find a Chess.com Profile
                    </h2>
                    <p className="text-xl text-gray-300 max-w-2xl">
                        Analyze your games with AI-powered insights and track
                        your progress over time.
                    </p>
                </div>

                {/* Search form */}
                <div className="w-full bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700 p-8 sm:p-10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label
                                htmlFor="username"
                                className="block text-sm font-medium text-gray-300"
                            >
                                Chess.com Username
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <ChessPawn
                                        className="h-5 w-5 text-gray-400"
                                        aria-hidden="true"
                                    />
                                </div>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={username}
                                    onChange={(e) =>
                                        setUsername(e.target.value)
                                    }
                                    placeholder="Enter username"
                                    className="block w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent hover:border-gray-500 transition-all"
                                    aria-describedby="username-error"
                                />
                            </div>
                            {error && (
                                <p
                                    className="mt-2 text-sm text-red-400"
                                    id="username-error"
                                >
                                    {error}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-center">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center justify-center px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg
                                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        Searching...
                                    </>
                                ) : (
                                    <>
                                        <Search className="mr-2 h-5 w-5" />
                                        Search
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Popular searches suggestion */}
                    <div className="mt-8 pt-6 border-t border-gray-700">
                        <p className="text-sm text-gray-400 mb-3">
                            Popular searches:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                "MagnusCarlsen",
                                "Hikaru",
                                "GothamChess",
                                "DanielNaroditsky",
                                "BotezLive",
                            ].map((name) => (
                                <button
                                    key={name}
                                    onClick={() => {
                                        setUsername(name);
                                        navigate(`/profile/${name}`);
                                    }}
                                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-full transition-colors"
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Additional info */}
                <div className="mt-8 text-center text-gray-400 text-sm">
                    <p>
                        Don't have a Chess.com account?{" "}
                        <a
                            href="https://www.chess.com/register"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-400 hover:text-teal-300 hover:underline transition-colors"
                        >
                            Sign up for free
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
