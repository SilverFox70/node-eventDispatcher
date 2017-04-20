var myfn = function(){
	'use strict';
  var localval;

	var double = function(val){
    localval = val * 2;
    return this;
  };

  var then = function(callback){
    callback(localval);
    return this;
  };

  var thenAgain = function(callback){
    callback("Hello, again!");
  }

  return {
    double,
    then,
    thenAgain
  }

}();

myfn.double(2).then(function(num){
  console.log(num);
}).thenAgain(function(num2){
  console.log(num2);
});
