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

export class GameLogic {
  static createEmptyBoard(): Board {
    return Array(9).fill(null);
  }

  static isValidMove(board: Board, position: number): boolean {
    return position >= 0 && position < 9 && board[position] === null;
  }

  static makeMove(board: Board, position: number, player: Player): MoveResult {
    if (!this.isValidMove(board, position)) {
      return {
        isValid: false,
        board,
        result: 'ongoing',
        winner: null
      };
    }

    const newBoard = [...board];
    newBoard[position] = player;

    const { result, winner, winningLine } = this.checkGameResult(newBoard);

    return {
      isValid: true,
      board: newBoard,
      result,
      winner,
      winningLine
    };
  }

  static checkGameResult(board: Board): { result: GameResult; winner: Player | null; winningLine?: number[] } {
    const winningCombinations = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    // Check for win
    for (const combination of winningCombinations) {
      const [a, b, c] = combination;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return {
          result: 'win',
          winner: board[a],
          winningLine: combination
        };
      }
    }

    // Check for draw
    if (board.every(cell => cell !== null)) {
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
   * Calculate game statistics
   */
  static calculateGameStats(games: Array<{ result: GameResult; winner: Player | null }>): {
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  } {
    const totalGames = games.length;
    const wins = games.filter(game => game.result === 'win' && game.winner).length;
    const draws = games.filter(game => game.result === 'draw').length;
    const losses = totalGames - wins - draws;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

    return {
      totalGames,
      wins,
      losses,
      draws,
      winRate: Math.round(winRate * 100) / 100
    };
  }
}
