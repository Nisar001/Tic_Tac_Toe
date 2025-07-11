import { GameLogic, Player, Board, GameResult, MoveResult, GameValidationResult, AntiCheatResult } from '../../../src/utils/game.utils';
import * as logger from '../../../src/utils/logger';

// Mock the logger
jest.mock('../../../src/utils/logger');

const mockLogError = logger.logError as jest.MockedFunction<typeof logger.logError>;
const mockLogDebug = logger.logDebug as jest.MockedFunction<typeof logger.logDebug>;

describe('GameLogic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEmptyBoard', () => {
    it('should create a board with 9 null cells', () => {
      const board = GameLogic.createEmptyBoard();
      
      expect(board).toHaveLength(9);
      expect(board.every(cell => cell === null)).toBe(true);
    });

    it('should handle errors gracefully', () => {
      // Mock Array to throw error
      const originalArray = Array;
      global.Array = jest.fn(() => {
        throw new Error('Array error');
      }) as any;
      
      const board = GameLogic.createEmptyBoard();
      
      expect(mockLogError).toHaveBeenCalled();
      expect(board).toHaveLength(9);
      
      // Restore Array
      global.Array = originalArray;
    });
  });

  describe('isValidMove', () => {
    it('should return true for valid move on empty position', () => {
      const board: Board = [null, null, null, null, null, null, null, null, null];
      const result = GameLogic.isValidMove(board, 0);
      
      expect(result).toBe(true);
    });

    it('should return false for move on occupied position', () => {
      const board: Board = ['X', null, null, null, null, null, null, null, null];
      const result = GameLogic.isValidMove(board, 0);
      
      expect(result).toBe(false);
    });

    it('should return false for invalid position', () => {
      const board: Board = [null, null, null, null, null, null, null, null, null];
      const result = GameLogic.isValidMove(board, 10);
      
      expect(result).toBe(false);
      expect(mockLogError).toHaveBeenCalled();
    });

    it('should return false for negative position', () => {
      const board: Board = [null, null, null, null, null, null, null, null, null];
      const result = GameLogic.isValidMove(board, -1);
      
      expect(result).toBe(false);
      expect(mockLogError).toHaveBeenCalled();
    });

    it('should return false for invalid board', () => {
      const board = [null, null] as Board; // Too short
      const result = GameLogic.isValidMove(board, 0);
      
      expect(result).toBe(false);
      expect(mockLogError).toHaveBeenCalled();
    });

    it('should handle non-array board', () => {
      const board = 'invalid' as any;
      const result = GameLogic.isValidMove(board, 0);
      
      expect(result).toBe(false);
      expect(mockLogError).toHaveBeenCalled();
    });

    it('should handle floating point position', () => {
      const board: Board = [null, null, null, null, null, null, null, null, null];
      const result = GameLogic.isValidMove(board, 1.5);
      
      expect(result).toBe(false);
      expect(mockLogError).toHaveBeenCalled();
    });

    it('should handle exceptions during validation', () => {
      const board: Board = [null, null, null, null, null, null, null, null, null];
      
      // Mock Array.isArray to throw error
      const originalIsArray = Array.isArray;
      (Array as any).isArray = jest.fn(() => {
        throw new Error('Validation error');
      });
      
      const result = GameLogic.isValidMove(board, 0);
      
      expect(mockLogError).toHaveBeenCalled();
      expect(result).toBe(false);
      
      // Restore Array.isArray
      (Array as any).isArray = originalIsArray;
    });
  });

  describe('makeMove', () => {
    it('should make a valid move successfully', () => {
      const board: Board = [null, null, null, null, null, null, null, null, null];
      const result = GameLogic.makeMove(board, 0, 'X');
      
      expect(result.isValid).toBe(true);
      expect(result.board[0]).toBe('X');
      expect(result.result).toBe('ongoing');
      expect(result.winner).toBeNull();
    });

    it('should detect a winning move', () => {
      const board: Board = ['X', 'X', null, null, null, null, null, null, null];
      const result = GameLogic.makeMove(board, 2, 'X');
      
      expect(result.isValid).toBe(true);
      expect(result.result).toBe('win');
      expect(result.winner).toBe('X');
      expect(result.winningLine).toEqual([0, 1, 2]);
    });

    it('should detect a draw', () => {
      const board: Board = ['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', null];
      const result = GameLogic.makeMove(board, 8, 'O');
      
      expect(result.isValid).toBe(true);
      expect(result.result).toBe('draw');
      expect(result.winner).toBeNull();
    });

    it('should reject invalid move on occupied position', () => {
      const board: Board = ['X', null, null, null, null, null, null, null, null];
      const result = GameLogic.makeMove(board, 0, 'O');
      
      expect(result.isValid).toBe(false);
      expect(result.board[0]).toBe('X'); // Original state preserved
    });

    it('should reject invalid player', () => {
      const board: Board = [null, null, null, null, null, null, null, null, null];
      const result = GameLogic.makeMove(board, 0, 'Y' as Player);
      
      expect(result.isValid).toBe(false);
      expect(mockLogError).toHaveBeenCalled();
    });

    it('should reject invalid position', () => {
      const board: Board = [null, null, null, null, null, null, null, null, null];
      const result = GameLogic.makeMove(board, 10, 'X');
      
      expect(result.isValid).toBe(false);
      expect(mockLogError).toHaveBeenCalled();
    });

    it('should reject invalid board', () => {
      const board = null as any;
      const result = GameLogic.makeMove(board, 0, 'X');
      
      expect(result.isValid).toBe(false);
      expect(mockLogError).toHaveBeenCalled();
    });

    it('should handle exceptions during move processing', () => {
      const board: Board = [null, null, null, null, null, null, null, null, null];
      
      // Mock spread operator to fail
      const originalArray = Array.prototype.slice;
      Array.prototype.slice = jest.fn(() => {
        throw new Error('Spread error');
      });
      
      const result = GameLogic.makeMove(board, 0, 'X');
      
      expect(mockLogError).toHaveBeenCalled();
      expect(result.isValid).toBe(false);
      
      // Restore slice
      Array.prototype.slice = originalArray;
    });
  });

  describe('checkGameResult', () => {
    it('should detect horizontal win', () => {
      const board: Board = ['X', 'X', 'X', null, null, null, null, null, null];
      const result = GameLogic.checkGameResult(board);
      
      expect(result.result).toBe('win');
      expect(result.winner).toBe('X');
      expect(result.winningLine).toEqual([0, 1, 2]);
    });

    it('should detect vertical win', () => {
      const board: Board = ['X', null, null, 'X', null, null, 'X', null, null];
      const result = GameLogic.checkGameResult(board);
      
      expect(result.result).toBe('win');
      expect(result.winner).toBe('X');
      expect(result.winningLine).toEqual([0, 3, 6]);
    });

    it('should detect diagonal win', () => {
      const board: Board = ['X', null, null, null, 'X', null, null, null, 'X'];
      const result = GameLogic.checkGameResult(board);
      
      expect(result.result).toBe('win');
      expect(result.winner).toBe('X');
      expect(result.winningLine).toEqual([0, 4, 8]);
    });

    it('should detect draw', () => {
      const board: Board = ['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', 'O'];
      const result = GameLogic.checkGameResult(board);
      
      expect(result.result).toBe('draw');
      expect(result.winner).toBeNull();
    });

    it('should detect ongoing game', () => {
      const board: Board = ['X', 'O', null, null, null, null, null, null, null];
      const result = GameLogic.checkGameResult(board);
      
      expect(result.result).toBe('ongoing');
      expect(result.winner).toBeNull();
    });

    it('should handle invalid board gracefully', () => {
      const board = null as any;
      const result = GameLogic.checkGameResult(board);
      
      expect(result.result).toBe('ongoing');
      expect(result.winner).toBeNull();
      expect(mockLogError).toHaveBeenCalled();
    });

    it('should handle board with invalid cells', () => {
      const board = ['X', 'Y', 'Z', null, null, null, null, null, null] as any;
      const result = GameLogic.checkGameResult(board);
      
      expect(mockLogError).toHaveBeenCalled();
    });
  });

  describe('getNextPlayer', () => {
    it('should return O when current player is X', () => {
      const result = GameLogic.getNextPlayer('X');
      expect(result).toBe('O');
    });

    it('should return X when current player is O', () => {
      const result = GameLogic.getNextPlayer('O');
      expect(result).toBe('X');
    });
  });

  describe('getBoardString', () => {
    it('should convert board to string correctly', () => {
      const board: Board = ['X', null, 'O', null, 'X', null, 'O', null, 'X'];
      const result = GameLogic.getBoardString(board);
      
      expect(result).toBe('X O X O X');
    });

    it('should handle empty board', () => {
      const board: Board = [null, null, null, null, null, null, null, null, null];
      const result = GameLogic.getBoardString(board);
      
      expect(result).toBe('         ');
    });
  });

  describe('parseBoardString', () => {
    it('should parse board string correctly', () => {
      const boardString = 'X O X O X';
      const result = GameLogic.parseBoardString(boardString);
      
      expect(result).toEqual(['X', ' ', 'O', ' ', 'X', ' ', 'O', ' ', 'X']);
    });

    it('should handle empty string', () => {
      const result = GameLogic.parseBoardString('');
      expect(result).toEqual([]);
    });
  });

  describe('getAvailablePositions', () => {
    it('should return available positions correctly', () => {
      const board: Board = ['X', null, 'O', null, null, null, null, null, null];
      const result = GameLogic.getAvailablePositions(board);
      
      expect(result).toEqual([1, 3, 4, 5, 6, 7, 8]);
    });

    it('should return empty array for full board', () => {
      const board: Board = ['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', 'O'];
      const result = GameLogic.getAvailablePositions(board);
      
      expect(result).toEqual([]);
    });

    it('should return all positions for empty board', () => {
      const board: Board = [null, null, null, null, null, null, null, null, null];
      const result = GameLogic.getAvailablePositions(board);
      
      expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    });
  });

  describe('isBoardFull', () => {
    it('should return true for full board', () => {
      const board: Board = ['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', 'O'];
      const result = GameLogic.isBoardFull(board);
      
      expect(result).toBe(true);
    });

    it('should return false for partially filled board', () => {
      const board: Board = ['X', null, 'O', null, null, null, null, null, null];
      const result = GameLogic.isBoardFull(board);
      
      expect(result).toBe(false);
    });

    it('should return false for empty board', () => {
      const board: Board = [null, null, null, null, null, null, null, null, null];
      const result = GameLogic.isBoardFull(board);
      
      expect(result).toBe(false);
    });
  });

  describe('isBoardEmpty', () => {
    it('should return true for empty board', () => {
      const board: Board = [null, null, null, null, null, null, null, null, null];
      const result = GameLogic.isBoardEmpty(board);
      
      expect(result).toBe(true);
    });

    it('should return false for partially filled board', () => {
      const board: Board = ['X', null, null, null, null, null, null, null, null];
      const result = GameLogic.isBoardEmpty(board);
      
      expect(result).toBe(false);
    });
  });

  describe('getRandomMove', () => {
    it('should return a valid random move', () => {
      const board: Board = ['X', null, 'O', null, null, null, null, null, null];
      const result = GameLogic.getRandomMove(board);
      
      expect([1, 3, 4, 5, 6, 7, 8]).toContain(result);
    });

    it('should throw error for full board', () => {
      const board: Board = ['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', 'O'];
      
      expect(() => GameLogic.getRandomMove(board)).toThrow('No available moves');
    });

    it('should work with single available position', () => {
      const board: Board = ['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', null];
      const result = GameLogic.getRandomMove(board);
      
      expect(result).toBe(8);
    });
  });

  describe('getSmartMove', () => {
    it('should win when possible', () => {
      const board: Board = ['X', 'X', null, null, null, null, null, null, null];
      const result = GameLogic.getSmartMove(board, 'X');
      
      expect(result).toBe(2); // Winning move
    });

    it('should block opponent win', () => {
      const board: Board = ['O', 'O', null, null, null, null, null, null, null];
      const result = GameLogic.getSmartMove(board, 'X');
      
      expect(result).toBe(2); // Blocking move
    });

    it('should take center when available', () => {
      const board: Board = ['X', null, null, null, null, null, null, null, 'O'];
      const result = GameLogic.getSmartMove(board, 'X');
      
      expect(result).toBe(4); // Center position
    });

    it('should prefer corners when center is taken', () => {
      const board: Board = [null, null, null, null, 'O', null, null, null, null];
      const result = GameLogic.getSmartMove(board, 'X');
      
      expect([0, 2, 6, 8]).toContain(result);
    });

    it('should make any valid move as fallback', () => {
      const board: Board = ['X', 'O', 'X', 'O', 'X', null, null, null, null];
      const result = GameLogic.getSmartMove(board, 'O');
      
      expect([5, 6, 7, 8]).toContain(result);
    });
  });

  describe('validateGameState', () => {
    it('should validate correct game state', () => {
      const board: Board = ['X', 'O', null, null, null, null, null, null, null];
      const result = GameLogic.validateGameState(board, 'X', 2);
      
      expect(result).toBe(true);
    });

    it('should reject invalid board length', () => {
      const board = ['X', 'O'] as Board;
      const result = GameLogic.validateGameState(board, 'X', 2);
      
      expect(result).toBe(false);
    });

    it('should reject invalid move count', () => {
      const board: Board = ['X', 'O', null, null, null, null, null, null, null];
      const result = GameLogic.validateGameState(board, 'X', 5); // Wrong count
      
      expect(result).toBe(false);
    });

    it('should reject unbalanced player counts', () => {
      const board: Board = ['X', 'X', 'X', null, null, null, null, null, null];
      const result = GameLogic.validateGameState(board, 'O', 3);
      
      expect(result).toBe(false); // X has 3, O has 0
    });

    it('should reject wrong current player for equal counts', () => {
      const board: Board = ['X', 'O', null, null, null, null, null, null, null];
      const result = GameLogic.validateGameState(board, 'O', 2); // Should be X's turn
      
      expect(result).toBe(false);
    });

    it('should reject wrong current player when X leads', () => {
      const board: Board = ['X', 'O', 'X', null, null, null, null, null, null];
      const result = GameLogic.validateGameState(board, 'X', 3); // Should be O's turn
      
      expect(result).toBe(false);
    });
  });

  describe('calculateGameStats', () => {
    it('should calculate stats correctly', () => {
      const games = [
        { result: 'win' as GameResult, winner: 'X' as Player },
        { result: 'win' as GameResult, winner: 'X' as Player },
        { result: 'draw' as GameResult, winner: null },
        { result: 'win' as GameResult, winner: 'O' as Player }
      ];
      
      const result = GameLogic.calculateGameStats(games);
      
      expect(result.totalGames).toBe(4);
      expect(result.wins).toBe(3);
      expect(result.draws).toBe(1);
      expect(result.losses).toBe(0);
      expect(result.winRate).toBe(75);
    });

    it('should handle empty games array', () => {
      const result = GameLogic.calculateGameStats([]);
      
      expect(result.totalGames).toBe(0);
      expect(result.winRate).toBe(0);
    });

    it('should handle invalid games array', () => {
      const result = GameLogic.calculateGameStats(null as any);
      
      expect(mockLogError).toHaveBeenCalled();
      expect(result.totalGames).toBe(0);
    });

    it('should filter invalid game entries', () => {
      const games = [
        { result: 'win' as GameResult, winner: 'X' as Player },
        null,
        { result: 'invalid' as any, winner: 'X' as Player },
        { result: 'draw' as GameResult, winner: null }
      ];
      
      const result = GameLogic.calculateGameStats(games as any);
      
      expect(result.totalGames).toBe(2); // Only valid games counted
    });

    it('should handle calculation errors', () => {
      const games = [
        { result: 'win' as GameResult, winner: 'X' as Player }
      ];
      
      // Mock Array.filter to throw error
      const originalFilter = Array.prototype.filter;
      Array.prototype.filter = jest.fn(() => {
        throw new Error('Calculation error');
      });
      
      const result = GameLogic.calculateGameStats(games);
      
      expect(mockLogError).toHaveBeenCalled();
      expect(result.totalGames).toBe(0);
      
      // Restore filter
      Array.prototype.filter = originalFilter;
    });
  });

  describe('validateGameSequence', () => {
    it('should validate correct game sequence', () => {
      const moves = [
        {
          position: 0,
          player: 'X' as Player,
          timestamp: new Date(Date.now() - 2000),
          board: ['X', null, null, null, null, null, null, null, null] as Board
        },
        {
          position: 1,
          player: 'O' as Player,
          timestamp: new Date(),
          board: ['X', 'O', null, null, null, null, null, null, null] as Board
        }
      ];
      
      const result = GameLogic.validateGameSequence(moves);
      
      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.riskLevel).toBe('low');
    });

    it('should detect too fast moves', () => {
      const moves = [
        {
          position: 0,
          player: 'X' as Player,
          timestamp: new Date(Date.now() - 50), // 50ms ago
          board: ['X', null, null, null, null, null, null, null, null] as Board
        },
        {
          position: 1,
          player: 'O' as Player,
          timestamp: new Date(),
          board: ['X', 'O', null, null, null, null, null, null, null] as Board
        }
      ];
      
      const result = GameLogic.validateGameSequence(moves);
      
      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.riskLevel).toBe('high');
    });

    it('should detect invalid player sequence', () => {
      const moves = [
        {
          position: 0,
          player: 'X' as Player,
          timestamp: new Date(Date.now() - 2000),
          board: ['X', null, null, null, null, null, null, null, null] as Board
        },
        {
          position: 1,
          player: 'X' as Player, // Should be O
          timestamp: new Date(),
          board: ['X', 'X', null, null, null, null, null, null, null] as Board
        }
      ];
      
      const result = GameLogic.validateGameSequence(moves);
      
      expect(result.isValid).toBe(false);
      expect(result.riskLevel).toBe('high');
    });

    it('should detect invalid moves', () => {
      const moves = [
        {
          position: 0,
          player: 'X' as Player,
          timestamp: new Date(Date.now() - 2000),
          board: ['X', null, null, null, null, null, null, null, null] as Board
        },
        {
          position: 0, // Same position as previous move
          player: 'O' as Player,
          timestamp: new Date(),
          board: ['X', 'O', null, null, null, null, null, null, null] as Board
        }
      ];
      
      const result = GameLogic.validateGameSequence(moves);
      
      expect(result.isValid).toBe(false);
      expect(result.riskLevel).toBe('high');
    });

    it('should handle empty moves array', () => {
      const result = GameLogic.validateGameSequence([]);
      
      expect(result.isValid).toBe(true);
      expect(result.riskLevel).toBe('low');
    });

    it('should handle invalid moves array', () => {
      const result = GameLogic.validateGameSequence(null as any);
      
      expect(result.isValid).toBe(true);
      expect(result.riskLevel).toBe('low');
    });

    it('should handle validation errors', () => {
      const moves = [
        {
          position: 0,
          player: 'X' as Player,
          timestamp: new Date(),
          board: ['X', null, null, null, null, null, null, null, null] as Board
        }
      ];
      
      // Mock Date.getTime to throw error
      const originalGetTime = Date.prototype.getTime;
      Date.prototype.getTime = jest.fn(() => {
        throw new Error('Time error');
      });
      
      const result = GameLogic.validateGameSequence(moves);
      
      expect(mockLogError).toHaveBeenCalled();
      expect(result.isValid).toBe(false);
      expect(result.riskLevel).toBe('high');
      
      // Restore getTime
      Date.prototype.getTime = originalGetTime;
    });
  });

  describe('detectSuspiciousPatterns', () => {
    it('should detect no suspicious patterns for normal gameplay', () => {
      const gameHistory = [
        { board: [] as Board, result: 'win' as GameResult, duration: 30000, moveCount: 5 },
        { board: [] as Board, result: 'draw' as GameResult, duration: 45000, moveCount: 9 },
        { board: [] as Board, result: 'win' as GameResult, duration: 25000, moveCount: 7 }
      ];
      
      const result = GameLogic.detectSuspiciousPatterns(gameHistory);
      
      expect(result.isSuspicious).toBe(false);
      expect(result.reasons).toHaveLength(0);
    });

    it('should detect unrealistic win rate', () => {
      const gameHistory = Array(15).fill(null).map(() => ({
        board: [] as Board,
        result: 'win' as GameResult,
        duration: 30000,
        moveCount: 5
      }));
      
      const result = GameLogic.detectSuspiciousPatterns(gameHistory);
      
      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Unrealistic win rate detected');
    });

    it('should detect unrealistic game durations', () => {
      const gameHistory = Array(10).fill(null).map(() => ({
        board: [] as Board,
        result: 'win' as GameResult,
        duration: 2000, // 2 seconds
        moveCount: 5
      }));
      
      const result = GameLogic.detectSuspiciousPatterns(gameHistory);
      
      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Unrealistic game durations detected');
    });

    it('should detect too many perfect games', () => {
      const gameHistory = Array(10).fill(null).map(() => ({
        board: [] as Board,
        result: 'win' as GameResult,
        duration: 10000,
        moveCount: 3 // Perfect game in 3 moves
      }));
      
      const result = GameLogic.detectSuspiciousPatterns(gameHistory);
      
      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Too many perfect games detected');
    });

    it('should handle insufficient game history', () => {
      const gameHistory = [
        { board: [] as Board, result: 'win' as GameResult, duration: 30000, moveCount: 5 }
      ];
      
      const result = GameLogic.detectSuspiciousPatterns(gameHistory);
      
      expect(result.isSuspicious).toBe(false);
    });

    it('should handle invalid game history', () => {
      const result = GameLogic.detectSuspiciousPatterns(null as any);
      
      expect(result.isSuspicious).toBe(false);
    });

    it('should handle pattern detection errors', () => {
      const gameHistory = [
        { board: [] as Board, result: 'win' as GameResult, duration: 30000, moveCount: 5 }
      ];
      
      // Mock Array.filter to throw error
      const originalFilter = Array.prototype.filter;
      Array.prototype.filter = jest.fn(() => {
        throw new Error('Pattern detection error');
      });
      
      const result = GameLogic.detectSuspiciousPatterns(gameHistory);
      
      expect(mockLogError).toHaveBeenCalled();
      expect(result.isSuspicious).toBe(false);
      
      // Restore filter
      Array.prototype.filter = originalFilter;
    });
  });
});
