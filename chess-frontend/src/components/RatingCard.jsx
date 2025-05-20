import React from "react";
import { Calendar, Zap, Activity, Target } from "lucide-react";

export default function RatingCard({ title, data, icon: Icon }) {
    if (!data) return null;

    const last = data.last?.rating;
    const best = data.best?.rating || data.best?.score;

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
                <h3 className="text-lg font-semibold text-white">{title}</h3>
            </div>
            <div className="space-y-2">
                {last && (
                    <div className="flex justify-between">
                        <span className="text-gray-400">Current</span>
                        <span className={`font-bold ${colorClass}`}>
                            {last}
                        </span>
                    </div>
                )}
                {best && (
                    <div className="flex justify-between">
                        <span className="text-gray-400">Best</span>
                        <span className="font-bold text-teal-400">{best}</span>
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
                                </span>{" "}
                                {data.record.draw != null && (
                                    <>
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
}
