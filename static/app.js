let map, markers = [];
let currentToken = localStorage.getItem('token');

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 40.7128, lng: -74.0060},
        zoom: 12
    });
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(p => {
            map.setCenter({lat: p.coords.latitude, lng: p.coords.longitude});
        });
    }
}

async function apiFetch(url, options = {}) {
    const headers = { 'Authorization': `Bearer ${currentToken}`, ...options.headers };
    if (options.body && !(options.body instanceof URLSearchParams)) {
        headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) logout();
    return res;
}

async function login(username, password) {
    const res = await fetch('/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password })
    });
    if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        location.reload();
    } else {
        alert("Login Failed: Check credentials.");
    }
}

async function register(username, email, password) {
    const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password })
    });
    if (res.ok) {
        alert("Account Created! Please Sign In.");
        document.getElementById('go-to-login').click();
    } else {
        const err = await res.json();
        alert(err.detail);
    }
}

function logout() {
    localStorage.removeItem('token');
    location.reload();
}

async function updateUI() {
    const authControls = document.getElementById('auth-controls');
    if (currentToken) {
        const res = await apiFetch('/auth/me');
        if (res.ok) {
            const user = await res.json();
            authControls.innerHTML = `<span>Hi, ${user.username}</span><button onclick="logout()" class="auth-button">Logout</button>`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    updateUI();
    if (currentToken) loadFavourites();

    // Modal Control Logic
    const modal = document.getElementById('auth-modal');
    const loginView = document.getElementById('login-form-container');
    const regView = document.getElementById('register-form-container');

    document.getElementById('login-btn').onclick = () => { modal.style.display = 'block'; loginView.style.display = 'block'; regView.style.display = 'none'; };
    document.getElementById('register-btn').onclick = () => { modal.style.display = 'block'; loginView.style.display = 'none'; regView.style.display = 'block'; };
    document.getElementById('go-to-reg').onclick = () => { loginView.style.display = 'none'; regView.style.display = 'block'; };
    document.getElementById('go-to-login').onclick = () => { regView.style.display = 'none'; loginView.style.display = 'block'; };
    document.querySelector('.close-modal').onclick = () => { modal.style.display = 'none'; };

    // Forms
    document.getElementById('login-form').onsubmit = (e) => {
        e.preventDefault();
        login(document.getElementById('login-username').value, document.getElementById('login-password').value);
    };
    document.getElementById('register-form').onsubmit = (e) => {
        e.preventDefault();
        register(document.getElementById('reg-username').value, document.getElementById('reg-email').value, document.getElementById('reg-password').value);
    };

    document.getElementById('search-btn').onclick = searchNearby;
});

// Include searchNearby, showPlaceDetails, etc. using apiFetch helper