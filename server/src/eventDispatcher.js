
var eventDispatcher = function(){
  'use strict';
  var shortid = require('shortid');
  var eventSubscribers = {};

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
      eventLog.action = "on";
      eventLog.callbackName = callback.name;
      eventLog.callback = callback.toString();
      if (isNew){
        eventLog.isNewEvent = true;
      }
    }

    var onceEvent = function(eventName, callback, isNew){
      var eventLog = baseEvent(eventName); 
      eventLog.action = "once";
      eventLog.callbackName = callback.name;
      eventLog.callback = callback.toString();
      if (isNew){
        eventLog.isNewEvent = true;
      }
    }

    var emitEvent = function(eventName, data, context){
      var eventLog = baseEvent(eventName);
      eventLog.action = "emit";
      eventLog.data = data;
      eventLog.context = context;
    }

    var offEvent = function(eventName, existingCallback){
      var eventLog = baseEvent(eventName);
      eventLog.action = "off";
      eventLog.existingCallback = existingCallback;
    }

    var unsubscribeAllEvent = function(eventName){
      var eventLog = baseEvent(eventName);
      eventLog.action = "unsubscribeAll";
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
      getEventLogs
    }

  }();

  return {
    on : function(eventName, callback){
      var subscribers = eventSubscribers[eventName];

      if (typeof subscribers === 'undefined'){
        subscribers = eventSubscribers[eventName] = [];
        eventLogger.onEvent(eventName, callback, true);
      } else {
        eventLogger.onEvent(eventName, callback, false);
      }

      subscribers.push(callback);
    },

    once : function(eventName, callback){
      var subscribers = eventSubscribers[eventName];
      eventLogger.onceEvent(eventName, callback);

      if (typeof subscribers === 'undefined'){
        subscribers = eventSubscribers[eventName] = [];
        eventLogger.onceEvent(eventName, callback, true);
      } else {
        eventLogger.onceEvent(eventName, callback, false);
      }

      subscribers.push({doOnce: true, fn: callback});
    },

    emit : function(eventName, data, context){
      var subscribers = eventSubscribers[eventName];
      var i;
      eventLogger.emitEvent(eventName, data, context);

      eventLogs[sid].functions = [];
      if (typeof subscribers === 'undefined') return; // Nothing to do, abort

      data = (data instanceof Array) ? data : [data];

      for (i = 0; i < subscribers.length; i++){
        if (subscribers[i].doOnce){
          eventLogs[sid].doOnce = "true";
          eventLogs[sid].functions.push(subscribers[i].fn.toString());
          subscribers[i].fn.apply(context, data);
          this.off(eventName, subscribers[i]);
        } else {
          eventLogs[sid].functions.push(subscribers[i].toString());
          subscribers[i].apply(context, data);
        }
      }
    },

    off : function(eventName, existingCallback){
      var subscribers = eventSubscribers[eventName];
      eventLogger.offEvent(eventName, existingCallback);

      if (typeof subscribers === 'undefined') {
        eventLogs[sid].result = "No event: " + eventName + " was found!";
        return; // nothing to do
      }
      
      var callbackIndex = subscribers.indexOf(existingCallback);

      if (callbackIndex === -1) {
        eventLogs[sid].result = "No callback: " + existingCallback + " found!";
        return; // nothing to do
      }

      subscribers.splice(callbackIndex, 1);
      eventLogs[sid].result = callbackFunction + " was deregistered";

    },

    unsubscribeAll : function(eventName){
      eventLogger.unsubscribeAllEvent(eventName);

      try {

        if (typeof eventSubscribers[eventName] === 'undefined'){
          eventLogs[sid].result = "No such event: '" + eventName + "' exists to unsubscribe from.";
          throw new ReferenceError("No such event: '" + eventName + "' exists", 'eventDispatcher.js', 46);
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
    }

  }

}();

module.exports = { eventDispatcher: eventDispatcher};