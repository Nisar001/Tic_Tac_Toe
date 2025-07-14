import React from 'react';
import { XMarkIcon, CircleStackIcon } from '@heroicons/react/24/solid';

interface TicTacToeBoardProps {
  board: string[][];
  onCellClick: (row: number, col: number) => void;
  isMyTurn: boolean;
  currentPlayer: string;
  gameStatus: string;
  disabled?: boolean;
}

const TicTacToeBoard: React.FC<TicTacToeBoardProps> = ({
  board,
  onCellClick,
  isMyTurn,
  currentPlayer,
  gameStatus,
  disabled = false
}) => {
  const renderCell = (row: number, col: number) => {
    const cellValue = board[row][col];
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
          {gameStatus === 'completed' && 'Game completed'}
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
