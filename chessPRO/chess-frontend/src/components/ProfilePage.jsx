import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
    Trophy,
    Users,
    Calendar,
    Globe,
    ExternalLink,
    Clock,
    Award,
    CastleIcon as ChessKnight,
    RocketIcon as ChessRook,
    Activity,
    Target,
    Zap,
    Loader2,
} from "lucide-react";
import userImg from "./user.svg";

export default function ProfilePage() {
    const { username } = useParams();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [archives, setArchives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            setError(false);
            try {
                // First, fetch profile
                const pRes = await fetch(
                    `https://api.chess.com/pub/player/${username}`
                );
                if (!pRes.ok) {
                    throw new Error("Profile not found");
                }
                const pData = await pRes.json();
                setProfile(pData);

                // If profile is valid, fetch stats and archives in parallel
                const [sRes, aRes] = await Promise.all([
                    fetch(`https://api.chess.com/pub/player/${username}/stats`),
                    fetch(
                        `https://api.chess.com/pub/player/${username}/games/archives`
                    ),
                ]);

                if (!sRes.ok) throw new Error("Stats not found");
                if (!aRes.ok) throw new Error("Archives not found");

                const sData = await sRes.json();
                const aData = await aRes.json();

                setStats(sData);
                setArchives(aData.archives || []);
            } catch (err) {
                setError(true);
                // brief delay so user sees error
                setTimeout(() => navigate("/search", { replace: true }), 2000);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [username, navigate]);

    // RatingCard inline
    const RatingCard = ({ title, data, icon: Icon }) => {
        if (!data) return null;
        const last = data.last?.rating;
        const best = data.best?.rating ?? data.best?.score;
        const colorClass =
            last >= 2200
                ? "text-yellow-300"
                : last >= 1800
                ? "text-blue-300"
                : last >= 1400
                ? "text-green-300"
                : "text-gray-300";

        return (
            <div className="bg-gray-800/80 rounded-xl p-5 border border-gray-700 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                    <h3 className="text-lg font-semibold text-white">
                        {title}
                    </h3>
                </div>
                <div className="space-y-2">
                    {last != null && (
                        <div className="flex justify-between">
                            <span className="text-gray-400">Current</span>
                            <span className={`font-bold ${colorClass}`}>
                                {last}
                            </span>
                        </div>
                    )}
                    {best != null && (
                        <div className="flex justify-between">
                            <span className="text-gray-400">Best</span>
                            <span className="font-bold text-teal-400">
                                {best}
                            </span>
                        </div>
                    )}
                    {data.record && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Record</span>
                                <span className="font-medium">
                                    <span className="text-green-400">
                                        {data.record.win}W
                                    </span>{" "}
                                    -{" "}
                                    <span className="text-red-400">
                                        {data.record.loss}L
                                    </span>
                                    {data.record.draw != null && (
                                        <>
                                            {" "}
                                            -{" "}
                                            <span className="text-gray-400">
                                                {data.record.draw}D
                                            </span>
                                        </>
                                    )}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
                <h3 className="text-xl font-medium text-gray-300">
                    Loading profile...
                </h3>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center">
                <div className="bg-red-900/30 border border-red-800 text-red-300 px-6 py-4 rounded-lg max-w-md text-center">
                    <h3 className="text-xl font-medium mb-2">
                        Profile Not Found
                    </h3>
                    <p>Redirecting to search...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto">
                {/* Chess-themed decorative header */}
                <div className="relative h-16 mb-8 overflow-hidden rounded-lg">
                    <div
                        className="absolute inset-0 opacity-20"
                        style={{
                            backgroundImage: `
                linear-gradient(45deg, #ffffff 25%, transparent 25%),
                linear-gradient(-45deg, #ffffff 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #ffffff 75%),
                linear-gradient(-45deg, transparent 75%, #ffffff 75%)
              `,
                            backgroundSize: "20px 20px",
                            backgroundPosition:
                                "0 0, 0 10px, 10px -10px, -10px 0px",
                            filter: "blur(2px)",
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-600/80 to-blue-600/80" />
                    <div className="relative flex items-center h-full px-6">
                        <ChessKnight className="w-8 h-8 text-white mr-3" />
                        <h1 className="text-2xl font-bold text-white">
                            ChessPRO
                        </h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Profile Card */}
                    <div className="lg:col-span-1">
                        <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
                            {/* Header with gradient */}
                            <div className="bg-gradient-to-r from-teal-600 to-blue-600 p-6 text-center">
                                <div className="relative inline-block mb-4">
                                    <img
                                        src={profile.avatar || userImg}
                                        alt={profile.username}
                                        className="w-28 h-28 rounded-full border-4 border-gray-900 shadow-lg object-cover"
                                    />
                                    {profile.status === "online" && (
                                        <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-gray-900 rounded-full" />
                                    )}
                                </div>
                                <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                                    {profile.name || profile.username}
                                    {profile.premium && (
                                        <Trophy className="w-5 h-5 text-yellow-300" />
                                    )}
                                </h2>
                                <p className="text-gray-200 opacity-90">
                                    @{profile.username}
                                </p>
                            </div>

                            {/* Stats Grid */}
                            <div className="p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <Users className="w-5 h-5 text-teal-400" />
                                    <div>
                                        <p className="text-sm text-gray-400">
                                            Followers
                                        </p>
                                        <p className="font-semibold text-gray-200">
                                            {profile.followers.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-teal-400" />
                                    <div>
                                        <p className="text-sm text-gray-400">
                                            Joined
                                        </p>
                                        <p className="font-semibold text-gray-200">
                                            {format(
                                                new Date(profile.joined * 1000),
                                                "MMMM yyyy"
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-teal-400" />
                                    <div>
                                        <p className="text-sm text-gray-400">
                                            Last Online
                                        </p>
                                        <p className="font-semibold text-gray-200">
                                            {formatDistanceToNow(
                                                new Date(
                                                    profile.last_online * 1000
                                                )
                                            )}{" "}
                                            ago
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Globe className="w-5 h-5 text-teal-400" />
                                    <div>
                                        <p className="text-sm text-gray-400">
                                            Status
                                        </p>
                                        <div className="flex items-center">
                                            <span
                                                className={`w-2 h-2 rounded-full mr-2 ${
                                                    profile.status === "online"
                                                        ? "bg-green-500"
                                                        : "bg-gray-500"
                                                }`}
                                            />
                                            <p className="font-semibold text-gray-200 capitalize">
                                                {profile.status}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* External Link */}
                            <div className="px-6 pb-6">
                                <a
                                    href={profile.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors border border-gray-600"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View on Chess.com
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Right: Stats Panels */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Status Pills */}
                        <div className="flex flex-wrap gap-3">
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 rounded-full border border-gray-700">
                                <Activity className="w-4 h-4 text-teal-400" />
                                <span className="text-sm text-gray-200">
                                    {profile.status === "online"
                                        ? "Currently Online"
                                        : `Last seen ${formatDistanceToNow(
                                              new Date(
                                                  profile.last_online * 1000
                                              )
                                          )} ago`}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 rounded-full border border-gray-700">
                                <Zap className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm text-gray-200">
                                    Blitz: {stats.chess_blitz.last.rating}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 rounded-full border border-gray-700">
                                <Target className="w-4 h-4 text-purple-400" />
                                <span className="text-sm text-gray-200">
                                    Tactics: {stats.tactics.highest.rating}
                                </span>
                            </div>
                        </div>

                        {/* Game Statistics */}
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 mt-8 mb-4">
                            <ChessRook className="w-5 h-5 text-teal-400" />
                            Game Statistics
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <RatingCard
                                title="Blitz"
                                data={stats.chess_blitz}
                                icon={Zap}
                            />
                            <RatingCard
                                title="Rapid"
                                data={stats.chess_rapid}
                                icon={Activity}
                            />
                            <RatingCard
                                title="Bullet"
                                data={stats.chess_bullet}
                                icon={Zap}
                            />
                            <RatingCard
                                title="Daily"
                                data={stats.chess_daily}
                                icon={Calendar}
                            />
                        </div>

                        {/* Training & Achievements */}
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 mt-8 mb-4">
                            <Award className="w-5 h-5 text-teal-400" />
                            Training & Achievements
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <RatingCard
                                title="Tactics"
                                data={stats.tactics}
                                icon={Target}
                            />
                            <RatingCard
                                title="Puzzle Rush"
                                data={stats.puzzle_rush}
                                icon={Zap}
                            />
                        </div>

                        {/* Browse Games Button */}
                        <div className="mt-8 text-center">
                            <Link
                                to={`/profile/${username}/games`}
                                state={{ archives }}
                                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-all duration-300 hover:-translate-y-1 shadow-lg"
                            >
                                <ChessKnight className="w-5 h-5" />
                                Browse Games History
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
