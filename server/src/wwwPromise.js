'use strict';
var request = require('request');

var wwwHandler = function(){
	var get = function(url){
		return new Promise(function(resolve, reject){
			request(url, function(error, response, body){

				if (error){
					reject(error);
				} else {
					resolve(body);
				}

			});
		});
	}

	var post = function(url, form){
		return new Promise(function(resolve, reject){
			request({
				uri: url,
				method: post,
				form: form
			}, function(error, response, body){

				if (error){
					reject(error);
				} else {
					resolve(body);
				}

			});
		});
	}

	return {
		get,
		post
	}

}();

module.exports = {wwwHandler: wwwHandler};