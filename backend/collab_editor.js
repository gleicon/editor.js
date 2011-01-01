// gleicon 2010 | http://zenmachine.wordpress.com | http://github.com/gleicon


var sys = require("sys");
var ws = require("./lib/node.ws.js/ws")
var http = require("http");
var qs = require("querystring");
var dmp_lib = require("./lib/diff_match_patch_node");

sys.puts('Initializing ws server');

var dmp = dmp_lib.diff_match_patch
var e_msg = new process.EventEmitter();
var local_text_buffer = "";

function add_patch(diff_text) {
  var patches = dmp.patch_fromText(diff_text);
  var results = dmp.patch_apply(patches, local_text_buffer);
  local_text_buffer = results[0]; 
  console.log(local_text_buffer);
}

server = http.createServer(function (req, res) {
  if (req.url == '/publish') {
    req.on('data', function(d) {
            params = qs.parse(d);
            m = params['body'];
            if (m != null) e_msg.emit('message', m); 
    });
    res.writeHead(200, {'Content-type':'text/plain'});
    res.end();
  } else {
    res.writeHead(404, {'Content-type':'text/plain'});
    res.write('not found');
    res.end();
  }
}).listen(8081);

ws_server = ws.createServer(function (websocket) {
    var id;
    websocket.addListener("connect", function (resource) { 
      sys.puts("connect: " + resource);
      id = new Date().getTime(); 
      var o = {};
      o['id'] = id;
      o['type'] = 'buffer';
      o['data'] = local_text_buffer;
      websocket.write(JSON.stringify(o));
    });

    var l = function(m) { 
      if (m.id != id) websocket.write(JSON.stringify(m));
    }

    e_msg.addListener('message', l)

    var to = setTimeout(function() {
      e_msg.removeListener('message', l);
      sys.puts("timeout from: " + websocket.remoteAddress);
    }, 60 * 1000 * 60);

    websocket.addListener("data", function(data) {
      var o = {};
      o['id'] = id;
      o['type'] = 'patch';
      o['data'] = data;
      e_msg.emit('message', o);
      add_patch(data);
    });
    
    websocket.addListener("close", function () { 
      e_msg.removeListener('message', l); 
      sys.puts("close");
    });
    
});

ws_server.listen(8080);


