// Unit tests for sms.service.ts
import twilio, { Twilio } from 'twilio';
import { SMSService } from '../../../src/services/sms.service';
import { config } from '../../../src/config';

describe('SMSService', () => {
  let mockTwilioClient: any;

  beforeEach(() => {
    mockTwilioClient = {
      messages: {
        create: jest.fn().mockResolvedValue({ sid: '12345' }),
      },
    };
    SMSService['client'] = mockTwilioClient as Twilio;
  });

  it('should send SMS successfully', async () => {
    const result = await SMSService.sendSMS('+1234567890', 'Test message');
    expect(result).toBe('12345');
    expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
      to: '+1234567890',
      body: 'Test message',
      from: config.TWILIO_PHONE_NUMBER,
    });
  });

  it('should handle Twilio client being undefined', async () => {
    SMSService['client'] = null as unknown as Twilio; // Force client to be null
    await expect(SMSService.sendSMS('+1234567890', 'Test message')).rejects.toThrow(
      'Twilio client is not initialized'
    );
  });

  it('should send verification SMS successfully', async () => {
    const phoneNumber = '+1234567890';
    const verificationCode = '123456';

    await SMSService.sendVerificationSMS(phoneNumber, verificationCode);

    expect(mockTwilioClient.messages?.create).toHaveBeenCalledWith({
      body: expect.stringContaining(verificationCode),
      from: config.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
  });

  it('should send game notification SMS successfully', async () => {
    const phoneNumber = '+1234567890';
    const message = 'You won the game!';

    await SMSService.sendGameNotificationSMS(phoneNumber, message);

    expect(mockTwilioClient.messages?.create).toHaveBeenCalledWith({
      body: expect.stringContaining(message),
      from: config.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
  });

  it('should format phone number correctly', () => {
    expect(SMSService.formatPhoneNumber('1234567890')).toBe('+11234567890');
    expect(SMSService.formatPhoneNumber('+1234567890')).toBe('+1234567890');
    expect(SMSService.formatPhoneNumber('11234567890')).toBe('+11234567890');
  });

  it('should validate phone number correctly', () => {
    expect(SMSService.isValidPhoneNumber('1234567890')).toBe(true);
    expect(SMSService.isValidPhoneNumber('+1234567890')).toBe(true);
    expect(SMSService.isValidPhoneNumber('123')).toBe(false);
  });
});
