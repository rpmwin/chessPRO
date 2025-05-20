import React, { useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useInView } from "react-intersection-observer";
import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

export default function GamesList({ initialArchives, username, api }) {
    const [archives] = useState([...initialArchives].reverse()); // newest-first
    const [games, setGames] = useState([]);
    const [loadingArchive, setLoadingArchive] = useState(false);
    const idxRef = useRef(0);
    const { ref, inView } = useInView({ threshold: 0.1 });
    const navigate = useNavigate();

    // get final FEN from PGN
    const getFinalPosition = (pgn) => {
        try {
            const chess = new Chess();
            chess.loadPgn(pgn);
            return chess.fen();
        } catch {
            return "start";
        }
    };

    // load next archive when inView
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
                // sort fetched games in descending order by end_time
                ...res.data.games.sort((a, b) => b.end_time - a.end_time),
            ]);
        } catch {
            toast.error("Failed to load games");
        } finally {
            setLoadingArchive(false);
        }
    }, [archives, api, username, loadingArchive]);

    // trigger load on scroll
    React.useEffect(() => {
        if (inView) loadNext();
    }, [inView, loadNext]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
            {games.map((game, i) => {
                const isWhite =
                    game.white.username.toLowerCase() ===
                    username.toLowerCase();
                const player = isWhite ? game.white : game.black;
                const opponent = isWhite ? game.black : game.white;
                const fen = getFinalPosition(game.pgn);
                const result =
                    game.white.result === "win"
                        ? `${game.white.username} won`
                        : game.black.result === "win"
                        ? `${game.black.username} won`
                        : "Draw";

                return (
                    <div
                        key={game.url}
                        className="bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-700"
                    >
                        <div className="aspect-square">
                            <Chessboard
                                position={fen}
                                boardWidth={300}
                                boardOrientation={isWhite ? "white" : "black"}
                            />
                        </div>
                        <div className="p-4 space-y-2">
                            <p className="text-sm text-gray-400">
                                {format(
                                    new Date(game.end_time * 1000),
                                    "MMM d, yyyy"
                                )}
                            </p>
                            <p className="font-medium text-gray-200">
                                {player.username} vs {opponent.username}
                            </p>
                            <p className="text-sm text-gray-400">
                                Result: {result}
                            </p>
                            <p className="text-sm text-gray-400">
                                Time: {game.time_control}
                            </p>
                            <button
                                onClick={() => {
                                    // save this game’s PGN & an identifier
                                    sessionStorage.setItem(
                                        "analysis_pgn",
                                        game.pgn
                                    );
                                    sessionStorage.setItem(
                                        "analysis_id",
                                        game.url
                                    );
                                    // navigate to Analysis page
                                    navigate("/analysis");
                                }}
                                className="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded"
                            >
                                Analyze
                            </button>
                            <a
                                href={game.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center text-blue-400 text-sm hover:underline"
                            >
                                <ExternalLink className="w-4 h-4 mr-1" /> View
                                on Chess.com
                            </a>
                        </div>
                    </div>
                );
            })}

            {/* sentinel for infinite scroll */}
            <div ref={ref} className="col-span-full text-center py-4">
                {loadingArchive ? (
                    <span className="animate-pulse text-gray-400">
                        Loading more…
                    </span>
                ) : idxRef.current >= archives.length ? (
                    <span className="text-gray-500">No more games</span>
                ) : null}
            </div>
        </div>
    );
}
