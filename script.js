// TODO: FIX BUTTONS NOT WORKING (CLICKING FLASHCARD, RATE BUTTONS) // done
// SAVE CARD RATINGS AND MAKE ALGORITHM // done

const apiBase = "https://flashcardapp-api.onrender.com";

let deck = [];
let currentIndex = 0;
let word = null;

let cardDeckIndex = 0
let calculatedDeckLength = 0

let isFlipped = false;


// get userid cookie (if found)
function getCookieValue(name) {
  const cookies = document.cookie.split('; ');
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === name) return value;
  }
  return null;
}

const userIdStr = getCookieValue('userId');
const userId = userIdStr ? parseInt(userIdStr, 10) : null;

// check if its a valid cookie, if not send to sign in page
fetch(`${apiBase}/authenticate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId })
})
  .then(response => {
    if (response.ok) {
      console.log("UserId Valid")

    } else if (response.status === 404) {
      window.location.href = 'signin.html';
      alert('User not found');
    } else {
      window.location.href = 'signin.html';
      alert('Error during authentication');
    }
  })
  .catch(() => {
    alert('Network error');
  });


console.log(userId)

function updateCardCounter() {
  const counterDiv = document.getElementById('card-counter');
  counterDiv.textContent = `Card ${currentIndex + 1} / ${calculatedDeckLength + currentIndex}`;
}


fetch(`${apiBase}/getUserDeck`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId })
})
  .then(res => res.ok ? res.json() : Promise.reject(res.status))
  .then(data => {
    deck = data;
    word = deck[currentIndex];
    renderFlashcard();
  })
  .catch(err => console.error('Error loading deck:', err));




function convertTextToJSON(inputText) {
  const lines = inputText.trim().split('\n');

  let separator = '\t';
  let html = false;

  // get settings from the comments
  for (let line of lines) {
    if (line.startsWith('#separator:')) {
      const sepType = line.split(':')[1].trim();
      if (sepType === 'tab') separator = '\t';
      else if (sepType === 'comma') separator = ',';
      else if (sepType === 'pipe') separator = '|';
    } else if (line.startsWith('#html:')) {
      html = line.split(':')[1].trim().toLowerCase() === 'true';
    }
  }

  // remove start lines (they define the split char and html stuff)
  const dataLines = lines.filter(line => !line.startsWith('#'));

  if (dataLines.length < 1) {
    console.error("Not enough data lines.");
    return;
  }

  const cards = [];

  for (let i = 0; i < dataLines.length; i++) {
    const row = dataLines[i].split(separator);

    let front = row[0] || "";
    let back = row[1] || "";

    if (!html) {
      const txt = document.createElement('textarea');
      txt.innerHTML = front;
      front = txt.value;

      txt.innerHTML = back;
      back = txt.value;
    }

    cards.push({ Front: front, Back: back });
  }

  return JSON.stringify(cards, null, 2);
}

function postDeck(json) {
  // send to api
  fetch(`${apiBase}/updateUserDeck`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(json)
  })
    .then(res => res.json())
    .then(responseData => {
      console.log('Server response:', responseData);
    })
    .catch(err => {
      console.error('Error sending data:', err);
    });
}

function updateIndexInDeck(payload) {
  const { index, newTable } = payload;

  fetch(`${apiBase}/updateDeckItem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  // sync locally so we can pick the next card on the client instead from server
  if (Array.isArray(deck) && index >= 0 && index < deck.length) {
    deck[index] = newTable;
    console.log('Local deck updated:', deck);
    renderFlashcard(); // Optional: only if currentIndex is affected
  } else {
    console.error("Index out of range in local deck");
  }

}


const dropZone = document.getElementById('drop-zone');
const dropMessage = document.getElementById('drop-message');
const dropOverlay = document.getElementById('drop-overlay');


dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropOverlay.style.display = 'block';
  dropOverlay.style.pointerEvents = 'auto'; // only block while dragging
});

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropOverlay.style.display = 'none';
  dropOverlay.style.pointerEvents = 'none';
});


dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropOverlay.style.display = 'none';
  dropOverlay.style.pointerEvents = 'none';

  const files = e.dataTransfer.files;
  if (files.length === 0) {
    alert('No file dropped.');
    return;
  }

  const file = files[0];

  if (!file.name.endsWith('.txt')) {
    alert('Please drop a valid TXT file.');
    return;
  }


  // post to api database
  const reader = new FileReader();

  reader.onload = function (event) {
    const fileText = event.target.result; 
    const deckJson = convertTextToJSON(fileText);
    console.log(deckJson); 

    const deckString = typeof deckJson === 'string' ? deckJson : JSON.stringify(deckJson);


    const payload = {
      deck: deckString,
      userId: userId
    };

    postDeck(payload)

    // small delay
    setTimeout(() => {
     window.location.href = 'signin.html';
}, 300);


  };



  reader.readAsText(file);

});



const flashcard = document.getElementById('flashcard');
const front = flashcard.querySelector('.flashcard-front');
const back = flashcard.querySelector('.flashcard-back');
const buttons = document.getElementById('button-container').querySelectorAll('button');


// update card text and also display front text on back
function renderFlashcard() {
  if (!word) {
    // was an error saying this so just wait
    console.warn('No word to render yet');
    return;
  }

  // update card counter to make sure its up to date
  updateCardCounter();

  front.innerHTML = `
    <div style="text-align:center; width:100%;">
      <h2 style="font-size:2rem; font-weight:bold; margin:0;">${word.Front}</h2>
    </div>
  `;


  // SET A TIMEOUT BECAUSE IT WAS SHOWING ANSWER WHEN FLIPPING OVER TO NEXT CARD
  setTimeout(() => {
    back.innerHTML = `
      <div style="text-align:center; width:100%;">
        <div style="font-size:1rem; font-weight:normal; margin-bottom:15px; color:#555;">
          ${word.Front}
        </div>
        <div style="font-size:2rem; font-weight:bold;">
          ${word.Back}
        </div>
      </div>
    `;
  }, 300);
}



deck.forEach(card => {
  card.nextDue = 0; // ready immediately
});



function calcDeckLength() {

  calculatedDeckLength = 0

  for (let i = 0; i < deck.length; i++) {
    const v = deck[i]
    if (v['Rating']) {

      const date = v['Rating'][0]
      const level = v['Rating'][1]

      if (level == 1 && Date.now() - date >= 10000) {
        calculatedDeckLength++
      }
      else if (level == 2 && Date.now() - date >= 300000) {
        calculatedDeckLength++
      }
      // 4h
      else if (level == 3 && Date.now() - date >= 3600000 * 4) {
        calculatedDeckLength++
      }
      // 24h
      else if (level == 4 && Date.now() - date >= (3600000 * 24)) {
        calculatedDeckLength++
      }
    }
    else {
      calculatedDeckLength++
    }

  }

}

// wait for deck to load so its not 0
setTimeout(() => {
  calcDeckLength();
  updateCardCounter();
}, 300);


// algorithm to find a card you struggled on or havnt done yet // TODO link to API
// the idea is to timestamp your ratings to not show them for a while if they have been rated good. and vice versa

// make it a func so we can reuse when space is pressed
// got this from a codepen project so thank you



function flip() {

  if (!isFlipped) {
    flashcard.classList.add('flipped');
    isFlipped = true;
  } else {
    flashcard.classList.remove('flipped');
    isFlipped = false;

    // go to next card:

    // put the rating logic + finding a new card + timestamp comparing

    const oldWord = word
    // get a card based on how long ago it was set, or just a card that has never been set
    let wasSet = false
    for (let i = 0; i < deck.length; i++) {
      const v = deck[i]
      if (v['Rating']) {

        const level = v['Rating'][1]
        const date = v['Rating'][0]

        // 6s
        if (level == 1 && Date.now() - date >= 10000) {
          word = deck[i];
          cardDeckIndex = i
          wasSet = true
          break
        }
        else if (level == 2 && Date.now() - date >= 300000) {
          word = deck[i];
          cardDeckIndex = i
          wasSet = true
          break
        }
        // 4h
        else if (level == 3 && Date.now() - date >= (3600000 * 4)) {
          word = deck[i];
          cardDeckIndex = i
          wasSet = true
          break
        }
        // 24h
        else if (level == 4 && Date.now() - date >= (3600000 * 24)) {
          word = deck[i];
          cardDeckIndex = i
          wasSet = true
          break
        }
      }
    }

    if (!wasSet) {

      for (let i = 0; i < deck.length; i++) {
        const v = deck[i]
        if (!v['Rating']) {
          word = deck[i];
          cardDeckIndex = i
          wasSet = true
          break
        }
      }

    }


    calcDeckLength();


    // it will spam update the card count without this
    if (oldWord != word) {
      currentIndex++;
    }
    if (currentIndex >= calculatedDeckLength) {
      currentIndex = 0; // loop around
    }

    // word contains front and back from the json // TODO make it include its past ratings in here maybe
    //word = deck[currentIndex];
    renderFlashcard();
  }
}

function rateCard(level) {
  // only allow rating if user has seen back of the card
  if (isFlipped) {
    console.log(level);

    // update database using new endpoint to save the rating
    const payload1 = {
      userId: userId,
      index: cardDeckIndex,
      newTable: {
        Front: word.Front,
        Back: word.Back,
        Rating: [Date.now(), level]
      }
    }

    updateIndexInDeck(payload1)

    flip();
  }
}

// flip when clicked and go to next card
flashcard.addEventListener('click', () => {
  flip();
});



// TODO ADD KEYBOARD LISTENERS // done
buttons.forEach(button => {
  button.addEventListener('click', () => {
    rateCard(button.textContent)
  });
});

document.addEventListener('keydown', (event) => {
  const key = event.key;

  if (key === ' ') {
    flip();
  }

  if (key === '1' || key === '2' || key === '3' || key === '4') {
    rateCard(key)
  }
});


renderFlashcard();
