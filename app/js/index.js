"use strict";

// create ssi module
var ssi = (function($){
  var si, myQueue;

  si = {
    queue: queue,
    update: update
  };
  myQueue = [];
  si.config = {
    apiUrl: 'http://zabbix.deadlayer.com:1180/api_jsonrpc.php',
    token: null,
    user: 'Aquila',
    pass: 'Aquila',
    hostid: '10108',
    itemids: [ '24011','24012','23994','24259','24271',
               '24295','24283','23986','23987','23991',
               '23992','23990','24008','24003','24009' ],
    itemMap: { // attach data to human readable objects
      '24011': 'memAvail', '24012': 'memTotal', '23994': 'cpuIdle',
      '24259': 'diskFree', '24271': 'diskFreeP', '24295': 'diskUsed',
      '24283': 'diskTotal', '23986': 'procRun', '23987': 'procTotal',
      '23991': 'cpuLoad60', '23992': 'cpuLoad300', '23990': 'cpuLoad900',
      '24008': 'systUptime', '24003': 'systTime', '24009': 'userNum'
    },
    refresh: 900000 //15 mins
  };

  init(); // where the magic happens

  return si;
  //////////

  /* Public */


  /* Private */
  function init() {
    getZabbixAuthToken()
      .then(function(data) {
        si.config.token = data.result; // save for future api calls

        update();
        setInterval(update, si.config.refresh);
      }, function(error) {
        console.log(error); // todo: better error handling
      });
  }

  // most of our api calls are the same. Wrapper to change just what we need
  function apiCall(_url_, _method_, _data_, callback) {
    return $.ajax({
                    url: _url_,
                    method: _method_,
                    data: JSON.stringify(_data_), // zabbix doesn't take
                    // real json so we need to convert it to string
                    /*dataType: 'json',*/
                    contentType: 'application/json-rpc'
                  })
            .always(function(data) {
              if(callback) { return callback(data); }
            });
  }

  // authenticate with zabbix so we can access raw data
  function getZabbixAuthToken() {
    var request = {
      "jsonrpc": "2.0",
      "method": "user.login",
      "params": {
        "user": si.config.user,     // hardcoded -disgusting I know
        "password": si.config.pass  // didn't wanna build back-end wrapper :P
      },
      "id": 1,
      "auth": null
    };

    return apiCall(si.config.apiUrl, 'POST', request, function(data) {
      console.log('Api call getZabbixAuthToken returned: '
                  + JSON.stringify(data));
      return data;
    });
  }

  // Gets raw data
  function getItems() {
    // build request for just the data we want
    var request = {
      "jsonrpc": "2.0",
      "method": "item.get",
      "params": {
        "output": ['itemid','name','key_','description','lastclock',
                   'units','lastvalue','prevvalue','trends' ],
        "hostids": si.config.hostid,
        "sortfield": "name",
        "itemids": si.config.itemids
      },
      "id": 2,
      "auth": si.config.token
    };

    // use wrapper function to make ajax call
    return apiCall(si.config.apiUrl, 'POST', request, function(data) {
      console.log('Api call getItems returned: '
                  + JSON.stringify(data));
      return data;
    });
  }

  function update() {
    getItems()
      .then(function(data) {
        data = data.result;
        while(data.length) { // faster then for loop
          var val = data.pop(); // we don't care about array after were done
          if(si.config.itemMap.hasOwnProperty(val.itemid)) {
            si[si.config.itemMap[val.itemid]] = val; // make items human readable
          }
        }
        runQueue();
      }, function(error) {
        console.log(error);
      })
  }

  function queue(func) {
    myQueue.push(func);
  }

  function runQueue() {
    while(myQueue.length) {
      var run = myQueue.pop();
      run();
    }
    myQueue = [];
  }

  /*
  // utility functions to use if you need to figure out what to query
  function getHosts() {
    var request = {
      "jsonrpc": "2.0",
      "method": "host.get",
      "params": {
        "sortfield": "name",
        "output": ['hostid', 'name', 'host']
      },
      "id": 2,
      "auth": si.config.token
    };

    return apiCall(si.config.apiUrl, 'POST', request, function(data) {
      console.log('Api call getHosts returned: ' + JSON.stringify(data));
      return data;
    });
  }

  function getApplications() {
    var request = {
      "jsonrpc": "2.0",
      "method": "application.get",
      "params": {
        "hostid": si.config.hostid,
        "sortfield": "name",
        "output": ['applicationid', 'name']
      },
      "id": 2,
      "auth": si.config.token
    };

    return apiCall(si.config.apiUrl, 'POST', request, function(data) {
      console.log('Api call getApplications returned: '
                  + JSON.stringify(data));
      return data;
    });
  }*/

})(jQuery);