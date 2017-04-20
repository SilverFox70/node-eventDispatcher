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
			events.emit('getComplete', res);
		});
	};

	var post = function(url, form){
		request({
			uri: url,
			method: post,
			form: form
		}, function(error, response, body){
			events.emit('postComplete', body);
		});
	}

	events.on('get', get);
	events.on('post', post);
	
}();

module.exports = {www: www};