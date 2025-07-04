const socket = io();
let name;
let WHEEL_SPIN_DURATION = 5000; // in milliseconds, adjust as needed
const startGame = () => {
  name = document.getElementById('name').value;
  if (name) {
    localStorage.setItem('name', name); // Save name to localStorage
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

const changeName = () => {
  localStorage.removeItem('name'); // Remove name from localStorage
  document.getElementById('name-input').style.display = 'block';
  document.getElementById('voting-section').style.display = 'none';
  socket.emit('leave', name);
};

document.getElementById('change-name-btn').addEventListener('click', changeName);

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

const removeParticipant = (participantName) => {
  socket.emit('removeParticipant', participantName);
};

socket.on('updateUsers', (users) => {
  const participantCards = document.getElementById('participant-cards');
  participantCards.innerHTML = '';
  users.forEach(user => {
    const card = document.createElement('div');
    card.classList.add('participant-card');
    card.setAttribute('data-name', user.name);
    card.innerHTML = `<p>${user.name}</p><p class="vote-value"></p><button class="close-btn" onclick="removeParticipant('${user.name}')">&times;</button>`;
    if (user.hasVoted) {
      card.classList.add('voted');
    }
    participantCards.appendChild(card);
  });
});

// --- Spin the Wheel Implementation ---

// Modal Elements
const spinBtn = document.getElementById('spin-btn');
const wheelModal = document.getElementById('wheel-modal');
const closeWheel = document.getElementById('close-wheel');
const wheelCanvas = document.getElementById('wheel-canvas');
const spinWheelBtn = document.getElementById('spin-wheel-btn');
const winnerNameDiv = document.getElementById('winner-name');

let wheelUsers = [];
let wheelSpinning = false;
let wheelAngle = 0;
let wheelActiveUsers = [];
let wheelCustomUsers = [];

// Elements for new features
const wheelParticipantList = document.getElementById('wheel-participant-list');
const addWheelNameInput = document.getElementById('add-wheel-name');
const addWheelBtn = document.getElementById('add-wheel-btn');

// Helper to update the participant list UI
function updateWheelParticipantList() {
  wheelParticipantList.innerHTML = '';
  // Show all main game users
  wheelUsers.forEach(name => {
    const id = `wheel-check-${name.replace(/\s+/g, '_')}`;
    const checked = wheelActiveUsers.includes(name) ? 'checked' : '';
    wheelParticipantList.innerHTML += `
      <div>
        <input type="checkbox" id="${id}" data-name="${name}" ${checked}>
        <label for="${id}">${name}</label>
      </div>
    `;
  });
  // Show custom users
  wheelCustomUsers.forEach(name => {
    const id = `wheel-check-custom-${name.replace(/\s+/g, '_')}`;
    const checked = wheelActiveUsers.includes(name) ? 'checked' : '';
    wheelParticipantList.innerHTML += `
      <div>
        <input type="checkbox" id="${id}" data-name="${name}" ${checked}>
        <label for="${id}">${name}</label>
        <button class="remove-custom-wheel-user" data-name="${name}" style="margin-left:5px;color:#dc3545;background:none;border:none;cursor:pointer;">&times;</button>
      </div>
    `;
  });

  // Add event listeners for checkboxes
  wheelParticipantList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const n = e.target.getAttribute('data-name');
      if (e.target.checked) {
        if (!wheelActiveUsers.includes(n)) wheelActiveUsers.push(n);
      } else {
        wheelActiveUsers = wheelActiveUsers.filter(u => u !== n);
      }
      drawWheel(wheelActiveUsers);
    });
  });

  // Remove custom user buttons
  wheelParticipantList.querySelectorAll('.remove-custom-wheel-user').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const n = btn.getAttribute('data-name');
      wheelCustomUsers = wheelCustomUsers.filter(u => u !== n);
      wheelActiveUsers = wheelActiveUsers.filter(u => u !== n);
      updateWheelParticipantList();
      drawWheel(wheelActiveUsers);
    });
  });
}

// Add custom participant
addWheelBtn.addEventListener('click', () => {
  const val = addWheelNameInput.value.trim();
  if (val && !wheelActiveUsers.includes(val)) {
    wheelCustomUsers.push(val);
    wheelActiveUsers.push(val);
    addWheelNameInput.value = '';
    updateWheelParticipantList();
    drawWheel(wheelActiveUsers);
  }
});
addWheelNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addWheelBtn.click();
});

// Open modal
spinBtn.addEventListener('click', () => {
  winnerNameDiv.innerText = '';
  spinWheelBtn.disabled = false;
  wheelAngle = 0;
  // Reset to all users + custom users, all checked
  wheelActiveUsers = [...wheelUsers, ...wheelCustomUsers];
  updateWheelParticipantList();
  wheelModal.style.display = 'block';
  drawWheel(wheelActiveUsers);
});

// Close modal
closeWheel.addEventListener('click', () => {
  wheelModal.style.display = 'none';
});

// Close modal on outside click
window.addEventListener('click', (e) => {
  if (e.target === wheelModal) wheelModal.style.display = 'none';
});

// Draw the wheel with names
function drawWheel(users, highlightIndex = null) {
  const ctx = wheelCanvas.getContext('2d');
  const size = wheelCanvas.width;
  ctx.clearRect(0, 0, size, size);

  if (!users.length) {
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No participants', size/2, size/2);
    return;
  }

  const anglePer = 2 * Math.PI / users.length;

  // 1. Draw all non-winner segments first
  for (let i = 0; i < users.length; i++) {
    if (i === highlightIndex) continue;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(size/2, size/2);
    ctx.arc(size/2, size/2, size/2-10, i*anglePer+wheelAngle, (i+1)*anglePer+wheelAngle);
    ctx.closePath();
    ctx.fillStyle = `hsl(${i*360/users.length}, 70%, 60%)`;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#222';
    ctx.stroke();
    ctx.restore();
  }

  // 2. Draw the winner segment last, so it's always on top
  if (highlightIndex !== null && users[highlightIndex]) {
    ctx.save();
    // Halo
    ctx.beginPath();
    ctx.moveTo(size/2, size/2);
    ctx.arc(size/2, size/2, size/2-10, highlightIndex*anglePer+wheelAngle, (highlightIndex+1)*anglePer+wheelAngle);
    ctx.closePath();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = "#FFD700";
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 40;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.restore();

    // Winner segment
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(size/2, size/2);
    ctx.arc(size/2, size/2, size/2-10, highlightIndex*anglePer+wheelAngle, (highlightIndex+1)*anglePer+wheelAngle);
    ctx.closePath();
    ctx.fillStyle = "#FFD700";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#fffbe6";
    ctx.stroke();
    ctx.restore();
  }

  // 3. Draw all the text labels
  for (let i = 0; i < users.length; i++) {
    ctx.save();
    ctx.translate(size/2, size/2);
    ctx.rotate(i*anglePer + anglePer/2 + wheelAngle);
    ctx.textAlign = 'right';
    ctx.fillStyle = (i === highlightIndex) ? '#222' : '#fff';
    ctx.font = (i === highlightIndex) ? 'bold 20px Arial' : '18px Arial';
    ctx.fillText(users[i], size/2 - 30, 10);
    ctx.restore();
  }

  // 4. Draw pointer
	  const pointerTipY = 150; // tip of the arrow (top of canvas)
    const spinButtonRadius = 20; // your spin button's radius in px
    const pointerBaseY = size/2 - spinButtonRadius; // base just above the spin button

    ctx.beginPath();
    ctx.moveTo(size/2, pointerTipY); // tip
    ctx.lineTo(size/2-22, pointerBaseY);
    ctx.lineTo(size/2+22, pointerBaseY);
    ctx.closePath();
    ctx.fillStyle = '#222222';
    ctx.fill();
}

// Spin logic
function spinWheel() {
  // Filter out any users who are no longer present
  wheelActiveUsers = wheelActiveUsers.filter(
    u => wheelUsers.includes(u) || wheelCustomUsers.includes(u)
  );

  if (wheelSpinning || wheelActiveUsers.length < 2) return;
  wheelSpinning = true;
  spinWheelBtn.disabled = true;
  winnerNameDiv.innerText = '';

  // Pick random winner index from active users
  const winnerIndex = Math.floor(Math.random() * wheelActiveUsers.length);

  const anglePer = 2 * Math.PI / wheelActiveUsers.length;
  const targetAngle = (3 * Math.PI / 2) - (winnerIndex + 0.5) * anglePer;
  const fullSpins = 6;
  const finalAngle = (2 * Math.PI * fullSpins) + targetAngle;

  let start = null;
  let duration = WHEEL_SPIN_DURATION;
  let startAngle = 0;

  function animateWheel(ts) {
    if (!start) start = ts;
    let elapsed = ts - start;
    let progress = Math.min(elapsed / duration, 1);
    let ease = 1 - Math.pow(1 - progress, 3);
    wheelAngle = startAngle + (finalAngle - startAngle) * ease;
    drawWheel(wheelActiveUsers);
    if (progress < 1) {
      requestAnimationFrame(animateWheel);
    } else {
      wheelAngle = finalAngle % (2 * Math.PI);
      drawWheel(wheelActiveUsers, winnerIndex);
      // Only show winner if still present
      const winner = wheelActiveUsers[winnerIndex];
      winnerNameDiv.innerText = winner
        ? `🎉 Winner: ${winner}!`
        : "No valid winner!";
      wheelSpinning = false;
      spinWheelBtn.disabled = false;
    }
  }
  requestAnimationFrame(animateWheel);
}

spinWheelBtn.addEventListener('click', spinWheel);

// Update wheel users on participant change
socket.on('updateUsers', (users) => {
  const participantCards = document.getElementById('participant-cards');
  participantCards.innerHTML = '';
  users.forEach(user => {
    const card = document.createElement('div');
    card.classList.add('participant-card');
    card.setAttribute('data-name', user.name);
    card.innerHTML = `<p>${user.name}</p><p class="vote-value"></p><button class="close-btn" onclick="removeParticipant('${user.name}')">&times;</button>`;
    if (user.hasVoted) {
      card.classList.add('voted');
    }
    participantCards.appendChild(card);
  });
  wheelUsers = users.map(u => u.name);
  // Remove any custom users that now conflict with main users
  wheelCustomUsers = wheelCustomUsers.filter(cu => !wheelUsers.includes(cu));
  if (wheelModal.style.display === 'block') {
    // Keep only checked users that still exist
    wheelActiveUsers = wheelActiveUsers.filter(u => wheelUsers.includes(u) || wheelCustomUsers.includes(u));
    updateWheelParticipantList();
    drawWheel(wheelActiveUsers);
  }
});

const calculateAverage = (allVotes) => {
  let total = 0;
  let users = 0
  for(let vote in allVotes) {
    if(allVotes[vote] !== 'coffee') {
      total = total + parseInt(allVotes[vote])
      users = users + 1
    }
  }
  return (total / users).toFixed(2)
}

socket.on('revealVotes', (allVotes) => {
  document.querySelectorAll('.participant-card').forEach(card => {
    const name = card.getAttribute('data-name');
    if (allVotes[name]) {
      card.classList.add('voted');
      if (allVotes[name] === 'coffee') {
        card.querySelector('.vote-value').innerHTML = '<i class="fas fa-coffee"></i>';
      } else {
        card.querySelector('.vote-value').innerText = allVotes[name];
      }
    }
  });
  const participantCards = document.getElementById('averageScore');
  participantCards.innerText = 'Average : '+ calculateAverage(allVotes);
});

socket.on('reset', () => {
  document.querySelectorAll('.participant-card').forEach(card => {
    card.classList.remove('voted');
    card.querySelector('.vote-value').innerText = '';
    card.querySelector('.vote-value').innerHTML = '';
  });
  document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
  const participantCards = document.getElementById('averageScore');
  participantCards.innerText = '';
});

socket.on('connect', () => {
  name = localStorage.getItem('name'); // Get name from localStorage
  if (name) {
    socket.emit('join', name);
    document.getElementById('name-input').style.display = 'none';
    document.getElementById('voting-section').style.display = 'block';
    document.getElementById('welcome-message').innerText = `Welcome, ${name}!`;
  }
});

socket.on('removeUser', (removedUserName) => {
  if (name === removedUserName) {
    localStorage.removeItem('name'); // Remove name from localStorage
    document.getElementById('name-input').style.display = 'block';
    document.getElementById('voting-section').style.display = 'none';
    socket.emit('leave', name);
  }
});
