import React, { useState, useEffect, useMemo, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EvaluationBar } from "./EvaluationBar";
import axios from "axios";
import { Engine } from "../Engine"; // in-browser Stockfish engine

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const Analysis = () => {
    const navigate = useNavigate();
    const game = useMemo(() => new Chess(), []);
    const engine = useMemo(() => new Engine(), []);
    const pollingIntervalRef = useRef(null);

    // Board & move history state
    const [chessBoardPosition, setChessBoardPosition] = useState(game.fen());
    const [moveHistory, setMoveHistory] = useState([]);
    const [moveIndex, setMoveIndex] = useState(0);

    // Analysis data state
    const [backendAnalysisData, setBackendAnalysisData] = useState(null);
    const [cp, setCp] = useState(0);
    const [localEval, setLocalEval] = useState({
        cp: 0,
        bestLine: "",
        depth: 0,
    });

    // Poll for backend analysis results if task_id exists
    useEffect(() => {
        const taskId = sessionStorage.getItem("task_id");
        if (!taskId) return;
        pollingIntervalRef.current = setInterval(async () => {
            try {
                const statusResponse = await axios.get(
                    `${API_BASE_URL}/task_status/${taskId}`
                );
                if (statusResponse.data.status === "SUCCESS") {
                    clearInterval(pollingIntervalRef.current);
                    setBackendAnalysisData(statusResponse.data.result);
                    sessionStorage.setItem(
                        "analysisData",
                        JSON.stringify(statusResponse.data.result)
                    );
                }
            } catch (err) {
                console.error("Error polling analysis:", err);
            }
        }, 2000);
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);

    // Load PGN from session storage and initialize move history
    useEffect(() => {
        const storedPgn = `
       1. e4 g5 2. Nc3 f5 3. Qh5# 1-0
      `;
        // if (!storedPgn) {
        //     navigate("/");
        //     return;
        // }
        game.loadPgn(storedPgn.trim());
        setMoveHistory(game.history({ verbose: true }));
        game.reset();
        setMoveIndex(0);
        setChessBoardPosition(game.fen());
    }, [game, navigate]);

    // Run local engine evaluation on the current board position if backend data isn’t available.
    useEffect(() => {
        if (backendAnalysisData) return; // skip if backend analysis is present

        engine.stop();
        setLocalEval({ cp: 0, bestLine: "Analyzing...", depth: 0 });

        setTimeout(() => {
            engine.evaluatePosition(game.fen(), 18);
            engine.onMessage((response) => {
                const { positionEvaluation, pv, depth } = response;
                if (depth && depth < 10) return;
                const evaluation =
                    (game.turn() === "w" ? 1 : -1) * Number(positionEvaluation);
                setLocalEval({
                    cp: evaluation,
                    bestLine: pv || "",
                    depth: depth || 0,
                });
            });
        }, 100);
    }, [chessBoardPosition, backendAnalysisData, engine, game]);

    // Navigation functions for move history
    const forwardMove = () => {
        if (moveIndex < moveHistory.length) {
            game.move(moveHistory[moveIndex]);
            setMoveIndex(moveIndex + 1);
            setChessBoardPosition(game.fen());
            // For backend data, if available, update evaluation using index = moveIndex - 1 (if moveIndex > 0)
            if (backendAnalysisData && moveIndex > 0) {
                setCp(
                    backendAnalysisData.analysis[moveIndex - 1]
                        ?.played_move_eval.value || 0
                );
            }
        }
    };

    const backwardMove = () => {
        if (moveIndex > 0) {
            game.undo();
            setMoveIndex(moveIndex - 1);
            setChessBoardPosition(game.fen());
            if (backendAnalysisData && moveIndex > 1) {
                setCp(
                    backendAnalysisData.analysis[moveIndex - 2]
                        ?.played_move_eval.value || 0
                );
            }
        }
    };

    const jumpToMove = (n) => {
        game.reset();
        for (let i = 0; i < n; i++) {
            game.move(moveHistory[i]);
        }
        setMoveIndex(n);
        setChessBoardPosition(game.fen());
        if (backendAnalysisData && n > 0) {
            setCp(backendAnalysisData.analysis[n - 1]?.cp || 0);
        }
    };

    // Helper for local analysis arrow:
    // Parse the local engine output (e.g., "1 score cp 82 ... pv e2e4 e7e5 ...")
    // Finds "pv" and then takes the next token as the best move.
    const getLocalAnalysisArrow = (bestLine) => {
        const tokens = bestLine.split(" ");
        const pvIndex = tokens.indexOf("pv");
        if (pvIndex !== -1 && tokens.length > pvIndex + 1) {
            const bestMove = tokens[pvIndex + 1]; // e.g. "e2e4"
            if (bestMove.length === 4) {
                const from = bestMove.substring(0, 2);
                const to = bestMove.substring(2, 4);
                return [[from, to, "rgb(255, 165, 0)"]]; // orange arrow for local analysis
            }
        }
        return [];
    };

    // For backend analysis, we assume the array holds evaluations for each board state
    // where index 0 is for the starting position and index (n-1) is for the board after n moves.
    // To show the best move for the current board, we use:
    //    index = moveIndex === 0 ? 0 : moveIndex - 1.
    const getAnalysisArrow = () => {
        if (backendAnalysisData) {
            const index = moveIndex === 0 ? 0 : moveIndex - 1;
            const bestMove = backendAnalysisData.analysis?.[index]?.best_move;
            if (bestMove && bestMove.length >= 4) {
                return [
                    [
                        bestMove.substring(0, 2),
                        bestMove.substring(2, 4),
                        "rgb(0, 128, 0)",
                    ],
                ];
            }
        } else if (localEval.bestLine) {
            return getLocalAnalysisArrow(localEval.bestLine);
        }
        return [];
    };

    const analysisArrow = getAnalysisArrow();

    // For commentary, use the backend suggestion from the current board state.
    const currentCommentary = backendAnalysisData
        ? backendAnalysisData.analysis?.[moveIndex === 0 ? 0 : moveIndex - 1]
              ?.ai_commentary || "No commentary available."
        : "Local analysis: " +
          (localEval.bestLine
              ? localEval.bestLine.slice(0, 40)
              : "Analyzing...");

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <div className="max-w-[1600px] mx-auto p-6">
                <div className="mb-6 flex items-center">
                    <button
                        onClick={() => navigate("/")}
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Profile
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left side: Board, Controls, Evaluation */}
                    <div className="space-y-6">
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                            <div className="flex items-center gap-4">
                                <EvaluationBar
                                    cp={backendAnalysisData ? cp : localEval.cp}
                                />
                                <div className="flex-1">
                                    <Chessboard
                                        position={chessBoardPosition}
                                        boardWidth={500}
                                        customBoardStyle={{
                                            borderRadius: "0.75rem",
                                            boxShadow:
                                                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                                        }}
                                        customArrows={analysisArrow}
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-center gap-4">
                                <button
                                    onClick={backwardMove}
                                    disabled={moveIndex === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={forwardMove}
                                    disabled={moveIndex >= moveHistory.length}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                            <h3 className="text-xl font-semibold mb-4">
                                AI Commentary
                            </h3>
                            <p className="text-gray-300 leading-relaxed">
                                {currentCommentary}
                            </p>
                        </div>
                    </div>

                    {/* Right side: Move History */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                        <h3 className="text-xl font-semibold mb-4">
                            Move History
                        </h3>
                        <div className="overflow-auto max-h-[600px] custom-scrollbar">
                            <table className="w-full border-collapse">
                                <thead className="sticky top-0 bg-gray-800">
                                    <tr>
                                        <th className="py-3 px-4 text-left font-semibold text-gray-400 border-b border-gray-700">
                                            #
                                        </th>
                                        <th className="py-3 px-4 text-left font-semibold text-gray-400 border-b border-gray-700">
                                            White
                                        </th>
                                        <th className="py-3 px-4 text-left font-semibold text-gray-400 border-b border-gray-700">
                                            Black
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({
                                        length: Math.ceil(
                                            moveHistory.length / 2
                                        ),
                                    }).map((_, index) => {
                                        const whiteMove =
                                            moveHistory[index * 2];
                                        const blackMove =
                                            moveHistory[index * 2 + 1];
                                        return (
                                            <tr
                                                key={index}
                                                className="border-b border-gray-700 last:border-0"
                                            >
                                                <td className="py-3 px-4 text-gray-400">
                                                    {index + 1}
                                                </td>
                                                <td
                                                    onClick={() =>
                                                        whiteMove &&
                                                        jumpToMove(
                                                            index * 2 + 1
                                                        )
                                                    }
                                                    className={`py-3 px-4 ${
                                                        whiteMove
                                                            ? "cursor-pointer hover:bg-gray-700 hover:text-blue-400"
                                                            : ""
                                                    } transition-colors`}
                                                >
                                                    {whiteMove
                                                        ? whiteMove.san
                                                        : "—"}
                                                </td>
                                                <td
                                                    onClick={() =>
                                                        blackMove &&
                                                        jumpToMove(
                                                            index * 2 + 2
                                                        )
                                                    }
                                                    className={`py-3 px-4 ${
                                                        blackMove
                                                            ? "cursor-pointer hover:bg-gray-700 hover:text-blue-400"
                                                            : ""
                                                    } transition-colors`}
                                                >
                                                    {blackMove
                                                        ? blackMove.san
                                                        : "—"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analysis;
