const TOTAL_QUESTIONS = 40;
let myChart = null; 

let currentQ = 1;
let selected = new Set();
let userAnswers = [];

function updateSeriesDropdown() {
    const folderKey = document.getElementById('folder-select').value;
    const seriesSelect = document.getElementById('series-select');
    const folderInfo = allData[folderKey];
    seriesSelect.innerHTML = '';

    if (folderKey === "dossier2") {
        // Ajout de la série spéciale "Panneaux"
        seriesSelect.add(new Option("Série Panneaux", "panneaux"));
        
        // Ajout des séries suivantes décalées (de 1 à 14)
        for(let i = 1; i < folderInfo.count; i++) {
            seriesSelect.add(new Option(`Série n°${i}`, i));
        }
    } else {
        // Comportement normal pour le Dossier 1
        for(let i = 1; i <= folderInfo.count; i++) {
            seriesSelect.add(new Option(`Série n°${i}`, i));
        }
    }
    initSession();
}

function initSession() {
    currentQ = 1;
    userAnswers = [];
    selected.clear();
    document.getElementById('exam-ui').style.display = 'block';
    document.getElementById('results').style.display = 'none';
    
    // --- MODIFICATION : On cache le graphique au début d'une série ---
    document.getElementById('chart-section').style.display = 'none';
    
    displayHistory(); 
    updateUI();
}

document.querySelectorAll('.ans-btn').forEach(btn => {
    btn.onclick = () => {
        const val = btn.dataset.val;
        if(selected.has(val)) {
            selected.delete(val);
            btn.classList.remove('selected');
        } else {
            selected.add(val);
            btn.classList.add('selected');
        }
    };
});

function updateUI() {
    // On ne scrolle vers le haut que si l'écran est petit (mobile)
    if (window.innerWidth < 768) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    document.getElementById('q-number').innerText = `Question ${currentQ}/${TOTAL_QUESTIONS}`;
    document.getElementById('progress-fill').style.width = `${(currentQ/TOTAL_QUESTIONS)*100}%`;
    document.querySelectorAll('.ans-btn').forEach(b => b.classList.remove('selected'));
    selected.clear();
}

function nextQuestion() {
    if(selected.size === 0) return alert("Veuillez sélectionner au moins une réponse.");
    const answer = Array.from(selected).sort().join("");
    userAnswers.push(answer);
    if(currentQ < TOTAL_QUESTIONS) {
        currentQ++;
        updateUI();
    } else {
        showResults();
    }
}

function showResults() {
    const folderKey = document.getElementById('folder-select').value;
    const seriesId = document.getElementById('series-select').value;
    
    if (!allData[folderKey] || !allData[folderKey].keys[seriesId]) {
        alert("Attention : Les réponses pour cette série ne sont pas encore configurées dans data.js.");
        return;
    }

    const key = allData[folderKey].keys[seriesId];
    let score = 0;
    let errors = [];

    userAnswers.forEach((ans, i) => {
    const questionNumber = i + 1;
    const correctAnswer = key[questionNumber]; // Accès par la clé (1, 2, 3...)
    
    if(ans === correctAnswer) {
        score++;
    } else {
        errors.push({q: questionNumber, user: ans, correct: correctAnswer});
    }
});

    const faultCount = TOTAL_QUESTIONS - score;
    let feedbackMsg = "";
    let statusClass = ""; 

    if (score === 40) {
        feedbackMsg = "Tu es un véritable expert.";
        statusClass = "status-good";
    } else if (faultCount <= 7) {
        feedbackMsg = "Encore un petit effort ne lâche rien.";
        statusClass = "status-good";
    } else if (faultCount <= 10) {
        feedbackMsg = "Encore un peu d'entraînement.";
        statusClass = "status-warning";
    } else if (faultCount <= 15) {
        feedbackMsg = "Il faut réviser davantage.";
        statusClass = "status-alert";
    } else {
        feedbackMsg = "Il faut commencer à réviser.";
        statusClass = "status-danger";
    }

    document.getElementById('exam-ui').style.display = 'none';
    document.getElementById('results').style.display = 'block';
    
    // --- MODIFICATION : On affiche le graphique à la fin de la série ---
    document.getElementById('chart-section').style.display = 'block';

    document.getElementById('final-score').innerText = `${score}/${TOTAL_QUESTIONS}`;
    
    const feedbackEl = document.getElementById('feedback');
    feedbackEl.innerText = feedbackMsg;
    feedbackEl.className = statusClass;

    const errorList = document.getElementById('error-list');
    if (errors.length > 0) {
        errorList.className = "error-grid";
        errorList.innerHTML = errors.map(e => `
            <div class="error-item">
                <strong>Q${e.q}:</strong> 
                <span class="user-wrong">${e.user}</span> 
                <span class="correct-truth">➔ ${e.correct}</span>
            </div>
        `).join('');
    } else {
        errorList.className = "";
        errorList.innerHTML = "<p style='color:var(--success)'>Félicitations ! Aucune erreur.</p>";
    }
    saveToLocalStorage(allData[folderKey].name, seriesId, score);
}

function saveToLocalStorage(folderName, series, score) {
    const history = JSON.parse(localStorage.getItem('examHistory')) || [];
    const entry = {
        date: new Date().toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}),
        display: `${folderName} - S${series}`,
        score: score
    };
    history.unshift(entry);
    localStorage.setItem('examHistory', JSON.stringify(history.slice(0, 10)));
    displayHistory();
}

function displayHistory() {
    const history = JSON.parse(localStorage.getItem('examHistory')) || [];
    const container = document.getElementById('history-container');
    if(!container) return;
    
    container.innerHTML = history.length === 0 ? "Aucun historique." : 
        history.map(h => `<div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:4px 0;">
            <span>${h.display}</span> <strong>${h.score}/40</strong> <span>${h.date}</span></div>`).join('');

    // --- MODIFICATION : On met à jour le graphique s'il y a des données, ---
    // --- mais on ne touche PAS au style.display ici pour ne pas forcer l'affichage ---
    if(history.length > 0) {
        updateChart(history);
    }
}

function updateChart(history) {
    const ctx = document.getElementById('scoreChart').getContext('2d');
    const chartData = [...history].reverse();

    if (myChart) myChart.destroy();

    // Détection sommaire pour adapter la taille des éléments sur grand écran
    const isLargeScreen = window.innerWidth > 768;

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(h => h.date.split(' ')[0]),
            datasets: [{
                data: chartData.map(h => h.score),
                borderColor: '#8E5AA9',
                backgroundColor: 'rgba(142, 90, 169, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: isLargeScreen ? 6 : 4, // Points plus gros sur PC
                borderWidth: isLargeScreen ? 4 : 2   // Ligne plus épaisse sur PC
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Indispensable pour suivre la hauteur du parent CSS
            scales: {
                y: { 
                    min: 0, 
                    max: 40, 
                    ticks: { 
                        stepSize: 10,
                        font: { size: isLargeScreen ? 14 : 10 } 
                    } 
                },
                x: { 
                    display: true, // Réactivé pour voir les dates sur PC
                    grid: { display: false },
                    ticks: { font: { size: isLargeScreen ? 12 : 10 } }
                }
            },
            plugins: { 
                legend: { display: false },
                tooltip: { enabled: true } // Utile au survol de la souris
            }
        }
    });
}

function clearHistory() {
    if(confirm("Voulez-vous vraiment supprimer tout votre historique ?")) {
        localStorage.removeItem('examHistory');
        if (myChart) {
            myChart.destroy();
            myChart = null;
        }
        // On cache le graphique s'il n'y a plus de données
        document.getElementById('chart-section').style.display = 'none';
        displayHistory();
    }
}

// Support du clavier
document.addEventListener('keydown', (e) => {
    if(document.getElementById('exam-ui').style.display === 'none') return;
    const key = e.key.toUpperCase();
    if (['A', 'B', 'C', 'D'].includes(key)) {
        const btn = document.querySelector(`.ans-btn[data-val="${key}"]`);
        if (btn) btn.click();
    }
    if (e.key === 'Enter') nextQuestion();
});

updateSeriesDropdown();

function closeLegalModal() {
    const modal = document.getElementById('legal-modal');
    if (modal) {
        modal.style.display = 'none';
        // On autorise à nouveau le défilement de la page
        document.body.style.overflow = 'auto';
    }
}

// Optionnel : Bloquer le scroll au démarrage tant que ce n'est pas accepté
document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('legal-modal')) {
        document.body.style.overflow = 'hidden';
    }
});

document.getElementById('current-year').textContent = new Date().getFullYear();