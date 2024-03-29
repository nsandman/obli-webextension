# obli-webextension

# Overview

Obli is a powerful platform for interacting with websites through a browser.

For some use cases, a browser extension might fill all of your project's needs. However, this is not true all the time, such as where an extension might need to fill in data that would be unrealistic to calculate on an end user's machine.

Obli solves this problem by providing an easy, modular, abstracted interface between a browser extension (this repository) and a server, which can interface with as many obli scripts as needed.

While some limitations of the WebExtensions API don't allow obli to be a superior platform in _every_ way (for example, files cannot be uploaded to it), it does greatly simplify the process.

As part of this abstraction, some APIs are provided to obli scripts:

# API

Any of these APIs can be called from any obli script at any time.

## TPI
This provides information about the script to itself. Stands for "this project's information" (before obli had actual projects).

### myName
```js
TPI.myName
```
Name of the script as set when saved to obli

```js
TPI.myProject
```
Name of the project this script belongs to. `null` if orphan

```js
TPI.isTesting
```
If your script is running in a debug window, this will be true

## Action
This API provides a simple set of actions for interfacing with the DOM. The following can be called from it:

### click()
```js
Action.click(DOMElement el, function next())
```
Click on DOM element `el`

### setTextValue()
```js
Action.setTextValue(DOMElement el, string val, function next())
```
Set `value` of DOM element `el` to string `val` and dispatch update event 

### setCheckValue()
```js
Action.setCheckValue(DOMElement el, bool val, function next())
```
Set `checked` attribute of checkbox `el` to boolean `val` and dispatch update event 

### clear()
```js
Action.clear(DOMElement el, function next())
```
Set `value` of DOM element `el` to an empty string

## Messenger

This is the API for communicating with an obli dispatcher. It will communicate only with the URL for the dispatcher set in options. Furthermore, it will only listen for messages from, or send messages to, dispatcher modules with your project name (or script's name if an orphan).

### send()

```js
Messenger.send(string method, object data, (nullable)function callback)
```
Emit event `method` to the obli dispatcher with data `data`. `cb` can be a function that takes an object from a potential response, or it can also take no params.

### listen()
```js
Messenger.listen(string method, function cb)
```
Listen for event `method`, and call `cb` with object `data` and optional callback `cb` if it is received.

## DataStore &amp; SharedDataStore

These APIs are both used to store data to the browser store. However, SharedDataStore will create getters and setters that can be accessed from an obli module.

The getter/setter events for hypothetical SharedDataStore key `key` would be:

```js
// getter
event: get_key
// returns 
{"key": value}

// setter
event: set_key
data: {"value": val}
``` 

### saveKey
```js
DataStore.saveKey(string key, obj val, function next)
```
Save a single key `key` with value `val`, then call `next()`

### saveKeys
```js
options = {
	"key": "val",
	"foo": "bar"
}
DataStore.saveKeys(object options, function next)
```
Save all key-val pairs in options, then call `next()`

### getKeys
```js
DataStore.getKeys(string keys, function(results))
DataStore.getKeys(string[] keys, function(results))
```
Get key or keys, and have the results returned in an object

# ObliQueue

This provides an API for actions that all need to be executed, but not necessarily in order.

```js
let queue = ObliQueue(/* optional: add tasks here */);
queue.addTasks(task1, task2, task3, ...);

queue.exec();              // execute all with 0ms delay
queue.exec(10);            // 10ms delay
queue.exec(null, 10, 40);  // execute with delay between 10ms and 40ms
```
