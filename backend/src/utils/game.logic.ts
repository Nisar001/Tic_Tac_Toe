/**
 * Core Game Logic for Tic-Tac-Toe
 * Handles all game rules, validation, and win detection
 */

export type Player = 'X' | 'O';
export type CellValue = Player | null;
export type Board = CellValue[][];
export type GameResult = 'win' | 'draw' | 'ongoing';

export interface GameMove {
  row: number;
  col: number;
  player: Player;
  timestamp: Date;
}

export interface GameState {
  board: Board;
  currentPlayer: Player;
  status: 'waiting' | 'active' | 'completed';
  winner: Player | null;
  result: GameResult;
  moves: GameMove[];
  startedAt: Date;
  lastMoveAt?: Date;
}

export class GameLogic {
  /**
   * Create an empty 3x3 game board
   */
  static createEmptyBoard(): Board {
    return [
      [null, null, null],
      [null, null, null],
      [null, null, null]
    ];
  }

  /**
   * Initialize a new game state
   */
  static initializeGame(): GameState {
    return {
      board: this.createEmptyBoard(),
      currentPlayer: 'X', // X always starts
      status: 'waiting',
      winner: null,
      result: 'ongoing',
      moves: [],
      startedAt: new Date()
    };
  }

  /**
   * Validate if a move is legal
   */
  static validateMove(
    board: Board, 
    row: number, 
    col: number, 
    player: Player,
    currentPlayer: Player
  ): { valid: boolean; error?: string } {
    // Check if coordinates are within bounds
    if (row < 0 || row > 2 || col < 0 || col > 2) {
      return { valid: false, error: 'Move coordinates out of bounds' };
    }

    // Check if it's the player's turn
    if (player !== currentPlayer) {
      return { valid: false, error: 'Not your turn' };
    }

    // Check if cell is empty
    if (board[row][col] !== null) {
      return { valid: false, error: 'Cell already occupied' };
    }

    return { valid: true };
  }

  /**
   * Make a move on the board
   */
  static makeMove(
    gameState: GameState,
    row: number,
    col: number,
    player: Player
  ): { success: boolean; newState?: GameState; error?: string } {
    // Validate the move
    const validation = this.validateMove(
      gameState.board, 
      row, 
      col, 
      player, 
      gameState.currentPlayer
    );

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Create new board state
    const newBoard = gameState.board.map(row => [...row]);
    newBoard[row][col] = player;

    // Create move record
    const move: GameMove = {
      row,
      col,
      player,
      timestamp: new Date()
    };

    // Check for winner
    const winner = this.checkWinner(newBoard);
    const isDraw = this.isBoardFull(newBoard) && !winner;
    
    let result: GameResult = 'ongoing';
    let status: GameState['status'] = 'active';

    if (winner) {
      result = 'win';
      status = 'completed';
    } else if (isDraw) {
      result = 'draw';
      status = 'completed';
    }

    // Create new game state
    const newState: GameState = {
      ...gameState,
      board: newBoard,
      currentPlayer: this.getNextPlayer(player),
      status,
      winner,
      result,
      moves: [...gameState.moves, move],
      lastMoveAt: new Date()
    };

    return { success: true, newState };
  }

  /**
   * Check for a winner on the board
   */
  static checkWinner(board: Board): Player | null {
    // Check rows
    for (let i = 0; i < 3; i++) {
      if (board[i][0] && 
          board[i][0] === board[i][1] && 
          board[i][1] === board[i][2]) {
        return board[i][0];
      }
    }

    // Check columns
    for (let j = 0; j < 3; j++) {
      if (board[0][j] && 
          board[0][j] === board[1][j] && 
          board[1][j] === board[2][j]) {
        return board[0][j];
      }
    }

    // Check diagonals
    if (board[0][0] && 
        board[0][0] === board[1][1] && 
        board[1][1] === board[2][2]) {
      return board[0][0];
    }

    if (board[0][2] && 
        board[0][2] === board[1][1] && 
        board[1][1] === board[2][0]) {
      return board[0][2];
    }

    return null;
  }

  /**
   * Check if the board is full (for draw detection)
   */
  static isBoardFull(board: Board): boolean {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[i][j] === null) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Get the next player
   */
  static getNextPlayer(currentPlayer: Player): Player {
    return currentPlayer === 'X' ? 'O' : 'X';
  }

  /**
   * Get game statistics
   */
  static getGameStats(gameState: GameState) {
    return {
      totalMoves: gameState.moves.length,
      duration: gameState.lastMoveAt 
        ? gameState.lastMoveAt.getTime() - gameState.startedAt.getTime()
        : 0,
      winner: gameState.winner,
      result: gameState.result,
      isCompleted: gameState.status === 'completed'
    };
  }

  /**
   * Convert board to string representation (for debugging)
   */
  static boardToString(board: Board): string {
    return board.map(row => 
      row.map(cell => cell || '-').join(' | ')
    ).join('\n---------\n');
  }

  /**
   * Clone game state (deep copy)
   */
  static cloneGameState(gameState: GameState): GameState {
    return {
      ...gameState,
      board: gameState.board.map(row => [...row]),
      moves: [...gameState.moves]
    };
  }

  /**
   * Validate entire game state consistency
   */
  static validateGameState(gameState: GameState): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check board dimensions
    if (gameState.board.length !== 3 || 
        !gameState.board.every(row => row.length === 3)) {
      errors.push('Invalid board dimensions');
    }

    // Check move count consistency
    const occupiedCells = gameState.board.flat().filter(cell => cell !== null);
    if (occupiedCells.length !== gameState.moves.length) {
      errors.push('Move count does not match board state');
    }

    // Check winner consistency
    const calculatedWinner = this.checkWinner(gameState.board);
    if (gameState.winner !== calculatedWinner) {
      errors.push('Winner state inconsistent with board');
    }

    // Check current player validity
    if (gameState.status === 'active') {
      const expectedPlayer = gameState.moves.length % 2 === 0 ? 'X' : 'O';
      if (gameState.currentPlayer !== expectedPlayer) {
        errors.push('Current player inconsistent with move history');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
