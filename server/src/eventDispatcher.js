
var eventDispatcher = function(){
  'use strict';
  var shortid = require('shortid');
  var eventSubscribers = {};
  var eventLogs = {};

  return {
    on : function(eventName, callback){
      var subscribers = eventSubscribers[eventName];
      var sid = shortid.generate();
      var timestamp = Date.now();
      eventLogs[sid] = {"timestamp" : timestamp, 
                        "action" : "on", 
                        "eventName" : eventName, 
                        "callback" : callback.toString()};

      if (typeof subscribers === 'undefined'){
        subscribers = eventSubscribers[eventName] = [];
        eventLogs[sid].isNewEvent = "true";
      }

      subscribers.push(callback);
    },

    once : function(eventName, callback){
      var subscribers = eventSubscribers[eventName];
      var sid = shortid.generate();
      var timestamp = Date.now();
      eventLogs[sid] = {"timestamp" : timestamp, 
                        "action" : "on", 
                        "eventName" : eventName, 
                        "callback" : callback.toString(),
                        "doOnce" : "true"};

      if (typeof subscribers === 'undefined'){
        subscribers = eventSubscribers[eventName] = [];
        eventLogs[sid].isNewEvent = "true";
      }

      subscribers.push({doOnce: true, fn: callback});
    },

    emit : function(eventName, data, context){
      var subscribers = eventSubscribers[eventName];
      var i;
      var sid = shortid.generate();
      var timestamp = Date.now();
      eventLogs[sid] = { "timestamp" : timestamp, 
                         "action" : "emit", 
                         "event" : eventName, 
                         "data" : data, 
                         "context" : context};

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
      var timestamp = Date.now();
      var sid = shortid.generate();
      var callbackFunction = existingCallback.doOnce ? existingCallback.fn : existingCallback;
      eventLogs[sid] = { "timestamp" : timestamp,
                         "action" : "off", 
                         "event" : eventName, 
                         "existingCallback" : callbackFunction};

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
      var sid = shortid.generate();
      var timestamp = Date.now(); 
      eventLogs[sid] = {"timestamp" : timestamp,
                        "action" : "unsubscribeAll", 
                        "eventName" : eventName};

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
            var localFunction = callback.fn.toString();
            functionsList.push(JSON.stringify({once: callback.doOnce, fn: localFunction}, null, '  '));
          } else {
          functionsList = callback.toString();
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
      return eventLogs;
    }

  }

}();

module.exports = { eventDispatcher: eventDispatcher};