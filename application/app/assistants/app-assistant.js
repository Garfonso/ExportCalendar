/*jslint sloppy: true */
/*global log, logGUI, logStatus, $L, Mojo, AppAssistant, PalmCall, config */

function AppAssistant(appController) {
	var request = new Mojo.Service.Request("palm://com.palm.db",
		{
			method: "putPermissions",
			parameters:
				{
					permissions: [{
						type: "db.kind",
						object: "com.palm.calendarevent:1",
						caller: "info.mobo.*",
						operations: { read: "allow" }
					}]
				},
			onSuccess: function () { Mojo.Log.error("DB permission granted successfully!"); },
			onFailure: function () { Mojo.Log.error("DB failed to grant permissions!"); }
		});
}

function email() {
	var request = new Mojo.Service.Request("palm://com.palm.applicationManager",
			{
				method: 'open',
				parameters: {
					id: 'com.palm.app.email',
					params: {
						'summary':  "Events",
						'text':   '<html><body>Events exported trom your webos device.</body></html>',
						"attachments": [{
							"fullPath": "/media/internal/" + config.filename,
							"displayName": config.filename,
							"mimeType": "text/plain"
						}]
					}
				}
			});
	return request;
}

//setup menu with email log:
AppAssistant.prototype.MenuModel = { visible: true, items: [ {label: $L("Mail events"), command: "do-log-email" }, {label: $L("Reset service"), command: "do-reset-service"}] };

AppAssistant.prototype.handleCommand = function (event) {
	var stageController = this.controller.getActiveStageController(), currentScene;
	if (stageController && event.type === Mojo.Event.command) {
		currentScene = stageController.activeScene();
		switch (event.command) {
		case 'do-log-email':
			email();
			break;
		case 'do-reset-service':
			currentScene.showAlertDialog({
				onChoose: function (value) {
					if (value === "do") {
						log("Resetting service.");
						PalmCall.call("palm://info.mobo.exportcalendar.service/", "__quit", {});
					}
				},
				title: $L("Are you sure?"),
				message: $L("Please reset the service only, if you are really sure. Only do that if the app hangs for a long time and you are sure that the service is not reacting anymore. Don't disturb a working service, you were warned! Do you really want to reset the service now?"),
				choices: [{
					label: $L("Do it!"),
					value: "do",
					type: 'negative'
				}, {
					label: $L("Cancel"),
					value: "cancel",
					type: 'dismiss'
				}]
			});
			break;
		}
	}
};
