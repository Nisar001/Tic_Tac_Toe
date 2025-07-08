// Unit tests for scheduler.service.ts
import cron from 'node-cron';
import { SchedulerService } from '../../../src/services/scheduler.service';
import User from '../../../src/models/user.model';
import { EnergyManager } from '../../../src/utils/energy.utils';
import { EmailService } from '../../../src/services/email.service';

jest.mock('node-cron');
jest.mock('../../../src/models/user.model');
jest.mock('../../../src/utils/energy.utils');
jest.mock('../../../src/services/email.service');

const mockSchedule = jest.fn();
cron.schedule = mockSchedule;

const mockFind = jest.fn();
const mockSave = jest.fn();
User.find = mockFind;
User.prototype.save = mockSave;

const mockCalculateCurrentEnergy = jest.fn();
EnergyManager.calculateCurrentEnergy = mockCalculateCurrentEnergy;

const mockSendEmail = jest.fn();
EmailService.sendEmail = mockSendEmail;

describe('SchedulerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize all jobs correctly', () => {
    SchedulerService.initialize();

    expect(mockSchedule).toHaveBeenCalledTimes(3);
    expect(mockSchedule).toHaveBeenCalledWith('* * * * *', expect.any(Function));
    expect(mockSchedule).toHaveBeenCalledWith('0 2 * * *', expect.any(Function));
    expect(mockSchedule).toHaveBeenCalledWith('0 */6 * * *', expect.any(Function));
  });

  it('should stop all jobs correctly', () => {
    SchedulerService.shutdown();

    expect(SchedulerService.getStatus()).toEqual({
      energyRegenActive: false,
      cleanupActive: false,
      statsActive: false,
    });
  });

  it('should process energy regeneration correctly', async () => {
    const mockUser = {
      energy: 2,
      energyUpdatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      save: mockSave,
    };

    mockFind.mockResolvedValue([mockUser]);
    mockCalculateCurrentEnergy.mockReturnValue({ currentEnergy: 5 });

    await SchedulerService.forceEnergyRegeneration();

    expect(mockFind).toHaveBeenCalledWith(expect.any(Object));
    expect(mockCalculateCurrentEnergy).toHaveBeenCalledWith(
      mockUser.energy,
      mockUser.energyUpdatedAt,
      mockUser.energyUpdatedAt
    );
    expect(mockSave).toHaveBeenCalled();
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it('should perform database cleanup correctly', async () => {
    const mockDeleteMany = jest.fn();
    const mockUpdateMany = jest.fn();

    User.deleteMany = mockDeleteMany;
    User.updateMany = mockUpdateMany;

    mockDeleteMany.mockResolvedValue({ deletedCount: 5 });
    mockUpdateMany.mockResolvedValue({ modifiedCount: 10 });

    await SchedulerService.forceDatabaseCleanup();

    expect(mockDeleteMany).toHaveBeenCalledTimes(1);
    expect(mockUpdateMany).toHaveBeenCalledTimes(2);
  });

  it('should calculate global stats correctly', async () => {
    const mockCountDocuments = jest.fn();
    const mockAggregate = jest.fn();

    User.countDocuments = mockCountDocuments;
    User.aggregate = mockAggregate;

    mockCountDocuments.mockResolvedValueOnce(100);
    mockCountDocuments.mockResolvedValueOnce(50);
    mockCountDocuments.mockResolvedValueOnce(80);
    mockAggregate.mockResolvedValue([{ avgLevel: 5, maxLevel: 10 }]);

    await SchedulerService.forceStatsCalculation();

    expect(mockCountDocuments).toHaveBeenCalledTimes(3);
    expect(mockAggregate).toHaveBeenCalledTimes(1);
  });
});
