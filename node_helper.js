/* Magic Mirror
 * Module: MMM-PIR-Sensor
 *
 * by Jeff Clarke
 * https://github.com/jclarke0000/MMM-PIR-Sensor
 *
 * Forked version of Paul-Vincent Roll's
 * original at http://paulvincentroll.com
 */

"use strict";

const NodeHelper = require("node_helper");
const Gpio = require("onoff").Gpio;
const exec = require("child_process").exec;

const screenStates = {
  OFF : 0,
  SCREENSAVER : 1,
  ON : 2
};

var screenState = screenStates.ON;
var screenSaverTimer;
var powerOffTimer;

module.exports = NodeHelper.create({

  start: function () {
    this.started = false;
  },

  screenOn: function(force) {

    /*
      when the "force" flag is set, then CEC "ON" command
      will be sent regardless of current screen state.
    */

    //cancel screensaver
    this.screenSaverOff();

    if (screenState === screenStates.OFF || force === true) {
      //wake from standby
      console.log("powering on TV");
      exec("/home/pi/scripts/tvon.sh");
    }

    screenState = screenStates.ON;

    //restart timers
    this.resetTimers();

    this.broadcastScreenState();
  },

  screenOff: function () {
    if (screenState !== screenStates.OFF) {
      //cancel timer
      clearTimeout(powerOffTimer);

      console.log("powering off TV");
      powerOffTimer = null;

      //put screen into standby
      exec("/home/pi/scripts/tvoff.sh");

      screenState = screenStates.OFF;
      this.broadcastScreenState();
    }
  },

  screenSaverOn: function() {
    clearTimeout(screenSaverTimer);
    screenSaverTimer = null;

    //activate screensaver
    exec("xscreensaver-command -activate");

    screenState = screenStates.SCREENSAVER;
    this.broadcastScreenState();

  },

  screenSaverOff: function() {
    clearTimeout(screenSaverTimer);
    screenSaverTimer = null;

    //cancel screensaver
    exec("xscreensaver-command -deactivate");
  },


  resetTimers: function() {

    console.log("resetting timers");

    var self = this;

    //reset screensaver timer
    clearTimeout(screenSaverTimer);
    screenSaverTimer = setTimeout(function() {
      console.log("Screensaver timeout");
      self.screenSaverOn();
    }, this.config.screenSaverDelay * 1000);

    //reset power off timer
    clearTimeout(powerOffTimer);
    powerOffTimer = setTimeout(function() {
      console.log("Poweroff timeout");
      self.screenOff();
    }, this.config.powerOffDelay * 1000);

  },

  broadcastScreenState: function() {
    this.sendSocketNotification("SCREEN_STATE_CHANGE", screenState);
  },

  // Subclass socketNotificationReceived received.
  socketNotificationReceived: function(notification, payload) {
    if (notification === "CONFIG") {

      this.config = payload;
      console.log("==> Screensaver timeout: " + this.config.screenSaverDelay);
      console.log("==> Poweroff timeout: " + this.config.powerOffDelay);

      if (!this.started) {

        const self = this;

        //Setup pins
        console.log("Enabling PIR Sensor on pin " + this.config.sensorPIN);
        this.pir = new Gpio(this.config.sensorPIN, "in", "both");

        //Detected movement
        this.pir.watch(function(err, value) {
          if (err) {
            throw err;
          } else if (value === 1) {
            console.log("Motion detected");
            self.screenOn();
          }
        });

        //clean up on MM termination
        process.on("SIGINT", function () {
          console.log("[MMM-PIR-Sensor] cleaning up");
          self.pir.unwatchAll();
          self.pir.unexport();
          clearTimeout(screenSaverTimer);
          clearTimeout(powerOffTimer);
          screenSaverTimer = null;
          powerOffTimer = null;
          process.exit();
        });

        this.started = true;        
      }

      //force screen on to start at a known state
      this.screenOn(true);

    } else if (notification === "SET_SCREEN_STATE" && this.started) {

      switch (payload) {
        case "OFF":
          this.screenOff();
          break;
        case "SCREENSAVER":
          this.screenSaverOn();
          break;
        case "ON":
          this.screenOn();
          break;
        default:
          console.log("Unknown screen state: " + payload);
          break;
      } 

    }
  }

});
