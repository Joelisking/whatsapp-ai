import * as cron from 'node-cron';
import { sendDailyPayoutNotification } from './payout.service';
import { initializeSettings } from './owner-notification.service';
import logger from '../utils/logger';

let dailyPayoutJob: any = null;

export function initializeCronJobs(): void {
  try {
    // Initialize settings on startup
    initializeSettings();

    // Schedule daily payout notification (runs at 6 PM every day)
    dailyPayoutJob = cron.schedule('0 18 * * *', async () => {
      logger.info('Running daily payout notification job...');
      try {
        await sendDailyPayoutNotification();
        logger.info('Daily payout notification completed successfully');
      } catch (error) {
        logger.error('Daily payout notification job failed:', error);
      }
    });

    logger.info('Cron jobs initialized successfully');
    logger.info('Daily payout job scheduled for 18:00 UTC');
  } catch (error) {
    logger.error('Error initializing cron jobs:', error);
  }
}

export function stopCronJobs(): void {
  if (dailyPayoutJob) {
    dailyPayoutJob.stop();
    logger.info('Cron jobs stopped');
  }
}

// Manual trigger for testing
export async function triggerDailyPayoutManually(): Promise<void> {
  logger.info('Manually triggering daily payout notification...');
  await sendDailyPayoutNotification();
}
