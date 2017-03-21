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

events.subscribe('messaging', sendMessage);
events.subscribe('messaging', anotherMsg);
events.subscribe('alert', myAlert);
events.subscribe('getComplete', displayResponse);

events.trigger('messaging', "Hello world");
events.trigger('alert', 'My warning');
events.trigger('messaging', "Goodbye!");
events.trigger('alert', 'exiting now...');
events.trigger('get', 'http://ip.jsontest.com/');

var subscribedFunctions = events.getSubscriberFunctionsByEventName("alert");

subscribedFunctions.forEach(function(fun){
  console.log(fun.toString());
});

console.log('---------------------------------------');

var subscribedEvents = events.getEventNames();
console.log(JSON.stringify(subscribedEvents, null, '  '));

console.log('---------------------------------------');

var list = events.getAllSubscribedFunctions();
console.log(JSON.stringify(list, null, '  '));

console.log('---------------------------------------');

var listKeys = Object.keys(list);
listKeys.forEach(function(key){
  console.log("key: " + key + " = " + list[key]);
});



