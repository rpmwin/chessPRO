import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { toast } from "react-hot-toast";

export default function GamesPage() {
    const { username } = useParams();
    const navigate = useNavigate();
    const [archives, setArchives] = useState([]);
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const idxRef = useRef(0);
    const loader = useRef(null);

    // Fetch archives first
    useEffect(() => {
        api.get(`/chesscom/archives/${username}`)
            .then((res) => setArchives(res.data.archives))
            .catch((err) => {
                if (err.response?.status === 404) {
                    toast.error("User not found");
                    navigate("/", { replace: true });
                } else {
                    toast.error("Failed to load archives");
                    setError(true);
                }
            })
            .finally(() => setLoading(false));
    }, [username, navigate]);

    // Load next month’s games
    const loadMore = useCallback(() => {
        if (idxRef.current >= archives.length) return;
        const url = archives[idxRef.current++];
        api.get(`/chesscom/games/${username}`, { params: { archiveUrl: url } })
            .then((res) => setGames((prev) => [...prev, ...res.data.games]))
            .catch(() => {
                toast.error("Failed to load games");
                setError(true);
            });
    }, [archives, username]);

    // Infinite scroll via IntersectionObserver
    useEffect(() => {
        if (loading || error) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMore();
                }
            },
            { threshold: 1 }
        );
        if (loader.current) observer.observe(loader.current);
        return () => observer.disconnect();
    }, [loading, error, loadMore]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
            </div>
        );
    }
    if (error) {
        return (
            <p className="text-center mt-20 text-red-600">
                Something went wrong.
            </p>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold">{username}’s Games</h1>
            <ul className="space-y-4">
                {games.map((game, i) => {
                    const date = new Date(
                        game.pgn.match(/\[Date "(.*?)"\]/)?.[1]
                    ).toDateString();
                    const white = game.white.username;
                    const black = game.black.username;
                    const result =
                        game.white.result === "win"
                            ? `${white} won`
                            : game.black.result === "win"
                            ? `${black} won`
                            : "Draw";
                    return (
                        <li
                            key={i}
                            className="p-4 border rounded hover:shadow transition"
                        >
                            <p className="font-semibold">{date}</p>
                            <p>
                                {white} vs {black}
                            </p>
                            <p className="text-sm text-gray-600">
                                Result: {result}
                            </p>
                            <a
                                href={game.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 underline text-sm"
                            >
                                View on Chess.com
                            </a>
                        </li>
                    );
                })}
            </ul>
            {/* Loader sentinel for infinite scroll */}
            <div ref={loader} className="h-8"></div>
            {idxRef.current >= archives.length && (
                <p className="text-center text-gray-500">No more games.</p>
            )}
        </div>
    );
}
