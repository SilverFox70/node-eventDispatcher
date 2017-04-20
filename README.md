# EventDispatcher

## Overview
This is small project centered around creating an *Event Dispatcher* to listen to and route events between modules. It is based on the _Publish-Subscribe_ pattern using the event dispatcher as the broadcaster. The Event Dispatcher itself has no direct knowledge of who is emitting or listening to events. 



## Getting Started
Clone or fork this repository to you local machine. Navigate to the root and run ```npm install``` to install dependencies. To see the current tests of the broadcaster, try ```npm run main```.



## eventDispatcher
In any script, simply ```require('./eventDispatcher');```. This will give you the ability to subscribe to events, set callbacks for events, and send events (triggers) to the dispatcher.


For example:
```JavaScript
var eventSystem = require('./eventDispatcher');
var events = eventSystem.eventDispatcher;

var sendMessage = function(msg){
  console.log(msg);
}

events.on('alert', sendMessage);

events.emit('alert', 'Sending an alert!');
```


Subscribing takes the following form: 

`eventDispatcher.on(eventName, callback);`

eventName is the name of the event you wish to listen for, and
callback is the function to execute when this event is called.

Triggering an event requires at least the _eventName_, but the whole form accepts the following:

```eventDispatcher.emit(eventName, args, context_);```

Optional arguments can be passed in _args_ to the event but must be an array or object, and _context_ defines the _this_ scope of the callback function set when subscribed.

Unsubscribing a single event can be done like so:

```eventDispatcher.off(eventName, existingCallback);```

To unsubscribe all callbacks from a given event use:

```eventDispatcher.unsubscribeAll(eventName);``` 

## To Do:
Currently, if you subscribe using `events.on(eventName, callback)` and there is already an existing callback of the same name registered to *eventName* unexpected behavior could occur. This needs to be tested.

## Modules
The examples here use the 'Request' module for making http requests. If you get an error that this module cannot be found, double check that you have run ```npm install``` at the root.