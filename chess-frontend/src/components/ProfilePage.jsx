import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios.js";
import { toast } from "react-hot-toast";

export default function ProfilePage() {
    const { username } = useParams(); // ✅ Now matches the route param
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [pRes, sRes] = await Promise.all([
                    api.get(`/chesscom/profile/${username}`),
                    api.get(`/chesscom/stats/${username}`),
                ]);
                setProfile(pRes.data);
                setStats(sRes.data);
            } catch (err) {
                if (err.response?.status === 404) {
                    toast.error("User not found");
                    navigate("/", { replace: true });
                } else {
                    toast.error("Failed to load profile");
                }
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [username, navigate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8">
            {/* Profile Header */}
            <div className="flex items-center space-x-6">
                <img
                    src={profile.avatar}
                    alt={`${profile.username} avatar`}
                    className="w-28 h-28 rounded-full object-cover border-2 border-blue-600"
                />
                <div>
                    <h1 className="text-3xl font-bold">
                        {profile.name || profile.username}
                    </h1>
                    <p className="text-gray-600">@{profile.username}</p>
                    <p className="mt-1 text-sm text-gray-500">
                        Joined{" "}
                        {new Date(profile.joined * 1000).toLocaleDateString()}{" "}
                        &mdash; {profile.followers} followers
                    </p>
                    {profile.status && (
                        <span className="inline-block mt-2 px-2 py-1 bg-gray-200 rounded-full text-sm">
                            {profile.status}
                        </span>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                    "chess_rapid",
                    "chess_blitz",
                    "chess_bullet",
                    "chess_daily",
                ].map(
                    (mode) =>
                        stats[mode] && (
                            <div
                                key={mode}
                                className="p-4 border rounded shadow-sm"
                            >
                                <h2 className="font-semibold mb-2">
                                    {mode.replace("chess_", "").toUpperCase()}
                                </h2>
                                <p>Last: {stats[mode].last.rating}</p>
                                <p>Best: {stats[mode].best.rating}</p>
                                <p className="mt-1 text-sm text-gray-600">
                                    Record: {stats[mode].record.win}&ndash;
                                    {stats[mode].record.loss}
                                    {stats[mode].record.draw != null &&
                                        `–${stats[mode].record.draw}`}
                                </p>
                            </div>
                        )
                )}

                {stats.tactics && (
                    <div className="p-4 border rounded shadow-sm">
                        <h2 className="font-semibold mb-2">Tactics</h2>
                        <p>Peak: {stats.tactics.highest.rating}</p>
                    </div>
                )}

                {stats.puzzle_rush?.best && (
                    <div className="p-4 border rounded shadow-sm">
                        <h2 className="font-semibold mb-2">Puzzle Rush</h2>
                        <p>Best Score: {stats.puzzle_rush.best.score}</p>
                    </div>
                )}
            </div>

            {/* Show Games Button */}
            <div className="text-center">
                <Link
                    to={`/profile/${username}/games`}
                    className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                    Show Games
                </Link>
            </div>
        </div>
    );
}
