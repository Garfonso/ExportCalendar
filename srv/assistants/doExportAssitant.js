/*jslint node: true, sloppy: true, nomen: true */
/*global Future, log, finishAssistant_global, logSubscription: true, startAssistant, logToApp, PalmCall, DB, fs, iCal */

var doExportAssitant = function (future) {
};

var nodejsMajorVersion = Number(process.version.match(/^v\d+\.(\d+)/)[1]);

var quote = function (string) {
	"use strict";
	if (string === undefined || string === null || typeof string !== "string") {
		return string;
	}
	string = string.replace(/\\/gmi, "\\\\");
	string = string.replace(/,/gmi, "\\,");
	string = string.replace(/;/gmi, "\\;");
	string = string.replace(/\n/gmi, "\\n");
	string = string.replace(/\r/gmi, "\\r");
	return string;
};

doExportAssitant.prototype.processEvents = function (eArray, first) {
	var txt = iCal.generateICal(eArray),
		start,
		end;
	log("Got result text:\n" + txt);
	start = txt.indexOf("BEGIN:VEVENT");
	txt = txt.substring(start);
	log("After cutting start:\n" + txt);
	end = txt.lastIndexOf("END:VEVENT\r\n") + "END:VEVENT\r\n".length; //get \r\n with it.
	txt = txt.substring(0, end);
	log("After cutting end:\n" + txt);
	return txt;
};

doExportAssitant.prototype.getHeader = function () {
	return "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:webos-ics-export\r\n";
};

doExportAssitant.prototype.getFooter = function () {
	return "END:VCALENDAR\r\n";
};

doExportAssitant.prototype.run = function (outerFuture, subscription) {
	log("============== doExportAssitant");
	var databaseCallback, processAlarm, finishAssistant, args = this.controller.args, stats = { events: 0, written: 0, count: 0, fileSize: 0 },
		config = args, fileStream, query = {}, newAlarms = [];
	log("args: " + JSON.stringify(args));
	finishAssistant = function (result) {
		finishAssistant_global({outerFuture: outerFuture, result: result});
		logSubscription = undefined; //delete subscription.
	};
	log("Future: " + JSON.stringify(outerFuture.result));

	if (!startAssistant({outerFuture: outerFuture, run: this.run.bind(this) })) {
		delete outerFuture.result;
		if (subscription) {
			logSubscription = subscription; //cool, seems to work. :)
			logToApp("Export already running, connecting output to app.");
		}
		return;
	}

	processAlarm = function (alarm) {
		if (alarm && alarm.alarmTrigger && alarm.alarmTrigger.value) {
			logToApp("Converting value to upper case");
			alarm.alarmTrigger.value = alarm.alarmTrigger.value.toUpperCase() + " U";
			if (!alarm.action) {
				alarm.action = "DISPLAY";
			} else {
				alarm.action = alarm.action.toUpperCase();
			}
			newAlarms.push(alarm);
		}
	};

	databaseCallback = function (future) {
		try {
			var r = future.result, i, line, fileStats;
			if (r.returnValue === true) {
				for (i = 0; i < r.results.length; i += 1) {
					/*delete r.results[i]._sync;
					delete r.results[i].uri;
					delete r.results[i].finished;
					delete r.results[i].originalDtstart;
					delete r.results[i].uploadFailed;
					delete r.results[i].etag;
					delete r.results[i].eventDisplayRevset;
					delete r.uId;
					delete r.floating;
					delete r.endValidity;
					if (r.results[i].alarms) {
						newAlarms = [];
						r.results[i].alarms.forEach(processAlarm);
						r.results[i].alarms = newAlarms;
					}
					if (nodejsMajorVersion < 4) { //necessary only on phones, will break stuff on TP.
						if (r.results[i].note) {
							r.results[i].note = quote(r.results[i].note);
						}
						if (r.results[i].subject) {
							r.results[i].subject = quote(r.results[i].subject);
						}
					}*/
					line = this.processEvents(r.results[i]);
					//line = line.replace(/TRIGGER:/g, "TRIGGER;VALUE=DURATION:"); //repair triggers
					stats.events += 1;
					fileStream.write(line);
				}
				//only the first count tells me how many messages there are...
				if (!stats.count) {
					stats.count = r.count;
				}
				logToApp("Exported\t" + stats.events + " / " + stats.count);

				//if there are more, call find again.
				if (stats.events !== r.count && r.results.length && r.next) {
					query.page = r.next;
					DB.find(query, false, true).then(this, databaseCallback);
				} else {
					//we are finished. give back control to app.
					fileStream.write(this.getFooter());
					fileStream.end();
					fileStats = fs.statSync("/media/internal/" + config.filename);
					stats.fileSize = fileStats.size;
					log("Success, returning to client");
					finishAssistant({ finalResult: true, success: true, reason: "All went well", stats: stats});
				}
			} else {
				log("Got database error:" + JSON.stringify(r));
				finishAssistant({ finalResult: true, success: false, reason: "Database Failure: " + r.errorCode + " = " + r.errorText});
			}
		} catch (e) {
			log("Got database error:" + JSON.stringify(e));
			finishAssistant({
				finalResult: true,
				success: false,
				reason: "Database Failure: " + (e ? e.name : "undefined") + " = " + (e ? e.message : "undefined")
			});
		}
	};

	logSubscription = subscription;
	if (!config.filename) {
		config.filename = "events.ics";
	}
	fileStream = fs.createWriteStream("/media/internal/" + config.filename, {flags: "w"});
	fileStream.write(this.getHeader());
	query.from = "com.palm.calendarevent:1";
	query.limit = 10;
	query.incDel = false;
	log("Calling DB.find for the first time.");
	DB.find(query, false, true).then(this, databaseCallback);

	return outerFuture;
};
