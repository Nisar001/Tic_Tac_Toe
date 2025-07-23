// Legacy controllers (REST-based)
export { getChatHistory } from './getChatHistory.controller';
export { getChatRooms, getChatRoomsRateLimit } from './getChatRooms.controller';
export { sendMessage, sendMessageRateLimit } from './sendMessage.controller';
export { joinChatRoom, joinChatRoomRateLimit } from './joinChatRoom.controller';
export { leaveChatRoom, leaveChatRoomRateLimit } from './leaveChatRoom.controller';
export { getChatRoomUsers, getChatRoomUsersRateLimit } from './getChatRoomUsers.controller';

// Socket.io controllers (Real-time)
export * from './socketRoom.controller';
export * from './socketMessage.controller';
