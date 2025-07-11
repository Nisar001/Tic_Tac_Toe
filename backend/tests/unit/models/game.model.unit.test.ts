import mongoose, { Document } from 'mongoose';
import GameModel, { IGame } from '../../../src/models/game.model';
import { logError, logDebug } from '../../../src/utils/logger';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logError: jest.fn(),
  logDebug: jest.fn()
}));

describe('Game Model Unit Tests', () => {
  let gameData: any;
  let player1Id: mongoose.Types.ObjectId;
  let player2Id: mongoose.Types.ObjectId;

  beforeEach(() => {
    jest.clearAllMocks();
    
    player1Id = new mongoose.Types.ObjectId();
    player2Id = new mongoose.Types.ObjectId();
    
    gameData = {
      gameId: 'test_game_123',
      players: {
        player1: player1Id,
        player2: player2Id
      },
      board: [
        [null, null, null],
        [null, null, null],
        [null, null, null]
      ],
      currentPlayer: 'X',
      status: 'active',
      room: 'room_test_game_123',
      moves: []
    };
  });

  describe('Schema Validation', () => {
    it('should create a valid game with all required fields', () => {
      const game = new GameModel(gameData);
      const validation = game.validateSync();
      
      expect(validation).toBeUndefined();
      expect(game.gameId).toBe('test_game_123');
      expect(game.players.player1).toEqual(player1Id);
      expect(game.players.player2).toEqual(player2Id);
      expect(game.currentPlayer).toBe('X');
      expect(game.status).toBe('active');
    });

    it('should fail validation with missing required fields', () => {
      const invalidGame = new GameModel({});
      const validation = invalidGame.validateSync();
      
      expect(validation).toBeDefined();
      expect(validation?.errors).toBeDefined();
    });

    it('should validate board structure correctly', () => {
      const gameWithInvalidBoard = new GameModel({
        ...gameData,
        board: [[null, null], [null, null]]
      });
      
      const validation = gameWithInvalidBoard.validateSync();
      expect(validation?.errors?.board).toBeDefined();
    });

    it('should validate enum values for currentPlayer', () => {
      const gameWithInvalidPlayer = new GameModel({
        ...gameData,
        currentPlayer: 'Z'
      });
      
      const validation = gameWithInvalidPlayer.validateSync();
      expect(validation?.errors?.currentPlayer).toBeDefined();
    });

    it('should validate enum values for status', () => {
      const gameWithInvalidStatus = new GameModel({
        ...gameData,
        status: 'invalid_status'
      });
      
      const validation = gameWithInvalidStatus.validateSync();
      expect(validation?.errors?.status).toBeDefined();
    });

    it('should validate enum values for result', () => {
      const gameWithInvalidResult = new GameModel({
        ...gameData,
        result: 'invalid_result'
      });
      
      const validation = gameWithInvalidResult.validateSync();
      expect(validation?.errors?.result).toBeDefined();
    });
  });

  describe('checkWinner Method', () => {
    let game: IGame;

    beforeEach(() => {
      game = new GameModel(gameData);
    });

    it('should return null for empty board', () => {
      const winner = game.checkWinner();
      expect(winner).toBeNull();
    });

    it('should detect row winner', () => {
      game.board = [
        ['X', 'X', 'X'],
        [null, null, null],
        [null, null, null]
      ];
      
      const winner = game.checkWinner();
      expect(winner).toBe('X');
    });

    it('should detect column winner', () => {
      game.board = [
        ['O', null, null],
        ['O', null, null],
        ['O', null, null]
      ];
      
      const winner = game.checkWinner();
      expect(winner).toBe('O');
    });

    it('should detect diagonal winner (top-left to bottom-right)', () => {
      game.board = [
        ['X', null, null],
        [null, 'X', null],
        [null, null, 'X']
      ];
      
      const winner = game.checkWinner();
      expect(winner).toBe('X');
    });

    it('should detect diagonal winner (top-right to bottom-left)', () => {
      game.board = [
        [null, null, 'O'],
        [null, 'O', null],
        ['O', null, null]
      ];
      
      const winner = game.checkWinner();
      expect(winner).toBe('O');
    });

    it('should detect draw when board is full with no winner', () => {
      game.board = [
        ['X', 'O', 'X'],
        ['O', 'O', 'X'],
        ['O', 'X', 'O']
      ];
      
      const winner = game.checkWinner();
      expect(winner).toBe('draw');
    });

    it('should handle invalid board structure gracefully', () => {
      game.board = null as any;
      const winner = game.checkWinner();
      
      expect(winner).toBeNull();
      expect(logError).toHaveBeenCalled();
    });

    it('should handle invalid board row gracefully', () => {
      game.board = [
        ['X', 'X', 'X'],
        null as any,
        ['O', 'O', 'O']
      ];
      
      const winner = game.checkWinner();
      expect(winner).toBe('X'); // Should still detect the valid row
    });
  });

  describe('isValidMove Method', () => {
    let game: IGame;

    beforeEach(() => {
      game = new GameModel(gameData);
    });

    it('should return true for valid move on empty cell', () => {
      const isValid = game.isValidMove(0, 0);
      expect(isValid).toBe(true);
    });

    it('should return false for move on occupied cell', () => {
      game.board[0][0] = 'X';
      const isValid = game.isValidMove(0, 0);
      expect(isValid).toBe(false);
    });

    it('should return false for out of bounds moves', () => {
      expect(game.isValidMove(-1, 0)).toBe(false);
      expect(game.isValidMove(3, 0)).toBe(false);
      expect(game.isValidMove(0, -1)).toBe(false);
      expect(game.isValidMove(0, 3)).toBe(false);
    });

    it('should return false for non-integer coordinates', () => {
      expect(game.isValidMove(0.5, 0)).toBe(false);
      expect(game.isValidMove(0, 1.5)).toBe(false);
    });

    it('should return false for non-number coordinates', () => {
      expect(game.isValidMove('0' as any, 0)).toBe(false);
      expect(game.isValidMove(0, '0' as any)).toBe(false);
    });

    it('should handle invalid board structure gracefully', () => {
      game.board = null as any;
      const isValid = game.isValidMove(0, 0);
      
      expect(isValid).toBe(false);
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('getPlayerSymbol Method', () => {
    let game: IGame;

    beforeEach(() => {
      game = new GameModel(gameData);
    });

    it('should return X for player1', () => {
      const symbol = game.getPlayerSymbol(player1Id.toString());
      expect(symbol).toBe('X');
    });

    it('should return O for player2', () => {
      const symbol = game.getPlayerSymbol(player2Id.toString());
      expect(symbol).toBe('O');
    });

    it('should return null for invalid player ID', () => {
      const invalidId = new mongoose.Types.ObjectId().toString();
      const symbol = game.getPlayerSymbol(invalidId);
      expect(symbol).toBeNull();
    });

    it('should return null for null/undefined player ID', () => {
      expect(game.getPlayerSymbol(null as any)).toBeNull();
      expect(game.getPlayerSymbol(undefined as any)).toBeNull();
    });

    it('should handle invalid players structure gracefully', () => {
      game.players = null as any;
      const symbol = game.getPlayerSymbol(player1Id.toString());
      
      expect(symbol).toBeNull();
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('makeMove Method', () => {
    let game: IGame;

    beforeEach(() => {
      game = new GameModel(gameData);
    });

    it('should make a valid move successfully', () => {
      const success = game.makeMove(player1Id.toString(), 0, 0);
      
      expect(success).toBe(true);
      expect(game.board[0][0]).toBe('X');
      expect(game.currentPlayer).toBe('O');
      expect(game.moves.length).toBe(1);
      expect(game.moves[0].position).toEqual({ row: 0, col: 0 });
      expect(game.moves[0].symbol).toBe('X');
    });

    it('should not allow move when game is not active', () => {
      game.status = 'completed';
      const success = game.makeMove(player1Id.toString(), 0, 0);
      
      expect(success).toBe(false);
      expect(game.board[0][0]).toBeNull();
    });

    it('should not allow move when it is not the player\'s turn', () => {
      game.currentPlayer = 'O';
      const success = game.makeMove(player1Id.toString(), 0, 0);
      
      expect(success).toBe(false);
      expect(game.board[0][0]).toBeNull();
    });

    it('should not allow move on occupied cell', () => {
      game.board[0][0] = 'O';
      const success = game.makeMove(player1Id.toString(), 0, 0);
      
      expect(success).toBe(false);
    });

    it('should detect win and update game status', () => {
      // Set up a winning scenario
      game.board[0][0] = 'X';
      game.board[0][1] = 'X';
      
      const success = game.makeMove(player1Id.toString(), 0, 2);
      
      expect(success).toBe(true);
      expect(game.status).toBe('completed');
      expect(game.result).toBe('win');
      expect(game.winner).toEqual(player1Id);
      expect(game.endedAt).toBeDefined();
    });

    it('should detect draw and update game status', () => {
      // Set up a draw scenario
      game.board = [
        ['X', 'O', 'X'],
        ['O', 'O', 'X'],
        ['O', 'X', null]
      ];
      game.currentPlayer = 'O';
      
      const success = game.makeMove(player2Id.toString(), 2, 2);
      
      expect(success).toBe(true);
      expect(game.status).toBe('completed');
      expect(game.result).toBe('draw');
      expect(game.winner).toBeUndefined();
    });

    it('should handle invalid player gracefully', () => {
      const success = game.makeMove('invalid_player', 0, 0);
      
      expect(success).toBe(false);
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('switchTurn Method', () => {
    let game: IGame;

    beforeEach(() => {
      game = new GameModel(gameData);
    });

    it('should switch from X to O', () => {
      game.currentPlayer = 'X';
      game.switchTurn();
      expect(game.currentPlayer).toBe('O');
    });

    it('should switch from O to X', () => {
      game.currentPlayer = 'O';
      game.switchTurn();
      expect(game.currentPlayer).toBe('X');
    });

    it('should handle invalid current player gracefully', () => {
      game.currentPlayer = 'Z' as any;
      game.switchTurn();
      
      expect(game.currentPlayer).toBe('X');
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('sanitizeGameData Method', () => {
    let game: IGame;

    beforeEach(() => {
      game = new GameModel({});
    });

    it('should sanitize invalid gameId', () => {
      game.gameId = null as any;
      game.sanitizeGameData();
      
      expect(game.gameId).toBeDefined();
      expect(typeof game.gameId).toBe('string');
      expect(game.gameId).toMatch(/^game_\d+_/);
    });

    it('should sanitize invalid board', () => {
      game.board = null as any;
      game.sanitizeGameData();
      
      expect(game.board).toEqual([
        [null, null, null],
        [null, null, null],
        [null, null, null]
      ]);
    });

    it('should sanitize invalid board cells', () => {
      game.board = [
        ['X', 'invalid', 'O'],
        [null, null, null],
        [null, null, null]
      ];
      game.sanitizeGameData();
      
      expect(game.board[0][1]).toBeNull();
    });

    it('should sanitize invalid current player', () => {
      game.currentPlayer = 'Z' as any;
      game.sanitizeGameData();
      
      expect(game.currentPlayer).toBe('X');
    });

    it('should sanitize invalid status', () => {
      game.status = 'invalid' as any;
      game.sanitizeGameData();
      
      expect(game.status).toBe('waiting');
    });

    it('should sanitize invalid result', () => {
      game.result = 'invalid' as any;
      game.sanitizeGameData();
      
      expect(game.result).toBeNull();
    });

    it('should sanitize moves array', () => {
      game.moves = null as any;
      game.sanitizeGameData();
      
      expect(Array.isArray(game.moves)).toBe(true);
      expect(game.moves.length).toBe(0);
    });

    it('should sanitize room', () => {
      game.room = null as any;
      game.gameId = 'test_game';
      game.sanitizeGameData();
      
      expect(game.room).toBe('room_test_game');
    });

    it('should sanitize dates', () => {
      game.startedAt = null as any;
      game.endedAt = 'invalid' as any;
      game.sanitizeGameData();
      
      expect(game.startedAt).toBeInstanceOf(Date);
      expect(game.endedAt).toBeUndefined();
    });
  });

  describe('validateGameState Method', () => {
    let game: IGame;

    beforeEach(() => {
      game = new GameModel(gameData);
    });

    it('should validate a valid game state', () => {
      const validation = game.validateGameState();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should detect invalid gameId', () => {
      game.gameId = null as any;
      const validation = game.validateGameState();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Game ID is required and must be a string');
    });

    it('should detect missing players', () => {
      game.players = null as any;
      const validation = game.validateGameState();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Both players are required');
    });

    it('should detect invalid player ObjectIds', () => {
      game.players.player1 = 'invalid' as any;
      const validation = game.validateGameState();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Player1 must be a valid ObjectId');
    });

    it('should detect same players', () => {
      game.players.player2 = game.players.player1;
      const validation = game.validateGameState();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Players must be different');
    });

    it('should detect invalid board structure', () => {
      game.board = [[null, null]] as any;
      const validation = game.validateGameState();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Board must be a 3x3 array');
    });

    it('should detect invalid current player', () => {
      game.currentPlayer = 'Z' as any;
      const validation = game.validateGameState();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Current player must be X or O');
    });

    it('should detect invalid status', () => {
      game.status = 'invalid' as any;
      const validation = game.validateGameState();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid game status');
    });

    it('should detect missing room', () => {
      game.room = null as any;
      const validation = game.validateGameState();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Room is required and must be a string');
    });

    it('should handle validation errors gracefully', () => {
      // Mock a validation that throws an error
      game.players = {
        get player1() { throw new Error('Test error'); },
        player2: player2Id
      } as any;
      
      const validation = game.validateGameState();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Validation process failed');
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('Pre-save Middleware', () => {
    it('should call sanitizeGameData before save', async () => {
      const game = new GameModel(gameData);
      const sanitizeSpy = jest.spyOn(game, 'sanitizeGameData');
      
      await game.validate();
      
      expect(sanitizeSpy).toHaveBeenCalled();
    });

    it('should call validateGameState before save', async () => {
      const game = new GameModel(gameData);
      const validateSpy = jest.spyOn(game, 'validateGameState');
      
      await game.validate();
      
      expect(validateSpy).toHaveBeenCalled();
    });

    it('should throw error for invalid game state', async () => {
      const game = new GameModel({
        ...gameData,
        players: { player1: 'invalid', player2: 'invalid' }
      });
      
      await expect(game.validate()).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in checkWinner gracefully', () => {
      const game = new GameModel(gameData);
      // Force an error by making board a non-array
      Object.defineProperty(game, 'board', {
        get() { throw new Error('Test error'); }
      });
      
      const winner = game.checkWinner();
      
      expect(winner).toBeNull();
      expect(logError).toHaveBeenCalled();
    });

    it('should handle errors in makeMove gracefully', () => {
      const game = new GameModel(gameData);
      // Force an error
      jest.spyOn(game, 'getPlayerSymbol').mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const success = game.makeMove(player1Id.toString(), 0, 0);
      
      expect(success).toBe(false);
      expect(logError).toHaveBeenCalled();
    });

    it('should handle errors in sanitizeGameData gracefully', () => {
      const game = new GameModel(gameData);
      // Force an error during sanitization
      Object.defineProperty(game, 'gameId', {
        get() { throw new Error('Test error'); },
        set() { throw new Error('Test error'); }
      });
      
      expect(() => game.sanitizeGameData()).not.toThrow();
      expect(logError).toHaveBeenCalled();
    });
  });
});
