import React from "react";
import { format } from "date-fns";
import {
    Trophy,
    Users,
    Calendar,
    Globe,
    ExternalLink,
    CastleIcon as ChessKnight,
} from "lucide-react";

export default function ProfileCard({ profile }) {
    return (
        <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-teal-600 to-blue-600 p-6 text-center">
                <div className="relative inline-block mb-4">
                    <img
                        src={profile.avatar}
                        alt={profile.username}
                        className="w-28 h-28 rounded-full border-4 border-gray-900 shadow-lg object-cover"
                    />
                    {profile.status === "online" && (
                        <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-gray-900 rounded-full" />
                    )}
                </div>
                <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                    {profile.name || profile.username}
                    {profile.verified && (
                        <Trophy className="w-5 h-5 text-yellow-300" />
                    )}
                </h2>
                <p className="text-gray-200 opacity-90">@{profile.username}</p>
            </div>

            {/* Stats Grid */}
            <div className="p-6 space-y-4">
                {/** Followers **/}
                <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-teal-400" />
                    <div>
                        <p className="text-sm text-gray-400">Followers</p>
                        <p className="font-semibold text-gray-200">
                            {profile.followers.toLocaleString()}
                        </p>
                    </div>
                </div>

                {/** Joined **/}
                <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-teal-400" />
                    <div>
                        <p className="text-sm text-gray-400">Joined</p>
                        <p className="font-semibold text-gray-200">
                            {format(
                                new Date(profile.joined * 1000),
                                "MMMM yyyy"
                            )}
                        </p>
                    </div>
                </div>

                {/** Status **/}
                <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-teal-400" />
                    <div>
                        <p className="text-sm text-gray-400">Status</p>
                        <p className="font-semibold text-gray-200 capitalize">
                            {profile.status}
                        </p>
                    </div>
                </div>
            </div>

            {/* External Link */}
            <div className="px-6 pb-6">
                <a
                    href={profile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg border border-gray-600 transition-colors"
                >
                    <ExternalLink className="w-4 h-4" />
                    View on Chess.com
                </a>
            </div>
        </div>
    );
}
