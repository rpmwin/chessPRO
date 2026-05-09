package analysis

import "time"

type Status string

const (
	StatusPending    Status = "pending"
	StatusProcessing Status = "processing"
	StatusDone       Status = "done"
	StatusError      Status = "error"
)

type MoveResult struct {
	MoveNumber int    `json:"move_number"`
	PlayedMove string `json:"played_move"`
	Eval       *int   `json:"eval"`
	BestMove   string `json:"best_move"`
	Depth      int    `json:"depth"`
}

type Comment struct {
	MoveNumber int    `json:"move_number"`
	Comment    string `json:"comment"`
}

type Results struct {
	Moves      []MoveResult `json:"moves"`
	Commentary []Comment    `json:"commentary"`
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
