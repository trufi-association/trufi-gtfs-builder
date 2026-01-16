/**
 * Schedule Expansion Utilities
 * Converts frequency-based service definitions into specific departure times
 */
/**
 * Convert time string "HH:MM" to seconds since midnight
 * @param time Time in format "HH:MM" (e.g., "05:00", "23:30")
 * @returns Seconds since midnight
 */
export declare function timeToSeconds(time: string): number;
/**
 * Convert seconds since midnight to time string "HH:MM:SS"
 * Supports times >= 24 hours for next-day trips (GTFS specification)
 * @param seconds Seconds since midnight (can be >= 86400 for next day)
 * @returns Time in format "HH:MM:SS"
 */
export declare function secondsToTime(seconds: number): string;
/**
 * Expand a service schedule into an array of specific departure times
 * @param startTime Service start time in format "HH:MM" (e.g., "05:00")
 * @param endTime Service end time in format "HH:MM" (e.g., "23:00")
 * @param headwaySecs Headway in seconds between departures (e.g., 300 for 5 minutes)
 * @returns Array of departure times in format "HH:MM:SS"
 *
 * @example
 * expandSchedule("05:00", "06:00", 300)
 * // Returns: ["05:00:00", "05:05:00", "05:10:00", "05:15:00", ..., "05:55:00"]
 * // Note: Does not include departure at exactly 06:00:00 (endTime)
 *
 * @example
 * // Service spanning midnight (e.g., 20:00 to 02:00)
 * expandSchedule("20:00", "02:00", 3600)
 * // Returns: ["20:00:00", "21:00:00", "22:00:00", "23:00:00", "24:00:00", "25:00:00"]
 * // Times >= 24:00:00 are valid GTFS times for next-day service
 */
export declare function expandSchedule(startTime: string, endTime: string, headwaySecs: number): string[];
//# sourceMappingURL=scheduleExpander.d.ts.map