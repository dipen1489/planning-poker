const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

let votes = {};
let users = {};

io.on('connection', (socket) => {
  socket.on('join', (name) => {
    socket.name = name; // Assign the name to the socket
    users[socket.id] = name;
    io.emit('updateUsers', Object.values(users));
  });

  socket.on('vote', ({ name, value }) => {
    votes[name] = value;
    io.emit('updateVotes', votes);
  });

  socket.on('revealVotes', () => {
    io.emit('revealVotes', votes);
  });

  socket.on('reset', () => {
    votes = {};
    io.emit('reset');
  });

  socket.on('disconnect', () => {
    if (users[socket.id]) {
      delete users[socket.id];
      io.emit('updateUsers', Object.values(users));
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
