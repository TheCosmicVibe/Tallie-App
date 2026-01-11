import {
  parse,
  format,
  addMinutes,
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
  /**
   * Parse a time string in either HH:mm or HH:mm:ss into a Date object (date = today).
   * Returns an invalid Date if input can't be parsed.
   */
  static parseTime(timeString: string): Date {
    if (!timeString || typeof timeString !== 'string') {
      return new Date(NaN);
    }

    // Try HH:mm:ss first, then HH:mm
    const tryFormats = ['HH:mm:ss', 'HH:mm'];
    for (const fmt of tryFormats) {
      const parsed = parse(timeString, fmt, new Date());
      if (isValid(parsed)) return parsed;
    }

    // fallback: try to parse only the first 5 characters (in case DB has trailing)
    const maybe = timeString.slice(0, 5);
    const parsed = parse(maybe, 'HH:mm', new Date());
    return isValid(parsed) ? parsed : new Date(NaN);
  }

  /**
   * Format a Date object to 'HH:mm' (no seconds).
   * Use this for API-level time strings so they match Joi validation.
   */
  static formatTime(date: Date): string {
    return format(date, 'HH:mm');
  }

  /**
   * Parse a combined date string and time string into a Date object.
   * Accepts timeString in HH:mm or HH:mm:ss.
   */
  static parseDateTime(dateString: string, timeString: string): Date {
    if (!dateString || !timeString) return new Date(NaN);

    // choose a format depending on whether timeString contains seconds
    const hasSeconds = /^\d{2}:\d{2}:\d{2}$/.test(timeString);
    const formatString = hasSeconds ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd HH:mm';

    const dateTimeString = `${dateString} ${timeString}`;
    const parsed = parse(dateTimeString, formatString, new Date());
    return parsed;
  }

  static formatDateTime(date: Date): { date: string; time: string } {
    return {
      date: format(date, 'yyyy-MM-dd'),
      time: format(date, 'HH:mm'),
    };
  }

  /**
   * Convert a time string (HH:mm or HH:mm:ss) into minutes since midnight.
   * Returns NaN for invalid inputs.
   */
  static timeStringToMinutes(timeString: string): number {
    if (!timeString) return NaN;
    const parts = timeString.split(':').map((p) => parseInt(p, 10));
    if (parts.length < 2) return NaN;
    const hours = Number.isFinite(parts[0]) ? parts[0] : NaN;
    const minutes = Number.isFinite(parts[1]) ? parts[1] : NaN;
    const seconds = parts.length >= 3 && Number.isFinite(parts[2]) ? parts[2] : 0;
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return NaN;
    return hours * 60 + minutes + Math.floor(seconds / 60);
  }

  /**
   * Check if a given Date (actual date+time) falls within operating hours defined
   * by openingTime and closingTime strings (either HH:mm or HH:mm:ss).
   *
   * Implementation compares only time-of-day (minutes from midnight), and correctly
   * handles overnight closing (e.g., open 20:00, close 02:00).
   */
  static isWithinOperatingHours(
    time: Date,
    openingTime: string,
    closingTime: string
  ): boolean {
    if (!isValid(time)) return false;

    const checkMinutes = time.getHours() * 60 + time.getMinutes();

    const openMinutes = this.timeStringToMinutes(openingTime);
    const closeMinutes = this.timeStringToMinutes(closingTime);

    if (!Number.isFinite(openMinutes) || !Number.isFinite(closeMinutes)) {
      // cannot interpret opening/closing times => treat as invalid => not within
      return false;
    }

    // normal same-day window
    if (closeMinutes > openMinutes) {
      return checkMinutes >= openMinutes && checkMinutes <= closeMinutes;
    }

    // overnight window (e.g., open 22:00 (1320), close 02:00 (120))
    return checkMinutes >= openMinutes || checkMinutes <= closeMinutes;
  }

  static hasOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    // Two intervals [start1,end1) and [start2,end2) overlap if start1 < end2 && end1 > start2
    return start1 < end2 && end1 > start2;
  }

  /**
   * Generate time slots between openingTime and closingTime using slotDuration minutes.
   * Returns times as 'HH:mm' strings. Handles overnight closing correctly by rolling the close time to next day.
   */
  static generateTimeSlots(
    openingTime: string,
    closingTime: string,
    slotDuration: number = 30
  ): string[] {
    const slots: string[] = [];

    const openDate = this.parseTime(openingTime);
    const closeDate = this.parseTime(closingTime);

    if (!isValid(openDate) || !isValid(closeDate)) {
      return slots;
    }

    // get minutes since midnight representation
    const openMin = this.timeStringToMinutes(openingTime);
    let closeMin = this.timeStringToMinutes(closingTime);

    // if close <= open -> overnight, add 24h to close
    const overnight = closeMin <= openMin;
    if (overnight) closeMin += 24 * 60;

    // iterate from openMin to (closeMin - slotDuration) inclusive, stepping by slotDuration
    for (let m = openMin; m + slotDuration <= closeMin; m += slotDuration) {
      // convert m (minutes possibly > 1440) back to a time-of-day in HH:mm, mod 1440
      const mm = m % (24 * 60);
      const hh = Math.floor(mm / 60)
        .toString()
        .padStart(2, '0');
      const mins = Math.floor(mm % 60)
        .toString()
        .padStart(2, '0');
      slots.push(`${hh}:${mins}`);
    }

    return slots;
  }

  static addMinutesToTime(timeString: string, minutes: number): string {
    const base = this.parseTime(timeString);
    if (!isValid(base)) return '';
    const newDate = addMinutes(base, minutes);
    return this.formatTime(newDate);
  }

  static isValidDate(dateString: string): boolean {
    const date = parseISO(dateString);
    return isValid(date);
  }

  static isValidTime(timeString: string): boolean {
    try {
      const parsed = this.parseTime(timeString);
      return isValid(parsed);
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
    // reservation date must be <= maxDate (on or before)
    return isBefore(date, maxDate) || date.getTime() === maxDate.getTime();
  }

  static isPeakHour(
    timeString: string,
    peakStart: string,
    peakEnd: string
  ): boolean {
    const time = this.parseTime(timeString);
    if (!isValid(time)) return false;

    const checkMin = time.getHours() * 60 + time.getMinutes();
    const startMin = this.timeStringToMinutes(peakStart);
    const endMin = this.timeStringToMinutes(peakEnd);

    if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) return false;

    if (endMin > startMin) {
      return checkMin >= startMin && checkMin <= endMin;
    }
    // overnight peak
    return checkMin >= startMin || checkMin <= endMin;
  }
}
