
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import { getFirestore, collection, doc, onSnapshot, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDp8RiAMM-MBaFw4VDGth3cFIF8pxvORPE",
  authDomain: "wny-photo-of-the-week.firebaseapp.com",
  projectId: "wny-photo-of-the-week",
  storageBucket: "wny-photo-of-the-week.firebasestorage.app",
  messagingSenderId: "982323538072",
  appId: "1:982323538072:web:5ee02ad7f43f83d77948ed",
  measurementId: "G-SZBWXENGGQ"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const message = document.getElementById("potw-message");
const total = document.getElementById("potw-total");
const buttons = [...document.querySelectorAll(".potw-vote")];
const ids = ["photo1", "photo2", "photo3"];
let currentUser = null;
let votedId = null;
let votesReady = false;
let submitting = false;

function updateButtons() {
  buttons.forEach(button => {
    button.disabled = !currentUser || !votesReady || !!votedId || submitting;
    button.textContent = votedId === button.dataset.photoId
      ? "✓ YOUR VOTE" : votedId ? "VOTING CLOSED FOR YOU" : "VOTE FOR THIS PHOTO";
  });
}

onSnapshot(collection(db, "photoVotes"), snapshot => {
  const counts = {photo1: 0, photo2: 0, photo3: 0};
  snapshot.forEach(vote => {
    const data = vote.data();
    if (Object.prototype.hasOwnProperty.call(counts, data.photoId)) counts[data.photoId]++;
    if (currentUser && vote.id === currentUser.uid) votedId = data.photoId;
  });
  const sum = Object.values(counts).reduce((a,b) => a+b, 0);
  ids.forEach(id => {
    const el = document.getElementById("potw-count-" + id);
    const percent = sum ? Math.round(counts[id] / sum * 100) : 0;
    el.textContent = counts[id] + (counts[id] === 1 ? " vote" : " votes") + " • " + percent + "%";
  });
  total.textContent = "Total votes: " + sum;
  message.textContent = votedId ? "Thanks for voting! Your choice has been recorded." :
    currentUser ? "Voting is open! Select one photo below." : "Connecting to voting…";
  updateButtons();
}, error => {
  votesReady = false;
  message.textContent = "Voting results are unavailable. Check your Firebase Firestore rules and connection.";
  console.error("Photo voting results:", error);
  updateButtons();
});

onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    // A fresh snapshot ensures existing votes are recognized for this account.
    votesReady = false;
    updateButtons();
    // onSnapshot fires again when auth changes only if we resubscribe; the
    // existing listener's cached results may already have loaded, so use a
    // direct one-document lookup before allowing another vote.
    try {
      const { getDocFromServer } = await import("https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js");
      const existing = await getDocFromServer(doc(db, "photoVotes", user.uid));
      votedId = existing.exists() ? existing.data().photoId : null;
      votesReady = true;
      message.textContent = votedId ? "Thanks for voting! Your choice has been recorded." : "Voting is open! Select one photo below.";
    } catch (error) {
      message.textContent = "Unable to verify voting status. Please try again later.";
      console.error("Vote verification:", error);
    }
    updateButtons();
  } else {
    currentUser = null;
    updateButtons();
    try { await signInAnonymously(auth); }
    catch (error) {
      message.textContent = "Anonymous voting sign-in failed. Please try again later.";
      console.error("Anonymous sign-in:", error);
    }
  }
});

buttons.forEach(button => button.addEventListener("click", async () => {
  if (!currentUser || !votesReady || votedId || submitting) return;
  submitting = true;
  updateButtons();
  message.textContent = "Submitting your vote…";
  try {
    const ref = doc(db, "photoVotes", currentUser.uid);
    await runTransaction(db, async transaction => {
      const previous = await transaction.get(ref);
      if (previous.exists()) throw Error('Already voted');
      transaction.set(ref, {photoId: button.dataset.photoId, createdAt: serverTimestamp()});
    });
    votedId = button.dataset.photoId;
    message.textContent = "Vote submitted! Thanks for participating.";
  } catch (error) {
    message.textContent = "Vote could not be saved. You may have already voted. Please refresh to check.";
    console.error("Vote submission:", error);
  } finally {
    submitting = false;
    updateButtons();
  }
}));
