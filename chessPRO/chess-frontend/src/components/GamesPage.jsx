"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useInView } from "react-intersection-observer";
import {
    ExternalLink,
    Loader2,
    CastleIcon as ChessKnight,
    Clock,
    Calendar,
    Trophy,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/axios"; // your configured Axios instance

export default function GamesPage() {
    const { username } = useParams();
    const navigate = useNavigate();

    const [archives, setArchives] = useState([]);
    const [games, setGames] = useState([]);
    const [loadingArchives, setLoadingArchives] = useState(true);
    const [loadingArchive, setLoadingArchive] = useState(false);
    const [allLoaded, setAllLoaded] = useState(false);
    const [visibleCount, setVisibleCount] = useState(30); // start by showing 30 games

    const boardRef = useRef(null);
    const [boardWidth, setBoardWidth] = useState(300);

    useEffect(() => {
        function updateWidth() {
            if (boardRef.current) {
                // subtract some padding if needed, here we just take the full width
                setBoardWidth(boardRef.current.offsetWidth);
            }
        }
        updateWidth();
        window.addEventListener("resize", updateWidth);
        return () => window.removeEventListener("resize", updateWidth);
    }, []);

    // index of next archive to load
    const idxRef = useRef(0);
    // intersection observer sentinel
    const { ref: sentinelRef, inView } = useInView({ threshold: 0.5 });

    // fetch archives on mount
    useEffect(() => {
        api.get(`/chesscom/archives/${username}`)
            .then((res) => {
                // newest-first
                setArchives(res.data.archives.reverse());
            })
            .catch(() => {
                toast.error("Could not load archives");
                navigate("/", { replace: true });
            })
            .finally(() => setLoadingArchives(false));
    }, [username, navigate]);

    // helper: final FEN from PGN
    const getFinalPosition = (pgn) => {
        try {
            const chess = new Chess();
            chess.loadPgn(pgn);
            return chess.fen();
        } catch {
            return "start";
        }
    };

    // helper: format time control
    const formatTime = (tc) => {
        if (tc === "daily") return "Daily";
        if (tc === "rapid") return "Rapid";
        const m = tc.match(/^(\d+)\|(\d+)$/);
        if (m) {
            const mins = parseInt(m[1], 10);
            const type =
                mins < 3
                    ? "Bullet"
                    : mins < 10
                    ? "Blitz"
                    : mins < 30
                    ? "Rapid"
                    : "Classical";
            return `${m[1]}|${m[2]} ${type}`;
        }
        return tc;
    };

    // helper: result info
    const getResultInfo = (g) => {
        const isWhite =
            g.white.username.toLowerCase() === username.toLowerCase();
        const winner =
            g.white.result === "win"
                ? g.white.username
                : g.black.result === "win"
                ? g.black.username
                : null;
        const text = winner ? `${winner} won` : "Draw";
        const color = winner
            ? winner.toLowerCase() === username.toLowerCase()
                ? "text-green-400"
                : "text-red-400"
            : "text-yellow-400";
        return {
            isWhite,
            player: isWhite ? g.white : g.black,
            opponent: isWhite ? g.black : g.white,
            resultText: text,
            resultColor: color,
        };
    };

    // load next archive’s games
    const loadNext = useCallback(async () => {
        if (loadingArchive || idxRef.current >= archives.length) return;
        setLoadingArchive(true);
        const url = archives[idxRef.current++];
        try {
            const res = await api.get(`/chesscom/games/${username}`, {
                params: { archiveUrl: url },
            });
            setGames((prev) => [
                ...prev,
                ...res.data.games.sort((a, b) => b.end_time - a.end_time),
            ]);
            if (idxRef.current >= archives.length) setAllLoaded(true);
        } catch {
            toast.error("Failed to load games");
        } finally {
            setLoadingArchive(false);
        }
    }, [archives, username, loadingArchive]);

    // trigger load when sentinel visible
    useEffect(() => {
        if (inView && !loadingArchives) loadNext();
    }, [inView, loadingArchives, loadNext]);

    // navigate to analysis
    const analyze = (game) => {
        sessionStorage.setItem("analysis_pgn", game.pgn);
        sessionStorage.setItem("analysis_id", game.url);
        navigate("/analysis");
    };

    // loading archives spinner
    if (loadingArchives) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin mr-2" />
                <span className="text-gray-400">Loading games…</span>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-white flex items-center">
                    <ChessKnight className="w-6 h-6 text-teal-500 mr-2" />
                    {username}'s Games
                </h1>
                <div className="text-gray-400 text-sm">
                    {games.length} games loaded {!allLoaded && "so far"}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {games.map((game) => {
                    const {
                        isWhite,
                        player,
                        opponent,
                        resultText,
                        resultColor,
                    } = getResultInfo(game);
                    const fen = getFinalPosition(game.pgn);
                    const tc = formatTime(game.time_control);
                    return (
                        <div
                            key={game.url}
                            className="bg-gray-800/90 rounded-xl shadow-lg w-max border border-gray-700 group hover:shadow-xl transition-shadow"
                        >
                            <div className="relative aspect-square">
                                <Chessboard
                                    position={fen}
                                    boardWidth={300}
                                    boardOrientation={
                                        isWhite ? "white" : "black"
                                    }
                                    customDarkSquareStyle={{
                                        backgroundColor: "#B58863",
                                    }}
                                    customLightSquareStyle={{
                                        backgroundColor: "#F0D9B5",
                                    }}
                                />
                                <div className="absolute top-2 right-2 bg-gray-900/80 rounded-full p-1.5">
                                    <ChessKnight className="w-4 h-4 text-teal-400" />
                                </div>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="flex justify-between text-sm text-gray-400">
                                    <span className="flex items-center">
                                        <Calendar className="w-4 h-4 mr-1.5" />{" "}
                                        {format(
                                            new Date(game.end_time * 1000),
                                            "MMM d, yyyy"
                                        )}
                                    </span>
                                    <span className="flex items-center">
                                        <Clock className="w-4 h-4 mr-1.5" />{" "}
                                        {tc}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-white font-medium">
                                        {player.username} vs {opponent.username}
                                    </h3>
                                    <p
                                        className={`text-sm font-medium ${resultColor}`}
                                    >
                                        {resultText}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => analyze(game)}
                                        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-lg flex items-center justify-center transition transform hover:-translate-y-0.5"
                                    >
                                        <Trophy className="w-4 h-4 mr-2" />{" "}
                                        Analyze
                                    </button>
                                    <a
                                        href={game.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center text-gray-300 hover:text-teal-400 text-sm"
                                    >
                                        <ExternalLink className="w-4 h-4 mr-1.5" />{" "}
                                        View on Chess.com
                                    </a>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* infinite scroll sentinel */}
                <div
                    ref={sentinelRef}
                    className="col-span-full text-center py-10"
                >
                    {loadingArchive ? (
                        <div className="flex items-center justify-center text-gray-400">
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />{" "}
                            Loading more games...
                        </div>
                    ) : allLoaded ? (
                        <div className="inline-block text-gray-500 bg-gray-800/60 px-4 py-2 rounded-full border border-gray-700">
                            No more games to load
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
