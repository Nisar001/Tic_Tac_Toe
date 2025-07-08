import mongoose, { Document, Schema } from 'mongoose';

export interface IGame extends Document {
  gameId: string;
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
        return board.length === 3 && board.every(row => row.length === 3);
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
GameSchema.index({ 'players.player1': 1, 'players.player2': 1 });
GameSchema.index({ status: 1 });
GameSchema.index({ createdAt: -1 });
GameSchema.index({ room: 1 });

// Instance methods
GameSchema.methods.checkWinner = function(): 'X' | 'O' | 'draw' | null {
  const board = this.board;
  
  // Check rows
  for (let i = 0; i < 3; i++) {
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
  const isBoardFull = board.every((row: any[]) => row.every((cell: any) => cell !== null));
  if (isBoardFull) {
    return 'draw';
  }
  
  return null;
};

GameSchema.methods.isValidMove = function(row: number, col: number): boolean {
  return row >= 0 && row < 3 && col >= 0 && col < 3 && this.board[row][col] === null;
};

GameSchema.methods.getPlayerSymbol = function(playerId: string): 'X' | 'O' | null {
  if (this.players.player1.toString() === playerId) return 'X';
  if (this.players.player2.toString() === playerId) return 'O';
  return null;
};

GameSchema.methods.makeMove = function(playerId: string, row: number, col: number): boolean {
  const playerSymbol = this.getPlayerSymbol(playerId);
  
  if (!playerSymbol || this.status !== 'active' || this.currentPlayer !== playerSymbol) {
    return false;
  }
  
  if (!this.isValidMove(row, col)) {
    return false;
  }
  
  // Make the move
  this.board[row][col] = playerSymbol;
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
};

GameSchema.methods.switchTurn = function(): void {
  this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
};

export default mongoose.model<IGame>('Game', GameSchema);
