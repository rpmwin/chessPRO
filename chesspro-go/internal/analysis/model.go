package analysis

import "time"

type Status string

const (
	StatusPending    Status = "pending"
	StatusProcessing Status = "processing"
	StatusDone       Status = "done"
	StatusError      Status = "error"
)

// Classification thresholds match chess.com
type Classification string

const (
	ClassBest       Classification = "best"       // played == engine best
	ClassExcellent  Classification = "excellent"  // 0–10 cp loss
	ClassGood       Classification = "good"       // 10–25 cp loss
	ClassInaccuracy Classification = "inaccuracy" // 25–50 cp loss
	ClassMistake    Classification = "mistake"    // 50–100 cp loss
	ClassBlunder    Classification = "blunder"    // 100+ cp loss
)

type Phase string

const (
	PhaseOpening    Phase = "opening"
	PhaseMiddlegame Phase = "middlegame"
	PhaseEndgame    Phase = "endgame"
)

// MoveResult is what we store + send. camelCase json for frontend compat.
type MoveResult struct {
	MoveNumber     int            `json:"moveNumber"`
	PlayedMove     string         `json:"playedMove"`    // SAN e.g. "e4"
	BestMove       string         `json:"bestMove"`      // UCI e.g. "e2e4" (for board arrows)
	BestMoveSAN    string         `json:"bestMoveSan"`   // SAN e.g. "e4" (for display/comments)
	Eval           *int           `json:"eval"`          // centipawns after this move (white-positive)
	EvalBefore     *int           `json:"evalBefore"`    // centipawns before this move
	CentipawnLoss  int            `json:"centipawnLoss"` // loss from player's perspective
	Classification Classification `json:"classification"`
	IsBestMove     bool           `json:"isBestMove"`
	Depth          int            `json:"depth"`
	Phase          Phase          `json:"phase"`
	IsCritical     bool           `json:"isCritical"`   // eval swing > 150cp from player's POV
	MateIn         *int           `json:"mateIn"`       // non-nil when eval is a forced mate
	LichessURL     string         `json:"lichessUrl"`   // analysis link for blunder/mistake positions
	FEN            string         `json:"fen"`          // position after this move
}

// GeminiInput is a slimmer struct sent to Gemini (less tokens)
type GeminiInput struct {
	MoveNumber     int            `json:"move_number"`
	PlayedMove     string         `json:"played_move"`
	BestMove       string         `json:"best_move"`
	CentipawnLoss  int            `json:"centipawn_loss"`
	Classification Classification `json:"classification"`
	IsBestMove     bool           `json:"is_best_move"`
}

type Comment struct {
	MoveNumber int    `json:"moveNumber"`
	Comment    string `json:"comment"`
}

type OpeningInfo struct {
	ECO  string `json:"eco"`
	Name string `json:"name"`
}

type GameSummary struct {
	Opening           OpeningInfo `json:"opening"`
	WhiteAccuracy     float64     `json:"whiteAccuracy"`
	BlackAccuracy     float64     `json:"blackAccuracy"`
	WhiteBlunders     int         `json:"whiteBlunders"`
	WhiteMistakes     int         `json:"whiteMistakes"`
	WhiteInaccuracies int         `json:"whiteInaccuracies"`
	BlackBlunders     int         `json:"blackBlunders"`
	BlackMistakes     int         `json:"blackMistakes"`
	BlackInaccuracies int         `json:"blackInaccuracies"`
	WhiteBestMoves    int         `json:"whiteBestMoves"`
	BlackBestMoves    int         `json:"blackBestMoves"`
	WhiteTotalMoves   int         `json:"whiteTotalMoves"`
	BlackTotalMoves   int         `json:"blackTotalMoves"`
	GameScore         float64     `json:"gameScore"` // 0–100 overall game quality
	CriticalMoments   int         `json:"criticalMoments"`
}

// Results — stored as JSONB, also returned to frontend.
// Shape matches frontend contract: analysis[] + commentary[].
type Results struct {
	Analysis    []EvalPoint  `json:"analysis"`    // N+1 entries, indexed by half-move (0=startpos)
	Commentary  []Comment    `json:"commentary"`  // N entries, commentary[i] = tip for move i+1
	Moves       []MoveResult `json:"moves"`       // Full data for move history panel
	Summary     GameSummary  `json:"summary"`
	EvalHistory []int        `json:"evalHistory"` // centipawn values for chart, N+1 entries (nil→0)
}

// EvalPoint is what the frontend reads for the eval bar + arrows.
type EvalPoint struct {
	BestMove string `json:"bestMove"` // UCI (for arrow)
	Eval     *int   `json:"eval"`     // centipawns
	Depth    int    `json:"depth"`
	MateIn   *int   `json:"mateIn"` // non-nil when this is a forced-mate position
}

type Analysis struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	PGN       string    `json:"pgn"`
	Status    Status    `json:"status"`
	Results   *Results  `json:"results,omitempty"`
	ErrorMsg  *string   `json:"error,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
