"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Engine } from "../Engine";
import { EvaluationBar } from "../components/EvaluationBar";
import { toast } from "react-hot-toast";
import {
    ChevronLeft, ChevronRight, ArrowLeft, CastleIcon as ChessKnight,
    Lightbulb, BarChart3, Code, Clock, FastForward, Rewind, Info,
    Maximize2, Minimize2, Cpu, Brain, RefreshCw, RocketIcon as ChessRook,
    ChurchIcon as ChessBishop, CastleIcon as ChessKing, DiamondIcon as ChessQueen,
    PianoIcon as ChessPawn, Route, ExternalLink, Zap, TrendingUp, Award,
    Target, BookOpen, AlertTriangle
} from "lucide-react";

const BACKEND = "http://localhost:8080";

// Classification styles
const CLASSIFICATION_STYLE = {
    best:        { dot: "bg-emerald-400", label: "Best",        text: "text-emerald-400" },
    excellent:   { dot: "bg-teal-400",    label: "Excellent",   text: "text-teal-400" },
    good:        { dot: "bg-blue-400",    label: "Good",        text: "text-blue-400" },
    inaccuracy:  { dot: "bg-yellow-400",  label: "Inaccuracy",  text: "text-yellow-400" },
    mistake:     { dot: "bg-orange-400",  label: "Mistake",     text: "text-orange-400" },
    blunder:     { dot: "bg-red-500",     label: "Blunder",     text: "text-red-500" },
};

// Simple SVG sparkline for eval history
function EvalSparkline({ history, currentIndex }) {
    if (!history || history.length === 0) return null;
    const W = 300, H = 60, PAD = 4;
    const clamp = (v) => Math.max(-1000, Math.min(1000, v));
    const pts = history.map((v, i) => {
        const x = PAD + (i / (history.length - 1)) * (W - PAD * 2);
        const y = H / 2 - (clamp(v) / 1000) * (H / 2 - PAD);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const curX = currentIndex < history.length
        ? PAD + (currentIndex / (history.length - 1)) * (W - PAD * 2)
        : null;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none">
            {/* Zero line */}
            <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="#374151" strokeWidth="1" />
            {/* White territory fill */}
            <polyline
                points={pts.join(" ")}
                fill="none"
                stroke="#14b8a6"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            {/* Current position marker */}
            {curX !== null && (
                <line x1={curX} y1={PAD} x2={curX} y2={H - PAD}
                    stroke="#f97316" strokeWidth="1.5" strokeDasharray="2,2" />
            )}
        </svg>
    );
}

function ClassificationBadge({ classification }) {
    const s = CLASSIFICATION_STYLE[classification];
    if (!s) return null;
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.text}`}>
            <span className={`w-2 h-2 rounded-full inline-block ${s.dot}`} />
            {s.label}
        </span>
    );
}

function AccuracyBar({ accuracy, label, color }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-12 shrink-0">{label}</span>
            <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div
                    className={`h-2 rounded-full ${color}`}
                    style={{ width: `${Math.min(100, accuracy || 0)}%` }}
                />
            </div>
            <span className="text-xs font-medium text-white w-10 text-right">
                {accuracy != null ? `${accuracy}%` : "—"}
            </span>
        </div>
    );
}

export default function AnalysisPage() {
    const navigate = useNavigate();
    const pgn = sessionStorage.getItem("analysis_pgn");

    useEffect(() => { if (!pgn) navigate("/", { replace: true }); }, [pgn, navigate]);

    const game = useMemo(() => new Chess(), []);
    const engine = useMemo(() => new Engine(), []);

    const [moveHistory, setMoveHistory] = useState([]);
    const [moveIndex, setMoveIndex] = useState(0);
    const [position, setPosition] = useState(game.fen());
    const [localEval, setLocalEval] = useState({ cp: 0, bestLine: "", depth: 0 });
    // backendData: full Results object after analysis completes
    const [backendData, setBackendData] = useState(null);
    // streamMoves: partial MoveResult[] during streaming
    const [streamMoves, setStreamMoves] = useState([]);
    const [streamComments, setStreamComments] = useState({});
    const [analysisState, setAnalysisState] = useState("idle"); // idle|streaming|done|error
    const [streamProgress, setStreamProgress] = useState({ done: 0, total: 0 });
    const [showRawData, setShowRawData] = useState(false);
    const [fullscreenBoard, setFullscreenBoard] = useState(false);
    const [boardOrientation, setBoardOrientation] = useState("white");
    const [gameInfo, setGameInfo] = useState({
        whitePlayer: "White Player", blackPlayer: "Black Player",
        event: "Game Analysis", date: "Unknown Date", result: "*",
    });
    const [parsedBestLine, setParsedBestLine] = useState([]);
    const streamRef = useRef(null);

    // parse PGN → move history + game info
    useEffect(() => {
        if (!pgn) return;
        try {
            game.loadPgn(pgn.trim(), { sloppy: true });
            const h = game.header();
            setGameInfo({
                whitePlayer: h.White || "White Player",
                blackPlayer: h.Black || "Black Player",
                event: h.Event || "Game Analysis",
                date: h.Date || "Unknown Date",
                result: h.Result || "*",
            });
            setMoveHistory(game.history({ verbose: true }));
            game.reset();
            setMoveIndex(0);
            setPosition(game.fen());
        } catch (e) {
            console.error("PGN parse error:", e);
            toast.error("Error parsing game data");
        }
    }, [pgn, game]);

    // local engine analysis
    useEffect(() => {
        engine.stop();
        setLocalEval({ cp: 0, bestLine: "Analyzing…", depth: 0 });
        setParsedBestLine([]);
        engine.evaluatePosition(position, 12);
        engine.onMessage((info) => {
            if (info.depth >= 8) {
                const cp = (game.turn() === "w" ? 1 : -1) * Number(info.positionEvaluation);
                setLocalEval({ cp, bestLine: info.pv, depth: info.depth });
                try {
                    const tmp = new Chess(position);
                    const parsed = [];
                    for (const mv of (info.pv || "").split(" ").slice(0, 5)) {
                        if (mv?.length >= 4) {
                            try {
                                const m = tmp.move({ from: mv.slice(0,2), to: mv.slice(2,4),
                                    promotion: mv.length === 5 ? mv[4] : undefined });
                                if (m) parsed.push({ san: m.san, from: m.from, to: m.to, color: m.color });
                            } catch { break; }
                        }
                    }
                    setParsedBestLine(parsed);
                } catch {}
            }
        });
        return () => engine.stop();
    }, [position, engine, game]);

    // SSE streaming analysis
    const startAnalysis = useCallback(async () => {
        if (!pgn) return;
        setAnalysisState("streaming");
        setStreamMoves([]);
        setStreamComments({});
        setStreamProgress({ done: 0, total: 0 });

        const token = localStorage.getItem("accessToken");
        try {
            const res = await fetch(`${BACKEND}/analysis/stream`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ pgn }),
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const reader = res.body.getReader();
            streamRef.current = reader;
            const decoder = new TextDecoder();
            let buf = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop(); // keep incomplete line
                for (const line of lines) {
                    if (!line.startsWith("data:")) continue;
                    try {
                        const event = JSON.parse(line.slice(5).trim());
                        if (event.type === "progress") {
                            setStreamProgress({ done: event.done, total: event.total });
                        } else if (event.type === "move" && event.move) {
                            setStreamMoves(prev => {
                                const next = [...prev];
                                next[event.move.moveNumber - 1] = event.move;
                                return next;
                            });
                            setStreamProgress({ done: event.done, total: event.total });
                        } else if (event.type === "commentary" && event.comment) {
                            setStreamComments(prev => ({
                                ...prev,
                                [event.comment.moveNumber]: event.comment.comment,
                            }));
                        } else if (event.type === "done" && event.results) {
                            setBackendData(event.results);
                            setAnalysisState("done");
                        } else if (event.type === "error") {
                            setAnalysisState("error");
                            toast.error("Analysis failed — check your PGN");
                        }
                    } catch {}
                }
            }
        } catch (e) {
            if (analysisState === "streaming") {
                console.error("Stream error:", e);
                setAnalysisState("error");
                toast.error("Analysis connection failed");
            }
        }
    }, [pgn]);

    // Start analysis on mount
    useEffect(() => {
        if (pgn) startAnalysis();
        return () => streamRef.current?.cancel?.();
    }, [pgn]);

    // Navigation
    const forward = () => {
        if (moveIndex < moveHistory.length) {
            game.move(moveHistory[moveIndex]);
            setMoveIndex(i => i + 1);
            setPosition(game.fen());
        }
    };
    const back = () => {
        if (moveIndex > 0) { game.undo(); setMoveIndex(i => i - 1); setPosition(game.fen()); }
    };
    const jumpTo = (n) => {
        game.reset();
        for (let i = 0; i < n; i++) game.move(moveHistory[i]);
        setMoveIndex(n);
        setPosition(game.fen());
    };
    const jumpToStart = () => { game.reset(); setMoveIndex(0); setPosition(game.fen()); };
    const jumpToEnd = () => {
        game.reset();
        for (let i = 0; i < moveHistory.length; i++) game.move(moveHistory[i]);
        setMoveIndex(moveHistory.length);
        setPosition(game.fen());
    };

    // Arrows
    const arrows = useMemo(() => {
        const arr = [];
        const src = backendData || (streamMoves.length > 0 ? { analysis: null, moves: streamMoves } : null);
        if (src) {
            const idx = moveIndex === 0 ? 0 : moveIndex - 1;
            // backend analysis[] for best move arrow
            const bm = backendData?.analysis?.[idx]?.bestMove;
            if (bm?.length === 4) arr.push({ fromSquare: bm.slice(0,2), toSquare: bm.slice(2,4), color: "rgba(0,200,0,0.7)" });
        }
        const tok = localEval.bestLine?.split(" ");
        if (tok?.[0]?.length === 4) arr.push({ fromSquare: tok[0].slice(0,2), toSquare: tok[0].slice(2,4), color: "rgba(255,140,0,0.7)" });
        return arr;
    }, [backendData, streamMoves, moveIndex, localEval.bestLine]);

    // Current move data
    const currentMoveData = useMemo(() => {
        if (moveIndex === 0) return null;
        return backendData?.moves?.[moveIndex - 1] ?? streamMoves[moveIndex - 1] ?? null;
    }, [backendData, streamMoves, moveIndex]);

    const currentComment = useMemo(() => {
        if (moveIndex === 0) return "Navigate moves to see analysis tips.";
        if (backendData) return backendData.commentary?.[moveIndex - 1]?.comment || "No tip for this move.";
        const streaming = streamComments[moveIndex];
        if (streaming) return streaming;
        if (analysisState === "streaming") return "Analyzing…";
        return `Local: ${localEval.bestLine?.split(" ").slice(0,3).join(" ") || "Calculating..."}`;
    }, [moveIndex, backendData, streamComments, analysisState, localEval.bestLine]);

    const currentEval = useMemo(() => {
        if (backendData) return backendData.analysis?.[moveIndex]?.eval ?? null;
        return localEval.cp;
    }, [backendData, moveIndex, localEval.cp]);

    const currentDepth = useMemo(() => {
        if (backendData) return backendData.analysis?.[moveIndex]?.depth ?? 20;
        return localEval.depth;
    }, [backendData, moveIndex, localEval.depth]);

    const summary = backendData?.summary;
    const evalHistory = backendData?.evalHistory;

    const formatEval = (cp) => {
        if (cp == null) return "0.0";
        if (cp > 9000) return "M" + (10000 - cp);
        if (cp < -9000) return "-M" + (10000 + cp);
        if (cp > 1000) return "+" + (cp / 100).toFixed(1);
        return (cp / 100).toFixed(1);
    };

    const getEvalClass = (cp) => {
        if (cp == null) return "text-gray-400";
        if (cp > 150) return "text-green-400";
        if (cp < -150) return "text-red-400";
        return "text-yellow-400";
    };

    const getPieceIcon = (san) => {
        if (san?.startsWith("N")) return <ChessKnight className="h-4 w-4" />;
        if (san?.startsWith("B")) return <ChessBishop className="h-4 w-4" />;
        if (san?.startsWith("R")) return <ChessRook className="h-4 w-4" />;
        if (san?.startsWith("Q")) return <ChessQueen className="h-4 w-4" />;
        if (san?.startsWith("K")) return <ChessKing className="h-4 w-4" />;
        return <ChessPawn className="h-4 w-4" />;
    };

    const isStreaming = analysisState === "streaming";
    const progressPct = streamProgress.total > 0
        ? Math.round((streamProgress.done / streamProgress.total) * 100)
        : 0;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <button onClick={() => navigate(-1)}
                        className="flex items-center text-gray-300 hover:text-teal-400 transition-colors">
                        <ArrowLeft className="mr-2 h-5 w-5" /> Back
                    </button>
                    <div className="flex items-center gap-3">
                        <ChessKnight className="h-6 w-6 text-teal-500" />
                        <h1 className="text-xl font-bold text-white">ChessPRO Analysis</h1>
                    </div>
                </div>
            </div>

            {/* Analysis progress bar */}
            {isStreaming && (
                <div className="max-w-7xl mx-auto mb-4">
                    <div className="bg-gray-800/90 rounded-lg border border-gray-700 px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-teal-400 rounded-full animate-pulse" />
                                <span className="text-sm font-medium text-teal-400">
                                    Analyzing with Stockfish + Gemini…
                                </span>
                            </div>
                            <span className="text-sm text-gray-400">
                                {streamProgress.done}/{streamProgress.total} moves
                            </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div className="bg-teal-400 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${progressPct}%` }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Game info + summary */}
            <div className="max-w-7xl mx-auto mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Game info card */}
                <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Info className="h-4 w-4 text-teal-400" /> Game Info
                    </h2>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0">
                                <ChessKing className="h-4 w-4 text-gray-900" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">White</div>
                                <div className="text-sm font-medium text-white">{gameInfo.whitePlayer}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-900 border border-gray-600 rounded-full flex items-center justify-center shrink-0">
                                <ChessKing className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500">Black</div>
                                <div className="text-sm font-medium text-white">{gameInfo.blackPlayer}</div>
                            </div>
                        </div>
                        <div className="pt-1 space-y-1">
                            {summary?.opening?.name && (
                                <div className="flex items-center gap-2">
                                    <BookOpen className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                                    <span className="text-sm text-white">
                                        {summary.opening.eco && <span className="text-teal-400 mr-1">{summary.opening.eco}</span>}
                                        {summary.opening.name}
                                    </span>
                                </div>
                            )}
                            <div className="text-xs text-gray-400">{gameInfo.event} · {gameInfo.date}</div>
                            <div className="text-xs font-medium text-white">Result: {gameInfo.result}</div>
                        </div>
                    </div>
                </div>

                {/* Summary card */}
                <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Award className="h-4 w-4 text-teal-400" /> Game Summary
                    </h2>
                    {summary ? (
                        <div className="space-y-3">
                            <AccuracyBar accuracy={summary.whiteAccuracy} label="White" color="bg-emerald-400" />
                            <AccuracyBar accuracy={summary.blackAccuracy} label="Black" color="bg-blue-400" />
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500 font-medium">White</div>
                                    {summary.whiteBlunders > 0 && <div className="text-xs text-red-400">⚫ {summary.whiteBlunders} blunder{summary.whiteBlunders > 1 ? "s" : ""}</div>}
                                    {summary.whiteMistakes > 0 && <div className="text-xs text-orange-400">🟠 {summary.whiteMistakes} mistake{summary.whiteMistakes > 1 ? "s" : ""}</div>}
                                    {summary.whiteInaccuracies > 0 && <div className="text-xs text-yellow-400">🟡 {summary.whiteInaccuracies} inaccurac{summary.whiteInaccuracies > 1 ? "ies" : "y"}</div>}
                                    {summary.whiteBestMoves > 0 && <div className="text-xs text-emerald-400">✓ {summary.whiteBestMoves} best</div>}
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-gray-500 font-medium">Black</div>
                                    {summary.blackBlunders > 0 && <div className="text-xs text-red-400">⚫ {summary.blackBlunders} blunder{summary.blackBlunders > 1 ? "s" : ""}</div>}
                                    {summary.blackMistakes > 0 && <div className="text-xs text-orange-400">🟠 {summary.blackMistakes} mistake{summary.blackMistakes > 1 ? "s" : ""}</div>}
                                    {summary.blackInaccuracies > 0 && <div className="text-xs text-yellow-400">🟡 {summary.blackInaccuracies} inaccurac{summary.blackInaccuracies > 1 ? "ies" : "y"}</div>}
                                    {summary.blackBestMoves > 0 && <div className="text-xs text-emerald-400">✓ {summary.blackBestMoves} best</div>}
                                </div>
                            </div>
                            {summary.criticalMoments > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-amber-400">
                                    <Zap className="h-3 w-3" />
                                    {summary.criticalMoments} critical moment{summary.criticalMoments > 1 ? "s" : ""}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 py-2">
                            {isStreaming ? "Calculating…" : "No analysis yet"}
                        </div>
                    )}
                </div>
            </div>

            {/* Main grid */}
            <div className={`max-w-7xl mx-auto grid ${fullscreenBoard ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-5 gap-6"}`}>
                {/* Board side */}
                <div className={`space-y-4 ${fullscreenBoard ? "" : "lg:col-span-3"}`}>
                    {/* Board card */}
                    <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
                            <h2 className="font-medium text-white flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-teal-400" />
                                Position Analysis
                                {currentMoveData && (
                                    <span className="ml-2">
                                        <ClassificationBadge classification={currentMoveData.classification} />
                                    </span>
                                )}
                                {currentMoveData?.isCritical && (
                                    <span title="Critical moment" className="text-amber-400">
                                        <Zap className="h-3.5 w-3.5" />
                                    </span>
                                )}
                            </h2>
                            <div className="flex items-center gap-2">
                                {currentMoveData?.lichessUrl && (
                                    <a href={currentMoveData.lichessUrl} target="_blank" rel="noopener noreferrer"
                                        title="Analyze on Lichess"
                                        className="text-gray-400 hover:text-teal-400 transition-colors p-1.5 hover:bg-gray-700 rounded-md">
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                )}
                                <button onClick={() => setBoardOrientation(o => o === "white" ? "black" : "white")}
                                    className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-gray-700 rounded-md">
                                    <RefreshCw className="h-4 w-4" />
                                </button>
                                <button onClick={() => setFullscreenBoard(f => !f)}
                                    className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-gray-700 rounded-md">
                                    {fullscreenBoard ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Player name (top) */}
                        <div className="px-6 py-1.5 text-center text-sm text-gray-300 font-medium">
                            {boardOrientation === "white" ? gameInfo.blackPlayer : gameInfo.whitePlayer}
                        </div>

                        <div className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                {/* Eval bar */}
                                <div className="w-full sm:w-auto flex-shrink-0">
                                    <EvaluationBar cp={currentEval} />
                                    <div className="mt-2 text-center">
                                        <span className={`text-lg font-bold ${getEvalClass(currentEval)}`}>
                                            {formatEval(currentEval)}
                                        </span>
                                        <div className="text-xs text-gray-400 mt-0.5">Depth {currentDepth}</div>
                                        {currentMoveData?.mateIn != null && (
                                            <div className="text-xs text-red-400 mt-0.5">
                                                Mate in {currentMoveData.mateIn}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Chessboard */}
                                <div className="relative flex-1 w-full">
                                    <Chessboard
                                        position={position}
                                        boardWidth={fullscreenBoard ? 600 : 400}
                                        customArrows={arrows}
                                        boardOrientation={boardOrientation}
                                        customDarkSquareStyle={{ backgroundColor: "#3a506b" }}
                                        customLightSquareStyle={{ backgroundColor: "#d6e5e3" }}
                                        boardStyle={{ borderRadius: "0.5rem" }}
                                    />
                                </div>
                            </div>

                            {/* Player name (bottom) */}
                            <div className="mt-3 text-center text-sm text-gray-300 font-medium">
                                {boardOrientation === "white" ? gameInfo.whitePlayer : gameInfo.blackPlayer}
                            </div>

                            {/* Nav controls */}
                            <div className="mt-5 flex justify-center gap-3">
                                <button onClick={jumpToStart} disabled={moveIndex === 0}
                                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full disabled:opacity-50 transition-colors">
                                    <Rewind className="h-4 w-4" />
                                </button>
                                <button onClick={back} disabled={moveIndex === 0}
                                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full disabled:opacity-50 transition-colors">
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <div className="px-4 py-2 bg-gray-700 rounded-full flex items-center text-sm font-medium">
                                    {moveIndex} / {moveHistory.length}
                                </div>
                                <button onClick={forward} disabled={moveIndex >= moveHistory.length}
                                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full disabled:opacity-50 transition-colors">
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                                <button onClick={jumpToEnd} disabled={moveIndex >= moveHistory.length}
                                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full disabled:opacity-50 transition-colors">
                                    <FastForward className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Commentary */}
                        <div className="px-6 py-4 bg-gray-800 border-t border-gray-700">
                            <div className="flex items-start gap-3">
                                <div className="bg-teal-500/20 p-2 rounded-lg shrink-0">
                                    <Lightbulb className="h-5 w-5 text-teal-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="text-sm font-medium text-teal-400">
                                            {backendData ? "Coach Tip" : analysisState === "streaming" ? "Streaming…" : "Engine Analysis"}
                                        </h3>
                                        {currentMoveData && (
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{currentMoveData.phase}</span>
                                                {currentMoveData.centipawnLoss > 0 && (
                                                    <span>−{currentMoveData.centipawnLoss}cp</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-gray-300 text-sm">{currentComment}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Eval chart */}
                    {evalHistory && evalHistory.length > 1 && (
                        <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-700">
                                <h2 className="font-medium text-white flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-teal-400" />
                                    Evaluation Chart
                                </h2>
                            </div>
                            <div className="p-4">
                                <EvalSparkline history={evalHistory} currentIndex={moveIndex} />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Start</span>
                                    <span className="text-teal-400">Current position ↑</span>
                                    <span>End</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Best Line */}
                    <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-700">
                            <h2 className="font-medium text-white flex items-center gap-2">
                                <Route className="h-4 w-4 text-teal-400" />
                                Best Line (Local Engine)
                            </h2>
                        </div>
                        <div className="p-4">
                            {parsedBestLine.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {parsedBestLine.map((mv, i) => (
                                        <div key={i} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${mv.color === "w" ? "bg-white/10" : "bg-gray-900/50"}`}>
                                            {i === 0 && <Cpu className="h-3.5 w-3.5 text-orange-400" />}
                                            <span className="text-sm font-medium text-gray-200 flex items-center gap-1">
                                                {mv.color === "w" && <span className="text-gray-500">{Math.floor(i/2)+1}.</span>}
                                                {getPieceIcon(mv.san)}
                                                {mv.san}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-400 text-center py-2 text-sm">
                                    {localEval.depth > 0 ? "Calculating…" : "Waiting for engine…"}
                                </div>
                            )}
                            <div className="mt-3 text-xs text-gray-500">
                                Eval: <span className={getEvalClass(localEval.cp)}>{formatEval(localEval.cp)}</span>
                                {" "}· Depth: {localEval.depth}
                            </div>
                        </div>
                    </div>

                    {/* Raw JSON (collapsible) */}
                    {!fullscreenBoard && (
                        <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                            <button onClick={() => setShowRawData(s => !s)}
                                className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                                <div className="flex items-center gap-2">
                                    <Code className="h-4 w-4 text-teal-400" />
                                    <span className="font-medium text-white">Full Analysis JSON</span>
                                </div>
                                <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${showRawData ? "rotate-90" : ""}`} />
                            </button>
                            {showRawData && (
                                <div className="p-4 max-h-60 overflow-auto">
                                    <pre className="text-xs text-gray-400 whitespace-pre-wrap">
                                        {JSON.stringify(backendData || { localEval }, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Move history */}
                {!fullscreenBoard && (
                    <div className="lg:col-span-2">
                        <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-700 shadow-lg h-full flex flex-col">
                            <div className="px-4 py-3 border-b border-gray-700 sticky top-0 bg-gray-800/95 backdrop-blur-sm z-10">
                                <h2 className="font-medium text-white flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-teal-400" />
                                    Move History
                                    {isStreaming && (
                                        <span className="text-xs text-teal-400 font-normal">
                                            ({streamProgress.done}/{streamProgress.total})
                                        </span>
                                    )}
                                </h2>
                            </div>

                            <div className="flex-1 overflow-auto p-2">
                                <table className="w-full table-auto text-left">
                                    <thead className="sticky top-0 bg-gray-800/95 backdrop-blur-sm z-10">
                                        <tr className="border-b border-gray-700">
                                            <th className="p-2 text-xs font-medium text-gray-400">#</th>
                                            <th className="p-2 text-xs font-medium text-gray-400">White</th>
                                            <th className="p-2 text-xs font-medium text-gray-400">Black</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, row) => {
                                            const w = moveHistory[row * 2];
                                            const b = moveHistory[row * 2 + 1];
                                            const wData = backendData?.moves?.[row*2] ?? streamMoves[row*2];
                                            const bData = backendData?.moves?.[row*2+1] ?? streamMoves[row*2+1];
                                            const isActiveW = moveIndex === row * 2 + 1;
                                            const isActiveB = moveIndex === row * 2 + 2;
                                            const wComment = backendData?.commentary?.[row*2]?.comment ?? streamComments[row*2+1];
                                            const bComment = backendData?.commentary?.[row*2+1]?.comment ?? streamComments[row*2+2];

                                            return (
                                                <tr key={row} className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                                                    <td className="p-2 text-gray-500 font-mono text-xs">{row + 1}.</td>
                                                    <td onClick={() => w && jumpTo(row * 2 + 1)}
                                                        className={`p-2 ${w ? "cursor-pointer" : "text-gray-600"} ${isActiveW ? "bg-teal-500/20 rounded" : ""}`}>
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className={`text-sm font-medium ${isActiveW ? "text-white" : "text-gray-200 hover:text-teal-400"}`}>
                                                                {w?.san || "—"}
                                                            </span>
                                                            {wData && <ClassificationBadge classification={wData.classification} />}
                                                            {wComment && (
                                                                <span className="text-xs text-gray-500 line-clamp-2 mt-0.5">{wComment}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td onClick={() => b && jumpTo(row * 2 + 2)}
                                                        className={`p-2 ${b ? "cursor-pointer" : "text-gray-600"} ${isActiveB ? "bg-teal-500/20 rounded" : ""}`}>
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className={`text-sm font-medium ${isActiveB ? "text-white" : "text-gray-200 hover:text-teal-400"}`}>
                                                                {b?.san || "—"}
                                                            </span>
                                                            {bData && <ClassificationBadge classification={bData.classification} />}
                                                            {bComment && (
                                                                <span className="text-xs text-gray-500 line-clamp-2 mt-0.5">{bComment}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Legend */}
                            <div className="px-4 py-3 border-t border-gray-700 bg-gray-800/80">
                                <div className="grid grid-cols-3 gap-1">
                                    {Object.entries(CLASSIFICATION_STYLE).map(([k, v]) => (
                                        <div key={k} className="flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full inline-block ${v.dot}`} />
                                            <span className="text-xs text-gray-400">{v.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
