# Event Driven Design

## Overview
This is small project centered around creating an *Event Dispatcher* to listen to and route events between modules.

## eventDispatcher
In any script, simply ```require('./eventDispatcher');```. This will give you the ability to subscribe to events, set callbacks for events, and send events (triggers) to the dispatcher.

For example:
```
var eventSystem = require('./eventDispatcher');
var events = eventSystem.eventDispatcher;

var sendMessage = function(msg){
  console.log(msg);
}

events.subscribe('alert', sendMessage);

events.trigger('alert', 'Sending an alert!');
```

Subscribing takes the following form: 

```eventDispatcher.subscribe(_eventName_, _callback_);```

_eventName_ is the name of the event you wish to listen for, and
_callback_ is the function to execute when this event is called.

Trigger an event requires at least the _eventName_, but the whole form accepts the following:

```eventDispatcher.trigger(_eventName_, _args_, _context_);```

Optional arguments can be passe in _args_ to the event, and _context_ defines the _this_ scope of the callback function defined when subscribed.