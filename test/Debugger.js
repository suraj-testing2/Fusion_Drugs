
/*global console*/

// @param return from appEnd getChromeExtensionPipe()

function Debugger(connection) {
  this.connection = connection;
}

function getRejection(msgObj) {
  var reason;
  var props = ['source', 'method', 'params', 'serial'];
  props.forEach(function(prop) {
    if (!reason && !msgObj[prop]) {
      reason = {from: "Debugger", reason: "No "+prop, msgObj: msgObj};
    }
  });
  return reason;
}

Debugger.prototype = {
  
  send: function(target, method, params, serial) {
    this.connection.postMessage({target: target, method: method, params: params, serial: serial});
  },
  
  recv: function(filter, deferred, msgObj) {
    if (!msgObj || !msgObj.serial || (msgObj.serial !== filter[3]) ) {
      return; // not our response
    }
    var rejection = getRejection(msgObj);
    if (rejection) {
      deferred.reject(rejection);
    } else {
      if (
        msgObj.source === filter[0] && 
        msgObj.method === filter[1]) {
        
        deferred.resolve(msgObj.params);
      } else {
        console.log("Debugger.promiseResponse ignoring filtered message", msgObj);
      }
    }
  },
  
  promiseResponse: function(request, filter) {
    var deferred = Q.defer();
    // close over the deferred for resolution upon response
    this.connection.addListener(this.recv.bind(this, filter, deferred));
    this.send.apply(this, request);
    return deferred.promise;
  },
  
  promiseWindow: function() {
    return this.promiseResponse(
      ['chrome.windows', 'create', [{}], 1 ],
      ['chrome.windows', 'onCreated', undefined, 1]
      );
  } 
};

// Debugging 
var _send = Debugger.prototype.send; 
Debugger.prototype.send = function() {
  if ( typeof arguments[0] !== 'string' ) {
    throw new Error("First argument must be a string");
  }
  if ( typeof arguments[1] !== 'string' ) {
    throw new Error("Second argument must be a string");
  }
  if (!arguments[2] instanceof Array) {
    throw new Error("Third argument must be an array");
  }
  if ( typeof arguments[3] !== 'number' ) {
    throw new Error("Fourth argument must be a number");
  }
  console.log("Debugger send", this, arguments);
  return _send.apply(this, arguments);
};