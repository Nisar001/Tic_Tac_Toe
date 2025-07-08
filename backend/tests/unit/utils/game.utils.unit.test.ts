// Unit tests for game.utils.ts
import { GameLogic, Board, Player, GameResult } from '../../../src/utils/game.utils';

describe('GameLogic', () => {
  describe('createEmptyBoard', () => {
    it('should create an empty board', () => {
      const board = GameLogic.createEmptyBoard();
      expect(board).toEqual(Array(9).fill(null));
    });
  });

  describe('isValidMove', () => {
    it('should return true for a valid move', () => {
      const board: Board = GameLogic.createEmptyBoard();
      expect(GameLogic.isValidMove(board, 0)).toBe(true);
    });

    it('should return false for an invalid move', () => {
      const board: Board = GameLogic.createEmptyBoard();
      board[0] = 'X';
      expect(GameLogic.isValidMove(board, 0)).toBe(false);
    });
  });

  describe('makeMove', () => {
    it('should make a valid move', () => {
      const board: Board = GameLogic.createEmptyBoard();
      const result = GameLogic.makeMove(board, 0, 'X');
      expect(result.isValid).toBe(true);
      expect(result.board[0]).toBe('X');
    });

    it('should return invalid for an invalid move', () => {
      const board: Board = GameLogic.createEmptyBoard();
      board[0] = 'X';
      const result = GameLogic.makeMove(board, 0, 'O');
      expect(result.isValid).toBe(false);
    });
  });

  describe('checkGameResult', () => {
    it('should detect a win', () => {
      const board: Board = ['X', 'X', 'X', null, null, null, null, null, null];
      const result = GameLogic.checkGameResult(board);
      expect(result.result).toBe('win');
      expect(result.winner).toBe('X');
    });

    it('should detect a draw', () => {
      const board: Board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
      const result = GameLogic.checkGameResult(board);
      expect(result.result).toBe('draw');
    });

    it('should detect an ongoing game', () => {
      const board: Board = ['X', 'O', 'X', null, null, null, null, null, null];
      const result = GameLogic.checkGameResult(board);
      expect(result.result).toBe('ongoing');
    });
  });

  describe('getNextPlayer', () => {
    it('should return the next player', () => {
      expect(GameLogic.getNextPlayer('X')).toBe('O');
      expect(GameLogic.getNextPlayer('O')).toBe('X');
    });
  });

  describe('getBoardString', () => {
    it('should convert board to string', () => {
      const board: Board = ['X', 'O', null, null, 'X', null, 'O', null, null];
      expect(GameLogic.getBoardString(board)).toBe('XO  X O  ');
    });
  });

  describe('parseBoardString', () => {
    it('should parse board string to board', () => {
      const boardString = 'XO  X O  ';
      const board = GameLogic.parseBoardString(boardString);
      expect(board).toEqual(['X', 'O', null, null, 'X', null, 'O', null, null]);
    });
  });

  describe('getAvailablePositions', () => {
    it('should return available positions', () => {
      const board: Board = ['X', 'O', null, null, 'X', null, 'O', null, null];
      expect(GameLogic.getAvailablePositions(board)).toEqual([2, 3, 5, 7, 8]);
    });
  });

  describe('isBoardFull', () => {
    it('should return true for a full board', () => {
      const board: Board = ['X', 'O', 'X', 'O', 'X', 'O', 'X', 'O', 'X'];
      expect(GameLogic.isBoardFull(board)).toBe(true);
    });

    it('should return false for a non-full board', () => {
      const board: Board = ['X', 'O', null, 'O', 'X', 'O', 'X', 'O', 'X'];
      expect(GameLogic.isBoardFull(board)).toBe(false);
    });
  });

  describe('isBoardEmpty', () => {
    it('should return true for an empty board', () => {
      const board: Board = GameLogic.createEmptyBoard();
      expect(GameLogic.isBoardEmpty(board)).toBe(true);
    });

    it('should return false for a non-empty board', () => {
      const board: Board = ['X', null, null, null, null, null, null, null, null];
      expect(GameLogic.isBoardEmpty(board)).toBe(false);
    });
  });

  describe('getRandomMove', () => {
    it('should return a random valid move', () => {
      const board: Board = ['X', 'O', null, null, 'X', null, 'O', null, null];
      const move = GameLogic.getRandomMove(board);
      expect(board[move]).toBe(null);
    });
  });

  describe('getSmartMove', () => {
    it('should return a smart move to win', () => {
      const board: Board = ['X', 'X', null, null, 'O', null, 'O', null, null];
      const move = GameLogic.getSmartMove(board, 'X');
      expect(move).toBe(2);
    });

    it('should return a smart move to block opponent', () => {
      const board: Board = ['X', 'X', null, null, 'O', null, 'O', null, null];
      const move = GameLogic.getSmartMove(board, 'O');
      expect(move).toBe(2);
    });
  });

  describe('validateGameState', () => {
    it('should validate a correct game state', () => {
      const board: Board = ['X', 'O', 'X', null, null, null, null, null, null];
      expect(GameLogic.validateGameState(board, 'O', 3)).toBe(true);
    });

    it('should invalidate an incorrect game state', () => {
      const board: Board = ['X', 'O', 'X', null, null, null, null, null, null];
      expect(GameLogic.validateGameState(board, 'X', 3)).toBe(false);
    });
  });

  describe('calculateGameStats', () => {
    it('should calculate game statistics', () => {
      const games: Array<{ result: GameResult; winner: Player | null }> = [
        { result: 'win', winner: 'X' },
        { result: 'draw', winner: null },
        { result: 'win', winner: 'O' },
        { result: 'ongoing', winner: null }
      ];
      const stats = GameLogic.calculateGameStats(games);
      expect(stats).toEqual({
        totalGames: 4,
        wins: 2,
        losses: 1,
        draws: 1,
        winRate: 50
      });
    });
  });
});
