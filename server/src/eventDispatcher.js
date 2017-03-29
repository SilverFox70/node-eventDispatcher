
var eventDispatcher = function(){
  'use strict';
  var eventSubscribers = {};

  return {
    on : function(eventName, callback){
      var subscribers = eventSubscribers[eventName];

      if (typeof subscribers === 'undefined'){
        subscribers = eventSubscribers[eventName] = [];
      }

      subscribers.push(callback);
    },

    once : function(eventName, callback){
      var subscribers = eventSubscribers[eventName];

      if (typeof subscribers === 'undefined'){
        subscribers = eventSubscribers[eventName] = [];
      }

      subscribers.push({doOnce: true, fn: callback});
    },

    emit : function(eventName, data, context){
      var subscribers = eventSubscribers[eventName];
      var i;

      if (typeof subscribers === 'undefined') return; // Nothing to do, abort

      data = (data instanceof Array) ? data : [data];

      for (i = 0; i < subscribers.length; i++){
        if (subscribers[i].doOnce){
          subscribers[i].fn.apply(context, data);
          this.off(eventName, subscribers[i]);
        } else {
          subscribers[i].apply(context, data);
        }
      }
    },

    off : function(eventName, existingCallback){
      var subscribers = eventSubscribers[eventName];

      if (typeof subscribers === 'undefined') return; // nothing to do
      
      var callbackIndex = subscribers.indexOf(existingCallback);

      if (callbackIndex === -1) return; // nothing to do

      subscribers.splice(callbackIndex, 1);

    },

    unsubscribeAll : function(eventName){
      try {

        if (typeof eventSubscribers[eventName] === 'undefined'){
          throw new ReferenceError("No such event: '" + eventName + "'' exists", 'eventDispatcher.js', 46);
        }
        return delete eventSubscribers[eventName];

      } catch(err){

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
    }

  }

}();

module.exports = { eventDispatcher: eventDispatcher};