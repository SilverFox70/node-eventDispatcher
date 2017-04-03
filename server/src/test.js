'use strict';

var eventSystem = require('./eventDispatcher');
var web = require('./www');
var util = require('util');
// Below is all just scratch tests for the eventDispatcher

var events = eventSystem.eventDispatcher;

var displayResponse = function(res){
	var response = res;
	console.log("from GET: " + response);
}

var sendMessage = function(msg){
  console.log(msg);
}

var anotherMsg = function(){
  console.log("Another message");
};

var myAlert = function(warn){
  console.log(warn);
}

var oneShot = function(){
  console.log('Single shot function');
}

events.on('messaging', sendMessage);
events.on('messaging', anotherMsg);
events.on('alert', myAlert);
events.on('getComplete', displayResponse);
events.once('oneshot', oneShot);

events.emit('messaging', "Hello world");
events.emit('alert', 'My warning');
events.emit('messaging', "Goodbye!");
events.emit('alert', 'exiting now...');
events.emit('get', 'http://ip.jsontest.com/');
events.emit('oneshot');
// events.emit('oneshot');

console.log('---------------------------------------');
var subscribedFunctions = events.getSubscriberFunctionsByEventName("alert");
console.log('Subscribed functions by event name (Alert):');
subscribedFunctions.forEach(function(fun){
  console.log(fun.name + ' = ' + fun.toString());
});

console.log('---------------------------------------');

var subscribedEvents = events.getEventNames();
console.log(JSON.stringify(subscribedEvents, null, '  '));

console.log('---------------------------------------');
console.log('All subscribed functions:');
var list = events.getAllSubscribedFunctions();
console.log(JSON.stringify(list, null, '  '));

console.log('---------------------------------------');

var listKeys = Object.keys(list);
listKeys.forEach(function(key){
  console.log("event name: " + key);
  list[key].forEach(function(fn){
    console.log(fn.name + ' = ' + fn);
  })
});

console.log('---------------------------------------');
console.log("is 'messaging' a valid event: ", events.isValidEvent('messaging'));
// console.log('unsubscribeAll:');
console.log('unsubscribe messaging, anotherMsg: ', events.off('messaging', anotherMsg));
// console.log('unsubscribe bunnyhop: ', events.unsubscribeAll('bunnyhop'));
console.log("is 'messaging' a valid event: ", events.isValidEvent('messaging'));
console.log("is 'foobar' a valid event: ", events.isValidEvent('foobar'));
console.log('has listeners on oneshot:', events.hasListenersOnEvent('oneshot'));
console.log('what listeners on oneshot:', events.getSubscriberFunctionsByEventName('oneshot'));
console.log(JSON.stringify(events.eventLog(), null, '  '));
