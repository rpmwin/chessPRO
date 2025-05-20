// src/pages/AnalysisPage.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import axios from "axios";
import { Engine } from "../Engine";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { EvaluationBar } from "../components/EvaluationBar";
import { toast } from "react-hot-toast";
import api from "../api/axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

    // parse PGN → history
    useEffect(() => {
        if (!pgn) return;
        game.loadPgn(pgn.trim(), { sloppy: true });
        setMoveHistory(game.history({ verbose: true }));
        game.reset();
        setMoveIndex(0);
        setPosition(game.fen());
    }, [pgn, game]);

    // local engine on position change
    useEffect(() => {
        engine.stop();
        setLocalEval({ cp: 0, bestLine: "Analyzing…", depth: 0 });
        engine.evaluatePosition(position, 12);
        engine.onMessage((info) => {
            if (info.depth >= 8) {
                const cp =
                    (game.turn() === "w" ? 1 : -1) *
                    Number(info.positionEvaluation);
                setLocalEval({ cp, bestLine: info.pv, depth: info.depth });
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

    // build arrows
    const makeArrows = () => {
        if (backendData) {
            const idx = moveIndex === 0 ? 0 : moveIndex - 1;
            const bm = backendData.analysis?.[idx]?.bestMove;
            if (bm?.length === 4) {
                return [
                    {
                        fromSquare: bm.slice(0, 2),
                        toSquare: bm.slice(2, 4),
                        color: "rgba(0,255,0,0.6)",
                    },
                ];
            }
        } else {
            const tok = localEval.bestLine.split(" ");
            if (tok[0]?.length === 4) {
                return [
                    {
                        fromSquare: tok[0].slice(0, 2),
                        toSquare: tok[0].slice(2, 4),
                        color: "rgba(255,165,0,0.6)",
                    },
                ];
            }
        }
        return [];
    };
    const arrows = makeArrows();

    // current commentary
    const currentComment = backendData
        ? backendData.commentary[moveIndex]?.comment || "No tip"
        : `Local: ${localEval.bestLine?.split(" ")[0] || ""}`;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center text-blue-400 mb-4"
            >
                <ArrowLeft className="mr-2" /> Back
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Board side */}
                <div className="space-y-6">
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-4">
                            <EvaluationBar
                                cp={
                                    backendData
                                        ? backendData.analysis[moveIndex]?.eval
                                        : localEval.cp
                                }
                            />
                            <div className="flex-1 overflow-hidden">
                                <Chessboard
                                    position={position}
                                    boardWidth={400}
                                    customArrows={arrows}
                                    boardStyle={{ borderRadius: "8px" }}
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-center gap-4">
                            <button
                                onClick={back}
                                disabled={moveIndex === 0}
                                className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
                            >
                                <ChevronLeft />
                            </button>
                            <button
                                onClick={forward}
                                disabled={moveIndex >= moveHistory.length}
                                className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
                            >
                                <ChevronRight />
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                        <h3 className="text-xl mb-2">Commentary</h3>
                        <p className="italic">
                            {loadingBack
                                ? "Loading coach tips…"
                                : currentComment}
                        </p>
                    </div>
                </div>

                {/* Move history table */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 max-h-[640px] overflow-auto">
                    <h3 className="text-xl mb-4">Move History & Tips</h3>
                    <table className="w-full table-auto text-left">
                        <thead className="sticky top-0 bg-gray-800">
                            <tr className="border-b border-gray-700">
                                <th className="p-2">#</th>
                                <th className="p-2">White</th>
                                <th className="p-2">Black</th>
                                <th className="p-2">Tip</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({
                                length: Math.ceil(moveHistory.length / 2),
                            }).map((_, row) => {
                                const w = moveHistory[row * 2];
                                const b = moveHistory[row * 2 + 1];
                                const tipW =
                                    backendData?.commentary?.[row * 2]?.comment;
                                const tipB =
                                    backendData?.commentary?.[row * 2 + 1]
                                        ?.comment;
                                return (
                                    <tr
                                        key={row}
                                        className="hover:bg-gray-700 cursor-default"
                                    >
                                        <td className="p-2">{row + 1}</td>
                                        <td
                                            onClick={() => jumpTo(row * 2 + 1)}
                                            className="p-2 hover:text-blue-300 cursor-pointer"
                                        >
                                            {w?.san || "—"}
                                        </td>
                                        <td
                                            onClick={() => jumpTo(row * 2 + 2)}
                                            className="p-2 hover:text-blue-300 cursor-pointer"
                                        >
                                            {b?.san || "—"}
                                        </td>
                                        <td className="p-2 text-green-300 text-sm">
                                            {w ? tipW : ""}
                                            <br />
                                            {b ? tipB : ""}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
