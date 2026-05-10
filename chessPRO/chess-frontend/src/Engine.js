export class Engine {
    constructor() {
        this.worker = new Worker(new URL("stockfish.js", import.meta.url));

        this.messageCallback = null;

        this.worker.onmessage = (e) => this.handleMessage(e.data);
        this.worker.postMessage("uci");
        this.worker.postMessage("isready");
    }

    handleMessage(message) {
        if (!this.messageCallback) return;

        const info = {};

        if (message.startsWith("info")) {
            const depth = message.match(/depth (\d+)/)?.[1];
            const score = message.match(/score cp (-?\d+)/)?.[1];
            const mate = message.match(/score mate (-?\d+)/)?.[1];
            const pv = message.match(/pv (.+)/)?.[1];

            if (depth) info.depth = parseInt(depth);
            if (score) info.positionEvaluation = score;
            if (mate) info.possibleMate = mate;
            if (pv) info.pv = pv;

            this.messageCallback(info);
        }
    }

    evaluatePosition(fen, depth) {
        this.worker.postMessage("position fen " + fen);
        this.worker.postMessage("go depth " + depth);
    }

    onMessage(callback) {
        this.messageCallback = callback;
    }

    stop() {
        this.worker.postMessage("stop");
    }
}
