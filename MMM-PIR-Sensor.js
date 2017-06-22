/* global Module */

/* Magic Mirror
 * Module: MMM-PIR-Sensor
 *
 * by Jeff Clarke
 * https://github.com/jclarke0000/MMM-PIR-Sensor
 *
 * Forked version of Paul-Vincent Roll's
 * original at http://paulvincentroll.com
 *
 * MIT Licensed.
 */

"use strict";

Module.register("MMM-PIR-Sensor",{

	requiresVersion: "2.1.0",

	defaults: {
		sensorPIN: 17,
    screenSaverDelay: 60, //1 minute
    powerOffDelay: 300    //5 minutes
	},

  screenStates: ["OFF","SCREENSAVER","ON"],

	socketNotificationReceived: function(notification, payload) {
		if (notification === "SCREEN_STATE_CHANGE") {
      /*
        Broadcasts change of screen state to all running modules.
        Translates numeric value to string for consumption by 
        other modules.
      */
			this.sendNotification(notification, this.screenStates[payload]);
		}
	},

	notificationReceived: function(notification, payload) {
		if (notification === "SET_SCREEN_STATE") {
      /* 
        Reception of a request from another module to explicitly
        set the screen state to one of the following:
        "OFF", "SCREENSAVER", "ON"
      */
			this.sendSocketNotification(notification, payload);
		}
	},

	start: function() {
		Log.info("Starting module: " + this.name);
    this.sendSocketNotification("CONFIG", this.config);
	}

});
