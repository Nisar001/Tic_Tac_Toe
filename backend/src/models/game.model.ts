import mongoose, { Document, Schema } from 'mongoose';
import { logError, logDebug } from '../utils/logger';

export interface IGame extends Document {
  gameId: string;
  gameMode?: 'classic' | 'blitz' | 'ranked' | 'custom';
  isPrivate?: boolean;
  maxPlayers?: number;
  timeLimit?: number;
  gameName?: string;
  password?: string;
  creatorId?: mongoose.Types.ObjectId;
  players: {
    player1: mongoose.Types.ObjectId;
    player2: mongoose.Types.ObjectId;
  };
  board: (string | null)[][];
  currentPlayer: 'X' | 'O';
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  winner?: mongoose.Types.ObjectId;
  result: 'win' | 'draw' | 'abandoned' | null;
  moves: {
    player: mongoose.Types.ObjectId;
    position: { row: number; col: number };
    symbol: 'X' | 'O';
    timestamp: Date;
  }[];
  startedAt: Date;
  endedAt?: Date;
  room: string;
  xpAwarded: boolean;
  createdAt: Date;
  updatedAt: Date;
  checkWinner(): 'X' | 'O' | 'draw' | null;
  makeMove(playerId: string, row: number, col: number): boolean;
  isValidMove(row: number, col: number): boolean;
  getPlayerSymbol(playerId: string): 'X' | 'O' | null;
  switchTurn(): void;
  validateGameState(): { isValid: boolean; errors: string[] };
  sanitizeGameData(): void;
}

const GameSchema = new Schema<IGame>({
  gameId: { 
    type: String, 
    required: true, 
    unique: true,
    default: () => `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  players: {
    player1: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    player2: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  board: {
    type: [[String]],
    default: () => Array(3).fill(null).map(() => Array(3).fill(null)),
    validate: {
      validator: function(board: (string | null)[][]) {
        try {
          return Array.isArray(board) && 
                 board.length === 3 && 
                 board.every(row => Array.isArray(row) && row.length === 3);
        } catch (error) {
          logError(`Board validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return false;
        }
      },
      message: 'Board must be a 3x3 grid'
    }
  },
  currentPlayer: {
    type: String,
    enum: ['X', 'O'],
    default: 'X'
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'abandoned'],
    default: 'waiting'
  },
  winner: { type: Schema.Types.ObjectId, ref: 'User' },
  result: {
    type: String,
    enum: ['win', 'draw', 'abandoned'],
    default: null
  },
  moves: [{
    player: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    position: {
      row: { type: Number, required: true, min: 0, max: 2 },
      col: { type: Number, required: true, min: 0, max: 2 }
    },
    symbol: { type: String, enum: ['X', 'O'], required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  room: { type: String, required: true },
  xpAwarded: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Indexes for better performance


// Pre-save middleware with error handling
GameSchema.pre('save', function(next) {
  try {
    this.sanitizeGameData();
    const validation = this.validateGameState();
    
    if (!validation.isValid) {
      logError(`Game validation failed for ${this.gameId}: ${validation.errors.join(', ')}`);
      return next(new Error(`Game validation failed: ${validation.errors.join(', ')}`));
    }
    
    next();
  } catch (error) {
    logError(`Pre-save processing error for game ${this.gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next(error as Error);
  }
});

// Instance methods with comprehensive error handling
GameSchema.methods.checkWinner = function(): 'X' | 'O' | 'draw' | null {
  try {
    const board = this.board;
    
    if (!Array.isArray(board) || board.length !== 3) {
      logError(`Invalid board structure for game ${this.gameId}`);
      return null;
    }
    
    // Check rows
    for (let i = 0; i < 3; i++) {
      if (!Array.isArray(board[i]) || board[i].length !== 3) {
        logError(`Invalid board row ${i} for game ${this.gameId}`);
        continue;
      }
      
      if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
        return board[i][0] as 'X' | 'O';
      }
    }
    
    // Check columns
    for (let j = 0; j < 3; j++) {
      if (board[0][j] && board[0][j] === board[1][j] && board[1][j] === board[2][j]) {
        return board[0][j] as 'X' | 'O';
      }
    }
    
    // Check diagonals
    if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
      return board[0][0] as 'X' | 'O';
    }
    
    if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
      return board[0][2] as 'X' | 'O';
    }
    
    // Check for draw
    const isBoardFull = board.every((row: any[]) => 
      Array.isArray(row) && row.length === 3 && row.every((cell: any) => cell !== null)
    );
    
    if (isBoardFull) {
      return 'draw';
    }
    
    return null;
  } catch (error) {
    logError(`Winner check error for game ${this.gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
};

GameSchema.methods.isValidMove = function(row: number, col: number): boolean {
  try {
    if (typeof row !== 'number' || typeof col !== 'number') {
      logError(`Invalid move parameters for game ${this.gameId}: row=${row}, col=${col}`);
      return false;
    }
    
    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      logError(`Move parameters must be integers for game ${this.gameId}: row=${row}, col=${col}`);
      return false;
    }
    
    if (row < 0 || row >= 3 || col < 0 || col >= 3) {
      logDebug(`Move out of bounds for game ${this.gameId}: row=${row}, col=${col}`);
      return false;
    }
    
    if (!Array.isArray(this.board) || !Array.isArray(this.board[row])) {
      logError(`Invalid board structure for move validation in game ${this.gameId}`);
      return false;
    }
    
    return this.board[row][col] === null;
  } catch (error) {
    logError(`Move validation error for game ${this.gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};

GameSchema.methods.getPlayerSymbol = function(playerId: string): 'X' | 'O' | null {
  try {
    if (!playerId || typeof playerId !== 'string') {
      logError(`Invalid player ID for game ${this.gameId}: ${playerId}`);
      return null;
    }
    
    if (!this.players || !this.players.player1 || !this.players.player2) {
      logError(`Invalid players structure for game ${this.gameId}`);
      return null;
    }
    
    if (this.players.player1.toString() === playerId) return 'X';
    if (this.players.player2.toString() === playerId) return 'O';
    
    logDebug(`Player ${playerId} not found in game ${this.gameId}`);
    return null;
  } catch (error) {
    logError(`Get player symbol error for game ${this.gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
};

GameSchema.methods.makeMove = function(playerId: string, row: number, col: number): boolean {
  try {
    const playerSymbol = this.getPlayerSymbol(playerId);
    
    if (!playerSymbol) {
      logError(`Invalid player for move in game ${this.gameId}: ${playerId}`);
      return false;
    }
    
    if (this.status !== 'active') {
      logDebug(`Game ${this.gameId} is not active: ${this.status}`);
      return false;
    }
    
    if (this.currentPlayer !== playerSymbol) {
      logDebug(`Not player's turn in game ${this.gameId}: current=${this.currentPlayer}, attempted=${playerSymbol}`);
      return false;
    }
    
    if (!this.isValidMove(row, col)) {
      logDebug(`Invalid move in game ${this.gameId}: row=${row}, col=${col}`);
      return false;
    }
    
    // Make the move
    this.board[row][col] = playerSymbol;
    
    // Add move to history
    if (!Array.isArray(this.moves)) {
      this.moves = [];
    }
    
    this.moves.push({
      player: new mongoose.Types.ObjectId(playerId),
      position: { row, col },
      symbol: playerSymbol,
      timestamp: new Date()
    });
    
    // Check for game end
    const winner = this.checkWinner();
    if (winner) {
      this.status = 'completed';
      this.endedAt = new Date();
      
      if (winner === 'draw') {
        this.result = 'draw';
      } else {
        this.result = 'win';
        this.winner = winner === 'X' ? this.players.player1 : this.players.player2;
      }
    } else {
      this.switchTurn();
    }
    
    return true;
  } catch (error) {
    logError(`Make move error for game ${this.gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return false;
  }
};

GameSchema.methods.switchTurn = function(): void {
  try {
    if (this.currentPlayer === 'X') {
      this.currentPlayer = 'O';
    } else if (this.currentPlayer === 'O') {
      this.currentPlayer = 'X';
    } else {
      logError(`Invalid current player for game ${this.gameId}: ${this.currentPlayer}`);
      this.currentPlayer = 'X'; // Default fallback
    }
  } catch (error) {
    logError(`Switch turn error for game ${this.gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    this.currentPlayer = 'X'; // Safe fallback
  }
};

GameSchema.methods.sanitizeGameData = function(): void {
  try {
    // Sanitize gameId
    if (!this.gameId || typeof this.gameId !== 'string') {
      this.gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Sanitize board
    if (!Array.isArray(this.board) || this.board.length !== 3) {
      this.board = Array(3).fill(null).map(() => Array(3).fill(null));
    } else {
      for (let i = 0; i < 3; i++) {
        if (!Array.isArray(this.board[i]) || this.board[i].length !== 3) {
          this.board[i] = Array(3).fill(null);
        } else {
          for (let j = 0; j < 3; j++) {
            const cell = this.board[i][j];
            if (cell !== 'X' && cell !== 'O' && cell !== null) {
              this.board[i][j] = null;
            }
          }
        }
      }
    }
    
    // Sanitize current player
    if (this.currentPlayer !== 'X' && this.currentPlayer !== 'O') {
      this.currentPlayer = 'X';
    }
    
    // Sanitize status
    const validStatuses = ['waiting', 'active', 'completed', 'abandoned'];
    if (!validStatuses.includes(this.status)) {
      this.status = 'waiting';
    }
    
    // Sanitize result
    const validResults = ['win', 'draw', 'abandoned', null];
    if (!validResults.includes(this.result)) {
      this.result = null;
    }
    
    // Sanitize moves array
    if (!Array.isArray(this.moves)) {
      this.moves = [];
    }
    
    // Sanitize room
    if (!this.room || typeof this.room !== 'string') {
      this.room = `room_${this.gameId}`;
    }
    
    // Sanitize dates
    if (!this.startedAt || !(this.startedAt instanceof Date)) {
      this.startedAt = new Date();
    }
    
    if (this.endedAt && !(this.endedAt instanceof Date)) {
      this.endedAt = undefined;
    }
  } catch (error) {
    logError(`Game data sanitization error for ${this.gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

GameSchema.methods.validateGameState = function(): { isValid: boolean; errors: string[] } {
  try {
    const errors: string[] = [];
    
    // Validate gameId
    if (!this.gameId || typeof this.gameId !== 'string') {
      errors.push('Game ID is required and must be a string');
    }
    
    // Validate players
    if (!this.players || !this.players.player1 || !this.players.player2) {
      errors.push('Both players are required');
    } else {
      if (!mongoose.Types.ObjectId.isValid(this.players.player1)) {
        errors.push('Player1 must be a valid ObjectId');
      }
      if (!mongoose.Types.ObjectId.isValid(this.players.player2)) {
        errors.push('Player2 must be a valid ObjectId');
      }
      if (this.players.player1.toString() === this.players.player2.toString()) {
        errors.push('Players must be different');
      }
    }
    
    // Validate board
    if (!Array.isArray(this.board) || this.board.length !== 3) {
      errors.push('Board must be a 3x3 array');
    } else {
      for (let i = 0; i < 3; i++) {
        if (!Array.isArray(this.board[i]) || this.board[i].length !== 3) {
          errors.push(`Board row ${i} must be an array of length 3`);
        }
      }
    }
    
    // Validate current player
    if (this.currentPlayer !== 'X' && this.currentPlayer !== 'O') {
      errors.push('Current player must be X or O');
    }
    
    // Validate status
    const validStatuses = ['waiting', 'active', 'completed', 'abandoned'];
    if (!validStatuses.includes(this.status)) {
      errors.push('Invalid game status');
    }
    
    // Validate room
    if (!this.room || typeof this.room !== 'string') {
      errors.push('Room is required and must be a string');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    logError(`Game state validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      isValid: false,
      errors: ['Validation process failed']
    };
  }
};

export default mongoose.model<IGame>('Game', GameSchema);
