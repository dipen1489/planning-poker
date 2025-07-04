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
let revealed = false;

const isSameUser = (newName) => {
    for(let user in users){
        if(users[user].name.toLowerCase() === newName.toLowerCase()) {
            return true
        }
    }
    return false
}

io.on('connection', (socket) => {
  socket.on('join', (name) => {
    if(!isSameUser(name)) {
        socket.name = name; // Assign the name to the socket
        users[socket.id] = { name, hasVoted: false };
    }
    io.emit('updateUsers', Object.values(users));
    if (revealed) {
      io.emit('revealVotes', votes);
    }
  });

  socket.on('vote', ({ name, value }) => {
    if (users[socket.id]) {
        users[socket.id].hasVoted = true;
        votes[name] = value;
        io.emit('updateVotes', votes);
        io.emit('updateUsers', Object.values(users));
    }
    if (revealed) {
        io.emit('revealVotes', votes);
    }
  });

  socket.on('revealVotes', () => {
    revealed = true;
    io.emit('revealVotes', votes);
  });

  socket.on('reset', () => {
    votes = {};
    revealed = false; // Reset the revealed flag
    for(let user in users){
        users[user].hasVoted = false
    }
    io.emit('reset');
    io.emit('updateUsers', Object.values(users));
  });

  socket.on('removeParticipant', (name) => {
    const userSocketId = Object.keys(users).find(id => users[id].name === name);
    if (userSocketId) {
      delete users[userSocketId];
      io.emit('updateUsers', Object.values(users));
      if (revealed) {
        io.emit('revealVotes', votes);
      }
      io.emit('removeUser', name);
    }
  });

  socket.on('disconnect', () => {
    if (users[socket.id]) {
      delete users[socket.id];
      io.emit('updateUsers', Object.values(users));
    }
  });
});

const PORT = process.env.PORT || 3010;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
