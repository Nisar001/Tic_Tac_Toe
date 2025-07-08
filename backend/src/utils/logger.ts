import fs from 'fs';
import path from 'path';

const logDirectory = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

const logFilePath = path.join(logDirectory, 'application.log');

export const log = (message: string, level: 'INFO' | 'ERROR' | 'DEBUG' = 'INFO') => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;

  fs.appendFileSync(logFilePath, logMessage);
};

export const logInfo = (message: string) => log(message, 'INFO');
export const logError = (message: string) => log(message, 'ERROR');
export const logDebug = (message: string) => log(message, 'DEBUG');
