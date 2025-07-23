import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAPIManager } from '../../contexts/APIManagerContext';
import { XMarkIcon, CircleStackIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const GameBoard: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentGame, makeMove, getGameState, isLoading, forfeitGame, joinGame } = useGame();
  const { loading, errors, retry } = useAPIManager();
  const [board, setBoard] = useState<(string | null)[][]>(Array(3).fill(null).map(() => Array(3).fill(null)));
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const loadGameState = React.useCallback(async () => {
    if (!roomId) return;
    setLoadError(null);
    setRetrying(false);
    try {
      await getGameState(roomId);
    } catch (error: any) {
      setLoadError(error?.message || 'Failed to load game state');
    }
  }, [roomId, getGameState]);

  useEffect(() => {
    if (!roomId) return;
    const ensureJoinedAndLoad = async () => {
      try {
        await joinGame(roomId!);
      } catch (e) {}
      await loadGameState();
    };
    ensureJoinedAndLoad();
  }, [roomId, joinGame, loadGameState]);

  useEffect(() => {
    if (currentGame) {
      setBoard(currentGame.board || Array(3).fill(null).map(() => Array(3).fill(null)));
      
      // Determine if it's the current user's turn
      const isPlayer1 = typeof currentGame.players.player1 === 'string' 
        ? currentGame.players.player1 === user?._id 
        : currentGame.players.player1?.id === user?._id;
      
      const isPlayer2 = typeof currentGame.players.player2 === 'string' 
        ? currentGame.players.player2 === user?._id 
        : currentGame.players.player2?.id === user?._id;
      
      // Player1 is X, Player2 is O
      const mySymbol = isPlayer1 ? 'X' : (isPlayer2 ? 'O' : null);
      setIsMyTurn(currentGame.currentPlayer === mySymbol);
    }
  }, [currentGame, user]);

  // ...existing code...

  const handleCellClick = async (row: number, col: number) => {
    if (!roomId || !isMyTurn || board[row][col] || currentGame?.status !== 'active') {
      return;
    }

    try {
      // Convert row/col to position (0-8 for backend)
      const position = row * 3 + col;
      await makeMove(roomId, {
        position,
        row,
        col,
      });
    } catch (error) {
      console.error('Failed to make move:', error);
    }
  };

  const handleForfeit = async () => {
    if (!currentGame) return;
    const id = currentGame.roomId ?? currentGame.room ?? currentGame.id ?? '';
    if (!id) return;
    try {
      await forfeitGame(id);
      await getGameState(id);
    } catch (error) {
      console.error('Failed to forfeit game:', error);
    }
  };

  const renderCell = (row: number, col: number) => {
    const value = board[row][col];
    const isEmpty = !value;
    const isClickable = isEmpty && isMyTurn && currentGame?.status === 'active';

    return (
      <button
        key={`${row}-${col}`}
        onClick={() => handleCellClick(row, col)}
        disabled={!isClickable}
        className={`game-cell ${value ? value.toLowerCase() : ''} ${!isClickable ? 'disabled' : ''}`}
      >
        {value === 'X' && <XMarkIcon className="w-8 h-8" />}
        {value === 'O' && <CircleStackIcon className="w-8 h-8" />}
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (loadError || (errors && Object.keys(errors).length > 0)) {
    return (
      <div className="text-center py-8">
        <div className="space-y-4">
          {loadError && (
            <p className="text-red-600">{loadError}</p>
          )}
          {errors && Object.keys(errors).length > 0 && (
            <div className="space-y-2">
              {Object.entries(errors).map(([apiCall, error]) => (
                <div key={apiCall} className="text-red-600">
                  API Error ({apiCall}): {error}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => {
              setRetrying(true);
              loadGameState();
            }}
            className="btn-primary flex items-center gap-2"
            disabled={retrying || loading.getGameState}
          >
            <ArrowPathIcon className={`w-4 h-4 ${(retrying || loading.getGameState) ? 'animate-spin' : ''}`} />
            {retrying || loading.getGameState ? 'Retrying...' : 'Retry'}
          </button>
          {errors && Object.keys(errors).length > 0 && (
            <button
              onClick={() => {
                Object.keys(errors).forEach(apiCall => {
                  if (apiCall === 'getGameState') {
                    retry(apiCall, () => getGameState(roomId!));
                  }
                });
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Retry API Calls
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!currentGame) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Game not found</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 btn-primary"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8">
      {/* Game Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Game #{roomId?.slice(0, 8)}
          </h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium w-fit ${
            currentGame.status === 'waiting' 
              ? 'bg-yellow-100 text-yellow-800'
              : currentGame.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {currentGame.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Players */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {[currentGame.players.player1, currentGame.players.player2].filter(Boolean).map((player, index) => {
            const playerObj = typeof player === 'string' ? { id: player, username: 'Player', symbol: index === 0 ? 'X' : 'O', isConnected: true } : player;
            return (
              <div 
                key={playerObj?.id || index}
                className={`p-3 rounded-lg border-2 ${
                  currentGame.currentPlayer === playerObj?.symbol
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                    playerObj?.symbol === 'X' ? 'bg-primary-100' : 'bg-error-100'
                  }`}>
                    {playerObj?.symbol === 'X' ? (
                      <XMarkIcon className={`w-5 h-5 text-primary-600`} />
                    ) : (
                      <CircleStackIcon className={`w-5 h-5 text-error-600`} />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{playerObj?.username}</p>
                    <p className="text-xs text-gray-500">
                      {playerObj?.isConnected ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Turn indicator */}
        {currentGame.status === 'active' && (
          <div className="text-center mb-4">
            <p className="text-lg font-medium text-gray-900">
              {isMyTurn ? "It's your turn!" : "Waiting for opponent..."}
            </p>
          </div>
        )}
      </div>

      {/* Game Board */}
      <div className="card">
        <div className="flex justify-center">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 p-4 max-w-xs sm:max-w-sm">
            {board.map((row, rowIndex) =>
              row.map((_, colIndex) => renderCell(rowIndex, colIndex))
            )}
          </div>
        </div>
      </div>

      {/* Game Result */}
      {currentGame.status === 'completed' && (
        <div className="card text-center">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            Game Over!
          </h2>
          {currentGame.winner ? (
            <p className="text-base sm:text-lg text-green-600 mb-4">
              🎉 {currentGame.winner === user?.id ? 'You won!' : 'You lost!'}
            </p>
          ) : (
            <p className="text-base sm:text-lg text-gray-600 mb-4">
              It's a draw!
            </p>
          )}
          <button
            onClick={() => navigate('/')}
            className="btn-primary w-full sm:w-auto"
          >
            Back to Dashboard
          </button>
        </div>
      )}

      {/* Game Actions */}
      {currentGame.status === 'active' && (
        <div className="card">
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:space-x-4">
            <button
              onClick={() => navigate('/')}
              className="btn-secondary w-full sm:w-auto"
            >
              Leave Game
            </button>
            <button
              onClick={handleForfeit}
              className="btn-danger w-full sm:w-auto"
            >
              Forfeit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;


