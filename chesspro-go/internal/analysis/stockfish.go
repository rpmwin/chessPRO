package analysis

import (
	"bufio"
	"fmt"
	"io"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
)

var (
	reDepth = regexp.MustCompile(`depth (\d+)`)
	reCp    = regexp.MustCompile(`score cp (-?\d+)`)
	reMate  = regexp.MustCompile(`score mate (-?\d+)`)
	rePV    = regexp.MustCompile(`\bpv\s+([a-h][1-8][a-h][1-8][nbrqNBRQ]?)`)
)

type PositionResult struct {
	Eval     *int
	BestMove string // UCI notation e.g. e2e4
	Depth    int
}

type Stockfish struct {
	path string
}

func NewStockfish(path string) *Stockfish {
	return &Stockfish{path: path}
}

// AnalyzeGame spawns stockfish once and analyzes all FEN positions sequentially.
// Returns one PositionResult per FEN.
func (s *Stockfish) AnalyzeGame(fens []string, depth int) ([]PositionResult, error) {
	cmd := exec.Command(s.path)
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("stockfish stdin: %w", err)
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("stockfish stdout: %w", err)
	}
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("stockfish start: %w", err)
	}
	defer func() {
		fmt.Fprintln(stdin, "quit")
		cmd.Wait()
	}()

	scanner := bufio.NewScanner(stdout)

	// Initialize UCI
	fmt.Fprintln(stdin, "uci")
	if err := waitFor(scanner, "uciok"); err != nil {
		return nil, fmt.Errorf("uciok: %w", err)
	}
	fmt.Fprintln(stdin, "isready")
	if err := waitFor(scanner, "readyok"); err != nil {
		return nil, fmt.Errorf("readyok: %w", err)
	}

	results := make([]PositionResult, 0, len(fens))
	for _, fen := range fens {
		res, err := s.analyzePosition(stdin, scanner, fen, depth)
		if err != nil {
			return nil, fmt.Errorf("analyze fen %s: %w", fen, err)
		}
		results = append(results, res)
	}
	return results, nil
}

func (s *Stockfish) analyzePosition(stdin io.Writer, scanner *bufio.Scanner, fen string, depth int) (PositionResult, error) {
	fmt.Fprintf(stdin, "position fen %s\n", fen)
	fmt.Fprintf(stdin, "go depth %d\n", depth)

	var lastInfo, bestmoveLine string
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "info") {
			lastInfo = line
		} else if strings.HasPrefix(line, "bestmove") {
			bestmoveLine = line
			break
		}
	}
	if err := scanner.Err(); err != nil {
		return PositionResult{}, err
	}

	res := parseInfoLine(lastInfo, fen)

	// extract best move from "bestmove e2e4 ponder ..."
	parts := strings.Fields(bestmoveLine)
	if len(parts) >= 2 && parts[1] != "(none)" {
		res.BestMove = parts[1]
	}
	return res, nil
}

func parseInfoLine(line, fen string) PositionResult {
	var res PositionResult

	if m := reDepth.FindStringSubmatch(line); m != nil {
		res.Depth, _ = strconv.Atoi(m[1])
	}

	isBlackToMove := len(strings.Fields(fen)) >= 2 && strings.Fields(fen)[1] == "b"

	if m := reCp.FindStringSubmatch(line); m != nil {
		v, _ := strconv.Atoi(m[1])
		if isBlackToMove {
			v = -v
		}
		res.Eval = &v
	} else if m := reMate.FindStringSubmatch(line); m != nil {
		n, _ := strconv.Atoi(m[1])
		var v int
		if n > 0 {
			v = 10000 - n
		} else {
			v = -10000 - n
		}
		if isBlackToMove {
			v = -v
		}
		res.Eval = &v
	}

	// fallback: best move from PV in info line if not in bestmove line yet
	if m := rePV.FindStringSubmatch(line); m != nil {
		res.BestMove = m[1]
	}

	return res
}

func waitFor(scanner *bufio.Scanner, token string) error {
	for scanner.Scan() {
		if strings.Contains(scanner.Text(), token) {
			return nil
		}
	}
	return fmt.Errorf("EOF before %q", token)
}
