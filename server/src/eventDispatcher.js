
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

    emit : function(eventName, data, context){
      var subscribers = eventSubscribers[eventName];
      var i;

      if (typeof subscribers === 'undefined') return; // Nothing to do, abort

      data = (data instanceof Array) ? data : [data];

      for (i = 0; i < subscribers.length; i++){
        subscribers[i].apply(context, data);
      }
    },

    off : function(eventName, existingCallback){
      var subscribers = eventSubscribers[eventName];
      var callbackIndex;

      if (typeof subscribers === 'undefined') return; // nothing to do
      
      callBackIndex = subscribers.indexOf(existingCallback);

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
        var fctns = eventSubscribers[event].toString();
        // var fctns = JSON.stringify(eventSubscribers[event].toString(), null, '  ');
        list[event] = fctns;
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