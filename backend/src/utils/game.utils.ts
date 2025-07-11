import { logError, logDebug } from './logger';

export type Player = 'X' | 'O';
export type BoardCell = Player | null;
export type Board = BoardCell[];
export type GameResult = 'win' | 'draw' | 'ongoing';

export interface MoveResult {
  isValid: boolean;
  board: Board;
  result: GameResult;
  winner: Player | null;
  winningLine?: number[];
}

export interface GameValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedBoard?: Board;
}

export interface AntiCheatResult {
  isValid: boolean;
  violations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export class GameLogic {
  private static readonly BOARD_SIZE = 9;
  private static readonly WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  /**
   * Validate board input with comprehensive checks
   */
  private static validateBoard(board: any): GameValidationResult {
    const errors: string[] = [];

    // Check if board is an array
    if (!Array.isArray(board)) {
      errors.push('Board must be an array');
      return { isValid: false, errors };
    }

    // Check board size
    if (board.length !== this.BOARD_SIZE) {
      errors.push(`Board must have exactly ${this.BOARD_SIZE} cells`);
    }

    // Validate each cell
    const sanitizedBoard: Board = [];
    for (let i = 0; i < this.BOARD_SIZE; i++) {
      const cell = board[i];
      if (cell === null || cell === 'X' || cell === 'O') {
        sanitizedBoard[i] = cell;
      } else if (cell === undefined || cell === '') {
        sanitizedBoard[i] = null;
      } else {
        errors.push(`Invalid cell value at position ${i}: ${cell}`);
        sanitizedBoard[i] = null;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedBoard: errors.length === 0 ? sanitizedBoard : undefined
    };
  }

  /**
   * Validate position input
   */
  private static validatePosition(position: any): { isValid: boolean; error?: string; sanitizedPosition?: number } {
    if (typeof position !== 'number') {
      return { isValid: false, error: 'Position must be a number' };
    }

    if (!Number.isInteger(position)) {
      return { isValid: false, error: 'Position must be an integer' };
    }

    if (position < 0 || position >= this.BOARD_SIZE) {
      return { isValid: false, error: `Position must be between 0 and ${this.BOARD_SIZE - 1}` };
    }

    return { isValid: true, sanitizedPosition: position };
  }

  /**
   * Validate player input
   */
  private static validatePlayer(player: any): { isValid: boolean; error?: string; sanitizedPlayer?: Player } {
    if (player !== 'X' && player !== 'O') {
      return { isValid: false, error: 'Player must be "X" or "O"' };
    }

    return { isValid: true, sanitizedPlayer: player };
  }

  /**
   * Create empty board with validation
   */
  static createEmptyBoard(): Board {
    try {
      return Array(this.BOARD_SIZE).fill(null);
    } catch (error) {
      logError(`Board creation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return Array(9).fill(null); // Fallback
    }
  }

  /**
   * Check if move is valid with enhanced validation
   */
  static isValidMove(board: Board, position: number): boolean {
    try {
      const boardValidation = this.validateBoard(board);
      if (!boardValidation.isValid) {
        logError(`Invalid board for move validation: ${boardValidation.errors.join(', ')}`);
        return false;
      }

      const positionValidation = this.validatePosition(position);
      if (!positionValidation.isValid) {
        logError(`Invalid position for move validation: ${positionValidation.error}`);
        return false;
      }

      return boardValidation.sanitizedBoard![positionValidation.sanitizedPosition!] === null;
    } catch (error) {
      logError(`Move validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Make move with comprehensive validation and error handling
   */
  static makeMove(board: Board, position: number, player: Player): MoveResult {
    try {
      // Validate inputs
      const boardValidation = this.validateBoard(board);
      if (!boardValidation.isValid) {
        logError(`Invalid board for move: ${boardValidation.errors.join(', ')}`);
        return {
          isValid: false,
          board,
          result: 'ongoing',
          winner: null
        };
      }

      const positionValidation = this.validatePosition(position);
      if (!positionValidation.isValid) {
        logError(`Invalid position for move: ${positionValidation.error}`);
        return {
          isValid: false,
          board,
          result: 'ongoing',
          winner: null
        };
      }

      const playerValidation = this.validatePlayer(player);
      if (!playerValidation.isValid) {
        logError(`Invalid player for move: ${playerValidation.error}`);
        return {
          isValid: false,
          board,
          result: 'ongoing',
          winner: null
        };
      }

      const sanitizedBoard = boardValidation.sanitizedBoard!;
      const sanitizedPosition = positionValidation.sanitizedPosition!;
      const sanitizedPlayer = playerValidation.sanitizedPlayer!;

      if (!this.isValidMove(sanitizedBoard, sanitizedPosition)) {
        return {
          isValid: false,
          board: sanitizedBoard,
          result: 'ongoing',
          winner: null
        };
      }

      const newBoard = [...sanitizedBoard];
      newBoard[sanitizedPosition] = sanitizedPlayer;

      const { result, winner, winningLine } = this.checkGameResult(newBoard);

      return {
        isValid: true,
        board: newBoard,
        result,
        winner,
        winningLine
      };
    } catch (error) {
      logError(`Make move error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        board,
        result: 'ongoing',
        winner: null
      };
    }
  }

  /**
   * Check game result with enhanced validation
   */
  static checkGameResult(board: Board): { result: GameResult; winner: Player | null; winningLine?: number[] } {
    try {
      const boardValidation = this.validateBoard(board);
      if (!boardValidation.isValid) {
        logError(`Invalid board for result check: ${boardValidation.errors.join(', ')}`);
        return { result: 'ongoing', winner: null };
      }

      const sanitizedBoard = boardValidation.sanitizedBoard!;

      // Check for win
      for (const combination of this.WINNING_COMBINATIONS) {
        const [a, b, c] = combination;
        if (sanitizedBoard[a] && 
            sanitizedBoard[a] === sanitizedBoard[b] && 
            sanitizedBoard[a] === sanitizedBoard[c]) {
          return {
            result: 'win',
            winner: sanitizedBoard[a],
            winningLine: combination
          };
        }
      }

      // Check for draw
      if (sanitizedBoard.every(cell => cell !== null)) {
        return {
          result: 'draw',
          winner: null
        };
      }

      // Game is still ongoing
      return {
        result: 'ongoing',
        winner: null
      };
    } catch (error) {
      logError(`Game result check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { result: 'ongoing', winner: null };
    }
  }

  static getNextPlayer(currentPlayer: Player): Player {
    return currentPlayer === 'X' ? 'O' : 'X';
  }

  static getBoardString(board: Board): string {
    return board.map(cell => cell || ' ').join('');
  }

  static parseBoardString(boardString: string): Board {
    return boardString.split('').map(char => char === ' ' ? null : char as Player);
  }

  static getAvailablePositions(board: Board): number[] {
    return board.map((cell, index) => cell === null ? index : -1).filter(index => index !== -1);
  }

  static isBoardFull(board: Board): boolean {
    return board.every(cell => cell !== null);
  }

  static isBoardEmpty(board: Board): boolean {
    return board.every(cell => cell === null);
  }

  /**
   * Simple AI that makes random valid moves
   */
  static getRandomMove(board: Board): number {
    const availablePositions = this.getAvailablePositions(board);
    if (availablePositions.length === 0) {
      throw new Error('No available moves');
    }
    return availablePositions[Math.floor(Math.random() * availablePositions.length)];
  }

  /**
   * AI with basic strategy
   */
  static getSmartMove(board: Board, player: Player): number {
    const opponent = this.getNextPlayer(player);

    // Try to win
    for (const position of this.getAvailablePositions(board)) {
      const testMove = this.makeMove(board, position, player);
      if (testMove.result === 'win') {
        return position;
      }
    }

    // Try to block opponent's win
    for (const position of this.getAvailablePositions(board)) {
      const testMove = this.makeMove(board, position, opponent);
      if (testMove.result === 'win') {
        return position;
      }
    }

    // Take center if available
    if (this.isValidMove(board, 4)) {
      return 4;
    }

    // Take corners
    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter(pos => this.isValidMove(board, pos));
    if (availableCorners.length > 0) {
      return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }

    // Take any available position
    return this.getRandomMove(board);
  }

  /**
   * Validate game state for consistency
   */
  static validateGameState(board: Board, currentPlayer: Player, moveCount: number): boolean {
    // Check board length
    if (board.length !== 9) {
      return false;
    }

    // Check move count consistency
    const xCount = board.filter(cell => cell === 'X').length;
    const oCount = board.filter(cell => cell === 'O').length;
    
    if (Math.abs(xCount - oCount) > 1) {
      return false;
    }

    if (xCount + oCount !== moveCount) {
      return false;
    }

    // X should go first, so if equal counts, current player should be X
    if (xCount === oCount && currentPlayer !== 'X') {
      return false;
    }

    // If X has one more move, current player should be O
    if (xCount === oCount + 1 && currentPlayer !== 'O') {
      return false;
    }

    return true;
  }

  /**
   * Calculate game statistics with validation
   */
  static calculateGameStats(games: Array<{ result: GameResult; winner: Player | null }>): {
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  } {
    try {
      if (!Array.isArray(games)) {
        logError('Invalid games array for statistics calculation');
        return { totalGames: 0, wins: 0, losses: 0, draws: 0, winRate: 0 };
      }

      const validGames = games.filter(game => 
        game && 
        typeof game === 'object' && 
        ['win', 'draw', 'ongoing'].includes(game.result)
      );

      const totalGames = validGames.length;
      const wins = validGames.filter(game => game.result === 'win' && game.winner).length;
      const draws = validGames.filter(game => game.result === 'draw').length;
      const losses = totalGames - wins - draws;
      const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

      return {
        totalGames,
        wins,
        losses,
        draws,
        winRate: Math.round(winRate * 100) / 100
      };
    } catch (error) {
      logError(`Game statistics calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { totalGames: 0, wins: 0, losses: 0, draws: 0, winRate: 0 };
    }
  }

  /**
   * Anti-cheat validation for game moves
   */
  static validateGameSequence(moves: Array<{ 
    position: number; 
    player: Player; 
    timestamp: Date; 
    board: Board 
  }>): AntiCheatResult {
    try {
      const violations: string[] = [];
      let riskLevel: 'low' | 'medium' | 'high' = 'low';

      if (!Array.isArray(moves) || moves.length === 0) {
        return { isValid: true, violations: [], riskLevel: 'low' };
      }

      // Check move timing patterns
      for (let i = 1; i < moves.length; i++) {
        const prevMove = moves[i - 1];
        const currMove = moves[i];

        if (!prevMove?.timestamp || !currMove?.timestamp) {
          continue;
        }

        const timeDiff = currMove.timestamp.getTime() - prevMove.timestamp.getTime();

        // Too fast moves (less than 100ms)
        if (timeDiff < 100) {
          violations.push(`Suspiciously fast move at position ${i}: ${timeDiff}ms`);
          riskLevel = 'high';
        }

        // Consistent timing patterns (bot-like)
        if (i >= 3) {
          const timings = moves.slice(i - 2, i + 1).map((move, idx) => 
            idx > 0 ? move.timestamp.getTime() - moves[i - 2 + idx - 1].timestamp.getTime() : 0
          ).filter(t => t > 0);

          const avgTiming = timings.reduce((sum, t) => sum + t, 0) / timings.length;
          const variance = timings.reduce((sum, t) => sum + Math.pow(t - avgTiming, 2), 0) / timings.length;

          if (variance < 1000 && avgTiming < 2000) { // Very consistent sub-2s moves
            violations.push(`Consistent timing pattern detected: avg=${avgTiming}ms, variance=${variance}`);
            riskLevel = riskLevel === 'high' ? 'high' : 'medium';
          }
        }
      }

      // Validate move sequence integrity
      let simulatedBoard = this.createEmptyBoard();
      let expectedPlayer: Player = 'X';

      for (let i = 0; i < moves.length; i++) {
        const move = moves[i];

        // Check player alternation
        if (move.player !== expectedPlayer) {
          violations.push(`Invalid player sequence at move ${i}: expected ${expectedPlayer}, got ${move.player}`);
          riskLevel = 'high';
        }

        // Validate move
        const moveResult = this.makeMove(simulatedBoard, move.position, move.player);
        if (!moveResult.isValid) {
          violations.push(`Invalid move at position ${i}: ${move.position}`);
          riskLevel = 'high';
        }

        simulatedBoard = moveResult.board;
        expectedPlayer = this.getNextPlayer(expectedPlayer);

        // Compare with provided board state
        if (move.board && !this.compareBoardStates(simulatedBoard, move.board)) {
          violations.push(`Board state mismatch at move ${i}`);
          riskLevel = 'high';
        }
      }

      return {
        isValid: violations.length === 0,
        violations,
        riskLevel
      };
    } catch (error) {
      logError(`Anti-cheat validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, violations: ['Validation error occurred'], riskLevel: 'high' };
    }
  }

  /**
   * Compare two board states for equality
   */
  private static compareBoardStates(board1: Board, board2: Board): boolean {
    try {
      if (board1.length !== board2.length) {
        return false;
      }

      for (let i = 0; i < board1.length; i++) {
        if (board1[i] !== board2[i]) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logError(`Board comparison error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Detect suspicious play patterns
   */
  static detectSuspiciousPatterns(gameHistory: Array<{
    board: Board;
    result: GameResult;
    duration: number;
    moveCount: number;
  }>): { isSuspicious: boolean; reasons: string[] } {
    try {
      const reasons: string[] = [];

      if (!Array.isArray(gameHistory) || gameHistory.length < 5) {
        return { isSuspicious: false, reasons: [] };
      }

      // Check for unrealistic win rates
      const stats = this.calculateGameStats(gameHistory.map(g => ({ result: g.result, winner: null })));
      if (stats.winRate > 95 && stats.totalGames > 10) {
        reasons.push('Unrealistic win rate detected');
      }

      // Check for consistently short game durations
      const avgDuration = gameHistory.reduce((sum, game) => sum + game.duration, 0) / gameHistory.length;
      if (avgDuration < 5000) { // Less than 5 seconds average
        reasons.push('Unrealistic game durations detected');
      }

      // Check for perfect play patterns
      const perfectGames = gameHistory.filter(game => 
        game.moveCount <= 5 && game.result === 'win'
      ).length;

      if (perfectGames / gameHistory.length > 0.8) {
        reasons.push('Too many perfect games detected');
      }

      return {
        isSuspicious: reasons.length > 0,
        reasons
      };
    } catch (error) {
      logError(`Suspicious pattern detection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isSuspicious: false, reasons: [] };
    }
  }
}
