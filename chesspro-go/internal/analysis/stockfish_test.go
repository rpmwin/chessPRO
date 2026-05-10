package analysis

import (
	"os"
	"testing"
)

func TestStockfishAnalyzeGame(t *testing.T) {
	path := os.Getenv("STOCKFISH_PATH")
	if path == "" {
		path = "/Users/iamrpm/Developer/projects/chesspro/chessPRO/backend/stockfish"
	}
	if _, err := os.Stat(path); err != nil {
		t.Skipf("stockfish not found at %s", path)
	}

	sf := NewStockfish(path)
	// starting position FEN
	fens := []string{
		"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
		"rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
	}

	results, err := sf.AnalyzeGame(fens, 10)
	if err != nil {
		t.Fatalf("AnalyzeGame error: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
	for i, r := range results {
		if r.BestMove == "" {
			t.Errorf("result[%d]: empty best move", i)
		}
		if r.Eval == nil {
			t.Errorf("result[%d]: nil eval", i)
		}
		t.Logf("result[%d]: eval=%v bestmove=%s depth=%d", i, r.Eval, r.BestMove, r.Depth)
	}
}
