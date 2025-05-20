// Game state variables
let totalClicks = 0;
let pairsMatched = 0;
let timeLeft = 60;
let timerId = null;
let gameOver = false;
let gameBusy = false; 
let powerUpUsedThisGame = false;

let timerDisplay, clicksDisplay, matchedPairsDisplay, remainingPairsDisplay;
let difficultySelect, startGameBtn, resetGameBtn;

const difficulties = {
  easy: { pairs: 3, time: 60 },
  medium: { pairs: 4, time: 45 },
  hard: { pairs: 5, time: 40 }
};
let currentDifficulty = 'easy';
let currentTotalPairs = difficulties[currentDifficulty].pairs;
let currentTimeLimit = difficulties[currentDifficulty].time;

function applyDifficultySettings() {
  currentDifficulty = difficultySelect.value;
  currentTotalPairs = difficulties[currentDifficulty].pairs;
  currentTimeLimit = difficulties[currentDifficulty].time;
  
  if (remainingPairsDisplay) { 
      remainingPairsDisplay.textContent = currentTotalPairs;
  }
  if (timerDisplay) { 
      timerDisplay.textContent = currentTimeLimit;
  }
}

function shuffleCardsPosition(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function startup() {
  gameOver = false;
  gameBusy = false; 
  powerUpUsedThisGame = false;
  $("#power-up-btn").prop("disabled", false);
  totalClicks = 0;
  pairsMatched = 0;
  timeLeft = currentTimeLimit;
  if (timerId) clearInterval(timerId);

  updateStatsDisplay(); 

  const gameGrid = $("#game_grid");
  gameGrid.empty(); 

  let gridColsClass = 'grid-cols-3'; 
  if (currentTotalPairs === 4) { 
    gridColsClass = 'grid-cols-4'; 
  } else if (currentTotalPairs === 5) { 
    gridColsClass = 'grid-cols-5';
  }
  gameGrid.removeClass('grid-cols-3 grid-cols-4 grid-cols-5').addClass(gridColsClass);

  const pokemonPromises = [];
  for (let i = 0; i < currentTotalPairs; i++) {
    const randomPokemonId = Math.floor(Math.random() * 1025) + 1; 
    pokemonPromises.push(
      fetch(`https://pokeapi.co/api/v2/pokemon/${randomPokemonId}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .catch(error => {
          console.error("Failed to fetch Pokémon:", error);
          return { name: `Error Pokémon ${i+1}`, sprites: { front_default: 'pokeball.png' } }; 
        })
    );
  }

  try {
    const uniquePokemonData = await Promise.all(pokemonPromises);
    let allPokemonForGame = [];
    uniquePokemonData.forEach(pokemon => {
      allPokemonForGame.push(pokemon, pokemon);
    });

    allPokemonForGame = shuffleCardsPosition(allPokemonForGame);

    allPokemonForGame.forEach((pokemon) => {
      const card = $('<div></div>');
      card.addClass(`card relative transform-style-preserve-3d transition-transform duration-1000 aspect-[2.5/3.5]`);
      card.data('pokemonName', pokemon.name); 

      const frontFace = $('<div></div>');
      frontFace.addClass('front_face absolute w-full h-full backface-hidden bg-gray-200 dark:bg-gray-700 rounded-lg shadow-md overflow-hidden flex items-center justify-center');
      const frontImage = $('<img>').attr('src', 'pokeball.png').addClass('p-2 object-contain max-w-[70%] max-h-[70%]');
      frontFace.append(frontImage);

      const backFace = $('<div></div>');
      backFace.addClass('back_face absolute w-full h-full backface-hidden bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex items-center justify-center');
      const spriteUrl  = pokemon.sprites && pokemon.sprites.front_default ? pokemon.sprites.front_default : 'pokeball.png'; 
      const backImage = $('<img>').attr('src', spriteUrl).addClass('object-contain w-full h-full p-1'); 
      backFace.append(backImage);

      card.append(frontFace).append(backFace);
      gameGrid.append(card);
    });

  } catch (error) {
    console.error("Error setting up game with Pokémon data:", error);
    gameGrid.html('<p class="text-red-500">Failed to load Pokémon. Please try starting a new game.</p>');
  }

  updateStatsDisplay();
  attachCardClickHandlers();
  if (timerId) clearInterval(timerId);
  startGameTimer();
  gameBusy = false;
}

function updateStatsDisplay() {
  if (!timerDisplay) return; 
  timerDisplay.textContent = timeLeft;
  clicksDisplay.textContent = totalClicks;
  matchedPairsDisplay.textContent = pairsMatched;
  remainingPairsDisplay.textContent = currentTotalPairs - pairsMatched;
}

function startGameTimer() {
  timeLeft = currentTimeLimit; 
  updateStatsDisplay(); 
  timerId = setInterval(() => {
    timeLeft--;
    updateStatsDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerId);
      gameOver = true;
      gameBusy = true;
      alert("Time's up! Game Over.");
    }
  }, 1000);
}

function attachCardClickHandlers() {
  let firstCard = null;
  let secondCard = null;

  $(".card").off("click"); 

  $(".card").on("click", function () {
    const clickedCard = $(this);

    if (gameOver || gameBusy || clickedCard.hasClass("matched") || clickedCard.is(firstCard)) {
      console.log("Invalid click or game state prevents action.");
      return;
    }

    clickedCard.addClass("flip");
    totalClicks++;
    updateStatsDisplay();

    if (!firstCard) {
      firstCard = clickedCard;
      // console.log("First card selected:", firstCard.data('pokemonName'));
    } else {
      // This is the second card selection
      secondCard = clickedCard;
      gameBusy = true; // Blocks all interactions while processing the match
      // console.log("Second card selected:", secondCard.data('pokemonName'));

      if (firstCard.data('pokemonName') === secondCard.data('pokemonName')) {
        // console.log("Match!");
        pairsMatched++;
        updateStatsDisplay();

        firstCard.addClass("matched");
        secondCard.addClass("matched");

        firstCard = null;
        secondCard = null;
        gameBusy = false;

        if (pairsMatched === currentTotalPairs) {
          gameOver = true;
          if(timerId) clearInterval(timerId);
          setTimeout(() => {
            alert(`Congratulations! You've matched all pairs!`);
          }, 500);
        }
      } else {

        // console.log("No match.");
        setTimeout(() => {
          if (firstCard) firstCard.removeClass("flip");
          if (secondCard) secondCard.removeClass("flip");
          firstCard = null;
          secondCard = null;
          gameBusy = false;
        }, 1000);
      }
    }
  });
}

$(document).ready(function() {
  timerDisplay = document.getElementById("timer-display");
  clicksDisplay = document.getElementById("clicks-display");
  matchedPairsDisplay = document.getElementById("matched-pairs-display");
  remainingPairsDisplay = document.getElementById("remaining-pairs-display");
  difficultySelect = document.getElementById("difficulty-select");
  startGameBtn = document.getElementById("start-game-btn");
  resetGameBtn = document.getElementById("reset-game-btn");

  const themeToggleButton = $("#theme-toggle-btn");
  const htmlElement = $("html");

  // Function to apply theme based on localStorage or default
  function applyInitialTheme() {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark') {
      htmlElement.addClass('dark');
    } else {
      htmlElement.removeClass('dark'); 
    }
  }

  applyInitialTheme();

  themeToggleButton.on("click", function() {
    htmlElement.toggleClass('dark');
    if (htmlElement.hasClass('dark')) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  });

  applyDifficultySettings(); 

  startGameBtn.addEventListener("click", () => {
    applyDifficultySettings();
    startup();
  });

  resetGameBtn.addEventListener("click", () => {
    applyDifficultySettings();
    startup();
  });

  difficultySelect.addEventListener("change", () => {
    applyDifficultySettings();
    document.getElementById("game_grid").innerHTML = "<p>Select difficulty and click Start Game.</p>";
    if(timerId) clearInterval(timerId); 
    gameOver = true; 
    gameBusy = true;
    updateStatsDisplay(); 

  });
  
  $("#power-up-btn").on("click", function() {
    if (gameOver || gameBusy || powerUpUsedThisGame || $(".card").length === 0 || ($(".card.matched").length === currentTotalPairs * 2 && currentTotalPairs > 0) ) {
      return;
    }

    powerUpUsedThisGame = true;
    $(this).prop("disabled", true);

    const wasGameBusy = gameBusy; 
    gameBusy = true; 

    const cardsToPeek = $(".card:not(.matched):not(.flip)");
    cardsToPeek.addClass("flip"); 

    setTimeout(function() {
      cardsToPeek.each(function() {
        if (!$(this).hasClass("matched")) { 
          $(this).removeClass("flip");
        }
      });
      gameBusy = wasGameBusy; 
    }, 1000); 
  });

  document.getElementById("game_grid").innerHTML = "<p>Select difficulty and click Start Game.</p>";
});