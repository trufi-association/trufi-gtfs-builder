"use strict";
/**
 * Schedule Expansion Utilities
 * Converts frequency-based service definitions into specific departure times
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeToSeconds = timeToSeconds;
exports.secondsToTime = secondsToTime;
exports.expandSchedule = expandSchedule;
/**
 * Convert time string "HH:MM" to seconds since midnight
 * @param time Time in format "HH:MM" (e.g., "05:00", "23:30")
 * @returns Seconds since midnight
 */
function timeToSeconds(time) {
    const parts = time.split(':');
    if (parts.length !== 2) {
        throw new Error(`Invalid time format: ${time}. Expected HH:MM`);
    }
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) {
        throw new Error(`Invalid time format: ${time}. Hours and minutes must be numbers`);
    }
    if (hours < 0 || minutes < 0 || minutes >= 60) {
        throw new Error(`Invalid time values: ${time}. Hours must be >= 0, minutes must be 0-59`);
    }
    return hours * 3600 + minutes * 60;
}
/**
 * Convert seconds since midnight to time string "HH:MM:SS"
 * Supports times >= 24 hours for next-day trips (GTFS specification)
 * @param seconds Seconds since midnight (can be >= 86400 for next day)
 * @returns Time in format "HH:MM:SS"
 */
function secondsToTime(seconds) {
    let hh = Math.floor(seconds / 3600);
    let mm = Math.floor((seconds - hh * 3600) / 60);
    let ss = seconds - hh * 3600 - mm * 60;
    if (hh < 10)
        hh = `0${hh}`;
    if (mm < 10)
        mm = `0${mm}`;
    if (ss < 10)
        ss = `0${ss}`;
    return `${hh}:${mm}:${ss}`;
}
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
function expandSchedule(startTime, endTime, headwaySecs) {
    if (headwaySecs <= 0) {
        throw new Error(`Invalid headway: ${headwaySecs}. Must be positive`);
    }
    let startSecs = timeToSeconds(startTime);
    let endSecs = timeToSeconds(endTime);
    // Handle service spanning midnight (e.g., "20:00" to "02:00")
    if (endSecs <= startSecs) {
        endSecs += 24 * 3600; // Add 24 hours to endTime
    }
    const departures = [];
    let currentSecs = startSecs;
    // Generate departures from startTime up to (but not including) endTime
    while (currentSecs < endSecs) {
        departures.push(secondsToTime(currentSecs));
        currentSecs += headwaySecs;
    }
    // Log warning if generating many trips
    if (departures.length > 500) {
        console.warn(`Warning: Generating ${departures.length} trips for service ${startTime}-${endTime} ` +
            `with ${headwaySecs}s headway. This may result in a large GTFS file.`);
    }
    return departures;
}
//# sourceMappingURL=scheduleExpander.js.map