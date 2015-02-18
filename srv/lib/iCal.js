/*global MojoLoader */

var CalendarIO = MojoLoader.require({name: "calendar.io", version: "1.0"})["calendar.io"].IO;
var Calendar = MojoLoader.require({name: "calendar", version: "1.0"}).calendar;

var iCal = (function () {
	"use strict";
	var TZManager = Calendar.TimezoneManager();
	return {
		generateICal: function (event) {
			var e = CalendarIO.eventToVCalendar(event, undefined, undefined, {includeUnknownFields: false});
			if (typeof e === "object") {
				return e[0];
			} else {
				return e;
			}
		},
		parseICal: function (ical, calendarID) { //options
			var events = CalendarIO.vCalendarToEvent(ical, {}, calendarID, TZManager);
			return events[0];
		}
	};
}());
