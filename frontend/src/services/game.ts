import api from './api';

export const createGame = (data: any) => api.post('/game/create', data);
export const getGameState = (roomId: string) => api.get(`/game/state/${roomId}`);
export const makeMove = (roomId: string, row: number, col: number) => api.post(`/game/move/${roomId}`, { row, col });
export const forfeitGame = (roomId: string) => api.post(`/game/forfeit/${roomId}`);
export const getLeaderboard = () => api.get('/game/leaderboard');
