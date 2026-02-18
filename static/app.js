let map, markers = [];
let lastSearchPlaces = [];
let currentToken = localStorage.getItem('token');
let userPosition = null;
let selectedPlace = null;

function initMap() {
    if (typeof google === 'undefined' || !google.maps) return;
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 40.7128, lng: -74.0060 },
        zoom: 12
    });
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            p => {
                userPosition = { lat: p.coords.latitude, lng: p.coords.longitude };
                map.setCenter(userPosition);
            },
            () => console.warn('Geolocation denied or unavailable')
        );
    }
    setupApp();
}

function setupApp() {
    updateUI();
    if (currentToken) loadFavourites();

    const modal = document.getElementById('auth-modal');
    const loginView = document.getElementById('login-form-container');
    const regView = document.getElementById('register-form-container');

    if (modal && loginView && regView) {
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        if (loginBtn) loginBtn.onclick = () => { modal.style.display = 'block'; loginView.style.display = 'block'; regView.style.display = 'none'; };
        if (registerBtn) registerBtn.onclick = () => { modal.style.display = 'block'; loginView.style.display = 'none'; regView.style.display = 'block'; };
        const goToReg = document.getElementById('go-to-reg');
        const goToLogin = document.getElementById('go-to-login');
        if (goToReg) goToReg.onclick = () => { loginView.style.display = 'none'; regView.style.display = 'block'; };
        if (goToLogin) goToLogin.onclick = () => { regView.style.display = 'none'; loginView.style.display = 'block'; };
        const closeBtn = document.querySelector('.close-modal');
        if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; };
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        if (loginForm) loginForm.onsubmit = (e) => { e.preventDefault(); login(document.getElementById('login-username').value, document.getElementById('login-password').value); };
        if (registerForm) registerForm.onsubmit = (e) => { e.preventDefault(); register(document.getElementById('reg-username').value, document.getElementById('reg-email').value, document.getElementById('reg-password').value); };
    }

    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) searchBtn.onclick = searchNearby;
}

async function apiFetch(url, options = {}) {
    const headers = { ...options.headers };
    if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
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
    if (!authControls) return;
    if (currentToken) {
        const res = await apiFetch('/auth/me');
        if (res.ok) {
            const user = await res.json();
            authControls.innerHTML = `<span>Hi, ${user.username}</span><button onclick="logout()" class="auth-button">Logout</button>`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof google !== 'undefined' && google.maps) initMap();
});

let searchInProgress = false;

async function searchNearby() {
    if (searchInProgress) return;
    searchInProgress = true;
    const btn = document.getElementById('search-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Searching...';

    try {
        const spotType = document.getElementById('spot-type').value;
        const cuisine = document.getElementById('cuisine').value.trim() || null;
        let lat, lng;

        if (userPosition) {
            lat = userPosition.lat;
            lng = userPosition.lng;
        } else if (navigator.geolocation) {
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                userPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                map.setCenter(userPosition);
                lat = userPosition.lat;
                lng = userPosition.lng;
            } catch {
                alert('Please allow location access to find spots nearby.');
                return;
            }
        } else {
            alert('Location is required. Your browser does not support geolocation.');
            return;
        }

        const params = new URLSearchParams({ lat, lng, spot_type: spotType });
        if (cuisine) params.set('cuisine', cuisine);
        const res = await fetch(`/map/nearby?${params}`);
        if (!res.ok) {
            alert('Search failed. Please try again.');
            return;
        }
        const places = await res.json();
        lastSearchPlaces = places;
        clearMarkers();
        places.forEach(p => addMarker(p));
        showSearchResults(places);
        fitMapToMarkers();
    } finally {
        searchInProgress = false;
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

function clearMarkers() {
    markers.forEach(m => m.setMap(null));
    markers = [];
}

function showSearchResults(places) {
    const list = document.getElementById('search-results-list');
    if (!list) return;
    if (!places.length) {
        list.innerHTML = '<li class="empty">No spots found. Try a different search.</li>';
        return;
    }
    list.innerHTML = places.map(p => {
        const name = escapeHtml(p.name);
        const rating = p.rating != null ? ` ★ ${p.rating}` : '';
        const pid = escapeHtml(p.place_id);
        return `<li class="search-result-item" data-place-id="${pid}">${name}${rating}</li>`;
    }).join('');
    list.querySelectorAll('.search-result-item').forEach(li => {
        li.onclick = () => selectSearchResult(li.dataset.placeId);
    });
}

function selectSearchResult(placeId) {
    showPlaceDetails(placeId);
    const place = lastSearchPlaces?.find(p => p.place_id === placeId);
    if (place && map) {
        map.panTo({ lat: place.lat, lng: place.lng });
        map.setZoom(16);
    }
}

function fitMapToMarkers() {
    if (!markers.length) return;
    if (markers.length === 1) {
        map.panTo(markers[0].getPosition());
        map.setZoom(15);
    } else {
        const bounds = new google.maps.LatLngBounds();
        markers.forEach(m => bounds.extend(m.getPosition()));
        map.fitBounds(bounds, 50);
    }
}

function addMarker(place) {
    const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map,
        title: place.name
    });
    marker.addListener('click', () => showPlaceDetails(place.place_id));
    markers.push(marker);
}

async function showPlaceDetails(placeId) {
    const res = await fetch(`/map/place-details/${placeId}`);
    if (!res.ok) return;
    const place = await res.json();
    selectedPlace = place;

    const detailsEl = document.getElementById('place-details');
    const rating = place.rating != null ? `★ ${place.rating}` : '';
    const price = place.price_level != null ? '₽'.repeat(place.price_level) : '';
    detailsEl.innerHTML = `
        <h4>${escapeHtml(place.name)}</h4>
        <p>${escapeHtml(place.address || '')}</p>
        <p>${rating} ${price}</p>
        <button class="nav-btn" onclick="openNavigation()">Navigate</button>
        ${currentToken ? `<button class="fav-btn" onclick="addToFavourites()">❤ Add to Favourites</button>` : ''}
    `;
}

function escapeHtml(text) {
    if (text == null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function openNavigation() {
    if (!selectedPlace?.lat || !selectedPlace?.lng) return;
    const dest = `${selectedPlace.lat},${selectedPlace.lng}`;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`, '_blank');
}

async function addToFavourites() {
    if (!currentToken || !selectedPlace) return;
    const res = await apiFetch('/favourites/add', {
        method: 'POST',
        body: JSON.stringify({
            place_id: selectedPlace.place_id,
            place_name: selectedPlace.name,
            place_address: selectedPlace.address || '',
            place_rating: selectedPlace.rating,
            place_price_level: selectedPlace.price_level || 0
        })
    });
    if (res.ok) {
        loadFavourites();
        alert('Added to favourites!');
    } else {
        const err = await res.json();
        alert(err.detail || 'Failed to add favourite');
    }
}

async function loadFavourites() {
    if (!currentToken) return;
    const res = await apiFetch('/favourites');
    if (!res.ok) return;
    const favs = await res.json();
    const list = document.getElementById('favourites-list');
    if (!favs.length) {
        list.innerHTML = '<li class="empty">No favourites yet</li>';
        return;
    }
    list.innerHTML = favs.map(f => {
        const pid = escapeHtml(f.place_id);
        const name = escapeHtml(f.place_name);
        return `<li class="fav-item" data-place-id="${pid}">${name}</li>`;
    }).join('');
    list.querySelectorAll('.fav-item').forEach(li => {
        li.onclick = () => showPlaceDetails(li.dataset.placeId);
    });
}