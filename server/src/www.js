'use strict';
var request = require('request');
var eventSystem = require('./eventDispatcher');
var events = eventSystem.eventDispatcher;

var www = function(){
	var get = function(url){
		console.log('Inside the get request.....');
		var res;
		request(url, function(error, response, body){
			if (error){
				res = error;
			} else {
				res = body;
			}
			events.trigger('getComplete', res);
		});
	};

	events.subscribe('get', get);
	
}();

module.exports = {www: www};