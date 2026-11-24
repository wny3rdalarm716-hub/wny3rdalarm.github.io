
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';

import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

import {
  getFirestore,
  doc,
  collection,
  getDocFromServer,
  getDocsFromServer,
  query,
  orderBy,
  limit,
  addDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

import {
  config,
  configured,
  announcements,
  photoLabels,
  categories
} from '../admin-config.js?v=2.4';

const $ = id => document.getElementById(id);
const status = t => $('status').textContent = t;

const el = (tag, t) => {
  const e = document.createElement(tag);
  e.textContent = t;
  return e;
};

let auth;
let db;
let authorized = false;
let epoch = 0;
let busy = false;

const day = 86400000;

function setPanels(user, verified = false, allowed = false) {
  authorized = allowed;

  $('signin').hidden = !!user;
  $('session').hidden = !user;
  $('verify').hidden = !user || verified;
  $('dashboard').hidden = !allowed;
  $('identity').textContent = user?.email || '';

  if (!allowed) {
    $('drafts').replaceChildren();
    $('published').replaceChildren();
    $('save-settings').disabled = true;
  }
}

function action(fn) {
  return async e => {
    e?.preventDefault();

    if (busy) return;
    busy = true;

    try {
      await fn();
    } catch (err) {
      status(
        'Unable to complete action. ' +
        (err.code === 'permission-denied'
          ? 'Access denied. Check staff authorization and rules.'
          : err.message || 'Try again.')
      );
    } finally {
      busy = false;
    }
  };
}

function requireAdmin() {
  if (!authorized || !auth.currentUser) {
    throw Error('Staff access required.');
  }

  return auth.currentUser.uid;
}

const docRef = (col, id) => doc(db, col, id);

function initFields() {
  for (const [k, v] of Object.entries(announcements)) {
    const o = el('option', v || 'No announcement');
    o.value = k;
    $('announcement').append(o);
  }

  for (const [k, v] of Object.entries(categories)) {
    const o = el('option', v);
    o.value = k;
    $('category').append(o);
  }

  for (const [k, v] of Object.entries(photoLabels)) {
    const l = el('label', '');
    l.className = 'check';

    const c = document.createElement('input');
    c.type = 'checkbox';
    c.checked = true;
    c.dataset.photo = k;

    l.append(c, document.createTextNode(v));
    $('photos').append(l);
  }
}

// Improved staff authorization diagnostics

async function checkUser(user) {
  const generation = ++epoch;

  setPanels(user, !!user?.emailVerified, false);

  if (!user) {
    status('Sign in with an authorized staff account.');
    return;
  }

  try {
    await user.reload();

    if (generation !== epoch) return;

    setPanels(user, user.emailVerified, false);

    if (!user.emailVerified) {
      status('Email verification required.');
      return;
    }

    await user.getIdToken(true);

    if (generation !== epoch) return;

    status('Checking staff permissions...');

    const grant = await getDocFromServer(
      docRef('staffAccess', user.uid)
    );

    if (generation !== epoch) return;

    if (!grant.exists()) {
      status(
        'Diagnostic V2.4.1: Staff document not found. ' +
        'Project: ' + config.projectId + '. ' +
        'Expected document: staffAccess/' + user.uid
      );
      return;
    }

    if (grant.data().active !== true) {
      status(
        'Diagnostic V2.4.1: Staff document found, ' +
        'but active is not Boolean true. ' +
        'Received type: ' + typeof grant.data().active
      );
      return;
    }

    setPanels(user, true, true);

  } catch (e) {
    if (generation === epoch) {
      setPanels(user, !!user.emailVerified, false);

      status(
        'Diagnostic V2.4.1: Authorization check failed. ' +
        'Error: ' + (e.code || 'unknown')
      );
    }

    return;
  }

  try {
    await refreshAll();

    if (generation !== epoch) return;

    status('Signed in · Full staff permissions');

  } catch (e) {
    if (generation === epoch) {
      setPanels(user, true, false);

      status(
        'Staff authorization passed, but dashboard loading failed. ' +
        'Error: ' + (e.code || 'unknown')
      );
    }
  }
}

async function refreshAll() {
  const uid = requireAdmin();
  const generation = epoch;

  const [settings, drafts, published] = await Promise.all([
    getDocFromServer(docRef('publicSettings', 'app')),

    getDocsFromServer(
      query(
        collection(db, 'reviewDrafts'),
        orderBy('createdAt', 'desc'),
        limit(40)
      )
    ),

    getDocsFromServer(
      query(
        collection(db, 'publicHistory'),
        orderBy('publishedAt', 'desc'),
        limit(40)
      )
    )
  ]);

  if (generation !== epoch || !authorized) return;

  const s = settings.data() || {};

  $('announcement').value =
    Object.hasOwn(announcements, s.announcement)
      ? s.announcement
      : 'none';

  for (const c of $('photos').querySelectorAll('input')) {
    c.checked = !(s.hiddenPhotos || []).includes(c.dataset.photo);
  }

  $('save-settings').disabled = false;

  const pending = drafts.docs.filter(
    x => x.data().state === 'pending'
  );

  $('pending-count').textContent =
    pending.length + (drafts.size === 40 ? '+' : '');

  $('published-count').textContent =
    published.size + (published.size === 40 ? '+' : '');

  $('drafts').replaceChildren();
  $('published').replaceChildren();

  if (!pending.length) {
    $('drafts').append(el('p', 'No pending drafts.'));
  }

  for (const snap of pending) {
    const d = snap.data();
    const row = el('div', '');

    row.className = 'review-row';

    row.append(
      el('strong', categories[d.category] || 'Unknown category')
    );

    const ready =
      d.createdAt?.toMillis() + day <= Date.now();

    row.append(
      el(
        'p',
        d.author === uid
          ? 'Your draft — another staff member must review.'
          : ready
            ? 'Eligible for independent review.'
            : 'Waiting for the 24-hour review hold.'
      )
    );

    const approve = el('button', 'Approve & publish');
    approve.className = 'button';
    approve.disabled = d.author === uid || !ready;

    approve.onclick = action(async () => {
      requireAdmin();

      if (!confirm(
        'I independently confirmed this historical summary is appropriate for public release. Publish the general category only?'
      )) return;

      const batch = writeBatch(db);

      batch.update(snap.ref, {
        state: 'published',
        reviewer: auth.currentUser.uid,
        reviewedAt: serverTimestamp()
      });

      batch.set(docRef('publicHistory', snap.id), {
        category: d.category,
        publishedAt: serverTimestamp()
      });

      await batch.commit();
      await refreshAll();

      status('Historical summary published.');
    });

    const remove = el('button', 'Discard draft');
    remove.className = 'secondary';

    remove.onclick = action(async () => {
      requireAdmin();

      if (!confirm('Discard this unpublished draft?')) return;

      await deleteDoc(snap.ref);
      await refreshAll();

      status('Draft discarded.');
    });

    row.append(approve, remove);
    $('drafts').append(row);
  }

  if (!published.size) {
    $('published').append(
      el('p', 'No published historical summaries.')
    );
  }

  for (const snap of published.docs) {
    const d = snap.data();
    const row = el('div', '');

    row.className = 'review-row';

    row.append(
      el('strong', categories[d.category] || 'Unknown category'),
      el(
        'p',
        'Published ' +
        (d.publishedAt?.toDate().toLocaleDateString() || 'recently')
      )
    );

    const remove = el('button', 'Unpublish');
    remove.className = 'secondary';

    remove.onclick = action(async () => {
      requireAdmin();

      if (!confirm('Remove this summary from the public app?')) {
        return;
      }

      await deleteDoc(snap.ref);
      await refreshAll();

      status('Summary removed from public app.');
    });

    row.append(remove);
    $('published').append(row);
  }
}

async function start() {
  if (!configured) {
    status(
      'Setup required: configure the dedicated Firebase admin project. See ADMIN-SETUP.md.'
    );
    return;
  }

  const app = initializeApp(config, 'wny-admin');

  auth = getAuth(app);
  db = getFirestore(app);

  await setPersistence(auth, browserSessionPersistence);

  initFields();

  $('login').onsubmit = action(async () => {
    await signInWithEmailAndPassword(
      auth,
      $('email').value.trim(),
      $('password').value
    );

    $('password').value = '';
  });

  $('reset').onclick = action(async () => {
    const email = $('email').value.trim();

    if (!email) throw Error('Enter your email first.');

    await sendPasswordResetEmail(auth, email);

    status('If the account exists, a reset email will be sent.');
  });

  $('logout').onclick = action(async () => {
    ++epoch;

    setPanels(null);

    await signOut(auth);

    status('Signed out.');
  });

  $('send-verification').onclick = action(async () => {
    await sendEmailVerification(auth.currentUser);

    status('Verification email sent.');
  });

  $('check-verification').onclick = action(async () => {
    await checkUser(auth.currentUser);
  });

  $('settings-form').onsubmit = action(async () => {
    requireAdmin();

    const hiddenPhotos = [
      ...$('photos').querySelectorAll('input:not(:checked)')
    ].map(x => x.dataset.photo);

    await setDoc(docRef('publicSettings', 'app'), {
      announcement: $('announcement').value,
      hiddenPhotos
    });

    status('Public app settings saved.');
  });

  $('draft-form').onsubmit = action(async () => {
    const author = requireAdmin();

    if (!$('concluded').checked) {
      throw Error('Review confirmation required.');
    }

    await addDoc(collection(db, 'reviewDrafts'), {
      category: $('category').value,
      author,
      state: 'pending',
      createdAt: serverTimestamp()
    });

    $('concluded').checked = false;

    await refreshAll();

    status(
      'Draft saved. A different staff member can approve after the 24-hour hold.'
    );
  });

  $('refresh').onclick = action(refreshAll);

  onAuthStateChanged(auth, checkUser);
}

start().catch(e => {
  status('Staff portal unavailable: ' + e.message);
});
