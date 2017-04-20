var fileLoader = function(){
	'use-strict';
  const fs = require('fs');

  var getFileList = function(path){
    return new Promise(function(resolve, reject){
      var jsFiles = [];
      fs.readdir(path, function(err, files){
        if (err) {
          reject(err);
        }
        files.forEach(function(file){
          if (file.endsWith('.js')){
            jsFiles.push(file);
          }
        });
        resolve(jsFiles);
      });
    });
  };

  var readFile = function(file){
    return new Promise(function(resolve, reject){
      fs.readFile(__dirname + '/' + file, function(err, rawFileData){
        if (err) {
          reject(err);
        }
        var data = {};
        data.fileName = file;
        data.fileText = rawFileData.toString();
        resolve(data);
      });
    });
  };

  var createFilesObject = function(filelist){
    var filesObject = {};
    var promises = [];
    filelist.forEach(function(file){
      promises.push(readFile(file));
    });
    return Promise.all(promises);
  };

  // var getFileData = function(){
  //   return new Promise(function(resolve, reject){
  //     this.fileList(__dirname).then(function(filelist){
  //       createFilesObject(filelist).then(function(rawfiles){
  //         resolve(rawfiles);
  //       }).catch(function(err){
  //         console.error(err);
  //         reject(err);
  //       });
  //     }).catch(function(err){
  //       console.error(err);
  //       reject(err);
  //     });
  //   });
  // };

  return {
    createFilesObject,
    getFileList,
    readFile
  }

}();

var clc = require('cli-color');

var yellow = clc.yellow;
var cyan = clc.cyan;

var findOnEventNameAndCallback = function(line, index){
  var openP = line.indexOf('(', index);
  var closeP = line.indexOf(')', openP);
  var substr = line.substring(openP +1, closeP);
  var rawEventandCB = [];
  substr.split(',').forEach(function(part){
    rawEventandCB.push(part.trim().replace(/(\'|\"")/g, ''));
  });
  console.log(yellow('eventName: ') + cyan(rawEventandCB[0]) + yellow('\tcallback: ') + cyan(rawEventandCB[1]));
  return { eventName: rawEventandCB[0], callback: rawEventandCB[1]};
}

fileLoader.getFileList(__dirname).then(function(files){
  files.forEach(function(file){
    console.log(file);
  });
  fileLoader.createFilesObject(files).then(function(rawfiles){
    rawfiles.forEach(function(rawfile){
      console.log('-----------------------------------------------------');
      console.log(rawfile.fileName);

      var fileEventMap = {};
      fileEventMap.file = rawfile.fileName;
      fileEventMap.subscribedEvents = [];

      var lines = rawfile.fileText.split('\n');
      for(var i = 0; i < lines.length ; i++){
        var index = lines[i].indexOf('.on');

        if ( index !== -1){
           fileEventMap.subscribedEvents.push(findOnEventNameAndCallback(lines[i], index));
        }

        console.log( (i+1) + ' : ' + lines[i]);
      }

      console.log(clc.blue(JSON.stringify(fileEventMap, null, '  ')));
    });
  });
});

