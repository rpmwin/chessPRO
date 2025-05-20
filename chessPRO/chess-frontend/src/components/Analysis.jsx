"use client";

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Engine } from "../Engine";
import { EvaluationBar } from "../components/EvaluationBar";
import { toast } from "react-hot-toast";
import api from "../api/axios";
import {
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    CastleIcon as ChessKnight,
    Lightbulb,
    BarChart3,
    Code,
    Clock,
    FastForward,
    Rewind,
    Info,
    Maximize2,
    Minimize2,
    Cpu,
    Brain,
    RefreshCw,
    RocketIcon as ChessRook,
    ChurchIcon as ChessBishop,
    CastleIcon as ChessKing,
    DiamondIcon as ChessQueen,
    PianoIcon as ChessPawn,
    Route,
} from "lucide-react";

export default function AnalysisPage() {
    const navigate = useNavigate();
    const pgn = sessionStorage.getItem("analysis_pgn");

    // redirect if no PGN
    useEffect(() => {
        if (!pgn) navigate("/", { replace: true });
    }, [pgn, navigate]);

    // chess.js + engine
    const game = useMemo(() => new Chess(), []);
    const engine = useMemo(() => new Engine(), []);

    // state
    const [moveHistory, setMoveHistory] = useState([]);
    const [moveIndex, setMoveIndex] = useState(0);
    const [position, setPosition] = useState(game.fen());
    const [localEval, setLocalEval] = useState({
        cp: 0,
        bestLine: "",
        depth: 0,
    });
    const [backendData, setBackendData] = useState(null);
    const [loadingBack, setLoadingBack] = useState(false);
    const [showRawData, setShowRawData] = useState(false);
    const [fullscreenBoard, setFullscreenBoard] = useState(false);
    const [boardOrientation, setBoardOrientation] = useState("white");
    const [gameInfo, setGameInfo] = useState({
        whitePlayer: "White Player",
        blackPlayer: "Black Player",
        event: "Game Analysis",
        date: "Unknown Date",
        result: "*",
    });
    const [parsedBestLine, setParsedBestLine] = useState([]);

    // parse PGN → history and extract player names
    useEffect(() => {
        if (!pgn) return;
        try {
            game.loadPgn(pgn.trim(), { sloppy: true });

            // Extract game info from PGN headers
            const headers = game.header();
            setGameInfo({
                whitePlayer: headers.White || "White Player",
                blackPlayer: headers.Black || "Black Player",
                event: headers.Event || "Game Analysis",
                date: headers.Date || "Unknown Date",
                result: headers.Result || "*",
            });

            setMoveHistory(game.history({ verbose: true }));
            game.reset();
            setMoveIndex(0);
            setPosition(game.fen());
        } catch (error) {
            console.error("Error parsing PGN:", error);
            toast.error("Error parsing game data");
        }
    }, [pgn, game]);

    // local engine on position change
    useEffect(() => {
        engine.stop();
        setLocalEval({ cp: 0, bestLine: "Analyzing…", depth: 0 });
        setParsedBestLine([]);

        engine.evaluatePosition(position, 12);
        engine.onMessage((info) => {
            if (info.depth >= 8) {
                const cp =
                    (game.turn() === "w" ? 1 : -1) *
                    Number(info.positionEvaluation);
                setLocalEval({ cp, bestLine: info.pv, depth: info.depth });

                // Parse the principal variation into a sequence of moves
                try {
                    const tempGame = new Chess(position);
                    const moves = info.pv.split(" ");
                    const parsedMoves = [];

                    for (let i = 0; i < Math.min(moves.length, 5); i++) {
                        // Limit to 5 moves
                        if (moves[i] && moves[i].length >= 4) {
                            try {
                                const move = tempGame.move({
                                    from: moves[i].substring(0, 2),
                                    to: moves[i].substring(2, 4),
                                    promotion:
                                        moves[i].length === 5
                                            ? moves[i][4]
                                            : undefined,
                                });

                                if (move) {
                                    parsedMoves.push({
                                        san: move.san,
                                        from: move.from,
                                        to: move.to,
                                        color: move.color,
                                    });
                                }
                            } catch (e) {
                                console.log("Invalid move in PV:", moves[i]);
                                break;
                            }
                        }
                    }

                    setParsedBestLine(parsedMoves);
                } catch (e) {
                    console.error("Error parsing best line:", e);
                }
            }
        });
        return () => engine.stop();
    }, [position, engine, game]);

    // fetch backend analysis + coaching
    useEffect(() => {
        if (!pgn) return;
        setLoadingBack(true);
        api.post(`/analysis`, { pgn })
            .then((res) => setBackendData(res.data))
            .catch((e) => {
                console.error(e);
                toast.error("Failed to get deep analysis");
            })
            .finally(() => setLoadingBack(false));
    }, [pgn]);

    // navigation helpers
    const forward = () => {
        if (moveIndex < moveHistory.length) {
            game.move(moveHistory[moveIndex]);
            const fen = game.fen();
            setMoveIndex((i) => i + 1);
            setPosition(fen);
        }
    };
    const back = () => {
        if (moveIndex > 0) {
            game.undo();
            setMoveIndex((i) => i - 1);
            setPosition(game.fen());
        }
    };
    const jumpTo = (n) => {
        game.reset();
        for (let i = 0; i < n; i++) game.move(moveHistory[i]);
        setMoveIndex(n);
        setPosition(game.fen());
    };
    const jumpToStart = () => {
        game.reset();
        setMoveIndex(0);
        setPosition(game.fen());
    };
    const jumpToEnd = () => {
        game.reset();
        for (let i = 0; i < moveHistory.length; i++) game.move(moveHistory[i]);
        setMoveIndex(moveHistory.length);
        setPosition(game.fen());
    };

    // flip board orientation
    const flipBoard = () => {
        setBoardOrientation(boardOrientation === "white" ? "black" : "white");
    };

    // build arrows
    const makeArrows = () => {
        const arrows = [];

        // Add backend arrow if available
        if (backendData) {
            const idx = moveIndex === 0 ? 0 : moveIndex - 1;
            const bm = backendData.analysis?.[idx]?.bestMove;
            if (bm?.length === 4) {
                arrows.push({
                    fromSquare: bm.slice(0, 2),
                    toSquare: bm.slice(2, 4),
                    color: "rgba(0, 200, 0, 0.7)", // Brighter green
                });
            }
        }

        // Add local engine arrow
        const tok = localEval.bestLine?.split(" ");
        if (tok && tok[0]?.length === 4) {
            arrows.push({
                fromSquare: tok[0].slice(0, 2),
                toSquare: tok[0].slice(2, 4),
                color: "rgba(255, 140, 0, 0.7)", // Brighter orange
            });
        }

        return arrows;
    };

    const arrows = makeArrows();

    // current commentary
    const currentComment = backendData
        ? backendData.commentary[moveIndex]?.comment || "No tip for this move."
        : `Local analysis: ${
              localEval.bestLine?.split(" ").slice(0, 3).join(" ") ||
              "Analyzing..."
          }`;

    // Get current evaluation
    const currentEval = backendData
        ? backendData.analysis[moveIndex]?.eval
        : localEval.cp;

    // Get current depth
    const currentDepth = backendData
        ? backendData.analysis[moveIndex]?.depth || 20
        : localEval.depth;

    // Format evaluation for display
    const formatEvaluation = (cp) => {
        if (cp === undefined) return "0.0";
        if (cp > 1000) return "M" + Math.ceil((2000 - cp) / 100);
        if (cp < -1000) return "M" + Math.ceil((cp + 2000) / -100);
        return (cp / 100).toFixed(1);
    };

    // Get evaluation class for coloring
    const getEvalClass = (cp) => {
        if (cp === undefined) return "text-gray-400";
        if (cp > 150) return "text-green-400";
        if (cp < -150) return "text-red-400";
        return "text-yellow-400";
    };

    // Get piece icon based on SAN notation
    const getPieceIcon = (san) => {
        if (san.startsWith("N")) return <ChessKnight className="h-4 w-4" />;
        if (san.startsWith("B")) return <ChessBishop className="h-4 w-4" />;
        if (san.startsWith("R")) return <ChessRook className="h-4 w-4" />;
        if (san.startsWith("Q")) return <ChessQueen className="h-4 w-4" />;
        if (san.startsWith("K")) return <ChessKing className="h-4 w-4" />;
        return <ChessPawn className="h-4 w-4" />;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6">
            {/* Back button and header */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center text-gray-300 hover:text-teal-400 transition-colors"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" /> Back
                    </button>

                    <div className="flex items-center">
                        <ChessKnight className="h-6 w-6 text-teal-500 mr-2" />
                        <h1 className="text-xl font-bold text-white">
                            ChessPRO Analysis
                        </h1>
                    </div>
                </div>
            </div>

            {/* Game Information Card */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
                    <h2 className="text-lg font-medium text-white mb-3 flex items-center">
                        <Info className="h-5 w-5 text-teal-400 mr-2" />
                        Game Information
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Players */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                                    <ChessKing className="h-6 w-6 text-gray-900" />
                                </div>
                                <div>
                                    <div className="text-sm text-gray-400">
                                        White
                                    </div>
                                    <div className="font-medium text-white">
                                        {gameInfo.whitePlayer}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-900 border border-gray-700 rounded-full flex items-center justify-center">
                                    <ChessKing className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <div className="text-sm text-gray-400">
                                        Black
                                    </div>
                                    <div className="font-medium text-white">
                                        {gameInfo.blackPlayer}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Game Details */}
                        <div className="space-y-2">
                            <div>
                                <span className="text-sm text-gray-400">
                                    Event:{" "}
                                </span>
                                <span className="text-white">
                                    {gameInfo.event}
                                </span>
                            </div>
                            <div>
                                <span className="text-sm text-gray-400">
                                    Date:{" "}
                                </span>
                                <span className="text-white">
                                    {gameInfo.date}
                                </span>
                            </div>
                            <div>
                                <span className="text-sm text-gray-400">
                                    Result:{" "}
                                </span>
                                <span className="text-white font-medium">
                                    {gameInfo.result}
                                </span>
                            </div>
                            <div>
                                <span className="text-sm text-gray-400">
                                    Current Move:{" "}
                                </span>
                                <span className="text-white font-medium">
                                    {moveIndex} / {moveHistory.length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary banner */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center">
                        <Info className="h-4 w-4 text-teal-400 mr-2" />
                        <span className="text-sm">
                            Move {moveIndex} of {moveHistory.length} – Engine
                            depth {currentDepth}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center">
                            <Cpu className="h-4 w-4 text-orange-400 mr-2" />
                            <span className="text-sm">
                                Local analysis active
                            </span>
                        </div>
                        <div className="flex items-center">
                            <Brain className="h-4 w-4 text-green-400 mr-2" />
                            <span className="text-sm">
                                {loadingBack
                                    ? "Coach loading..."
                                    : backendData
                                    ? "Coach tips ready"
                                    : "No coach tips"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content grid */}
            <div
                className={`max-w-7xl mx-auto grid ${
                    fullscreenBoard
                        ? "grid-cols-1"
                        : "grid-cols-1 lg:grid-cols-5 gap-6"
                }`}
            >
                {/* Board side */}
                <div
                    className={`space-y-6 ${
                        fullscreenBoard ? "col-span-1" : "lg:col-span-3"
                    }`}
                >
                    {/* Board card */}
                    <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-teal-900/20 hover:shadow-lg">
                        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
                            <h2 className="font-medium text-white flex items-center">
                                <BarChart3 className="h-4 w-4 text-teal-400 mr-2" />
                                Position Analysis
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={flipBoard}
                                    className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-gray-700 rounded-md"
                                    aria-label="Flip board"
                                    title="Flip board"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() =>
                                        setFullscreenBoard(!fullscreenBoard)
                                    }
                                    className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-gray-700 rounded-md"
                                    aria-label={
                                        fullscreenBoard
                                            ? "Exit fullscreen"
                                            : "Fullscreen board"
                                    }
                                    title={
                                        fullscreenBoard
                                            ? "Exit fullscreen"
                                            : "Fullscreen board"
                                    }
                                >
                                    {fullscreenBoard ? (
                                        <Minimize2 className="h-4 w-4" />
                                    ) : (
                                        <Maximize2 className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Black player name */}
                        <div className="px-6 py-2 text-center">
                            <div className="text-gray-300 font-medium">
                                {boardOrientation === "white"
                                    ? gameInfo.blackPlayer
                                    : gameInfo.whitePlayer}
                            </div>
                        </div>

                        <div className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                {/* Evaluation bar */}
                                <div className="w-full sm:w-auto flex-shrink-0">
                                    <EvaluationBar cp={currentEval} />
                                    <div className="mt-2 text-center">
                                        <span
                                            className={`text-lg font-bold ${getEvalClass(
                                                currentEval
                                            )}`}
                                            title="Evaluation in centipawns"
                                        >
                                            {formatEvaluation(currentEval)}
                                        </span>
                                        <div className="text-xs text-gray-400 mt-1">
                                            Depth {currentDepth}
                                        </div>
                                    </div>
                                </div>

                                {/* Chessboard */}
                                <div className="relative flex-1 w-full">
                                    {/* Loading overlay */}
                                    {loadingBack && (
                                        <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                                            <div className="flex flex-col items-center">
                                                <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                                <p className="text-teal-400 font-medium">
                                                    Analyzing game...
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <Chessboard
                                        position={position}
                                        boardWidth={fullscreenBoard ? 600 : 400}
                                        customArrows={arrows}
                                        boardOrientation={boardOrientation}
                                        customDarkSquareStyle={{
                                            backgroundColor: "#3a506b",
                                        }} // Changed to a blue-gray
                                        customLightSquareStyle={{
                                            backgroundColor: "#d6e5e3",
                                        }} // Changed to a light teal
                                        boardStyle={{
                                            borderRadius: "0.5rem",
                                            boxShadow:
                                                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                                        }}
                                    />
                                </div>
                            </div>

                            {/* White player name */}
                            <div className="mt-4 text-center">
                                <div className="text-gray-300 font-medium">
                                    {boardOrientation === "white"
                                        ? gameInfo.whitePlayer
                                        : gameInfo.blackPlayer}
                                </div>
                            </div>

                            {/* Navigation controls */}
                            <div className="mt-6 flex justify-center gap-3">
                                <button
                                    onClick={jumpToStart}
                                    disabled={moveIndex === 0}
                                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    aria-label="Jump to start"
                                >
                                    <Rewind className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={back}
                                    disabled={moveIndex === 0}
                                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    aria-label="Previous move"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <div className="px-4 py-2 bg-gray-700 rounded-full flex items-center">
                                    <span className="text-sm font-medium">
                                        {moveIndex} / {moveHistory.length}
                                    </span>
                                </div>
                                <button
                                    onClick={forward}
                                    disabled={moveIndex >= moveHistory.length}
                                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    aria-label="Next move"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={jumpToEnd}
                                    disabled={moveIndex >= moveHistory.length}
                                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    aria-label="Jump to end"
                                >
                                    <FastForward className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Commentary section */}
                        <div className="px-6 py-4 bg-gray-800 border-t border-gray-700">
                            <div className="flex items-start gap-3">
                                <div className="bg-teal-500/20 p-2 rounded-lg">
                                    <Lightbulb className="h-5 w-5 text-teal-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-teal-400 mb-1">
                                        {backendData
                                            ? "Coach Tip"
                                            : "Engine Analysis"}
                                    </h3>
                                    <p className="text-gray-300 text-base">
                                        {/* Increased font size for tips */}
                                        {currentComment}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Best Line Display */}
                    <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-700">
                            <h2 className="font-medium text-white flex items-center">
                                <Route className="h-4 w-4 text-teal-400 mr-2" />
                                Best Line (Principal Variation)
                            </h2>
                        </div>

                        <div className="p-4">
                            {parsedBestLine.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {parsedBestLine.map((move, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
                                                move.color === "w"
                                                    ? "bg-white/10"
                                                    : "bg-gray-900/50"
                                            }`}
                                        >
                                            {idx === 0 && (
                                                <span className="text-orange-400 mr-1">
                                                    <Cpu className="h-4 w-4" />
                                                </span>
                                            )}
                                            <span
                                                className={`text-sm font-medium ${
                                                    move.color === "w"
                                                        ? "text-gray-200"
                                                        : "text-gray-300"
                                                }`}
                                            >
                                                {move.color === "w" && (
                                                    <span className="text-gray-500 mr-1">
                                                        {Math.floor(idx / 2) +
                                                            1}
                                                        .
                                                    </span>
                                                )}
                                                {move.color === "b" &&
                                                    idx === 0 && (
                                                        <span className="text-gray-500 mr-1">
                                                            1...
                                                        </span>
                                                    )}
                                                <span className="flex items-center">
                                                    {getPieceIcon(move.san)}
                                                    <span className="ml-1">
                                                        {move.san}
                                                    </span>
                                                </span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-400 text-center py-2">
                                    {localEval.depth > 0
                                        ? "Calculating best line..."
                                        : "Waiting for engine analysis..."}
                                </div>
                            )}

                            <div className="mt-3 text-xs text-gray-500">
                                Evaluation:{" "}
                                <span className={getEvalClass(localEval.cp)}>
                                    {formatEvaluation(localEval.cp)}
                                </span>{" "}
                                • Depth: {localEval.depth} •
                                {parsedBestLine.length > 0
                                    ? `Showing ${parsedBestLine.length} moves ahead`
                                    : "No moves calculated yet"}
                            </div>
                        </div>
                    </div>

                    {/* Raw data panel (collapsible) */}
                    {!fullscreenBoard && (
                        <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                            <button
                                onClick={() => setShowRawData(!showRawData)}
                                className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
                            >
                                <div className="flex items-center">
                                    <Code className="h-4 w-4 text-teal-400 mr-2" />
                                    <h2 className="font-medium text-white">
                                        Full Analysis JSON
                                    </h2>
                                </div>
                                <ChevronRight
                                    className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${
                                        showRawData ? "rotate-90" : ""
                                    }`}
                                />
                            </button>
                            {showRawData && (
                                <div className="p-4 max-h-60 overflow-auto">
                                    <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                                        {JSON.stringify(
                                            backendData || { localEval },
                                            null,
                                            2
                                        )}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Move history table */}
                {!fullscreenBoard && (
                    <div className="lg:col-span-2">
                        <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg h-full flex flex-col">
                            <div className="px-4 py-3 border-b border-gray-700 sticky top-0 bg-gray-800/95 backdrop-blur-sm z-10">
                                <h2 className="font-medium text-white flex items-center">
                                    <Clock className="h-4 w-4 text-teal-400 mr-2" />
                                    Move History & Analysis
                                </h2>
                            </div>

                            <div className="flex-1 overflow-auto p-2">
                                <table className="w-full table-auto text-left">
                                    <thead className="sticky top-0 bg-gray-800/95 backdrop-blur-sm z-10">
                                        <tr className="border-b border-gray-700">
                                            <th className="p-2 text-xs font-medium text-gray-400">
                                                #
                                            </th>
                                            <th className="p-2 text-xs font-medium text-gray-400">
                                                White
                                            </th>
                                            <th className="p-2 text-xs font-medium text-gray-400">
                                                Black
                                            </th>
                                            <th className="p-2 text-xs font-medium text-gray-400">
                                                Tip
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from({
                                            length: Math.ceil(
                                                moveHistory.length / 2
                                            ),
                                        }).map((_, row) => {
                                            const w = moveHistory[row * 2];
                                            const b = moveHistory[row * 2 + 1];
                                            const tipW =
                                                backendData?.commentary?.[
                                                    row * 2
                                                ]?.comment;
                                            const tipB =
                                                backendData?.commentary?.[
                                                    row * 2 + 1
                                                ]?.comment;
                                            const isCurrentMoveW =
                                                moveIndex === row * 2 + 1;
                                            const isCurrentMoveB =
                                                moveIndex === row * 2 + 2;

                                            return (
                                                <tr
                                                    key={row}
                                                    className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors`}
                                                >
                                                    <td className="p-2 text-gray-400 font-mono">
                                                        {row + 1}.
                                                    </td>
                                                    <td
                                                        onClick={() =>
                                                            w &&
                                                            jumpTo(row * 2 + 1)
                                                        }
                                                        className={`p-2 ${
                                                            w
                                                                ? `cursor-pointer ${
                                                                      isCurrentMoveW
                                                                          ? "bg-teal-500/20 text-white font-medium rounded"
                                                                          : "hover:text-teal-400"
                                                                  }`
                                                                : "text-gray-600"
                                                        }`}
                                                    >
                                                        {w?.san || "—"}
                                                    </td>
                                                    <td
                                                        onClick={() =>
                                                            b &&
                                                            jumpTo(row * 2 + 2)
                                                        }
                                                        className={`p-2 ${
                                                            b
                                                                ? `cursor-pointer ${
                                                                      isCurrentMoveB
                                                                          ? "bg-teal-500/20 text-white font-medium rounded"
                                                                          : "hover:text-teal-400"
                                                                  }`
                                                                : "text-gray-600"
                                                        }`}
                                                    >
                                                        {b?.san || "—"}
                                                    </td>
                                                    <td className="p-2">
                                                        {w && tipW && (
                                                            <div
                                                                className={`text-sm mb-1 ${
                                                                    isCurrentMoveW
                                                                        ? "text-teal-300 font-medium"
                                                                        : "text-gray-400"
                                                                }`}
                                                            >
                                                                {tipW}
                                                            </div>
                                                        )}
                                                        {b && tipB && (
                                                            <div
                                                                className={`text-sm ${
                                                                    isCurrentMoveB
                                                                        ? "text-teal-300 font-medium"
                                                                        : "text-gray-400"
                                                                }`}
                                                            >
                                                                {tipB}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Legend */}
                            <div className="px-4 py-3 border-t border-gray-700 bg-gray-800/80">
                                <div className="flex flex-wrap gap-4 text-xs">
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 bg-orange-500/80 rounded-sm mr-2"></div>
                                        <span className="text-gray-400">
                                            Local Engine Arrow
                                        </span>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 bg-green-500/80 rounded-sm mr-2"></div>
                                        <span className="text-gray-400">
                                            Coach Suggestion Arrow
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
