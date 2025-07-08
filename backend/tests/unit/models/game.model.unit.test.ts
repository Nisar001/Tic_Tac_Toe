// Unit tests for game.model.ts
import mongoose from 'mongoose';
import Game, { IGame } from '../../../src/models/game.model';

describe('Game Model', () => {
  it('should create a valid game instance', async () => {
    const gameData: Partial<IGame> = {
      players: {
        player1: new mongoose.Types.ObjectId(),
        player2: new mongoose.Types.ObjectId(),
      },
      room: 'room_123',
    };

    const game = new Game(gameData);
    const validationError = game.validateSync();

    expect(validationError).toBeUndefined();
    expect(game.board.length).toBe(3);
    expect(game.board.every(row => row.length === 3)).toBe(true);
  });

  it('should throw validation error for missing required fields', async () => {
    const game = new Game({});
    const validationError = game.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors['players']).toBeDefined();
    expect(validationError?.errors['room']).toBeDefined();
  });

  it('should validate board size', async () => {
    const gameData: Partial<IGame> = {
      players: {
        player1: new mongoose.Types.ObjectId(),
        player2: new mongoose.Types.ObjectId(),
      },
      board: [[null, null], [null, null], [null, null]],
      room: 'room_123',
    };

    const game = new Game(gameData);
    const validationError = game.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors['board']).toBeDefined();
  });

  it('should correctly switch turns', async () => {
    const gameData: Partial<IGame> = {
      players: {
        player1: new mongoose.Types.ObjectId(),
        player2: new mongoose.Types.ObjectId(),
      },
      room: 'room_123',
    };

    const game = new Game(gameData);
    expect(game.currentPlayer).toBe('X');

    game.switchTurn();
    expect(game.currentPlayer).toBe('O');

    game.switchTurn();
    expect(game.currentPlayer).toBe('X');
  });

  it('should validate moves', async () => {
    const gameData: Partial<IGame> = {
      players: {
        player1: new mongoose.Types.ObjectId(),
        player2: new mongoose.Types.ObjectId(),
      },
      room: 'room_123',
    };

    const game = new Game(gameData);

    expect(game.isValidMove(0, 0)).toBe(true);
    game.board[0][0] = 'X';
    expect(game.isValidMove(0, 0)).toBe(false);
    expect(game.isValidMove(3, 3)).toBe(false);
  });

  it('should correctly make moves and determine winner', async () => {
    const player1 = new mongoose.Types.ObjectId();
    const player2 = new mongoose.Types.ObjectId();

    const gameData: Partial<IGame> = {
      players: { player1, player2 },
      room: 'room_123',
      status: 'active',
    };

    const game = new Game(gameData);

    expect(game.makeMove(player1.toString(), 0, 0)).toBe(true);
    expect(game.board[0][0]).toBe('X');

    expect(game.makeMove(player2.toString(), 1, 1)).toBe(true);
    expect(game.board[1][1]).toBe('O');

    expect(game.makeMove(player1.toString(), 0, 1)).toBe(true);
    expect(game.makeMove(player2.toString(), 2, 2)).toBe(true);
    expect(game.makeMove(player1.toString(), 0, 2)).toBe(true);

    expect(game.status).toBe('completed');
    expect(game.result).toBe('win');
    expect(game.winner?.toString()).toBe(player1.toString());
  });

  it('should handle draw scenarios', async () => {
    const player1 = new mongoose.Types.ObjectId();
    const player2 = new mongoose.Types.ObjectId();

    const gameData: Partial<IGame> = {
      players: { player1, player2 },
      room: 'room_123',
      status: 'active',
    };

    const game = new Game(gameData);

    game.board = [
      ['X', 'O', 'X'],
      ['X', 'X', 'O'],
      ['O', 'X', 'O'],
    ];

    const winner = game.checkWinner();
    expect(winner).toBe('draw');
    expect(game.status).toBe('active');

    game.makeMove(player1.toString(), 0, 0);
    expect(game.status).toBe('completed');
    expect(game.result).toBe('draw');
  });
});
