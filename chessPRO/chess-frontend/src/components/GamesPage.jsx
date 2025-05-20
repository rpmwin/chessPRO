import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { toast } from "react-hot-toast";
import GamesList from "../components/GamesList";

export default function GamesPage() {
    const { username } = useParams();
    const nav = useNavigate();
    const location = useLocation();
    const [archives, setArchives] = useState(location.state?.archives || []);
    const [loading, setLoading] = useState(!archives.length);

    useEffect(() => {
        if (archives.length) {
            setLoading(false);
            return;
        }
        api.get(`/chesscom/archives/${username}`)
            .then((res) => setArchives(res.data.archives))
            .catch(() => {
                toast.error("Could not load archives");
                nav("/", { replace: true });
            })
            .finally(() => setLoading(false));
    }, [archives.length, username, nav]);

    if (loading) return <div className="p-6 text-center">Loading games…</div>;

    return (
        <GamesList initialArchives={archives} username={username} api={api} />
    );
}
