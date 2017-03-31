var fileLoader = function(){
	'use-strict';
  const fs = require('fs');

  var fileList = function(path){
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
      fs.readFile(__dirname + '/' + file, function(err, data){
        if (err) {
          reject(err);
        }
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

  return {
    fileList,
    getFileData : function(){
      this.fileList(__dirname).then(function(filelist){
        return createFilesObject(filelist);
      })
    }
  }

}();

var allfiles = fileLoader.getFileData().then(function(allfiles){
  console.log(JSON.stringify(allfiles, null, '  '));
});
// --------------------------------------------------------
// 'use-strict';
// const fs = require('fs');

// var fileList = function(path){
//   return new Promise(function(resolve, reject){
//     var jsFiles = [];
//     fs.readdir(path, function(err, files){
//       if (err) {
//         console.error(err);
//         reject(err);
//       }
//       files.forEach(function(file){
//         if (file.endsWith('.js')){
//           jsFiles.push(file);
//         }
//       });
//       resolve(jsFiles);
//     });
//   });
// };

// console.log(__dirname);
// fileList(__dirname).then(function(files){
//   files.forEach(function(file){
//     console.log(file);
//   });
// }).catch(function(err){
//     console.error(err);
// });
