import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { toast } from "react-hot-toast";
import ProfileCard from "../components/ProfileCard";
import { Globe, Clock, Award } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

export default function ProfilePage() {
    const { username } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [archives, setArchives] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [pRes, sRes, aRes] = await Promise.all([
                    api.get(`/chesscom/profile/${username}`),
                    api.get(`/chesscom/stats/${username}`),
                    api.get(`/chesscom/archives/${username}`),
                ]);
                setProfile(pRes.data);
                setStats(sRes.data);
                setArchives(aRes.data.archives);
            } catch (err) {
                toast.error("User not found");
                navigate("/", { replace: true });
            } finally {
                setLoading(false);
            }
        })();
    }, [username, navigate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                Loading…
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-6 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Profile Card */}
                <div>
                    <ProfileCard profile={profile} />
                </div>

                {/* Right: Detailed Stats */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info Row */}
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg">
                            <Globe className="w-5 h-5 text-purple-300" />
                            {/* <span>
                                {new URL(profile.country).pathname.replace(
                                    "/",
                                    ""
                                )}
                            </span> */}
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg">
                            <Clock className="w-5 h-5 text-yellow-300" />
                            <span>
                                Last online{" "}
                                {formatDistanceToNow(
                                    new Date(profile.last_online * 1000)
                                )}{" "}
                                ago
                            </span>
                        </div>
                        {profile.league && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg">
                                <Award className="w-5 h-5 text-green-300" />
                                <span>League: {profile.league}</span>
                            </div>
                        )}
                    </div>

                    {/* Ratings Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                        className="p-4 bg-gray-700 rounded-lg shadow-inner"
                                    >
                                        <h3 className="text-lg font-semibold mb-2 text-blue-200">
                                            {mode
                                                .replace("chess_", "")
                                                .toUpperCase()}
                                        </h3>
                                        <p>
                                            Last:{" "}
                                            <span className="font-medium">
                                                {stats[mode].last.rating}
                                            </span>
                                        </p>
                                        <p>
                                            Best:{" "}
                                            <span className="font-medium">
                                                {stats[mode].best.rating}
                                            </span>
                                        </p>
                                        <p className="text-sm mt-1">
                                            Record: {stats[mode].record.win}
                                            &ndash;{stats[mode].record.loss}
                                            {stats[mode].record.draw != null &&
                                                `–${stats[mode].record.draw}`}
                                        </p>
                                    </div>
                                )
                        )}

                        {/* Tactics & Puzzle Rush */}
                        {stats.tactics && (
                            <div className="p-4 bg-gray-700 rounded-lg shadow-inner">
                                <h3 className="text-lg font-semibold mb-2 text-blue-200">
                                    Tactics
                                </h3>
                                <p>
                                    Peak:{" "}
                                    <span className="font-medium">
                                        {stats.tactics.highest.rating}
                                    </span>
                                </p>
                            </div>
                        )}
                        {stats.puzzle_rush?.best && (
                            <div className="p-4 bg-gray-700 rounded-lg shadow-inner">
                                <h3 className="text-lg font-semibold mb-2 text-blue-200">
                                    Puzzle Rush
                                </h3>
                                <p>
                                    Score:{" "}
                                    <span className="font-medium">
                                        {stats.puzzle_rush.best.score}
                                    </span>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Show Games Button */}
                    <div className="text-center pt-4">
                        <Link
                            to={`/profile/${username}/games`}
                            state={{ archives }}
                            className="inline-block px-8 py-2 bg-blue-600 hover:bg-blue-700 rounded-full font-semibold transition"
                        >
                            Browse Games
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
