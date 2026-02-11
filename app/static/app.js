let map;
let markers = [];
let currentUser = null;
let currentToken = null;

// 1. Initialize Google Map
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 40.7128, lng: -74.0060}, // NYC Default
        zoom: 12
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
            map.setCenter(pos);
        });
    }
}

// 2. Clear Markers from Map
function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

// 3. Search for nearby spots (Bars, Cafes, Restaurants)
async function searchNearby() {
    if (!currentToken) {
        alert('Please login first');
        return;
    }

    const spotType = document.getElementById('spot-type').value;
    const cuisine = document.getElementById('cuisine').value;
    const center = map.getCenter();

    try {
        // Calling your restructured FastAPI endpoint
        const response = await fetch(`/map/nearby?lat=${center.lat()}&lng=${center.lng()}&spot_type=${spotType}&cuisine=${cuisine}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const places = await response.json();

        clearMarkers();

        places.forEach(place => {
            // Using real lat/lng from backend, no more Math.random!
            const marker = new google.maps.Marker({
                position: { lat: place.lat, lng: place.lng },
                map: map,
                title: place.name
            });

            marker.addListener('click', () => showPlaceDetails(place.place_id));
            markers.push(marker);
        });
    } catch (error) {
        console.error('Error searching nearby:', error);
    }
}

// 4. Show Place Details & Add Fav Button
async function showPlaceDetails(placeId) {
    if (!currentToken) return;

    try {
        const response = await fetch(`/map/place-details/${placeId}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const details = await response.json();

        const detailsDiv = document.getElementById('place-details');
        detailsDiv.innerHTML = `
            <h3>${details.name}</h3>
            <p>Address: ${details.address}</p>
            <p>Rating: ⭐ ${details.rating || 'N/A'}</p>
            <p>Price: ${'$'.repeat(details.price_level) || 'Unknown'}</p>
            <button onclick="addToFavourites('${placeId}', '${details.name}', '${details.address}', ${details.rating || 0}, ${details.price_level || 0})">
                Add to Favourites
            </button>
        `;
    } catch (error) {
        console.error('Error getting details:', error);
    }
}

// 5. Add to Favourites (JSON Body Fix)
async function addToFavourites(placeId, name, address, rating, priceLevel) {
    try {
        const response = await fetch('/favourites/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // Backend expects JSON
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                place_id: placeId,
                place_name: name,
                place_address: address,
                place_rating: rating,
                place_price_level: priceLevel
            })
        });

        if (response.ok) {
            alert('Added to favourites!');
            loadFavourites();
        } else {
            alert('Already in your favourites or session expired');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// --- Auth & UI Helpers (Simplified) ---

async function login(username, password) {
    const response = await fetch('/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password })
    });
    if (response.ok) {
        const data = await response.json();
        currentToken = data.access_token;
        localStorage.setItem('token', currentToken);
        location.reload(); // Refresh to update UI
    } else {
        alert('Login failed');
    }
}

async function loadFavourites() {
    if (!currentToken) return;
    const response = await fetch('/favourites/', {
        headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const favourites = await response.json();
    const list = document.getElementById('favourites-list');
    list.innerHTML = favourites.map(fav => `
        <li onclick="showPlaceDetails('${fav.place_id}')">${fav.name}</li>
    `).join('');
}

// Event Listeners initialization...
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    currentToken = localStorage.getItem('token');
    if (currentToken) {
        loadUser();
        loadFavourites();
    }
    document.getElementById('search-btn').onclick = searchNearby;
});

function updateUI() {
    const authControls = document.getElementById('auth-controls');
    
    if (currentToken) {
        // If logged in, show username and logout
        authControls.innerHTML = `
            <span class="user-greeting">Hi, ${currentUser ? currentUser.username : 'Gourmet'}!</span>
            <button onclick="logout()" class="btn-secondary">Logout</button>
        `;
    } else {
        // If logged out, show Login button
        authControls.innerHTML = `
            <button onclick="showAuthModal()" class="btn-primary">Login / Sign Up</button>
        `;
    }
}

function showAuthModal() {
    document.getElementById('auth-modal').style.display = 'block';
}

function logout() {
    localStorage.removeItem('token');
    currentToken = null;
    currentUser = null;
    window.location.reload(); // Hard refresh to clear all states
}

// 1. Update the list to include a delete icon/button
async function loadFavourites() {
    if (!currentToken) return;

    try {
        const response = await fetch('/favourites/', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const favourites = await response.json();

        const list = document.getElementById('favourites-list');
        list.innerHTML = ''; // Clear current list

        favourites.forEach(fav => {
            const li = document.createElement('li');
            li.className = 'fav-item';
            li.innerHTML = `
                <span onclick="showPlaceDetails('${fav.place_id}')">${fav.name}</span>
                <button class="delete-btn" onclick="removeFavourite('${fav.place_id}')">×</button>
            `;
            list.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading favourites:', error);
    }
}

// 2. New function to call the DELETE endpoint
async function removeFavourite(placeId) {
    if (!confirm("Remove this from your favourites?")) return;

    try {
        const response = await fetch(`/favourites/remove/${placeId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            loadFavourites(); // Refresh the list
        } else {
            alert('Failed to remove favourite');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}