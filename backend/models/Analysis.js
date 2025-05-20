import mongoose from "mongoose";
const { Schema } = mongoose;

const MoveAnalysisSchema = new Schema(
    {
        moveNumber: Number,
        playedMoveEval: { value: Number, bestMove: String },
        aiCommentary: String,
    },
    { _id: false }
);

const AnalysisSchema = new Schema(
    {
        jobId: { type: String, required: true, unique: true },
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        gameId: { type: String, required: true },
        pgn: { type: String, required: true },
        status: {
            type: String,
            enum: ["pending", "in_progress", "done", "error"],
            default: "pending",
        },
        analysis: { type: [MoveAnalysisSchema], default: [] },
        error: String,
    },
    { timestamps: true }
);

export default mongoose.model("Analysis", AnalysisSchema);
