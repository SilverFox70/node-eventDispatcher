var fileLoader = function(){
	'use-strict';
  var fs = require('fs');

  var fileList = function(path){
    var jsFiles = []
    fs.readdir(path, function(err, files){
      if (err) return console.error(err);
      files.forEach(function(file){
        if (file.endsWith('.js')){
          jsFiles.push(file);
        }
      });
      return jsFiles;
    });
  }


}();