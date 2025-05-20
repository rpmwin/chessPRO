import React from "react";
import { format } from "date-fns";
import { Trophy, Users, Calendar, Globe, Link } from "lucide-react";

export default function ProfileCard({ profile }) {
    return (
        <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden max-w-2xl mx-auto border border-gray-700">
            {/* Header Gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-6">
                <div className="flex items-center gap-6">
                    <img
                        src={profile.avatar}
                        alt={profile.username}
                        className="w-24 h-24 rounded-full border-4 border-gray-900 shadow-lg object-cover"
                    />
                    <div className="text-gray-100">
                        <h2 className="text-2xl font-bold">
                            {profile.name || profile.username}
                        </h2>
                        <p className="text-gray-300">@{profile.username}</p>
                        {profile.verified && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-200 mt-2">
                                <Trophy className="w-4 h-4 mr-1" />
                                Verified
                            </span>
                        )}
                    </div>
                </div>
            </div>
            {/* Stats Grid */}
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-blue-400" />
                    <div>
                        <p className="text-sm text-gray-400">Followers</p>
                        <p className="font-semibold text-gray-200">
                            {profile.followers}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-green-400" />
                    <div>
                        <p className="text-sm text-gray-400">Joined</p>
                        <p className="font-semibold text-gray-200">
                            {format(
                                new Date(profile.joined * 1000),
                                "MMM yyyy"
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Globe className="w-6 h-6 text-purple-400" />
                    <div>
                        <p className="text-sm text-gray-400">Status</p>
                        <p className="font-semibold text-gray-200 capitalize">
                            {profile.status}
                        </p>
                    </div>
                </div>
                {/* add more cards here if you like */}
            </div>
            {/* External Link */}
            <div className="px-6 pb-6">
                <a
                    href={profile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 px-4 border border-blue-500 text-blue-400 rounded-lg hover:bg-blue-900/30 transition-colors"
                >
                    <Link className="w-4 h-4" />
                    View on Chess.com
                </a>
            </div>
        </div>
    );
}
