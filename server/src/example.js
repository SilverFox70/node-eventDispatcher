'use strict';

var eventSystem = require('./eventDispatcher');
var web = require('./www');
var util = require('util');
var events = eventSystem.eventDispatcher;

var displayResponse = function(res){
	var response = res;
  console.log("from GET: ", response);
}

events.on('getComplete', displayResponse);

events.emit('get', 'http://ip.jsontest.com');


// Using Promises
var web2 = require('./wwwPromise');

web2.wwwHandler.get('http://ip.jsontest.com').then(function(res){
  displayResponse(res);
});