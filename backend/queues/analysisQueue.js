import Queue from "bull";
import Analysis from "../models/Analysis.js";
import { spawn } from "child_process";
import path from "path";

export const analysisQueue = new Queue("analysis", {
    redis: { host: "127.0.0.1", port: 6379 },
});

// Process jobs (one at a time)
analysisQueue.process(async (job) => {
    const { analysisId } = job.data;
    const doc = await Analysis.findById(analysisId);
    if (!doc) throw new Error("Analysis record not found");

    // mark in_progress
    doc.status = "in_progress";
    await doc.save();

    // Here: spawn Stockfish CLI for deep analysis
    const enginePath = "/usr/bin/stockfish"; // adjust this
    const stockfish = spawn(enginePath, [], {
        stdio: ["pipe", "pipe", "pipe"],
    });

    // Load PGN into chess.js (optional) or just analyze final positions…
    // For illustration, we’ll just evaluate startpos at depth 18.
    stockfish.stdin.write("uci\n");
    stockfish.stdin.write("isready\n");
    stockfish.stdin.write("position startpos\n");
    stockfish.stdin.write("go depth 18\n");

    let buffer = "";
    const results = [];

    stockfish.stdout.on("data", (data) => {
        const lines = data.toString().split("\n");
        lines.forEach((line) => {
            if (line.startsWith("info")) {
                buffer = line;
            }
            if (line.startsWith("bestmove")) {
                // parse the last buffer for “cp” or “mate”
                const d = buffer.match(/depth (\d+)/)?.[1];
                const cp = buffer.match(/score cp (-?\d+)/)?.[1];
                const pv = buffer.match(/pv (.+)/)?.[1];
                results.push({
                    moveNumber: 0,
                    playedMoveEval: {
                        value: cp ? +cp : null,
                        bestMove: pv || null,
                    },
                    aiCommentary: `Depth ${d} PV: ${pv}`,
                });
                // finish
                stockfish.stdin.write("quit\n"); 
            }
        });
    });

    return new Promise((resolve, reject) => {
        stockfish.on("exit", async (code , signal) => {
            console.log("⚙️  stockfish exited with code", code , " signal = ",signal);
            if (code === 0) {
                doc.analysis = results;
                doc.status = "done";
                await doc.save();
                resolve();
            } else {
                doc.status = "error";
                doc.error = `Stockfish exited ${code}`;
                await doc.save();
                reject(new Error("Stockfish error"));
            }
        });
    });
});
