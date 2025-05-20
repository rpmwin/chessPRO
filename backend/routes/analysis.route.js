import express from "express";
import { Chess } from "chess.js";
import { spawn } from "child_process";
import auth from "../middleware/auth.js";
import { GoogleGenAI } from "@google/genai";

const router = express.Router();

router.post("/", auth, async (req, res, next) => {
    try {
        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
        });

        const { pgn } = req.body;
        if (!pgn) return res.status(400).json({ error: "Missing PGN" });

        // Load moves from PGN
        const game = new Chess();
        game.loadPgn(pgn.trim(), { sloppy: true });
        const history = game.history({ verbose: true });
        if (history.length === 0) {
            return res.status(400).json({ error: "Invalid or empty PGN" });
        }

        // Reset to start‑pos for per‑move analysis
        game.reset();
        const stockfishPath = "/usr/bin/stockfish";
        const results = [];

        for (let i = 0; i < history.length; i++) {
            // 1) get FEN of the position *before* the next move
            const fen = game.fen();

            // 2) spawn and initialize Stockfish
            const sf = spawn(stockfishPath);
            await new Promise((r) => {
                sf.stdin.write("uci\n");
                sf.stdin.write("isready\n");
                sf.stdout.on("data", (chunk) => {
                    if (chunk.toString().includes("readyok")) r();
                });
            });

            // 3) ask engine to analyze this FEN to depth 20
            sf.stdin.write(`position fen ${fen}\n`);
            sf.stdin.write("go depth 12\n");

            let bestmoveLine = "";
            let lastInfoLine = "";
            await new Promise((r) => {
                sf.stdout.on("data", (chunk) => {
                    const lines = chunk.toString().split("\n");
                    for (const line of lines) {
                        if (line.startsWith("info")) {
                            lastInfoLine = line;
                        } else if (line.startsWith("bestmove")) {
                            bestmoveLine = line;
                            r();
                            break;
                        }
                    }
                });
            });

            // 4) tell Stockfish to quit
            sf.stdin.write("quit\n");

            // 5) parse depth & eval from lastInfoLine
            const depthMatch = lastInfoLine.match(/depth (\d+)/);
            const cpMatch = lastInfoLine.match(/score cp (-?\d+)/);
            const mateMatch = lastInfoLine.match(/score mate (-?\d+)/);

            let evalScore = null;
            if (cpMatch) {
                evalScore = parseInt(cpMatch[1], 10);
            } else if (mateMatch) {
                const m = parseInt(mateMatch[1], 10);
                // positive mate in N => large +; negative => large –
                evalScore = m > 0 ? 10000 - m : -10000 - m;
            }
            // flip if it was Black to move
            if (fen.split(" ")[1] === "b" && evalScore !== null) {
                evalScore = -evalScore;
            }

            // 6) get PV's first move in UCI, convert to SAN
            const pvMatch = lastInfoLine.match(
                /pv\s+([a-h][1-8][a-h][1-8][nbrqNBRQ]?)/
            );
            let bestMoveSan = null;
            if (pvMatch) {
                const uci = pvMatch[1];
                // apply on board, read SAN, then undo
                const sanObj = game.move(
                    {
                        from: uci.slice(0, 2),
                        to: uci.slice(2, 4),
                        promotion: uci[4],
                    },
                    { sloppy: true }
                );
                if (sanObj) {
                    bestMoveSan = sanObj.san;
                    game.undo();
                }
            }

            // 7) now apply the actual played move so we advance to next position
            game.move(history[i].san, { sloppy: true });

            // 8) record
            results.push({
                moveNumber: i + 1,
                playedMove: history[i].san,
                eval: evalScore,
                bestMove: bestMoveSan,
                depth: depthMatch ? parseInt(depthMatch[1], 10) : null,
            });
        }

        const systemInstruction = `
You are a chess coach. Given a JSON array of moves with fields:
  moveNumber, playedMove, eval, bestMove, depth
Return **only** a JSON array of objects:
  { "moveNumber": <n>, "comment": "<one-sentence coaching tip>" }
Do **not** include any explanatory text or markdown—just the raw JSON. and also try to give comments for each move possible 
`.trim();

        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: JSON.stringify(results, null, 2),
            config: {
                systemInstruction,
                temperature: 0.7,
                maxOutputTokens: 8000,
            },
        });

        // ➊ extract
        const raw =
            response.candidates?.[0]?.content?.parts?.[0]?.text ||
            response.candidates?.[0]?.content ||
            "";
        console.log("🔹 Gemini raw:\n", raw);

        // ➋ clean
        let text = raw.trim();
        text = text.replace(/```json\s*([\s\S]*?)```/, "$1");
        const start = text.indexOf("[");
        const end = text.lastIndexOf("]");
        if (start < 0 || end < 0) {
            console.error("Cannot locate JSON array in reply:", text);
            throw new Error("Gemini returned invalid JSON format");
        }
        text = text.slice(start, end + 1);

        // ➌ parse
        let commentary;
        try {
            commentary = JSON.parse(text);
        } catch (e) {
            console.error("JSON parse failed:", text);
            throw new Error("Gemini returned non-JSON comments");
        }

        // ➍ optional length check
        if (
            !Array.isArray(commentary) ||
            commentary.length !== results.length
        ) {
            console.warn(
                `⚠️ Expected ${results.length} comments, but got ${commentary.length}`
            );
        }

        return res.json({ analysis: results, commentary });
    } catch (err) {
        next(err);
    }
});

export default router;
