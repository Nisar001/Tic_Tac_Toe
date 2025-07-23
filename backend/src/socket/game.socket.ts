import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket, SocketAuthManager } from './auth.socket';
import Game from '../models/game.model';
import User from '../models/user.model';
import { Types } from 'mongoose';
import { logError, logWarn, logInfo } from '../utils/logger';

type Player = 'X' | 'O';
type Board = (string | null)[][];

interface GameRoom {
  id: string;
  gameId: string;
  players: {
    X: {
      userId: string;
      username: string;
      socketId: string;
    } | null;
    O: {
      userId: string;
      username: string;
      socketId: string;
    } | null;
  };
  spectators: Set<string>;
  board: Board;
  currentPlayer: Player;
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  winner: Player | 'draw' | null;
  gameMode: string;
  createdAt: Date;
  lastActivity: Date;
}

export class GameSocket {
  private io: SocketIOServer;
  private authManager: SocketAuthManager;
  private gameRooms: Map<string, GameRoom> = new Map();
  private userToRoom: Map<string, string> = new Map();

  constructor(io: SocketIOServer, authManager: SocketAuthManager) {
    this.io = io;
    this.authManager = authManager;
  }

  setupGameHandlers(socket: AuthenticatedSocket): void {
    logInfo(`Game socket connected: ${socket.user?.id}`);

    // Join Game
    socket.on('joinGame', async (data) => {
      try {
        await this.handleJoinGame(socket, data);
      } catch (error) {
        logError(`Error joining game: ${error}`);
        socket.emit('gameError', { message: 'Failed to join game' });
      }
    });

    // Make Move
    socket.on('makeMove', async (data) => {
      try {
        await this.handleMakeMove(socket, data);
      } catch (error) {
        logError(`Error making move: ${error}`);
        socket.emit('gameError', { message: 'Failed to make move' });
      }
    });

    // Leave Game
    socket.on('leaveGame', async (data) => {
      try {
        await this.handleLeaveGame(socket, data);
      } catch (error) {
        logError(`Error leaving game: ${error}`);
        socket.emit('gameError', { message: 'Failed to leave game' });
      }
    });

    // Spectate Game
    socket.on('spectateGame', async (data) => {
      try {
        await this.handleSpectateGame(socket, data);
      } catch (error) {
        logError(`Error spectating game: ${error}`);
        socket.emit('gameError', { message: 'Failed to spectate game' });
      }
    });

    // Forfeit Game
    socket.on('forfeitGame', async (data) => {
      try {
        await this.handleForfeitGame(socket, data);
      } catch (error) {
        logError(`Error forfeiting game: ${error}`);
        socket.emit('gameError', { message: 'Failed to forfeit game' });
      }
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
      this.handlePlayerDisconnect(socket.user?.id || '');
    });
  }

  async handleJoinGame(socket: AuthenticatedSocket, data: any): Promise<void> {
    const { gameId } = data;
    if (!gameId || !socket.user?.id) return;

    try {
      // Find the game
      const game = await Game.findOne({ gameId }).populate('players.player1 players.player2');
      if (!game) {
        socket.emit('gameError', { message: 'Game not found' });
        return;
      }

      // Check if user can join
      const userId = socket.user.id;
      const isPlayer1 = game.players.player1?.toString() === userId;
      const isPlayer2 = game.players.player2?.toString() === userId;

      if (!isPlayer1 && !isPlayer2) {
        // Add as player 2 if slot is available
        if (!game.players.player2) {
          game.players.player2 = new Types.ObjectId(userId);
          game.status = 'active';
          await game.save();
        } else {
          socket.emit('gameError', { message: 'Game is full' });
          return;
        }
      }

      // Join socket room
      socket.join(gameId);
      this.userToRoom.set(userId, gameId);

      // Create or update game room
      let gameRoom = this.gameRooms.get(gameId);
      if (!gameRoom) {
        const user = await User.findById(userId);
        gameRoom = {
          id: gameId,
          gameId,
          players: {
            X: isPlayer1 ? {
              userId: userId,
              username: user?.username || 'Player',
              socketId: socket.id
            } : null,
            O: isPlayer2 ? {
              userId: userId,
              username: user?.username || 'Player',
              socketId: socket.id
            } : null
          },
          spectators: new Set(),
          board: game.board,
          currentPlayer: game.currentPlayer,
          status: game.status,
          winner: null,
          gameMode: game.gameMode || 'classic',
          createdAt: game.createdAt,
          lastActivity: new Date()
        };
        this.gameRooms.set(gameId, gameRoom);
      } else {
        // Update player info
        const user = await User.findById(userId);
        const playerData = {
          userId: userId,
          username: user?.username || 'Player',
          socketId: socket.id
        };

        if (isPlayer1) {
          gameRoom.players.X = playerData;
        } else if (isPlayer2) {
          gameRoom.players.O = playerData;
        }
      }

      // Emit join success
      socket.emit('gameJoined', {
        gameId,
        room: gameRoom,
        player: {
          id: userId
        }
      });

      // Notify other players
      socket.to(gameId).emit('playerJoined', {
        player: {
          id: userId,
          username: socket.user.username
        }
      });

      logInfo(`User ${userId} joined game ${gameId}`);

    } catch (error) {
      logError(`Error in handleJoinGame: ${error}`);
      socket.emit('gameError', { message: 'Failed to join game' });
    }
  }

  async handleMakeMove(socket: AuthenticatedSocket, data: any): Promise<void> {
    const { gameId, row, col } = data;
    const userId = socket.user?.id;

    if (!gameId || !userId || row === undefined || col === undefined) {
      socket.emit('gameError', { message: 'Invalid move data' });
      return;
    }

    try {
      const gameRoom = this.gameRooms.get(gameId);
      if (!gameRoom) {
        socket.emit('gameError', { message: 'Game room not found' });
        return;
      }

      // Check if it's the player's turn
      let playerSymbol: Player | null = null;
      if (gameRoom.players.X?.userId === userId) {
        playerSymbol = 'X';
      } else if (gameRoom.players.O?.userId === userId) {
        playerSymbol = 'O';
      }

      if (!playerSymbol) {
        socket.emit('gameError', { message: 'You are not a player in this game' });
        return;
      }

      if (gameRoom.currentPlayer !== playerSymbol) {
        socket.emit('gameError', { message: 'Not your turn' });
        return;
      }

      // Validate move
      if (row < 0 || row > 2 || col < 0 || col > 2 || gameRoom.board[row][col] !== null) {
        socket.emit('gameError', { message: 'Invalid move' });
        return;
      }

      // Make the move
      gameRoom.board[row][col] = playerSymbol;
      gameRoom.lastActivity = new Date();

      // Update database
      const game = await Game.findOne({ gameId });
      if (game) {
        game.board = gameRoom.board;
        game.moves.push({
          player: new Types.ObjectId(userId),
          position: { row, col },
          symbol: playerSymbol,
          timestamp: new Date()
        });

        // Check for winner
        const winner = this.checkWinner(gameRoom.board);
        if (winner) {
          gameRoom.winner = winner;
          gameRoom.status = 'completed';
          game.status = 'completed';
          game.winner = winner === 'draw' ? undefined : 
                       (winner === 'X' ? game.players.player1 : game.players.player2);
          game.result = winner === 'draw' ? 'draw' : 'win';
          game.endedAt = new Date();

          // Update player stats
          await this.updatePlayerStats(game, winner);
        } else {
          // Switch turns
          gameRoom.currentPlayer = gameRoom.currentPlayer === 'X' ? 'O' : 'X';
          game.currentPlayer = gameRoom.currentPlayer;
        }

        await game.save();
      }

      // Emit move result to all players in the room
      this.io.to(gameId).emit('moveResult', {
        success: true,
        gameId,
        move: {
          row,
          col,
          symbol: playerSymbol,
          player: userId,
          timestamp: new Date()
        },
        board: gameRoom.board,
        currentPlayer: gameRoom.currentPlayer,
        winner: gameRoom.winner,
        status: gameRoom.status
      });

      if (gameRoom.winner) {
        this.io.to(gameId).emit('gameOver', {
          gameId,
          winner: gameRoom.winner,
          board: gameRoom.board
        });
      }

    } catch (error) {
      logError(`Error in handleMakeMove: ${error}`);
      socket.emit('gameError', { message: 'Failed to make move' });
    }
  }

  async handleLeaveGame(socket: AuthenticatedSocket, data: any): Promise<void> {
    const { gameId } = data;
    const userId = socket.user?.id;

    if (!gameId || !userId) return;

    try {
      const gameRoom = this.gameRooms.get(gameId);
      if (gameRoom) {
        // Remove player from game room
        if (gameRoom.players.X?.userId === userId) {
          gameRoom.players.X = null;
        } else if (gameRoom.players.O?.userId === userId) {
          gameRoom.players.O = null;
        }

        // If no players left, remove the room
        if (!gameRoom.players.X && !gameRoom.players.O && gameRoom.spectators.size === 0) {
          this.gameRooms.delete(gameId);
        }
      }

      // Leave socket room
      socket.leave(gameId);
      this.userToRoom.delete(userId);

      // Notify other players
      socket.to(gameId).emit('playerLeft', {
        player: {
          id: userId
        }
      });

      logInfo(`User ${userId} left game ${gameId}`);

    } catch (error) {
      logError(`Error in handleLeaveGame: ${error}`);
    }
  }

  async handleSpectateGame(socket: AuthenticatedSocket, data: any): Promise<void> {
    const { gameId } = data;
    const userId = socket.user?.id;

    if (!gameId || !userId) return;

    try {
      const game = await Game.findOne({ gameId });
      if (!game) {
        socket.emit('gameError', { message: 'Game not found' });
        return;
      }

      // Join as spectator
      socket.join(gameId);
      
      const gameRoom = this.gameRooms.get(gameId);
      if (gameRoom) {
        gameRoom.spectators.add(userId);
      }

      socket.emit('spectatingGame', {
        gameId,
        gameState: {
          board: game.board,
          currentPlayer: game.currentPlayer,
          status: game.status,
          winner: game.winner
        }
      });

      logInfo(`User ${userId} started spectating game ${gameId}`);

    } catch (error) {
      logError(`Error in handleSpectateGame: ${error}`);
      socket.emit('gameError', { message: 'Failed to spectate game' });
    }
  }

  async handleForfeitGame(socket: AuthenticatedSocket, data: any): Promise<void> {
    const { gameId } = data;
    const userId = socket.user?.id;

    if (!gameId || !userId) return;

    try {
      const gameRoom = this.gameRooms.get(gameId);
      if (!gameRoom) {
        socket.emit('gameError', { message: 'Game room not found' });
        return;
      }

      const isPlayerX = gameRoom.players.X?.userId === userId;
      const isPlayerO = gameRoom.players.O?.userId === userId;

      if (!isPlayerX && !isPlayerO) {
        socket.emit('gameError', { message: 'You are not a player in this game' });
        return;
      }

      // Determine winner (opponent)
      const winner = isPlayerX ? 'O' : 'X';
      gameRoom.winner = winner;
      gameRoom.status = 'completed';

      // Update database
      const game = await Game.findOne({ gameId });
      if (game) {
        game.status = 'completed';
        game.winner = winner === 'X' ? game.players.player1 : game.players.player2;
        game.result = 'win';
        game.endedAt = new Date();
        await game.save();

        // Update player stats
        await this.updatePlayerStats(game, winner);
      }

      // Notify all players
      this.io.to(gameId).emit('gameOver', {
        gameId,
        winner,
        reason: 'forfeit',
        forfeiter: userId
      });

      logInfo(`Game ${gameId} forfeited by user ${userId}`);

    } catch (error) {
      logError(`Error in handleForfeitGame: ${error}`);
    }
  }

  handlePlayerDisconnect(userId: string): void {
    const gameId = this.userToRoom.get(userId);
    if (!gameId) return;

    logInfo(`Game socket disconnected: ${userId}`);
    
    // Handle cleanup when player disconnects
    // Could implement reconnection logic here
  }

  private checkWinner(board: Board): Player | 'draw' | null {
    // Check rows
    for (let i = 0; i < 3; i++) {
      if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
        return board[i][0] as Player;
      }
    }

    // Check columns
    for (let i = 0; i < 3; i++) {
      if (board[0][i] && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
        return board[0][i] as Player;
      }
    }

    // Check diagonals
    if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
      return board[0][0] as Player;
    }
    if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
      return board[0][2] as Player;
    }

    // Check for draw
    let hasEmptyCell = false;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[i][j] === null) {
          hasEmptyCell = true;
          break;
        }
      }
      if (hasEmptyCell) break;
    }

    return hasEmptyCell ? null : 'draw';
  }

  private async updatePlayerStats(game: any, winner: Player | 'draw'): Promise<void> {
    try {
      if (game.players.player1) {
        const player1 = await User.findById(game.players.player1);
        if (player1) {
          player1.stats.gamesPlayed += 1;
          if (winner === 'X') {
            player1.stats.wins += 1;
          } else if (winner === 'O') {
            player1.stats.losses += 1;
          } else {
            player1.stats.draws += 1;
          }
          player1.stats.winRate = (player1.stats.wins / player1.stats.gamesPlayed) * 100;
          await player1.save();
        }
      }

      if (game.players.player2) {
        const player2 = await User.findById(game.players.player2);
        if (player2) {
          player2.stats.gamesPlayed += 1;
          if (winner === 'O') {
            player2.stats.wins += 1;
          } else if (winner === 'X') {
            player2.stats.losses += 1;
          } else {
            player2.stats.draws += 1;
          }
          player2.stats.winRate = (player2.stats.wins / player2.stats.gamesPlayed) * 100;
          await player2.save();
        }
      }
    } catch (error) {
      logError(`Error updating player stats: ${error}`);
    }
  }

  getActiveGames(): GameRoom[] {
    return Array.from(this.gameRooms.values());
  }

  getGameRoom(gameId: string): GameRoom | undefined {
    return this.gameRooms.get(gameId);
  }
}

export { GameRoom };
export default GameSocket;
