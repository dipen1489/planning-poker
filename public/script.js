const socket = io();
let name;

const startGame = () => {
  name = document.getElementById('name').value;
  if (name) {
    socket.emit('join', name);
    document.getElementById('name-input').style.display = 'none';
    document.getElementById('voting-section').style.display = 'block';
    document.getElementById('welcome-message').innerText = `Welcome, ${name}!`;
  }
};

document.getElementById('start-btn').addEventListener('click', startGame);

document.getElementById('name').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    startGame();
  }
});

document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    const value = card.getAttribute('data-value');
    socket.emit('vote', { name, value });
  });
});

document.getElementById('reveal-btn').addEventListener('click', () => {
  socket.emit('revealVotes');
});

document.getElementById('reset-btn').addEventListener('click', () => {
  socket.emit('reset');
});

socket.on('updateUsers', (users) => {
  const participantList = document.getElementById('participant-list');
  participantList.innerHTML = '';
  users.forEach(user => {
    const listItem = document.createElement('li');
    listItem.innerText = user;
    participantList.appendChild(listItem);
  });
});

socket.on('revealVotes', (allVotes) => {
  const resultDiv = document.getElementById('results');
  resultDiv.innerHTML = '';
  for (const [name, value] of Object.entries(allVotes)) {
    if(value === 'coffee') {
        resultDiv.innerHTML += `<div class="result-card"><p>${name}</p><p><i class="fas fa-coffee"></i></p></div>`;
    } else {
        resultDiv.innerHTML += `<div class="result-card"><p>${name}</p><p>${value}</p></div>`;
    }
  }
  resultDiv.style.display = 'flex';
});

socket.on('reset', () => {
  document.getElementById('results').innerHTML = '';
  document.getElementById('results').style.display = 'none';
  document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
});

socket.on('connect', () => {
  if (name) {
    socket.emit('join', name);
  }
});
