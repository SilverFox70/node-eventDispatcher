
var eventDispatcher = function(){
  'use strict';
  var shortid = require('shortid');
  var eventSubscribers = {};
  var loggerOn = false;

  var eventLogger = function(){
    var eventLogs = {};

    var baseEvent = function(eventName){
      var sid = shortid.generate();
      var timestamp = Date.now();
      eventLogs[sid] = {"timestamp" : timestamp,
                           "event" : eventName};
      return eventLogs[sid];
    }

    var onEvent = function(eventName, callback, isNew){
      var eventLog = baseEvent(eventName); 
      eventLog.action = 'on';
      eventLog.callbackName = callback.name;
      eventLog.callback = callback.toString();
      if (isNew){
        eventLog.isNewEvent = true;
      }
    }

    var onceEvent = function(eventName, callback, isNew){
      var eventLog = baseEvent(eventName); 
      eventLog.action = 'once';
      eventLog.callbackName = callback.name;
      eventLog.callback = callback.toString();
      if (isNew){
        eventLog.isNewEvent = true;
      }
    }

    var emitEvent = function(eventName, data, context, subscribedFunctions){
      var eventLog = baseEvent(eventName);
      eventLog.action = 'emit';
      eventLog.data = data;
      eventLog.context = context;
      eventLog.functionsCalled = [];
      subscribedFunctions.forEach(function(callback){
        eventLog.functionsCalled.push({"functionName" : callback.name, "functionScript" : callback.toString()});
      });
    }

    var offEvent = function(eventName, existingCallback){
      var eventLog = baseEvent(eventName);
      eventLog.action = 'off';
      if (existingCallback.doOnce){
        eventLog.existingCallback = {};
        eventLog.existingCallback.doOnce = true;
        eventLog.existingCallback.fn = existingCallback.fn.toString();
      }
      eventLog.existingCallback = existingCallback;
    }

    var unsubscribeAllEvent = function(eventName){
      var eventLog = baseEvent(eventName);
      eventLog.action = 'unsubscribeAll';
    }

    var noSuchEvent = function(eventName){
      var eventLog = baseEvent(eventName);
      eventLog.warning = 'No event: ' + eventName + ' was found!';
    }

    var noSuchCallback = function(callback){
      var eventLog = baseEvent('#OFF is looking for existing callback');
      eventLog.warning = 'No callback: ' + callback + ' was found!';
    }

    var getEventLogs = function(){
      return eventLogs;
    }

    return {
      onEvent,
      onceEvent,
      emitEvent,
      offEvent,
      unsubscribeAllEvent,
      getEventLogs,
      noSuchEvent,
      noSuchCallback
    }

  }(); // end eventLogger

  return {
    on : function(eventName, callback){
      var subscribers = eventSubscribers[eventName];

      if (typeof subscribers === 'undefined'){
        subscribers = eventSubscribers[eventName] = [];
        if (loggerOn) { 
          eventLogger.onEvent(eventName, callback, true);
        }
      } else {
        if (loggerOn) { 
          eventLogger.onEvent(eventName, callback, false);
        }
      }

      subscribers.push(callback);
    },

    once : function(eventName, callback){
      var subscribers = eventSubscribers[eventName];
      if (loggerOn) {
        eventLogger.onceEvent(eventName, callback);
      }

      if (typeof subscribers === 'undefined'){
        subscribers = eventSubscribers[eventName] = [];
        if (loggerOn) {
          eventLogger.onceEvent(eventName, callback, true);
        }
      } else {
        if (loggerOn) {
          eventLogger.onceEvent(eventName, callback, false);
        }
      }

      subscribers.push({doOnce: true, fn: callback});
    },

    emit : function(eventName, data, context){
      var subscribers = eventSubscribers[eventName];
      var i;
      var subscribedFunctionsList = [];
      

      if (typeof subscribers === 'undefined') {
        if (loggerOn) {
          eventLogger.emitEvent(eventName, data, context, subscribedFunctionsList);
        }
        return; // Nothing to do, abort
      }
      data = (data instanceof Array) ? data : [data];

      for (i = 0; i < subscribers.length; i++){
        if (subscribers[i].doOnce){
          subscribedFunctionsList.push(subscribers[i].fn); // for logging use
          subscribers[i].fn.apply(context, data);
          this.off(eventName, subscribers[i]);
        } else {
          subscribedFunctionsList.push(subscribers[i]);    // for logging use
          subscribers[i].apply(context, data);
        }
      }
      // console.log("!--------- logger is on: " + loggerOn);
      if (loggerOn) {
        eventLogger.emitEvent(eventName, data, context, subscribedFunctionsList);
      }
    },

    off : function(eventName, existingCallback){
      var subscribers = eventSubscribers[eventName];
      if (loggerOn) {
        eventLogger.offEvent(eventName, existingCallback);
      }

      if (typeof subscribers === 'undefined') {
        if (loggerOn) {
          eventLogger.noSuchEvent(eventName);
        }
        return; // nothing to do
      }
      
      var callbackIndex = subscribers.indexOf(existingCallback);

      if (callbackIndex === -1) {
        if (loggerOn) {
          eventLogger.noSuchCallback(existingCallback);
        }
        return; // nothing to do
      }

      subscribers.splice(callbackIndex, 1);

    },

    unsubscribeAll : function(eventName){
      if (loggerOn) eventLogger.unsubscribeAllEvent(eventName);

      try {

        if (typeof eventSubscribers[eventName] === 'undefined'){
          if (loggerOn) {
            eventLogger.noSuchEvent(eventName);
          }
          throw new ReferenceError('No such event: ' + eventName + ' exists', 'eventDispatcher.js', 46);
        }
        return delete eventSubscribers[eventName];

      } catch(err){
        eventLogs[sid].error = err;
        console.error(err);
        return false;
      }
    },

    getSubscriberFunctionsByEventName : function(eventName){
      return eventSubscribers[eventName];
    },

    getEventNames : function(){
      return Object.keys(eventSubscribers);
    },

    getAllSubscribedFunctions : function(){
      var list = {};
      var eventNames = this.getEventNames();
      eventNames.forEach(function(event){
        var functionsList = [];
        eventSubscribers[event].forEach(function(callback){
          if (callback.doOnce){
            var localFunction = callback.fn;
            functionsList.push(JSON.stringify({once: callback.doOnce, fn: localFunction}, null, '  '));
          } else {
          functionsList.push(callback);
          }
        });

        list[event] = functionsList;
      });
      return list;
    },

    isValidEvent : function(eventName){
      var subscribers = eventSubscribers[eventName];
      if (typeof subscribers === 'undefined'){
        return false;
      } else {
        return true;
      }
    },

    hasListenersOnEvent : function(eventName){
      return (typeof eventSubscribers[eventName] === 'undefined' || eventSubscribers[eventName].length === 0) ? false : true;
    },

    eventLog : function(){
      return eventLogger.getEventLogs();
    },

    eventLoggerOn : function(){
      loggerOn = true;
    },

    eventLoggerIsOn : function(){
      return loggerOn;
    },

    eventLoggerOff : function(){
      loggerOn = false;
    }

  }

}();

module.exports = { eventDispatcher: eventDispatcher};