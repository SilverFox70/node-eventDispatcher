# Guide | EventDispatcher

## Purpose of EventDispatcher
EventDispatcher is a lightweight 'broadcaster' implementation of a "publish-subscribe" _Event Driven Architecture_ pattern. The Event Dispatcher itself acts as the hub to which all components subscribe to. When events occur, the Event Dispatcher notifies all subscribers. The EventDispatcher itself has no direct of who is emitting or listening to events.s

## API
Given the following:
```Javascript
var eventSystem = require('./eventDispatcher');
var events = eventSystem.eventDispatcher;
```

```events.on(eventName, callback)``` - subscribes to event of *eventName* and set the callback function as *callback*. If an event of the given name already exists, then the callback will be appended to the list of subscribers to that event in EventDispatcher. If the given event name does not exist yet, it will be created.

```events.emit(eventName, data, context)``` - notifies all subscribers that _eventName_ has occured, invoking all subscribed callbacks associated with that event. The **data** can be a single argument, an array of arguments, or an object. **Context** allows you to define the _this_ identifier for use in the subscribed functions that are called.

```events.once(eventName,callback)``` - subscribes to an event and invokes the callback function only once. Once the function is invoked, eventDispatcher removes the callback from the event using the ```off``` function internally.

```events.off(eventName, existingCallback)``` -  unsubscribes the _existingCallback_ from the event of _eventName_.

```events.unsubscribeAll(eventName)``` - removes all subscribed callbacks from the given event and deletes that _eventName_ event from EventDispatcher.

```events.getEventNames()``` - returns an array of event names that are registered with EventDispatcher.

```events.getSubscriberFunctionsByEventName(eventName)``` - returns an array of all functions associated with the given event.

```events.isValidEvent(eventName)``` - returns **true** if there is an event of the given name registered, and **false** otherwise.

```events.hasListenersOnEvent(eventName)``` - returns **true** if the given event is being listened to, and **false** otherwise.

```events.eventLog()``` - returns an event log json object that contains a wealth of data about all events registered and called.

```events.eventLoggerOn()``` - turn on the internal event logger (default is that the logger is *off*).

```events.eventLoggerOff()``` - turn the internal event logger off.

```events.eventLoggerIsOn()``` - returns **true** if the event logger is *on*, and **false** if the logger is *off*.

```events.getAllSubscribedFunctions()``` - returns an object that contains every event name and every callback function associated with that event. For example, see the code below:
```Javascript
var list = events.getAllSubscribedFunctions();
var listKeys = Object.keys(list);
listKeys.forEach(function(key){
  console.log("event name: " + key);
  list[key].forEach(function(fn){
    console.log(fn.name + ' = ' + fn);
  })
});
```
Would log the following type of output to the console:
```Bash
event name: messaging
sendMessage = function (msg){
  console.log(msg);
}
anotherMsg = function (){
  console.log("Another message");
}
event name: alert
myAlert = function (warn){
  console.log(warn);
}
```
