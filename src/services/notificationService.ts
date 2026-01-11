import { env } from '../config/env';
import { logger } from '../utils/logger';
import { NotificationPayload } from '../types';

export class NotificationService {
  async sendConfirmation(
    type: 'reservation' | 'cancellation' | 'modification' | 'waitlist',
    payload: {
      customerName: string;
      customerPhone: string;
      customerEmail?: string;
      details: any;
    }
  ): Promise<void> {
    if (!env.ENABLE_NOTIFICATIONS) {
      logger.info('Notifications disabled, skipping...');
      return;
    }

    try {
      const emailPayload = this.buildEmailPayload(type, payload);
      const smsPayload = this.buildSMSPayload(type, payload);

      // Mock email sending
      await this.sendEmail(emailPayload);

      // Mock SMS sending
      await this.sendSMS(smsPayload);

      logger.info(`${type} notification sent to ${payload.customerName}`);
    } catch (error) {
      logger.error('Error sending notification:', error);
      // Don't throw error - notifications are non-critical
    }
  }

  private buildEmailPayload(
    type: string,
    payload: any
  ): NotificationPayload {
    const { customerName, customerEmail, details } = payload;

    let subject = '';
    let message = '';

    switch (type) {
      case 'reservation':
        subject = 'Reservation Confirmation';
        message = `Dear ${customerName},\n\nYour reservation has been confirmed!\n\nDetails:\n- Date: ${details.reservationDate}\n- Time: ${details.reservationTime}\n- Party Size: ${details.partySize}\n- Table: ${details.tableNumber}\n- Confirmation Code: ${details.confirmationCode}\n\nWe look forward to serving you!\n\nBest regards,\n${details.restaurantName}`;
        break;

      case 'cancellation':
        subject = 'Reservation Cancelled';
        message = `Dear ${customerName},\n\nYour reservation has been cancelled.\n\nDetails:\n- Date: ${details.reservationDate}\n- Time: ${details.reservationTime}\n- Confirmation Code: ${details.confirmationCode}\n\nWe hope to see you again soon!\n\nBest regards,\n${details.restaurantName}`;
        break;

      case 'modification':
        subject = 'Reservation Modified';
        message = `Dear ${customerName},\n\nYour reservation has been updated.\n\nNew Details:\n- Date: ${details.reservationDate}\n- Time: ${details.reservationTime}\n- Party Size: ${details.partySize}\n- Table: ${details.tableNumber}\n\nBest regards,\n${details.restaurantName}`;
        break;

      case 'waitlist':
        subject = 'Added to Waitlist';
        message = `Dear ${customerName},\n\nYou've been added to our waitlist.\n\nDetails:\n- Date: ${details.waitlistDate}\n- Party Size: ${details.partySize}\n- Position: ${details.position}\n\nWe'll notify you when a table becomes available.\n\nBest regards,\n${details.restaurantName}`;
        break;
    }

    return {
      to: customerEmail || '',
      subject,
      message,
      type: 'email',
    };
  }

  private buildSMSPayload(type: string, payload: any): NotificationPayload {
    const { customerName, customerPhone, details } = payload;

    let message = '';

    switch (type) {
      case 'reservation':
        message = `Hi ${customerName}! Your reservation at ${details.restaurantName} is confirmed for ${details.reservationDate} at ${details.reservationTime}. Code: ${details.confirmationCode}`;
        break;

      case 'cancellation':
        message = `Hi ${customerName}! Your reservation at ${details.restaurantName} for ${details.reservationDate} has been cancelled.`;
        break;

      case 'modification':
        message = `Hi ${customerName}! Your reservation at ${details.restaurantName} has been updated to ${details.reservationDate} at ${details.reservationTime}.`;
        break;

      case 'waitlist':
        message = `Hi ${customerName}! You're #${details.position} on the waitlist for ${details.restaurantName} on ${details.waitlistDate}.`;
        break;
    }

    return {
      to: customerPhone,
      subject: '',
      message,
      type: 'sms',
    };
  }

  private async sendEmail(payload: NotificationPayload): Promise<void> {
    // Mock email sending - in production, integrate with SendGrid, AWS SES, etc.
    logger.info('📧 Email Notification:', {
      from: env.NOTIFICATION_FROM_EMAIL,
      to: payload.to,
      subject: payload.subject,
      message: payload.message.substring(0, 100) + '...',
    });
  }

  private async sendSMS(payload: NotificationPayload): Promise<void> {
    // Mock SMS sending - in production, integrate with Twilio, AWS SNS, etc.
    logger.info('📱 SMS Notification:', {
      from: env.NOTIFICATION_FROM_PHONE,
      to: payload.to,
      message: payload.message.substring(0, 100) + '...',
    });
  }

  async notifyWaitlistAvailability(
    waitlistEntry: any,
    availableSlot: { date: string; time: string; tableNumber: string }
  ): Promise<void> {
    if (!env.ENABLE_NOTIFICATIONS) return;

    try {
      const message = `Great news ${waitlistEntry.customerName}! A table is now available at ${waitlistEntry.restaurant.name} on ${availableSlot.date} at ${availableSlot.time} (Table ${availableSlot.tableNumber}). Reply within 15 minutes to confirm!`;

      await this.sendSMS({
        to: waitlistEntry.customerPhone,
        subject: '',
        message,
        type: 'sms',
      });

      if (waitlistEntry.customerEmail) {
        await this.sendEmail({
          to: waitlistEntry.customerEmail,
          subject: 'Table Available - Action Required',
          message,
          type: 'email',
        });
      }

      logger.info(`Waitlist availability notification sent to ${waitlistEntry.customerName}`);
    } catch (error) {
      logger.error('Error sending waitlist notification:', error);
    }
  }
}
