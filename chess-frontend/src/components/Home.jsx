// src/pages/Home.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
            {/* Hero Section */}
            <header className="flex-grow flex flex-col justify-center items-center text-center px-4">
                <h1 className="text-5xl font-bold mb-4">ChessPRO</h1>
                <p className="text-xl mb-8 max-w-2xl">
                    Discover any Chess.com player’s profile, browse their games,
                    and get instant in-browser analysis plus AI-powered coaching
                    tips—all in one sleek interface.
                </p>
                <button
                    onClick={() => navigate("/")}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-lg font-medium transition"
                >
                    Search a Player
                </button>
            </header>

            {/* Features */}
            <section className="bg-gray-800 py-16">
                <div className="max-w-4xl mx-auto grid gap-12 md:grid-cols-2 px-4">
                    <div className="space-y-3">
                        <h2 className="text-2xl font-semibold">
                            🔍 Profile Lookup
                        </h2>
                        <p className="text-gray-300">
                            Enter any Chess.com username to instantly view their
                            avatar, stats, and league information.
                        </p>
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-2xl font-semibold">
                            📁 Game Archive
                        </h2>
                        <p className="text-gray-300">
                            Scroll through a clean, infinite-scroll gallery of
                            their past games, complete with mini-boards showing
                            final positions.
                        </p>
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-2xl font-semibold">
                            ⚡ Instant Analysis
                        </h2>
                        <p className="text-gray-300">
                            Get a quick, shallow Stockfish eval right in your
                            browser the moment you open a game.
                        </p>
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-2xl font-semibold">
                            🤖 AI Coaching
                        </h2>
                        <p className="text-gray-300">
                            Send your PGN to our server for deep Stockfish
                            analysis plus Google Gemini–powered move-by-move
                            coaching tips.
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer / CTA */}
            <footer className="bg-gray-900 py-8 text-center">
                <p className="text-gray-500 mb-4">
                    Ready to level up your chess?
                </p>
                <button
                    onClick={() => navigate("/")}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                >
                    Get Started
                </button>
            </footer>
        </div>
    );
}
