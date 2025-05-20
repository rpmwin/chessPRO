// routes/chesscom.routes.js
import express from "express";
import axios from "axios";

const router = express.Router();
const chess_com_API = "https://api.chess.com/pub/player";

router.get("/profile/:username", async (req, res, next) => {
    try {
        const { username } = req.params;
        const resp = await axios.get(`${chess_com_API}/${username}`);

        const {
            avatar,
            player_id,
            url,
            name,
            username: uname,
            followers,
            location,
            last_online,
            joined,
            status,
        } = resp.data;

        res.json({
            avatar,
            username: uname,
            name,
            joined,
            status,
            last_online,
            location,
            followers,
            url,
            player_id,
        });
    } catch (err) {
        if (err.response?.status === 404) {
            return res.status(404).json({ error: "Chess.com user not found" });
        }
        next(err);
    }
});

router.get("/archives/:username", async (req, res, next) => {
    try {
        const { username } = req.params;
        const resp = await axios.get(
            `${chess_com_API}/${username}/games/archives`
        );
        res.json({ archives: resp.data.archives });
    } catch (err) {
        if (err.response?.status === 404) {
            return res.status(404).json({ error: "Chess.com user not found" });
        }
        next(err);
    }
});

router.get("/games/:username", async (req, res, next) => {
    try {
        const { username } = req.params;
        const { archiveUrl } = req.query;
        if (!archiveUrl) {
            return res
                .status(400)
                .json({ error: "Missing archiveUrl query parameter" });
        }
        const resp = await axios.get(archiveUrl);
        res.json({ games: resp.data.games });
    } catch (err) {
        if (err.response?.status === 404) {
            return res.status(404).json({
                error: "Archive not found or no games in this period",
            });
        }
        next(err);
    }
});

router.get("/stats/:username", async (req, res, next) => {
    try {
        const { username } = req.params;
        const resp = await axios.get(`${chess_com_API}/${username}/stats`);
        res.json(resp.data);
    } catch (err) {
        if (err.response?.status === 404) {
            return res.status(404).json({ error: "Chess.com user not found" });
        }
        next(err);
    }
});

export default router;
