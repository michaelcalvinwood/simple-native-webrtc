'use strict';
const listenPort = 8000;
const hostname = 'etherpad.treepadcloud.com'
const privateKeyPath = `/home/keys/treepadcloud.com.key`;
const fullchainPath = `/home/keys/treepadcloud.com.pem`;

//Loading dependencies & initializing express
const fs = require('fs');
var os = require('os');
var express = require('express');
var app = express();
var http = require('http');
const https = require('https');
//For signalling in WebRTC
var socketIO = require('socket.io');

const privateCert = fs.readFileSync(privateKeyPath, 'utf8');
const publicCert = fs.readFileSync(fullchainPath, 'utf8');

app.use(express.static('public'))

app.get("/", function(req, res){
	res.render("index.ejs");
});

//var server = http.createServer(app);
const server = https.createServer({
    key: privateCert,
    cert: publicCert,
  }, app);
  


server.listen(process.env.PORT || 8000);

var io = socketIO(server);

io.sockets.on('connection', function(socket) {

	// Convenience function to log server messages on the client.
	// Arguments is an array like object which contains all the arguments of log(). 
	// To push all the arguments of log() in array, we have to use apply().
	function log() {
	  var array = ['Message from server:'];
	  array.push.apply(array, arguments);
	  socket.emit('log', array);
      console.log(arguments);
	}
  
    
    //Defining Socket Connections
    socket.on('message', function(message, room) {
	  log('Client said: ', message);
	  // for a real app, would be room-only (not broadcast)
	  socket.in(room).emit('message', message, room);
	});
  
	socket.on('create or join', function(room) {
	  log('Received request to create or join room ' + room);
  
	  var clientsInRoom = io.sockets.adapter.rooms[room];
      console.log('clientsInRoom', clientsInRoom, io.sockets.adapter.rooms[room]);
	  var numClients = clientsInRoom ? Object.keys(io.sockets.adapter.rooms[room]).length : 0;
	  log('Room ' + room + ' now has ' + numClients + ' client(s)');
  
	  if (numClients === 0) {
		socket.join(room);
		log('Client ID ' + socket.id + ' created room ' + room);
		socket.emit('created', room, socket.id);
  
	  } else if (numClients === 1) {
		log('Client ID ' + socket.id + ' joined room ' + room);
		io.sockets.in(room).emit('join', room);
		socket.join(room);
		socket.emit('joined', room, socket.id);
		io.sockets.in(room).emit('ready');
	  } else { // max two clients
		socket.emit('full', room);
	  }
	});
  
	socket.on('ipaddr', function() {
	  var ifaces = os.networkInterfaces();
	  for (var dev in ifaces) {
		ifaces[dev].forEach(function(details) {
		  if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
			socket.emit('ipaddr', details.address);
		  }
		});
	  }
	});
  
	socket.on('bye', function(){
	  console.log('received bye');
	});
  
  });