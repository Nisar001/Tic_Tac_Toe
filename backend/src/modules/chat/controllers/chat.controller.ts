// Chat Controllers - Re-exports for easy importing
export { sendMessage } from './sendMessage.controller';
export { getChatHistory } from './getChatHistory.controller';
export { joinChatRoom } from './joinChatRoom.controller';
export { leaveChatRoom } from './leaveChatRoom.controller';
export { getChatRooms } from './getChatRooms.controller';
export { getChatRoomUsers } from './getChatRoomUsers.controller';

// Import individual controllers for default export
import { sendMessage } from './sendMessage.controller';
import { getChatHistory } from './getChatHistory.controller';
import { joinChatRoom } from './joinChatRoom.controller';
import { leaveChatRoom } from './leaveChatRoom.controller';
import { getChatRooms } from './getChatRooms.controller';
import { getChatRoomUsers } from './getChatRoomUsers.controller';

// Default export with all controllers
export default {
  sendMessage,
  getChatHistory,
  joinChatRoom,
  leaveChatRoom,
  getChatRooms,
  getChatRoomUsers,
};