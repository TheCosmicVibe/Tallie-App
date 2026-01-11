import {
  parse,
  format,
  addMinutes,
  isWithinInterval,
  isBefore,
  isAfter,
  startOfDay,
  endOfDay,
  parseISO,
  isValid,
  differenceInMinutes,
  addDays,
} from 'date-fns';

export class TimeHelper {
  static parseTime(timeString: string): Date {
    return parse(timeString, 'HH:mm', new Date());
  }

  static formatTime(date: Date): string {
    return format(date, 'HH:mm');
  }

  static parseDateTime(dateString: string, timeString: string): Date {
    const dateTime = `${dateString} ${timeString}`;
    return parse(dateTime, 'yyyy-MM-dd HH:mm', new Date());
  }

  static formatDateTime(date: Date): { date: string; time: string } {
    return {
      date: format(date, 'yyyy-MM-dd'),
      time: format(date, 'HH:mm'),
    };
  }

  static isWithinOperatingHours(
    time: Date,
    openingTime: string,
    closingTime: string
  ): boolean {
    const openTime = this.parseTime(openingTime);
    const closeTime = this.parseTime(closingTime);
    const checkTime = this.parseTime(this.formatTime(time));

    // Handle overnight closing (e.g., 10:00 to 02:00)
    if (isBefore(closeTime, openTime)) {
      return (
        !isBefore(checkTime, openTime) || !isAfter(checkTime, closeTime)
      );
    }

    return isWithinInterval(checkTime, {
      start: openTime,
      end: closeTime,
    });
  }

  static hasOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return isBefore(start1, end2) && isAfter(end1, start2);
  }

  static generateTimeSlots(
    openingTime: string,
    closingTime: string,
    slotDuration: number = 30
  ): string[] {
    const slots: string[] = [];
    let currentTime = this.parseTime(openingTime);
    const closeTime = this.parseTime(closingTime);

    // Handle overnight closing
    if (isBefore(closeTime, currentTime)) {
      closeTime.setDate(closeTime.getDate() + 1);
    }

    while (isBefore(currentTime, closeTime)) {
      slots.push(this.formatTime(currentTime));
      currentTime = addMinutes(currentTime, slotDuration);
    }

    return slots;
  }

  static addMinutesToTime(timeString: string, minutes: number): string {
    const time = this.parseTime(timeString);
    const newTime = addMinutes(time, minutes);
    return this.formatTime(newTime);
  }

  static isValidDate(dateString: string): boolean {
    const date = parseISO(dateString);
    return isValid(date);
  }

  static isValidTime(timeString: string): boolean {
    try {
      const time = this.parseTime(timeString);
      return isValid(time);
    } catch {
      return false;
    }
  }

  static isFutureDateTime(dateString: string, timeString: string): boolean {
    const dateTime = this.parseDateTime(dateString, timeString);
    return isAfter(dateTime, new Date());
  }

  static isPastDateTime(dateString: string, timeString: string): boolean {
    const dateTime = this.parseDateTime(dateString, timeString);
    return isBefore(dateTime, new Date());
  }

  static getDayBoundaries(dateString: string): { start: Date; end: Date } {
    const date = parseISO(dateString);
    return {
      start: startOfDay(date),
      end: endOfDay(date),
    };
  }

  static getDurationInMinutes(start: Date, end: Date): number {
    return differenceInMinutes(end, start);
  }

  static isWithinAdvanceBookingPeriod(
    dateString: string,
    maxDays: number
  ): boolean {
    const date = parseISO(dateString);
    const maxDate = addDays(new Date(), maxDays);
    return isBefore(date, maxDate);
  }

  static isPeakHour(
    timeString: string,
    peakStart: string,
    peakEnd: string
  ): boolean {
    const time = this.parseTime(timeString);
    const start = this.parseTime(peakStart);
    const end = this.parseTime(peakEnd);

    return isWithinInterval(time, { start, end });
  }
}
