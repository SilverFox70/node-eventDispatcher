'use strict';

var eventSystem = require('./eventDispatcher');
var web = require('./www');
var util = require('util');
var events = eventSystem.eventDispatcher;

// Function to be performed after we have the data
var displayResponse = function(res){
  console.log("from GET: ", res);
}

// Using an Event Driven System, we subscribe to a known
// event and set a function to be executed when that event
// occurs. Our 'emitted' event does NOT trigger the 'getComplete'
// event - that is fired from inside www.js
events.on('getComplete', displayResponse);

events.emit('get', 'http://ip.jsontest.com');


// Using Promises...
var web2 = require('./wwwPromise');

web2.wwwHandler.get('http://ip.jsontest.com').then(function(res){
  displayResponse(res);
});

/*--------------------------------------------------------------
  You will notice that you must register all of your event
  listeners in a case like this _before_ you can emit an event
  that will (after some time) call one of those listeners.
--------------------------------------------------------------*/