'use-strict';

const fileLoader = require('./fileLoader').fileLoader;

var clc = require('cli-color');
var yellow = clc.yellow;
var cyan = clc.cyan;
var mag = clc.magenta;

var createEventList = function(eventNodeList){
  var eventList = {};
  eventNodeList.files.forEach(function(file){
    file.subscribedEvents.forEach(function(subscribedEvent){
      var sevent = subscribedEvent.eventName;
      console.log("eventName: " + sevent);
      if (!eventList[sevent]){
        eventList[sevent] = [];
      }
      eventList[sevent].push({functionName: subscribedEvent.callback, 
                              file: file.fileName, 
                              once: subscribedEvent.once, 
                              line: subscribedEvent.line});
    });
  });
  console.log(clc.green(JSON.stringify(eventList, null, '  ')));
}

var findOnEventNameAndCallback = function(line, index, lineNumber, doOnce){
  var openP = line.indexOf('(', index);
  var closeP = line.indexOf(')', openP);
  var substr = line.substring(openP +1, closeP);
  var rawEventandCB = [];

  substr.split(',').forEach(function(part){
    rawEventandCB.push(part.trim().replace(/(\'|\"")/g, ''));
  });

  console.log(yellow('eventName: ') + cyan(rawEventandCB[0]) + yellow('\tcallback: ') + cyan(rawEventandCB[1]));
  return { eventName: rawEventandCB[0], callback: rawEventandCB[1], once: doOnce,line: lineNumber };
}

var findEmitEventsandArgs = function(line, index, lineNumber){
  var openP = line.indexOf('(', index);
  var closeP = line.indexOf(')', openP);
  var substr = line.substring(openP +1, closeP);
  var rawEmitandData = [];

  substr.split(',').forEach(function(part){
    rawEmitandData.push(part.trim().replace(/(\'|\"")/g, ''));
  });

  console.log(mag('eventName: ') + cyan(rawEmitandData[0]) + mag('\tdata: ') + cyan(rawEmitandData[1]));
  return { eventName: rawEmitandData[0], data: rawEmitandData[1], line: lineNumber };
}

fileLoader.getFileList(__dirname).then(function(files){
  
  files.forEach(function(file){
    console.log(file);
  });

  fileLoader.createFilesObject(files).then(function(rawfiles){
    var eventNodeMap = {};
    eventNodeMap.files = [];
    rawfiles.forEach(function(rawfile){
      if (rawfile.fileName === 'eventDispatcher.js' || rawfile.fileName === 'eventNodeMap.js') return;
      console.log('-----------------------------------------------------');
      console.log(clc.bold(rawfile.fileName));

      var fileEventMap = {};
      fileEventMap.fileName = rawfile.fileName;
      fileEventMap.subscribedEvents = [];
      fileEventMap.invokedEvents = [];

      var lines = rawfile.fileText.split('\n');
      for(var i = 0; i < lines.length ; i++){

        var index = lines[i].indexOf('.on');
        if ( index !== -1){
          // if this is not a case of 'once', log as 'on'
          if (lines[i].indexOf('.once') === -1){
            fileEventMap.subscribedEvents.push(findOnEventNameAndCallback(lines[i], index, i+1, false));
          } else {
            fileEventMap.subscribedEvents.push(findOnEventNameAndCallback(lines[i], index, i+1, true));
          }

        }

        var index2 = lines[i].indexOf('.emit');
        if (index2 !== -1){
          fileEventMap.invokedEvents.push(findEmitEventsandArgs(lines[i], index2, i+1));
        }

        console.log( clc.blackBright((i+1) + ' : ') + lines[i]);
      } // End for...loop

      eventNodeMap.files.push(fileEventMap);
    }); // end forEach

    console.log(clc.blueBright(JSON.stringify(eventNodeMap, null, '  ')));
    createEventList(eventNodeMap);
  }); // end createFilesObject

});


