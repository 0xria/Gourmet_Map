let map;
let markers = [];
let currentToken = localStorage.getItem('token');
let authModal;
let loginCont;
let regCont;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 40.7128, lng: -74.0060},
        zoom: 12
    });

    // Try to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            map.setCenter(pos);
        });
    }
}

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

async function searchNearby() {
    if (!currentToken) {
        alert('Please login first');
        return;
    }

    const spotType = document.getElementById('spot-type').value;
    const cuisine = document.getElementById('cuisine').value;

    const center = map.getCenter();
    const lat = center.lat();
    const lng = center.lng();

    try {
        const response = await fetch(`/map/nearby?lat=${lat}&lng=${lng}&spot_type=${spotType}&cuisine=${cuisine}`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        const places = await response.json();

        clearMarkers();

        places.forEach(place => {
            const marker = new google.maps.Marker({
                position: {lat: Math.random() * 0.01 + lat, lng: Math.random() * 0.01 + lng}, // Random for demo
                map: map,
                title: place.name
            });

            marker.addListener('click', () => {
                showPlaceDetails(place.place_id);
            });

            markers.push(marker);
        });
    } catch (error) {
        console.error('Error searching nearby:', error);
    }
}

async function showPlaceDetails(placeId) {
    if (!currentToken) return;

    try {
        const response = await fetch(`/map/place-details/${placeId}`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        const details = await response.json();

        const detailsDiv = document.getElementById('place-details');
        detailsDiv.innerHTML = `
            <h4>${details.name}</h4>
            <p>Address: ${details.address}</p>
            <p>Rating: ${details.rating}</p>
            <p>Price Level: ${details.price_level}</p>
            <button onclick="addToFavourites('${placeId}', '${details.name}', '${details.address}', ${details.rating}, ${details.price_level})">Add to Favourites</button>
        `;
    } catch (error) {
        console.error('Error getting place details:', error);
    }
}

async function addToFavourites(placeId, name, address, rating, priceLevel) {
    try {
        const response = await fetch('/favourites/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${currentToken}`
            },
            body: new URLSearchParams({
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
            alert('Error adding to favourites');
        }
    } catch (error) {
        console.error('Error adding to favourites:', error);
    }
}

async function loadFavourites() {
    if (!currentToken) return;

    try {
        const response = await fetch('/favourites/', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        const favourites = await response.json();

        const list = document.getElementById('favourites-list');
        list.innerHTML = '';
        favourites.forEach(fav => {
            const li = document.createElement('li');
            li.textContent = fav.name;
            li.onclick = () => showPlaceDetails(fav.place_id);
            list.appendChild(li);
        });
    } catch (error) {
        console.error('Error loading favourites:', error);
    }
}

async function login(username, password) {
    try {
        console.log('Attempting login for:', username);
        const response = await fetch('/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ username, password })
        });
        console.log('Login response status:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('Login successful, token received');
            localStorage.setItem('token', data.access_token);
            currentToken = data.access_token;
            document.getElementById('auth-modal').style.display = 'none';
            updateUI();
            loadFavourites();
        } else {
            const errorText = await response.text();
            console.error('Login failed:', response.status, errorText);
            alert('Login failed: ' + errorText);
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login error: ' + error.message);
    }
}

async function register(username, email, password) {
    try {
        console.log('Attempting registration for:', username, email);
        const response = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        console.log('Register response status:', response.status);
        if (response.ok) {
            console.log('Registration successful');
            alert('Account created! Please login.');
            document.getElementById('register-form-container').style.display = 'none';
            document.getElementById('login-form-container').style.display = 'block';
        } else {
            let errorMsg = 'Unknown error';
            try {
                const error = await response.json();
                errorMsg = error.detail || errorMsg;
            } catch {
                errorMsg = await response.text();
            }
            console.error('Registration failed:', response.status, errorMsg);
            alert('Registration failed: ' + errorMsg);
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration error: ' + error.message);
    }
}

function logout() {
    localStorage.removeItem('token');
    currentToken = null;
    updateUI();
}

function openLoginModal() {
    authModal.style.display = 'block';
    loginCont.style.display = 'block';
    regCont.style.display = 'none';
}

function openRegisterModal() {
    authModal.style.display = 'block';
    loginCont.style.display = 'none';
    regCont.style.display = 'block';
}

function closeModal() {
    authModal.style.display = 'none';
}

function switchToRegister() {
    loginCont.style.display = 'none';
    regCont.style.display = 'block';
}

function switchToLogin() {
    regCont.style.display = 'none';
    loginCont.style.display = 'block';
}

async function updateUI() {
    const authControls = document.getElementById('auth-controls');
    if (currentToken) {
        try {
            const response = await fetch('/auth/me', {
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });
            if (response.ok) {
                const user = await response.json();
                authControls.innerHTML = `
                    <span>Welcome, ${user.username}!</span>
                    <button onclick="logout()" class="auth-button">Sign Out</button>
                `;
            } else {
                // If fetch fails, just show sign out
                authControls.innerHTML = `
                    <button onclick="logout()" class="auth-button">Sign Out</button>
                `;
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            authControls.innerHTML = `
                <button onclick="logout()" class="auth-button">Sign Out</button>
            `;
        }
    } else {
        authControls.innerHTML = `
            <button id="login-btn" class="auth-button">Login</button>
            <button id="register-btn" class="auth-button">Create Account</button>
        `;
        // Reattach event listeners
        document.getElementById('login-btn').onclick = () => {
            authModal.style.display = 'block';
            loginCont.style.display = 'block';
            regCont.style.display = 'none';
        };
        document.getElementById('register-btn').onclick = () => {
            authModal.style.display = 'block';
            loginCont.style.display = 'none';
            regCont.style.display = 'block';
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    authModal = document.getElementById('auth-modal');
    loginCont = document.getElementById('login-form-container');
    regCont = document.getElementById('register-form-container');

    initMap();

    // Form submissions
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        login(document.getElementById('login-username').value, document.getElementById('login-password').value);
    });

    document.getElementById('register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        register(
            document.getElementById('reg-username').value,
            document.getElementById('reg-email').value,
            document.getElementById('reg-password').value
        );
    });

    // Modal toggles
    document.getElementById('go-to-reg').onclick = (e) => {
        e.preventDefault();
        loginCont.style.display = 'none';
        regCont.style.display = 'block';
    };

    document.getElementById('go-to-login').onclick = (e) => {
        e.preventDefault();
        regCont.style.display = 'none';
        loginCont.style.display = 'block';
    };

    document.querySelector('.close-modal').onclick = () => {
        authModal.style.display = 'none';
    };

    document.getElementById('search-btn').onclick = searchNearby;

    // Initial UI update
    updateUI();
    if (currentToken) {
        loadFavourites();
    }
});
