import { useState } from "react";
import { Link } from "react-router-dom";
import {
    Menu,
    X,
    CastleIcon as ChessKnight,
    Search,
    History,
    Zap,
    Brain,
    RocketIcon as ChessRook,
    ChurchIcon as ChessBishop,
    CastleIcon as ChessKing,
    DiamondIcon as ChessQueen,
    PianoIcon as ChessPawn,
} from "lucide-react";

export default function Home() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
            {/* Navbar */}
            <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 shadow-md">
                <div className="container mx-auto px-4 md:px-8">
                    <nav className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <Link to="/" className="flex items-center space-x-2">
                            <ChessKnight className="h-8 w-8 text-teal-500" />
                            <span className="text-xl font-bold">ChessPRO</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-6">
                            <Link
                                to="/"
                                className="font-medium hover:text-teal-400 transition-colors"
                            >
                                Home
                            </Link>
                            <Link
                                to="/search"
                                className="font-medium hover:text-teal-400 transition-colors"
                            >
                                Search
                            </Link>
                            <Link
                                to="/login"
                                className="font-medium hover:text-teal-400 transition-colors"
                            >
                                Login
                            </Link>
                            <Link
                                to="/signup"
                                className="bg-teal-500 hover:bg-teal-400 text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors"
                            >
                                Sign Up
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden text-gray-200 hover:text-white"
                            onClick={toggleMenu}
                            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                            aria-expanded={isMenuOpen}
                            aria-controls="mobile-menu"
                        >
                            {isMenuOpen ? (
                                <X className="h-6 w-6" />
                            ) : (
                                <Menu className="h-6 w-6" />
                            )}
                        </button>
                    </nav>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div
                        id="mobile-menu"
                        className="md:hidden bg-gray-800 border-b border-gray-700"
                    >
                        <div className="container mx-auto px-4 py-3 flex flex-col space-y-3">
                            <Link
                                to="/"
                                className="font-medium py-2 hover:text-teal-400 transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Home
                            </Link>
                            <Link
                                to="/search"
                                className="font-medium py-2 hover:text-teal-400 transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Search
                            </Link>
                            <Link
                                to="/login"
                                className="font-medium py-2 hover:text-teal-400 transition-colors"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Login
                            </Link>
                            <Link
                                to="/signup"
                                className="bg-teal-500 hover:bg-teal-400 text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors text-center"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Sign Up
                            </Link>
                        </div>
                    </div>
                )}
            </header>

            <main className="flex-1">
                {/* Hero Section with Chess Pattern Background */}
                <section className="relative min-h-[90vh] flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
                    {/* Chess Pattern Background (decorative) */}
                    <div className="absolute inset-0 opacity-5 pointer-events-none">
                        <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
                            {Array.from({ length: 64 }).map((_, index) => {
                                const row = Math.floor(index / 8);
                                const col = index % 8;
                                const isBlack = (row + col) % 2 === 1;
                                return (
                                    <div
                                        key={index}
                                        className={
                                            isBlack
                                                ? "bg-gray-700"
                                                : "bg-gray-600"
                                        }
                                    />
                                );
                            })}
                        </div>
                    </div>

                    <div className="container mx-auto px-4 md:px-8 text-center relative z-10">
                        <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white">
                            ChessPRO
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
                            Search Chess.com users, browse archives, analyze
                            your games with AI-powered coaching.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to="/search"
                                className="bg-teal-500 hover:bg-teal-400 text-gray-900 px-6 py-3 rounded-lg font-bold shadow-md transition-colors w-full sm:w-auto"
                            >
                                Search a Player
                            </Link>
                            <Link
                                to="/signup"
                                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-colors w-full sm:w-auto"
                            >
                                Sign Up Free
                            </Link>
                        </div>
                    </div>
                </section>

                {/* About Section */}
                <section className="py-16 bg-gray-900">
                    <div className="container mx-auto px-4 md:px-8">
                        <div className="max-w-4xl mx-auto">
                            <h2 className="text-3xl font-bold text-center mb-8">
                                About ChessPRO
                            </h2>
                            <div className="bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-700">
                                <p className="text-gray-300 mb-6 leading-relaxed">
                                    ChessPRO is a comprehensive platform
                                    designed for chess enthusiasts who want to
                                    take their game to the next level. Our
                                    platform connects directly to Chess.com's
                                    API to provide deep insights into your chess
                                    journey.
                                </p>
                                <p className="text-gray-300 mb-6 leading-relaxed">
                                    Whether you're a beginner looking to improve
                                    or an advanced player analyzing your
                                    performance, ChessPRO offers powerful tools
                                    to help you understand your strengths and
                                    weaknesses, track your progress over time,
                                    and receive personalized recommendations for
                                    improvement.
                                </p>
                                <div className="flex flex-wrap justify-center gap-8 mt-8">
                                    <div className="flex flex-col items-center">
                                        <div className="bg-gray-700 rounded-full w-16 h-16 flex items-center justify-center mb-3">
                                            <ChessKing className="w-8 h-8 text-teal-400" />
                                        </div>
                                        <span className="text-gray-200 font-medium">
                                            Advanced Analysis
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="bg-gray-700 rounded-full w-16 h-16 flex items-center justify-center mb-3">
                                            <ChessQueen className="w-8 h-8 text-teal-400" />
                                        </div>
                                        <span className="text-gray-200 font-medium">
                                            Game Archives
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <div className="bg-gray-700 rounded-full w-16 h-16 flex items-center justify-center mb-3">
                                            <ChessBishop className="w-8 h-8 text-teal-400" />
                                        </div>
                                        <span className="text-gray-200 font-medium">
                                            AI Coaching
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-16 bg-gray-800">
                    <div className="container mx-auto px-4 md:px-8">
                        <h2 className="text-3xl font-bold text-center mb-12">
                            Features
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Feature 1 */}
                            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:-translate-y-1 transition-transform">
                                <div className="bg-gray-700 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                                    <Search className="w-6 h-6 text-teal-400" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">
                                    Profile Lookup
                                </h3>
                                <p className="text-gray-300">
                                    Find any Chess.com player and view their
                                    detailed statistics, rating history, and
                                    performance metrics across different time
                                    controls.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:-translate-y-1 transition-transform">
                                <div className="bg-gray-700 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                                    <History className="w-6 h-6 text-teal-400" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">
                                    Game Archive
                                </h3>
                                <p className="text-gray-300">
                                    Browse through your entire game history with
                                    advanced filtering and sorting options.
                                    Identify patterns in your play across
                                    openings and time controls.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:-translate-y-1 transition-transform">
                                <div className="bg-gray-700 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                                    <Zap className="w-6 h-6 text-teal-400" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">
                                    Instant Analysis
                                </h3>
                                <p className="text-gray-300">
                                    Get immediate feedback on your games with
                                    move-by-move analysis, mistake
                                    identification, and improvement suggestions
                                    from our advanced chess engine.
                                </p>
                            </div>

                            {/* Feature 4 */}
                            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:-translate-y-1 transition-transform">
                                <div className="bg-gray-700 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                                    <Brain className="w-6 h-6 text-teal-400" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">
                                    AI Coaching
                                </h3>
                                <p className="text-gray-300">
                                    Receive personalized coaching and training
                                    plans based on your playing style,
                                    weaknesses, and goals. Improve faster with
                                    targeted exercises and recommendations.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Chessboard Section */}
                <section className="py-16 bg-gray-900">
                    <div className="container mx-auto px-4 md:px-8">
                        <div className="max-w-5xl mx-auto">
                            <h2 className="text-3xl font-bold text-center mb-12">
                                Visualize Your Chess Journey
                            </h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                                <div className="order-2 lg:order-1">
                                    <h3 className="text-2xl font-bold mb-4">
                                        Track Your Progress
                                    </h3>
                                    <p className="text-gray-300 mb-6 leading-relaxed">
                                        ChessPRO provides detailed analytics on
                                        your chess performance, helping you
                                        visualize your progress over time. Our
                                        interactive dashboards show your rating
                                        trends, win/loss ratios, and improvement
                                        areas.
                                    </p>
                                    <h3 className="text-2xl font-bold mb-4">
                                        Learn From Your Games
                                    </h3>
                                    <p className="text-gray-300 mb-6 leading-relaxed">
                                        Replay your games with our advanced
                                        analysis tools. Identify critical
                                        moments, missed opportunities, and
                                        brilliant moves. Our AI coach highlights
                                        patterns in your play style and suggests
                                        targeted improvements.
                                    </p>
                                    <Link
                                        to="/features"
                                        className="inline-flex items-center text-teal-400 hover:text-teal-300 font-medium"
                                    >
                                        Learn more about our features
                                        <svg
                                            className="ml-2 w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5l7 7-7 7"
                                            />
                                        </svg>
                                    </Link>
                                </div>
                                <div className="order-1 lg:order-2">
                                    {/* Simplified Chessboard */}
                                    <div className="aspect-square max-w-md mx-auto bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700">
                                        <div className="grid grid-cols-8 grid-rows-8 h-full w-full">
                                            {Array.from({ length: 64 }).map(
                                                (_, index) => {
                                                    const row = Math.floor(
                                                        index / 8
                                                    );
                                                    const col = index % 8;
                                                    const isBlack =
                                                        (row + col) % 2 === 1;

                                                    // Add some chess pieces for visual effect
                                                    let piece = null;
                                                    if (row === 0) {
                                                        if (
                                                            col === 0 ||
                                                            col === 7
                                                        )
                                                            piece = (
                                                                <ChessRook className="w-full h-full p-2 text-white" />
                                                            );
                                                        else if (
                                                            col === 1 ||
                                                            col === 6
                                                        )
                                                            piece = (
                                                                <ChessKnight className="w-full h-full p-2 text-white" />
                                                            );
                                                        else if (
                                                            col === 2 ||
                                                            col === 5
                                                        )
                                                            piece = (
                                                                <ChessBishop className="w-full h-full p-2 text-white" />
                                                            );
                                                        else if (col === 3)
                                                            piece = (
                                                                <ChessQueen className="w-full h-full p-2 text-white" />
                                                            );
                                                        else if (col === 4)
                                                            piece = (
                                                                <ChessKing className="w-full h-full p-2 text-white" />
                                                            );
                                                    } else if (row === 1) {
                                                        piece = (
                                                            <ChessPawn className="w-full h-full p-3 text-white" />
                                                        );
                                                    } else if (row === 6) {
                                                        piece = (
                                                            <ChessPawn className="w-full h-full p-3 text-teal-400" />
                                                        );
                                                    } else if (row === 7) {
                                                        if (
                                                            col === 0 ||
                                                            col === 7
                                                        )
                                                            piece = (
                                                                <ChessRook className="w-full h-full p-2 text-teal-400" />
                                                            );
                                                        else if (
                                                            col === 1 ||
                                                            col === 6
                                                        )
                                                            piece = (
                                                                <ChessKnight className="w-full h-full p-2 text-teal-400" />
                                                            );
                                                        else if (
                                                            col === 2 ||
                                                            col === 5
                                                        )
                                                            piece = (
                                                                <ChessBishop className="w-full h-full p-2 text-teal-400" />
                                                            );
                                                        else if (col === 3)
                                                            piece = (
                                                                <ChessQueen className="w-full h-full p-2 text-teal-400" />
                                                            );
                                                        else if (col === 4)
                                                            piece = (
                                                                <ChessKing className="w-full h-full p-2 text-teal-400" />
                                                            );
                                                    }

                                                    return (
                                                        <div
                                                            key={index}
                                                            className={`flex items-center justify-center ${
                                                                isBlack
                                                                    ? "bg-gray-700"
                                                                    : "bg-gray-600"
                                                            }`}
                                                        >
                                                            {piece}
                                                        </div>
                                                    );
                                                }
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-gray-900 border-t border-gray-800 py-8">
                <div className="container mx-auto px-4 md:px-8 text-center">
                    <p className="text-gray-400 mb-4">
                        © {new Date().getFullYear()} ChessPRO. All rights
                        reserved.
                    </p>
                    <div className="flex justify-center space-x-4">
                        <Link
                            to="/terms"
                            className="text-gray-500 hover:text-gray-300 text-sm"
                        >
                            Terms of Service
                        </Link>
                        <Link
                            to="/privacy"
                            className="text-gray-500 hover:text-gray-300 text-sm"
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            to="/contact"
                            className="text-gray-500 hover:text-gray-300 text-sm"
                        >
                            Contact Us
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
