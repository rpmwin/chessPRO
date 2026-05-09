package analysis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/url"
	"strings"

	"github.com/hibiken/asynq"
	"github.com/notnil/chess"
)

const TaskTypeAnalysis = "analysis:run"
const analysisDepthQuick = 10 // first pass — classifies all moves fast
const analysisDepthDeep = 18  // second pass — only critical/blunder/mistake positions

type TaskPayload struct {
	AnalysisID string `json:"analysis_id"`
}

func NewAnalysisTask(analysisID string) (*asynq.Task, error) {
	payload, err := json.Marshal(TaskPayload{AnalysisID: analysisID})
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(TaskTypeAnalysis, payload), nil
}

// ProgressEvent is emitted during streaming analysis.
type ProgressEvent struct {
	Type string `json:"type"` // "move" | "commentary" | "done" | "error"
	// For "move": one MoveResult
	Move *MoveResult `json:"move,omitempty"`
	// For "commentary": one Comment
	Comment *Comment `json:"comment,omitempty"`
	// For "done": the full Results
	Results *Results `json:"results,omitempty"`
	// Progress counters
	Done  int `json:"done"`
	Total int `json:"total"`
}

type Worker struct {
	repo   *Repository
	sf     *Stockfish
	gemini *GeminiClient
}

func NewWorker(repo *Repository, sf *Stockfish, gemini *GeminiClient) *Worker {
	return &Worker{repo: repo, sf: sf, gemini: gemini}
}

// AnalyzeStream runs analysis inline and pushes ProgressEvents to ch.
// The caller must drain ch. ch is closed when analysis finishes or errors.
// Unlike analyze(), this emits each MoveResult immediately after stockfish returns it,
// then commentary events as Gemini responds, then a final "done" event.
func (w *Worker) AnalyzeStream(ctx context.Context, pgn string, ch chan<- ProgressEvent) {
	defer close(ch)

	send := func(e ProgressEvent) {
		select {
		case ch <- e:
		case <-ctx.Done():
		}
	}

	game, err := parsePGN(pgn)
	if err != nil {
		log.Printf("AnalyzeStream parsePGN error: %v", err)
		send(ProgressEvent{Type: "error", Done: 0})
		return
	}
	moves := game.Moves()
	positions := game.Positions()
	if len(moves) == 0 {
		send(ProgressEvent{Type: "error"})
		return
	}

	fens := make([]string, len(moves)+1)
	for i, pos := range positions {
		fens[i] = pos.String()
	}

	total := len(moves)
	send(ProgressEvent{Type: "progress", Done: 0, Total: total})

	// Quick pass — parallel, all positions
	sfResults, err := w.sf.AnalyzeGameParallel(fens, analysisDepthQuick)
	if err != nil {
		send(ProgressEvent{Type: "error"})
		return
	}

	// Deep pass for critical positions
	deepFENIndices := []int{}
	for i := 0; i < len(moves); i++ {
		before, after := sfResults[i].Eval, sfResults[i+1].Eval
		if before == nil || after == nil {
			continue
		}
		var swing int
		if i%2 == 0 {
			swing = *before - *after
		} else {
			swing = *after - *before
		}
		if swing > 60 {
			deepFENIndices = append(deepFENIndices, i, i+1)
		}
	}
	if len(deepFENIndices) > 0 {
		seen := map[int]bool{}
		deepFENs, deepIdx := []string{}, []int{}
		for _, idx := range deepFENIndices {
			if !seen[idx] {
				seen[idx] = true
				deepFENs = append(deepFENs, fens[idx])
				deepIdx = append(deepIdx, idx)
			}
		}
		if deepR, err := w.sf.AnalyzeGameParallel(deepFENs, analysisDepthDeep); err == nil {
			for i, origIdx := range deepIdx {
				sfResults[origIdx] = deepR[i]
			}
		}
	}

	opening := detectOpening(game)

	// Build move results and stream each one
	moveResults := make([]MoveResult, len(moves))
	enc := chess.AlgebraicNotation{}
	for i, move := range moves {
		evalBefore, evalAfter := sfResults[i].Eval, sfResults[i+1].Eval
		cpLoss := 0
		if evalBefore != nil && evalAfter != nil {
			if i%2 == 0 {
				cpLoss = *evalBefore - *evalAfter
			} else {
				cpLoss = *evalAfter - *evalBefore
			}
			if cpLoss < 0 {
				cpLoss = 0
			}
		}
		bestMoveUCI := sfResults[i].BestMove
		bestMoveSAN := uciToSAN(positions[i], bestMoveUCI)
		playedMoveSAN := enc.Encode(positions[i], move)
		isBest := bestMoveUCI != "" && uciMatch(move, bestMoveUCI)
		class := classify(cpLoss, isBest)
		fenAfter := fens[i+1]

		lichessURL := ""
		if class == ClassBlunder || class == ClassMistake {
			lichessURL = "https://lichess.org/analysis/" + url.PathEscape(fenAfter)
		}
		var mateIn *int
		if evalAfter != nil && abs(*evalAfter) >= 9000 {
			n := 10000 - abs(*evalAfter)
			mateIn = &n
		}
		mr := MoveResult{
			MoveNumber: i + 1, PlayedMove: playedMoveSAN,
			BestMove: bestMoveUCI, BestMoveSAN: bestMoveSAN,
			Eval: evalAfter, EvalBefore: evalBefore,
			CentipawnLoss: cpLoss, Classification: class,
			IsBestMove: isBest, Depth: sfResults[i].Depth,
			Phase: detectPhase(i, positions[i]), IsCritical: cpLoss > 150,
			MateIn: mateIn, LichessURL: lichessURL, FEN: fenAfter,
		}
		moveResults[i] = mr
		send(ProgressEvent{Type: "move", Move: &mr, Done: i + 1, Total: total})
	}

	// Build eval history + analysis points
	analysisPoints := make([]EvalPoint, len(sfResults))
	evalHistory := make([]int, len(sfResults))
	for i, r := range sfResults {
		var mateIn *int
		if r.Eval != nil && abs(*r.Eval) >= 9000 {
			n := 10000 - abs(*r.Eval)
			mateIn = &n
		}
		analysisPoints[i] = EvalPoint{BestMove: r.BestMove, Eval: r.Eval, Depth: r.Depth, MateIn: mateIn}
		if r.Eval != nil {
			evalHistory[i] = *r.Eval
		}
	}

	summary := buildSummary(moveResults)
	summary.Opening = opening

	// Gemini commentary — stream individual comments as they arrive
	geminiInputs := make([]GeminiInput, len(moveResults))
	for i, mr := range moveResults {
		geminiInputs[i] = GeminiInput{
			MoveNumber: mr.MoveNumber, PlayedMove: mr.PlayedMove,
			BestMove: mr.BestMoveSAN, CentipawnLoss: mr.CentipawnLoss,
			Classification: mr.Classification, IsBestMove: mr.IsBestMove,
		}
	}

	sortedCommentary := make([]Comment, len(moveResults))
	commentary, err := w.gemini.GetCommentary(ctx, geminiInputs)
	if err != nil {
		log.Printf("gemini streaming commentary failed: %v", err)
	} else {
		for _, c := range commentary {
			idx := c.MoveNumber - 1
			if idx >= 0 && idx < len(sortedCommentary) {
				sortedCommentary[idx] = c
				cc := c
				send(ProgressEvent{Type: "commentary", Comment: &cc})
			}
		}
	}

	results := &Results{
		Analysis: analysisPoints, Commentary: sortedCommentary,
		Moves: moveResults, Summary: summary, EvalHistory: evalHistory,
	}
	send(ProgressEvent{Type: "done", Results: results, Done: total, Total: total})
}

func (w *Worker) ProcessTask(ctx context.Context, t *asynq.Task) error {
	var payload TaskPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return fmt.Errorf("unmarshal payload: %w", err)
	}

	a, err := w.repo.FindByID(ctx, payload.AnalysisID)
	if err != nil {
		return fmt.Errorf("find analysis: %w", err)
	}

	if err := w.repo.SetStatus(ctx, a.ID, StatusProcessing); err != nil {
		return fmt.Errorf("set processing: %w", err)
	}

	results, err := w.analyze(ctx, a)
	if err != nil {
		log.Printf("analysis %s failed: %v", a.ID, err)
		_ = w.repo.SaveError(ctx, a.ID, err.Error())
		return err
	}

	if err := w.repo.SaveResults(ctx, a.ID, results); err != nil {
		return fmt.Errorf("save results: %w", err)
	}

	log.Printf("analysis %s done: %d moves", a.ID, len(results.Moves))
	return nil
}

func (w *Worker) analyze(ctx context.Context, a *Analysis) (*Results, error) {
	game, err := parsePGN(a.PGN)
	if err != nil {
		return nil, fmt.Errorf("parse PGN: %w", err)
	}

	moves := game.Moves()
	positions := game.Positions()
	if len(moves) == 0 {
		return nil, fmt.Errorf("no moves in PGN")
	}

	// Build N+1 FEN array: position before each move + final position
	fens := make([]string, len(moves)+1)
	for i, pos := range positions {
		fens[i] = pos.String()
	}

	// Pass 1: quick parallel analysis to classify all positions
	sfResults, err := w.sf.AnalyzeGameParallel(fens, analysisDepthQuick)
	if err != nil {
		return nil, fmt.Errorf("stockfish quick pass: %w", err)
	}

	// Pass 2: deep re-analysis for positions with large eval swings (critical moves)
	// We look at pairs: [i] before, [i+1] after each move.
	deepFENIndices := make([]int, 0)
	for i := 0; i < len(moves); i++ {
		before := sfResults[i].Eval
		after := sfResults[i+1].Eval
		if before == nil || after == nil {
			continue
		}
		var swing int
		if i%2 == 0 {
			swing = *before - *after
		} else {
			swing = *after - *before
		}
		if swing > 60 { // re-analyze any position involved in a significant eval drop
			deepFENIndices = append(deepFENIndices, i, i+1)
		}
	}
	// Deduplicate and deep-analyze
	seen := make(map[int]bool)
	deepFENs := make([]string, 0)
	deepIdx := make([]int, 0)
	for _, idx := range deepFENIndices {
		if !seen[idx] {
			seen[idx] = true
			deepFENs = append(deepFENs, fens[idx])
			deepIdx = append(deepIdx, idx)
		}
	}
	if len(deepFENs) > 0 {
		deepResults, err := w.sf.AnalyzeGameParallel(deepFENs, analysisDepthDeep)
		if err != nil {
			log.Printf("deep analysis pass failed (using quick results): %v", err)
		} else {
			for i, origIdx := range deepIdx {
				sfResults[origIdx] = deepResults[i]
			}
		}
	}

	// Opening detection
	opening := detectOpening(game)

	// Build MoveResult array with classification
	moveResults := make([]MoveResult, len(moves))
	for i, move := range moves {
		evalBefore := sfResults[i].Eval  // eval at position before this move
		evalAfter := sfResults[i+1].Eval // eval at position after this move

		// Centipawn loss from the moving player's perspective
		cpLoss := 0
		if evalBefore != nil && evalAfter != nil {
			if i%2 == 0 { // white
				cpLoss = *evalBefore - *evalAfter
			} else { // black
				cpLoss = *evalAfter - *evalBefore
			}
			if cpLoss < 0 {
				cpLoss = 0
			}
		}

		bestMoveUCI := sfResults[i].BestMove
		bestMoveSAN := uciToSAN(positions[i], bestMoveUCI)

		enc := chess.AlgebraicNotation{}
		playedMoveSAN := enc.Encode(positions[i], move)

		isBest := bestMoveUCI != "" && uciMatch(move, bestMoveUCI)
		class := classify(cpLoss, isBest)

		// FEN after this move
		fenAfter := fens[i+1]

		// Lichess URL for blunders and mistakes
		lichessURL := ""
		if class == ClassBlunder || class == ClassMistake {
			lichessURL = "https://lichess.org/analysis/" + url.PathEscape(fenAfter)
		}

		// Mate-in-N from the eval after the move
		var mateIn *int
		if evalAfter != nil && abs(*evalAfter) >= 9000 {
			n := 10000 - abs(*evalAfter)
			mateIn = &n
		}

		// Critical: eval swing > 150cp from moving player's POV
		isCritical := cpLoss > 150

		mr := MoveResult{
			MoveNumber:     i + 1,
			PlayedMove:     playedMoveSAN,
			BestMove:       bestMoveUCI,
			BestMoveSAN:    bestMoveSAN,
			Eval:           evalAfter,
			EvalBefore:     evalBefore,
			CentipawnLoss:  cpLoss,
			Classification: class,
			IsBestMove:     isBest,
			Depth:          sfResults[i].Depth,
			Phase:          detectPhase(i, positions[i]),
			IsCritical:     isCritical,
			MateIn:         mateIn,
			LichessURL:     lichessURL,
			FEN:            fenAfter,
		}
		moveResults[i] = mr
	}

	// Build analysis[] array for frontend eval bar (N+1 entries)
	analysisPoints := make([]EvalPoint, len(sfResults))
	evalHistory := make([]int, len(sfResults))
	for i, r := range sfResults {
		var mateIn *int
		if r.Eval != nil && abs(*r.Eval) >= 9000 {
			n := 10000 - abs(*r.Eval)
			mateIn = &n
		}
		analysisPoints[i] = EvalPoint{
			BestMove: r.BestMove,
			Eval:     r.Eval,
			Depth:    r.Depth,
			MateIn:   mateIn,
		}
		if r.Eval != nil {
			evalHistory[i] = *r.Eval
		}
	}

	// Game summary
	summary := buildSummary(moveResults)
	summary.Opening = opening

	// Build Gemini input (slim, SAN-based)
	geminiInputs := make([]GeminiInput, len(moveResults))
	for i, mr := range moveResults {
		geminiInputs[i] = GeminiInput{
			MoveNumber:     mr.MoveNumber,
			PlayedMove:     mr.PlayedMove,
			BestMove:       mr.BestMoveSAN,
			CentipawnLoss:  mr.CentipawnLoss,
			Classification: mr.Classification,
			IsBestMove:     mr.IsBestMove,
		}
	}

	commentary, err := w.gemini.GetCommentary(ctx, geminiInputs)
	if err != nil {
		log.Printf("gemini commentary failed for %s: %v", a.ID, err)
		commentary = make([]Comment, len(moveResults))
		for i, mr := range moveResults {
			commentary[i] = Comment{MoveNumber: mr.MoveNumber, Comment: ""}
		}
	}

	sortedCommentary := make([]Comment, len(moveResults))
	for _, c := range commentary {
		idx := c.MoveNumber - 1
		if idx >= 0 && idx < len(sortedCommentary) {
			sortedCommentary[idx] = c
		}
	}

	return &Results{
		Analysis:    analysisPoints,
		Commentary:  sortedCommentary,
		Moves:       moveResults,
		Summary:     summary,
		EvalHistory: evalHistory,
	}, nil
}

// classify returns move classification based on centipawn loss.
func classify(cpLoss int, isBest bool) Classification {
	if isBest {
		return ClassBest
	}
	switch {
	case cpLoss <= 10:
		return ClassExcellent
	case cpLoss <= 25:
		return ClassGood
	case cpLoss <= 50:
		return ClassInaccuracy
	case cpLoss <= 100:
		return ClassMistake
	default:
		return ClassBlunder
	}
}

// winPercentage converts centipawns to win probability (0–100).
// Formula matches lichess/chess.com approximation.
func winPercentage(cp int) float64 {
	return 50 + 50*math.Tanh(float64(cp)*0.00368208)
}

// buildSummary computes per-side accuracy, error counts, best move counts, and game score.
func buildSummary(moves []MoveResult) GameSummary {
	var summary GameSummary
	var whiteWpSum, blackWpSum float64
	var whiteCount, blackCount int

	for i, mr := range moves {
		isWhite := i%2 == 0
		if mr.EvalBefore == nil || mr.Eval == nil {
			continue
		}
		wpBefore := winPercentage(*mr.EvalBefore)
		wpAfter := winPercentage(*mr.Eval)

		if isWhite {
			wpDrop := math.Max(0, wpBefore-wpAfter)
			whiteWpSum += 100 - wpDrop*2
			whiteCount++
			summary.WhiteTotalMoves++
			switch mr.Classification {
			case ClassBlunder:
				summary.WhiteBlunders++
			case ClassMistake:
				summary.WhiteMistakes++
			case ClassInaccuracy:
				summary.WhiteInaccuracies++
			case ClassBest:
				summary.WhiteBestMoves++
			}
		} else {
			wpDrop := math.Max(0, wpAfter-wpBefore)
			blackWpSum += 100 - wpDrop*2
			blackCount++
			summary.BlackTotalMoves++
			switch mr.Classification {
			case ClassBlunder:
				summary.BlackBlunders++
			case ClassMistake:
				summary.BlackMistakes++
			case ClassInaccuracy:
				summary.BlackInaccuracies++
			case ClassBest:
				summary.BlackBestMoves++
			}
		}
		if mr.IsCritical {
			summary.CriticalMoments++
		}
	}

	if whiteCount > 0 {
		summary.WhiteAccuracy = math.Round(whiteWpSum/float64(whiteCount)*10) / 10
	}
	if blackCount > 0 {
		summary.BlackAccuracy = math.Round(blackWpSum/float64(blackCount)*10) / 10
	}
	// Game score: average of both sides, weighted toward the worse performer
	if whiteCount > 0 && blackCount > 0 {
		summary.GameScore = math.Round((summary.WhiteAccuracy+summary.BlackAccuracy)/2*10) / 10
	} else if whiteCount > 0 {
		summary.GameScore = summary.WhiteAccuracy
	} else if blackCount > 0 {
		summary.GameScore = summary.BlackAccuracy
	}
	return summary
}

// detectOpening extracts ECO code and name from parsed game metadata or notnil/chess opening tag.
func detectOpening(game *chess.Game) OpeningInfo {
	// notnil/chess exposes TagPair slice via game.GetTagPair
	eco := game.GetTagPair("ECO")
	opening := game.GetTagPair("Opening")
	if eco != nil && opening != nil {
		return OpeningInfo{ECO: eco.Value, Name: opening.Value}
	}
	if eco != nil {
		return OpeningInfo{ECO: eco.Value, Name: ""}
	}
	if opening != nil {
		return OpeningInfo{ECO: "", Name: opening.Value}
	}
	return OpeningInfo{}
}

// detectPhase returns opening/middlegame/endgame based on half-move index and position.
// Heuristic: opening = first 20 half-moves and queens still on board,
// endgame = total material < 26 pawns-worth, else middlegame.
func detectPhase(halfMoveIdx int, pos *chess.Position) Phase {
	// Count non-pawn, non-king material (Q=9, R=5, B=3, N=3)
	board := pos.Board()
	material := 0
	for sq := chess.A1; sq <= chess.H8; sq++ {
		p := board.Piece(sq)
		switch p.Type() {
		case chess.Queen:
			material += 9
		case chess.Rook:
			material += 5
		case chess.Bishop, chess.Knight:
			material += 3
		}
	}
	if material <= 14 { // both rooks equivalent or less
		return PhaseEndgame
	}
	if halfMoveIdx < 20 {
		return PhaseOpening
	}
	return PhaseMiddlegame
}

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}

// uciToSAN converts a UCI move string to SAN using the given position.
func uciToSAN(pos *chess.Position, uci string) string {
	if len(uci) < 4 {
		return uci
	}
	from := chess.Square(squareIndex(uci[0:2]))
	to := chess.Square(squareIndex(uci[2:4]))
	var promo chess.PieceType
	if len(uci) == 5 {
		promo = promoChar(uci[4])
	}
	move := &chess.Move{}
	for _, m := range pos.ValidMoves() {
		if m.S1() == from && m.S2() == to && (promo == chess.NoPieceType || m.Promo() == promo) {
			move = m
			break
		}
	}
	if move.S1() == move.S2() {
		return uci // fallback if not found
	}
	enc := chess.AlgebraicNotation{}
	return enc.Encode(pos, move)
}

// uciMatch checks if a played move matches a UCI string.
func uciMatch(move *chess.Move, uci string) bool {
	if len(uci) < 4 {
		return false
	}
	from := chess.Square(squareIndex(uci[0:2]))
	to := chess.Square(squareIndex(uci[2:4]))
	return move.S1() == from && move.S2() == to
}

func squareIndex(sq string) int {
	if len(sq) != 2 {
		return 0
	}
	file := int(sq[0] - 'a') // a=0 ... h=7
	rank := int(sq[1] - '1') // 1=0 ... 8=7
	return rank*8 + file
}

func promoChar(c byte) chess.PieceType {
	switch c {
	case 'q', 'Q':
		return chess.Queen
	case 'r', 'R':
		return chess.Rook
	case 'b', 'B':
		return chess.Bishop
	case 'n', 'N':
		return chess.Knight
	}
	return chess.NoPieceType
}

func parsePGN(pgn string) (*chess.Game, error) {
	reader, err := chess.PGN(strings.NewReader(pgn))
	if err != nil {
		return nil, err
	}
	game := chess.NewGame(reader)
	return game, nil
}
