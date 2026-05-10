package chesscom

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const baseURL = "https://api.chess.com/pub/player"

type Client struct {
	http *http.Client
}

func NewClient() *Client {
	return &Client{
		http: &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) get(ctx context.Context, url string, dest any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "chesspro-go/1.0 (github.com/iamrpm/chesspro-go)")
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return ErrNotFound
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("chess.com API returned %d", resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(dest)
}

func (c *Client) GetProfile(ctx context.Context, username string) (map[string]any, error) {
	var data map[string]any
	err := c.get(ctx, fmt.Sprintf("%s/%s", baseURL, username), &data)
	return data, err
}

func (c *Client) GetArchives(ctx context.Context, username string) ([]string, error) {
	var data struct {
		Archives []string `json:"archives"`
	}
	err := c.get(ctx, fmt.Sprintf("%s/%s/games/archives", baseURL, username), &data)
	return data.Archives, err
}

func (c *Client) GetGames(ctx context.Context, archiveURL string) ([]any, error) {
	var data struct {
		Games []any `json:"games"`
	}
	err := c.get(ctx, archiveURL, &data)
	return data.Games, err
}

func (c *Client) GetStats(ctx context.Context, username string) (map[string]any, error) {
	var data map[string]any
	err := c.get(ctx, fmt.Sprintf("%s/%s/stats", baseURL, username), &data)
	return data, err
}
