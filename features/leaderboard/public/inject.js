(function() {
  console.log('[FAS Plugin] Injecting Leaderboard & Timer feature...');

  let seconds = 0;
  let timerInterval = null;
  let gameSolved = false;
  let scoreSubmitted = false;

  // 1. Inject Timer DOM element into status panel
  function injectTimer() {
    const statusPanel = document.querySelector('.status-panel');
    if (!statusPanel) {
      setTimeout(injectTimer, 100);
      return;
    }

    const timerBadge = document.createElement('span');
    timerBadge.id = 'game-timer';
    timerBadge.className = 'badge active';
    timerBadge.style.marginLeft = '10px';
    timerBadge.style.fontFamily = 'monospace';
    timerBadge.textContent = 'TIME: 00:00';
    
    statusPanel.appendChild(timerBadge);

    // Start timer loop
    timerInterval = setInterval(() => {
      if (!gameSolved) {
        seconds++;
        timerBadge.textContent = `TIME: ${formatTime(seconds)}`;
      }
    }, 1000);
  }

  // Helper to format seconds to MM:SS
  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // 2. Inject Modal markup to body
  function injectModal() {
    const modal = document.createElement('div');
    modal.id = 'leaderboard-modal';
    modal.className = 'modal-overlay';
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="modal-content glass-card">
        <h2>🏆 PUZZLE COMPLETED!</h2>
        <p class="final-time-text">Time Taken: <span id="final-time" style="color: var(--accent-cyan); font-weight: 800;">00:00</span></p>
        
        <div id="submit-section">
          <input type="text" id="nickname-input" placeholder="Enter Nickname" maxlength="20">
          <button class="btn btn-primary" id="btn-submit-score" style="margin-top: 10px; width: 100%;">Submit to Board</button>
        </div>

        <div id="leaderboard-section" style="display:none; margin-top: 20px; width: 100%;">
          <h3>TOP 10 SOLVERS</h3>
          <table class="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody id="scores-body">
              <!-- Loaded dynamically -->
            </tbody>
          </table>
        </div>

        <button class="btn btn-secondary" id="btn-close-modal" style="margin-top: 20px; width: 100%;">Close</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Attach button actions
    document.getElementById('btn-submit-score').addEventListener('click', submitScore);
    document.getElementById('btn-close-modal').addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }

  // 3. Submit Score API Handler
  async function submitScore() {
    const nickname = document.getElementById('nickname-input').value.trim();
    if (!nickname) {
      alert('Please enter a nickname.');
      return;
    }

    const gameId = window.location.pathname.split('/').pop();

    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          nickname,
          timeTaken: seconds
        })
      });

      const data = await res.json();
      if (data.success) {
        scoreSubmitted = true;
        document.getElementById('submit-section').style.display = 'none';
        showLeaderboard();
      } else {
        alert('Failed to submit score: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      console.error('Error submitting score:', e);
    }
  }

  // 4. Fetch and render leaderboard entries
  async function showLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      
      if (data.success) {
        const body = document.getElementById('scores-body');
        body.innerHTML = '';

        data.scores.forEach((score, index) => {
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>#${index + 1}</td>
            <td style="font-weight: 600;">${escapeHTML(score.nickname)}</td>
            <td style="font-family: monospace;">${formatTime(score.time_taken)}</td>
          `;
          body.appendChild(row);
        });

        document.getElementById('leaderboard-section').style.display = 'block';
      }
    } catch (e) {
      console.error('Error loading leaderboard:', e);
    }
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // 5. Monitor status loops
  function startSolvedMonitor() {
    setInterval(() => {
      const statusBadge = document.getElementById('game-status');
      if (statusBadge && statusBadge.textContent === 'solved' && !gameSolved) {
        gameSolved = true;
        clearInterval(timerInterval);
        
        // Populate modal time
        document.getElementById('final-time').textContent = formatTime(seconds);
        
        // Show modal
        const modal = document.getElementById('leaderboard-modal');
        if (modal) {
          modal.style.display = 'flex';
          
          if (scoreSubmitted) {
            document.getElementById('submit-section').style.display = 'none';
            showLeaderboard();
          } else {
            document.getElementById('submit-section').style.display = 'block';
            document.getElementById('leaderboard-section').style.display = 'none';
          }
        }
      }
    }, 500);
  }

  // Run
  injectTimer();
  injectModal();
  startSolvedMonitor();
})();
