import React from 'react';
import { XMarkIcon, CircleStackIcon } from '@heroicons/react/24/solid';

interface TicTacToeBoardProps {
  board: string[] | string[][]; // Support both backend formats
  onCellClick: (row: number, col: number) => void;
  isMyTurn: boolean;
  currentPlayer: string;
  gameStatus: string;
  disabled?: boolean;
  winner?: string | null;
  isDraw?: boolean;
}

const TicTacToeBoard: React.FC<TicTacToeBoardProps> = ({
  board,
  onCellClick,
  isMyTurn,
  currentPlayer,
  gameStatus,
  disabled = false,
  winner,
  isDraw
}) => {
  // Convert board format if needed (backend sends flat array)
  const getBoardMatrix = (): string[][] => {
    if (Array.isArray(board) && board.length === 9 && typeof board[0] === 'string') {
      // Flat array format from backend
      const matrix: string[][] = [];
      for (let i = 0; i < 3; i++) {
        matrix[i] = [];
        for (let j = 0; j < 3; j++) {
          matrix[i][j] = (board as string[])[i * 3 + j] || '';
        }
      }
      return matrix;
    } else if (Array.isArray(board) && Array.isArray(board[0])) {
      // Already 2D array format
      return board as string[][];
    }
    // Fallback to empty board
    return Array(3).fill(null).map(() => Array(3).fill(''));
  };

  const boardMatrix = getBoardMatrix();

  const renderCell = (row: number, col: number) => {
    const cellValue = boardMatrix[row][col];
    const isClickable = !disabled && isMyTurn && !cellValue && gameStatus === 'in_progress';

    return (
      <button
        key={`${row}-${col}`}
        className={`
          w-20 h-20 border-2 border-gray-300 bg-white rounded-lg
          flex items-center justify-center text-4xl font-bold
          transition-all duration-200 hover:bg-gray-50
          ${isClickable ? 'cursor-pointer hover:border-blue-400' : 'cursor-not-allowed'}
          ${cellValue === 'X' ? 'text-blue-600' : 'text-red-600'}
        `}
        onClick={() => isClickable && onCellClick(row, col)}
        disabled={!isClickable}
      >
        {cellValue === 'X' && <XMarkIcon className="w-12 h-12" />}
        {cellValue === 'O' && <CircleStackIcon className="w-12 h-12" />}
      </button>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {gameStatus === 'waiting' && 'Waiting for opponent...'}
          {gameStatus === 'in_progress' && (
            isMyTurn ? "Your turn" : "Opponent's turn"
          )}
          {gameStatus === 'completed' && (
            winner 
              ? `Game won by ${winner}!`
              : isDraw 
                ? 'Game ended in a draw!'
                : 'Game completed'
          )}
          {gameStatus === 'abandoned' && 'Game abandoned'}
        </h3>
        {gameStatus === 'in_progress' && (
          <p className="text-sm text-gray-600">
            Current player: <span className="font-semibold">{currentPlayer}</span>
          </p>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-2 max-w-64 mx-auto">
        {Array.from({ length: 3 }, (_, row) =>
          Array.from({ length: 3 }, (_, col) => renderCell(row, col))
        )}
      </div>
    </div>
  );
};

export default TicTacToeBoard;


