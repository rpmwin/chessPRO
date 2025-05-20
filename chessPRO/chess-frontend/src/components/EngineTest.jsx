import { useEffect, useState } from "react";
import { Engine } from "../Engine.js";

export default function EngineTest() {
    const [info, setInfo] = useState({});

    useEffect(() => {
        const engine = new Engine();
        engine.onMessage((data) => setInfo(data));
        // engine.evaluate("startpos", 8);
        setTimeout(() => engine.stop(), 3000);
    }, []);

    return <pre>{JSON.stringify(info, null, 2)}</pre>;
}
