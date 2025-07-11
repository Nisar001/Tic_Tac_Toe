import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket, SocketAuthManager } from './auth.socket';
import { GameLogic, Board, Player, MoveResult } from '../utils/game.utils';
import { EnergyManager } from '../utils/energy.utils';

export interface GameRoom {
  id: string;
  players: {
    X: {
      userId: string;
      username: string;
      socketId: string;
    };
    O: {
      userId: string;
      username: string;
      socketId: string;
    };
  };
  board: Board;
  currentPlayer: Player;
  status: 'waiting' | 'active' | 'finished';
  winner: Player | null;
  winningLine?: number[];
  createdAt: Date;
  lastMoveAt?: Date;
  moveCount: number;
  spectators: string[]; // socket IDs of spectators
}

export class GameSocket {
  private authManager: SocketAuthManager;
  private io: SocketIOServer;
  private activeGames: Map<string, GameRoom> = new Map();
  handleGameForfeit: any;

  constructor(io: SocketIOServer, authManager: SocketAuthManager) {
    this.io = io;
    this.authManager = authManager;
  }

  /**
   * Handle joining a game room
   */
  handleJoinRoom(socket: AuthenticatedSocket, data: { roomId: string }) {
    if (!this.authManager.isSocketAuthenticated(socket)) {
      socket.emit('auth_required', { message: 'Authentication required for this action' });
      return;
    }

    try {
      const { roomId } = data;
      
      if (!roomId) {
        socket.emit('game_error', { message: 'Room ID is required' });
        return;
      }

      // Join the socket room
      socket.join(roomId);
      
      // Get or create game room
      let gameRoom = this.activeGames.get(roomId);
      
      if (!gameRoom) {
        socket.emit('game_error', { message: 'Game room not found' });
        return;
      }

      // Check if player is part of this game
      const isPlayerX = gameRoom.players.X.userId === socket.user?.id;
      const isPlayerO = gameRoom.players.O.userId === socket.user?.id;
      
      if (!isPlayerX && !isPlayerO) {
        // Add as spectator
        if (!gameRoom.spectators.includes(socket.id)) {
          gameRoom.spectators.push(socket.id);
        }
        
        socket.emit('joined_as_spectator', {
          roomId,
          gameState: this.getGameState(gameRoom)
        });
        
        // Notify others
        socket.to(roomId).emit('spectator_joined', {
          spectatorId: socket.id,
          spectatorCount: gameRoom.spectators.length
        });
        
        return;
      }

      // Player joined their own game
      const playerSymbol = isPlayerX ? 'X' : 'O';
      
      socket.emit('room_joined', {
        roomId,
        playerSymbol,
        gameState: this.getGameState(gameRoom)
      });

      // Notify opponent
      socket.to(roomId).emit('opponent_joined', {
        playerId: socket.user?.id ?? 'unknown',
        username: socket.user?.username ?? 'unknown'
      });

      console.log(`🎮 Player ${socket.user?.id ?? 'unknown'} joined game room ${roomId} as ${playerSymbol}`);

    } catch (error) {
      console.error('Join room error:', error);
      socket.emit('game_error', { message: 'Failed to join room' });
    }
  }

  /**
   * Handle leaving a game room
   */
  handleLeaveRoom(socket: AuthenticatedSocket, data: { roomId: string }) {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        return;
      }

      socket.leave(roomId);
      
      const gameRoom = this.activeGames.get(roomId);
      if (gameRoom) {
        // Remove from spectators if applicable
        gameRoom.spectators = gameRoom.spectators.filter(id => id !== socket.id);
        
        // Notify others
        socket.to(roomId).emit('player_left', {
          playerId: socket.user?.id,
          spectatorCount: gameRoom.spectators.length
        });
      }

      console.log(`🚪 Player ${socket.user?.id} left game room ${roomId}`);

    } catch (error) {
      console.error('Leave room error:', error);
    }
  }

  /**
   * Handle player move
   */
  handlePlayerMove(socket: AuthenticatedSocket, data: { roomId: string; position: number }) {
    if (!this.authManager.isSocketAuthenticated(socket)) {
      socket.emit('auth_required', { message: 'Authentication required for this action' });
      return;
    }

    try {
      const { roomId, position } = data;
      
      if (!roomId || position === undefined) {
        socket.emit('game_error', { message: 'Room ID and position are required' });
        return;
      }

      const gameRoom = this.activeGames.get(roomId);
      if (!gameRoom) {
        socket.emit('game_error', { message: 'Game room not found' });
        return;
      }

      // Check if game is active
      if (gameRoom.status !== 'active') {
        socket.emit('game_error', { message: 'Game is not active' });
        return;
      }

      // Determine player symbol
      const isPlayerX = gameRoom.players.X.userId === socket.user?.id;
      const isPlayerO = gameRoom.players.O.userId === socket.user?.id;
      
      if (!isPlayerX && !isPlayerO) {
        socket.emit('game_error', { message: 'You are not a player in this game' });
        return;
      }

      const playerSymbol: Player = isPlayerX ? 'X' : 'O';

      // Check if it's player's turn
      if (gameRoom.currentPlayer !== playerSymbol) {
        socket.emit('game_error', { message: 'Not your turn' });
        return;
      }

      // Validate and make move
      const moveResult = GameLogic.makeMove(gameRoom.board, position, playerSymbol);
      
      if (!moveResult.isValid) {
        socket.emit('game_error', { message: 'Invalid move' });
        return;
      }

      // Update game state
      gameRoom.board = moveResult.board;
      gameRoom.lastMoveAt = new Date();
      gameRoom.moveCount++;
      
      // Check game result
      if (moveResult.result === 'win') {
        gameRoom.status = 'finished';
        gameRoom.winner = moveResult.winner;
        gameRoom.winningLine = moveResult.winningLine;
        
        // Handle game end
        this.handleGameEnd(gameRoom, 'win');
        
      } else if (moveResult.result === 'draw') {
        gameRoom.status = 'finished';
        gameRoom.winner = null;
        
        // Handle game end
        this.handleGameEnd(gameRoom, 'draw');
        
      } else {
        // Switch turns
        gameRoom.currentPlayer = GameLogic.getNextPlayer(gameRoom.currentPlayer);
      }

      // Broadcast move to all in room
      this.io.to(roomId).emit('move_made', {
        position,
        player: playerSymbol,
        board: gameRoom.board,
        currentPlayer: gameRoom.currentPlayer,
        moveCount: gameRoom.moveCount,
        gameStatus: gameRoom.status,
        winner: gameRoom.winner,
        winningLine: gameRoom.winningLine,
        timestamp: new Date()
      });

      console.log(`🎯 Move made in room ${roomId}: Player ${playerSymbol} at position ${position}`);

    } catch (error) {
      console.error('Player move error:', error);
      socket.emit('game_error', { message: 'Failed to make move' });
    }
  }

  /**
   * Handle game surrender
   */
  handleSurrender(socket: AuthenticatedSocket, data: { roomId: string }) {
    if (!this.authManager.isSocketAuthenticated(socket)) {
      socket.emit('auth_required', { message: 'Authentication required for this action' });
      return;
    }

    try {
      const { roomId } = data;
      
      const gameRoom = this.activeGames.get(roomId);
      if (!gameRoom) {
        socket.emit('game_error', { message: 'Game room not found' });
        return;
      }

      // Check if player is part of this game
      const isPlayerX = gameRoom.players.X.userId === socket.user?.id;
      const isPlayerO = gameRoom.players.O.userId === socket.user?.id;
      
      if (!isPlayerX && !isPlayerO) {
        socket.emit('game_error', { message: 'You are not a player in this game' });
        return;
      }

      const surrenderingPlayer: Player = isPlayerX ? 'X' : 'O';
      const winner: Player = surrenderingPlayer === 'X' ? 'O' : 'X';

      // Update game state
      gameRoom.status = 'finished';
      gameRoom.winner = winner;

      // Broadcast surrender
      this.io.to(roomId).emit('game_surrendered', {
        surrenderingPlayer,
        winner,
        gameState: this.getGameState(gameRoom)
      });

      // Handle game end
      this.handleGameEnd(gameRoom, 'surrender');

      console.log(`🏳️ Player ${surrenderingPlayer} surrendered in room ${roomId}`);

    } catch (error) {
      console.error('Surrender error:', error);
      socket.emit('game_error', { message: 'Failed to surrender' });
    }
  }

  /**
   * Handle rematch request
   */
  handleRematchRequest(socket: AuthenticatedSocket, data: { roomId: string }) {
    if (!this.authManager.isSocketAuthenticated(socket)) {
      socket.emit('auth_required', { message: 'Authentication required for this action' });
      return;
    }

    try {
      const { roomId } = data;
      
      const gameRoom = this.activeGames.get(roomId);
      if (!gameRoom) {
        socket.emit('game_error', { message: 'Game room not found' });
        return;
      }

      // Check if player is part of this game
      const isPlayerX = gameRoom.players.X.userId === socket.user?.id;
      const isPlayerO = gameRoom.players.O.userId === socket.user?.id;
      
      if (!isPlayerX && !isPlayerO) {
        socket.emit('game_error', { message: 'You are not a player in this game' });
        return;
      }

      const requestingPlayer: Player = isPlayerX ? 'X' : 'O';

      // Broadcast rematch request to opponent
      socket.to(roomId).emit('rematch_requested', {
        requestingPlayer,
        message: `${socket.user?.username} requested a rematch`
      });

      socket.emit('rematch_request_sent', {
        message: 'Rematch request sent to opponent'
      });

      console.log(`🔄 Rematch requested by ${requestingPlayer} in room ${roomId}`);

    } catch (error) {
      console.error('Rematch request error:', error);
      socket.emit('game_error', { message: 'Failed to request rematch' });
    }
  }

  /**
   * Handle rematch acceptance
   */
  handleRematchAccept(socket: AuthenticatedSocket, data: { roomId: string }) {
    if (!this.authManager.isSocketAuthenticated(socket)) {
      socket.emit('auth_required', { message: 'Authentication required for this action' });
      return;
    }

    try {
      const { roomId } = data;
      
      const gameRoom = this.activeGames.get(roomId);
      if (!gameRoom) {
        socket.emit('game_error', { message: 'Game room not found' });
        return;
      }

      // Reset game state for rematch
      gameRoom.board = GameLogic.createEmptyBoard();
      gameRoom.currentPlayer = 'X';
      gameRoom.status = 'active';
      gameRoom.winner = null;
      gameRoom.winningLine = undefined;
      gameRoom.moveCount = 0;
      gameRoom.lastMoveAt = undefined;

      // Broadcast new game start
      this.io.to(roomId).emit('rematch_accepted', {
        gameState: this.getGameState(gameRoom),
        message: 'Rematch started!'
      });

      console.log(`🔄 Rematch accepted in room ${roomId}`);

    } catch (error) {
      console.error('Rematch accept error:', error);
      socket.emit('game_error', { message: 'Failed to accept rematch' });
    }
  }

  /**
   * Handle rematch response
   */
  handleRematchResponse(socket: AuthenticatedSocket, data: { roomId: string; accept: boolean }) {
    if (!this.authManager.isSocketAuthenticated(socket)) {
      socket.emit('auth_required', { message: 'Authentication required for this action' });
      return;
    }

    try {
      const { roomId, accept } = data;
      
      const gameRoom = this.activeGames.get(roomId);
      if (!gameRoom) {
        socket.emit('game_error', { message: 'Game room not found' });
        return;
      }

      // Check if player is part of this game
      const isPlayerX = gameRoom.players.X.userId === socket.user?.id;
      const isPlayerO = gameRoom.players.O.userId === socket.user?.id;
      
      if (!isPlayerX && !isPlayerO) {
        socket.emit('game_error', { message: 'You are not a player in this game' });
        return;
      }

      if (accept) {
        // Reset game for rematch
        this.resetGameForRematch(gameRoom);
        
        this.io.to(roomId).emit('rematch_accepted', {
          roomId,
          gameState: this.getGameState(gameRoom)
        });
        
        console.log(`🔄 Rematch accepted in room ${roomId}`);
      } else {
        this.io.to(roomId).emit('rematch_declined', {
          roomId,
          message: 'Rematch declined'
        });
        
        console.log(`❌ Rematch declined in room ${roomId}`);
      }

    } catch (error) {
      console.error('Rematch response error:', error);
      socket.emit('game_error', { message: 'Failed to process rematch response' });
    }
  }

  /**
   * Handle get game state
   */
  handleGetGameState(socket: AuthenticatedSocket, data: { roomId: string }) {
    if (!this.authManager.isSocketAuthenticated(socket)) {
      socket.emit('auth_required', { message: 'Authentication required for this action' });
      return;
    }

    try {
      const { roomId } = data;
      
      const gameRoom = this.activeGames.get(roomId);
      if (!gameRoom) {
        socket.emit('game_error', { message: 'Game room not found' });
        return;
      }

      socket.emit('game_state', {
        roomId,
        gameState: this.getGameState(gameRoom)
      });

    } catch (error) {
      console.error('Get game state error:', error);
      socket.emit('game_error', { message: 'Failed to get game state' });
    }
  }

  /**
   * Handle spectate game
   */
  handleSpectateGame(socket: AuthenticatedSocket, data: { roomId: string }) {
    if (!this.authManager.isSocketAuthenticated(socket)) {
      socket.emit('auth_required', { message: 'Authentication required for this action' });
      return;
    }

    try {
      const { roomId } = data;
      
      const gameRoom = this.activeGames.get(roomId);
      if (!gameRoom) {
        socket.emit('game_error', { message: 'Game room not found' });
        return;
      }

      // Check if already a player in this game
      const isPlayer = gameRoom.players.X.userId === socket.user?.id || 
                      gameRoom.players.O.userId === socket.user?.id;
      
      if (isPlayer) {
        socket.emit('game_error', { message: 'You are already a player in this game' });
        return;
      }

      // Join as spectator
      socket.join(roomId);
      
      if (!gameRoom.spectators.includes(socket.id)) {
        gameRoom.spectators.push(socket.id);
      }

      socket.emit('spectating_started', {
        roomId,
        gameState: this.getGameState(gameRoom),
        spectatorCount: gameRoom.spectators.length
      });

      // Notify others
      socket.to(roomId).emit('spectator_joined', {
        spectatorId: socket.id,
        spectatorCount: gameRoom.spectators.length
      });

      console.log(`👁️ User ${socket.user?.id} started spectating room ${roomId}`);

    } catch (error) {
      console.error('Spectate game error:', error);
      socket.emit('game_error', { message: 'Failed to spectate game' });
    }
  }

  /**
   * Handle stop spectating
   */
  handleStopSpectating(socket: AuthenticatedSocket, data: { roomId: string }) {
    if (!this.authManager.isSocketAuthenticated(socket)) {
      return;
    }

    try {
      const { roomId } = data;
      
      const gameRoom = this.activeGames.get(roomId);
      if (!gameRoom) {
        return;
      }

      // Remove from spectators
      const index = gameRoom.spectators.indexOf(socket.id);
      if (index > -1) {
        gameRoom.spectators.splice(index, 1);
      }

      // Leave room
      socket.leave(roomId);

      socket.emit('spectating_stopped', {
        roomId
      });

      // Notify others
      socket.to(roomId).emit('spectator_left', {
        spectatorId: socket.id,
        spectatorCount: gameRoom.spectators.length
      });

      console.log(`👁️ User ${socket.user?.id} stopped spectating room ${roomId}`);

    } catch (error) {
      console.error('Stop spectating error:', error);
    }
  }

  /**
   * Create a new game room
   */
  createGameRoom(roomId: string, player1: any, player2: any): GameRoom {
    const gameRoom: GameRoom = {
      id: roomId,
      players: {
        X: {
          userId: player1.userId.toString(),
          username: player1.username,
          socketId: player1.socketId
        },
        O: {
          userId: player2.userId.toString(),
          username: player2.username,
          socketId: player2.socketId
        }
      },
      board: GameLogic.createEmptyBoard(),
      currentPlayer: 'X',
      status: 'active',
      winner: null,
      createdAt: new Date(),
      moveCount: 0,
      spectators: []
    };

    this.activeGames.set(roomId, gameRoom);
    return gameRoom;
  }

  /**
   * Create a custom game
   */
  createCustomGame(gameConfig: { roomId: string; players: { X: string; O: string } }): GameRoom {
    const { roomId, players } = gameConfig;

    if (this.activeGames.has(roomId)) {
      throw new Error('Game room already exists');
    }

    const newGame: GameRoom = {
      id: roomId,
      players: {
        X: { userId: players.X, username: 'PlayerX', socketId: '' },
        O: { userId: players.O, username: 'PlayerO', socketId: '' }
      },
      board: [],
      currentPlayer: 'X',
      status: 'waiting',
      winner: null,
      createdAt: new Date(),
      moveCount: 0,
      spectators: []
    };

    this.activeGames.set(roomId, newGame);
    return newGame;
  }

  /**
   * Get user game stats
   */
  getUserGameStats(userId: string): { gamesPlayed: number; wins: number; losses: number } {
    let gamesPlayed = 0;
    let wins = 0;
    let losses = 0;

    this.activeGames.forEach(game => {
      if (game.players.X.userId === userId || game.players.O.userId === userId) {
        gamesPlayed++;
        if (game.winner && game.winner === userId) {
          wins++;
        } else if (game.status === 'finished' && game.winner !== userId) {
          losses++;
        }
      }
    });

    return { gamesPlayed, wins, losses };
  }

  /**
   * Get game state for client
   */
  private getGameState(gameRoom: GameRoom) {
    return {
      roomId: gameRoom.id,
      board: gameRoom.board,
      currentPlayer: gameRoom.currentPlayer,
      status: gameRoom.status,
      winner: gameRoom.winner,
      winningLine: gameRoom.winningLine,
      moveCount: gameRoom.moveCount,
      players: gameRoom.players,
      spectatorCount: gameRoom.spectators.length,
      createdAt: gameRoom.createdAt,
      lastMoveAt: gameRoom.lastMoveAt
    };
  }

  /**
   * Handle game end
   */
  private async handleGameEnd(gameRoom: GameRoom, endType: 'win' | 'draw' | 'surrender') {
    try {
      // TODO: Save game to database
      // TODO: Update player stats
      // TODO: Award XP and update levels
      // TODO: Consume energy

      console.log(`🏁 Game ended in room ${gameRoom.id}: ${endType}`);
      
      // Clean up game room after some time
      setTimeout(() => {
        this.activeGames.delete(gameRoom.id);
        console.log(`🧹 Cleaned up game room ${gameRoom.id}`);
      }, 300000); // 5 minutes

    } catch (error) {
      console.error('Game end handling error:', error);
    }
  }

  /**
   * Handle player disconnect
   */
  handlePlayerDisconnect(socketId: string, userId?: string) {
    try {
      // Find games where this player is involved
      for (const [roomId, gameRoom] of this.activeGames) {
        const isPlayerX = gameRoom.players.X.socketId === socketId;
        const isPlayerO = gameRoom.players.O.socketId === socketId;
        const isSpectator = gameRoom.spectators.includes(socketId);

        if (isPlayerX || isPlayerO) {
          // Player disconnected from active game
          const disconnectedPlayer = isPlayerX ? 'X' : 'O';
          
          if (gameRoom.status === 'active') {
            // Pause game or end it depending on policy
            gameRoom.status = 'waiting';
            
            this.io.to(roomId).emit('player_disconnected', {
              disconnectedPlayer,
              message: 'Opponent disconnected. Game paused.',
              gameState: this.getGameState(gameRoom)
            });
          }
          
          console.log(`📡 Player ${disconnectedPlayer} disconnected from game ${roomId}`);
        }

        if (isSpectator) {
          // Remove spectator
          gameRoom.spectators = gameRoom.spectators.filter(id => id !== socketId);
          
          this.io.to(roomId).emit('spectator_left', {
            spectatorCount: gameRoom.spectators.length
          });
        }
      }

    } catch (error) {
      console.error('Handle player disconnect error:', error);
    }
  }

  /**
   * Reset game for rematch
   */
  private resetGameForRematch(gameRoom: GameRoom): void {
    gameRoom.board = Array(9).fill(null);
    gameRoom.currentPlayer = 'X';
    gameRoom.status = 'active';
    gameRoom.winner = null;
    gameRoom.winningLine = undefined;
    gameRoom.lastMoveAt = new Date();
    gameRoom.moveCount = 0;
  }

  /**
   * Get active games count
   */
  getActiveGamesCount(): number {
    return this.activeGames.size;
  }

  /**
   * Get active games list
   */
  getActiveGames(): GameRoom[] {
    return Array.from(this.activeGames.values());
  }

  /**
   * Clean up finished games
   */
  cleanupFinishedGames(): number {
    let cleanedCount = 0;
    const now = new Date();
    
    for (const [roomId, gameRoom] of this.activeGames) {
      if (gameRoom.status === 'finished') {
        const timeSinceEnd = now.getTime() - (gameRoom.lastMoveAt?.getTime() || 0);
        
        // Clean up games finished more than 30 minutes ago
        if (timeSinceEnd > 1800000) {
          this.activeGames.delete(roomId);
          cleanedCount++;
        }
      }
    }
    
    return cleanedCount;
  }
}
