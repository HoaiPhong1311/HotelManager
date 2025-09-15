// User Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard module loaded');
    initializeDashboard();
});

// Global variables
let currentUser = null;
let userBookings = [];

// Initialize dashboard
async function initializeDashboard() {
    try {
        // Check if user is logged in
        if (!HotelManager.Utils.isLoggedIn()) {
            showError();
            return;
        }

        console.log('Loading dashboard...');
        
        // Load user data FIRST, then bookings (bookings need user ID)
        await loadUserData();
        await loadUserBookings();
        
        // Populate dashboard
        populateUserProfile();
        populateQuickStats();
        populateRecentBookings();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize navigation
        HotelManager.Navigation.updateNavigation();
        
        // Show main content
        showMainContent();
        
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showError();
    }
}

// Load user data
async function loadUserData() {
    try {
        console.log('Loading user data...');
        
        const response = await HotelManager.ApiService.get('/users/get-logged-in-profile-info');
        
        if (response && response.statusCode === 200 && response.user) {
            currentUser = response.user;
            console.log('User data loaded:', currentUser);
        } else {
            throw new Error('Failed to load user data');
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        throw error;
    }
}

// Load user bookings
async function loadUserBookings() {
    try {
        console.log('Loading user bookings...');
        console.log('Current user:', currentUser);
        
        if (!currentUser || !currentUser.id) {
            console.warn('No user ID available for booking lookup', { currentUser });
            return;
        }

        console.log(`Making API call to: /users/get-user-bookings/${currentUser.id}`);
        const response = await HotelManager.ApiService.get(`/users/get-user-bookings/${currentUser.id}`);
        
        console.log('Bookings API response:', response);
        
        if (response && response.statusCode === 200 && response.user && response.user.bookings) {
            userBookings = response.user.bookings;
            console.log('User bookings loaded successfully:', userBookings);
        } else if (response && response.statusCode === 200 && response.user) {
            // User exists but no bookings
            userBookings = [];
            console.log('User found but no bookings available');
        } else {
            console.log('No bookings found or API call failed. Response:', response);
            userBookings = [];
        }
    } catch (error) {
        console.error('Error loading user bookings:', error);
        console.error('Error details:', error.response || error.message);
        userBookings = [];
    }
}

// Populate user profile
function populateUserProfile() {
    if (!currentUser) return;

    try {
        document.getElementById('userName').textContent = currentUser.name || 'User';
        document.getElementById('profileName').textContent = currentUser.name || 'N/A';
        document.getElementById('profileEmail').textContent = currentUser.email || 'N/A';
        document.getElementById('profilePhone').textContent = currentUser.phoneNumber || 'N/A';
        
        // Set member since (assuming user creation date or fallback to current year)
        const memberSince = new Date().getFullYear();
        document.getElementById('memberSince').textContent = memberSince;

        console.log('User profile populated');
    } catch (error) {
        console.error('Error populating user profile:', error);
    }
}

// Populate quick stats
function populateQuickStats() {
    try {
        const today = new Date();
        
        // Calculate booking statistics
        const totalBookings = userBookings.length;
        
        const activeBookings = userBookings.filter(booking => {
            const checkIn = new Date(booking.checkInDate);
            const checkOut = new Date(booking.checkOutDate);
            return today >= checkIn && today <= checkOut;
        }).length;
        
        const upcomingBookings = userBookings.filter(booking => {
            const checkIn = new Date(booking.checkInDate);
            return checkIn > today;
        }).length;
        
        const completedBookings = userBookings.filter(booking => {
            const checkOut = new Date(booking.checkOutDate);
            return checkOut < today;
        }).length;

        // Update stats display
        document.getElementById('totalBookings').textContent = totalBookings;
        document.getElementById('activeBookings').textContent = activeBookings;
        document.getElementById('upcomingBookings').textContent = upcomingBookings;
        document.getElementById('completedBookings').textContent = completedBookings;

        console.log('Quick stats populated:', { totalBookings, activeBookings, upcomingBookings, completedBookings });
    } catch (error) {
        console.error('Error populating quick stats:', error);
    }
}

// Populate recent bookings
function populateRecentBookings() {
    try {
        const bookingsLoading = document.getElementById('bookingsLoading');
        const noBookings = document.getElementById('noBookings');
        const recentBookingsList = document.getElementById('recentBookingsList');

        // Hide loading
        bookingsLoading.style.display = 'none';

        if (userBookings.length === 0) {
            noBookings.style.display = 'block';
            return;
        }

        // Show recent bookings (last 3)
        const recentBookings = userBookings
            .sort((a, b) => new Date(b.checkInDate) - new Date(a.checkInDate))
            .slice(0, 3);

        recentBookingsList.innerHTML = '';
        recentBookings.forEach(booking => {
            const bookingCard = createBookingCard(booking, true);
            recentBookingsList.appendChild(bookingCard);
        });

        recentBookingsList.style.display = 'block';

        console.log('Recent bookings populated:', recentBookings.length);
    } catch (error) {
        console.error('Error populating recent bookings:', error);
    }
}

// Create booking card
function createBookingCard(booking, isCompact = false) {
    const div = document.createElement('div');
    div.className = isCompact ? 'border-bottom pb-3 mb-3' : 'card card-custom mb-3';

    const checkInDate = formatDate(booking.checkInDate);
    const checkOutDate = formatDate(booking.checkOutDate);
    const status = getBookingStatus(booking);

    if (isCompact) {
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="mb-1">Booking #${booking.bookingConfirmationCode}</h6>
                    <p class="mb-1 text-muted small">
                        <i class="fas fa-calendar me-1"></i>${checkInDate} - ${checkOutDate}
                    </p>
                    <p class="mb-0 text-muted small">
                        <i class="fas fa-users me-1"></i>${booking.numOfAdults} adults, ${booking.numOfChildren} children
                    </p>
                </div>
                <div class="text-end">
                    <span class="badge ${getStatusBadgeClass(status)}">${status}</span>
                </div>
            </div>
        `;
    } else {
        div.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h5 class="card-title">Booking #${booking.bookingConfirmationCode}</h5>
                        <span class="badge ${getStatusBadgeClass(status)}">${status}</span>
                    </div>
                    <div class="text-end">
                        <button class="btn btn-outline-primary btn-sm" onclick="viewBookingDetails('${booking.bookingConfirmationCode}')">
                            <i class="fas fa-eye me-1"></i>View Details
                        </button>
                    </div>
                </div>
                <div class="row g-3">
                    <div class="col-md-6">
                        <small class="text-muted">Check-in</small>
                        <div class="fw-semibold">${checkInDate}</div>
                    </div>
                    <div class="col-md-6">
                        <small class="text-muted">Check-out</small>
                        <div class="fw-semibold">${checkOutDate}</div>
                    </div>
                    <div class="col-md-6">
                        <small class="text-muted">Guests</small>
                        <div class="fw-semibold">${booking.numOfAdults} adults, ${booking.numOfChildren} children</div>
                    </div>
                    <div class="col-md-6">
                        <small class="text-muted">Guest Name</small>
                        <div class="fw-semibold">${booking.guestName || 'N/A'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    return div;
}

// Get booking status
function getBookingStatus(booking) {
    const today = new Date();
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);

    if (today < checkIn) {
        return 'Upcoming';
    } else if (today >= checkIn && today <= checkOut) {
        return 'Active';
    } else {
        return 'Completed';
    }
}

// Get status badge class
function getStatusBadgeClass(status) {
    switch (status) {
        case 'Upcoming':
            return 'bg-info';
        case 'Active':
            return 'bg-success';
        case 'Completed':
            return 'bg-secondary';
        default:
            return 'bg-primary';
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// Setup event listeners
function setupEventListeners() {
    console.log('Event listeners setup completed');
}


// View booking details
function viewBookingDetails(confirmationCode) {
    // For now, redirect to my-bookings page with filter
    window.location.href = `my-bookings.html?booking=${confirmationCode}`;
}

// Show main content
function showMainContent() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

// Show error state
function showError() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
}

// Make functions available globally
window.viewBookingDetails = viewBookingDetails;

console.log('Dashboard module initialized');
