// My Bookings Page JavaScript

let currentUser = null;
let allBookings = [];
let filteredBookings = [];
let currentFilter = 'all';
let currentSort = 'checkIn-desc';

document.addEventListener('DOMContentLoaded', function() {
    console.log('My Bookings module loaded');
    initializeMyBookings();
});

async function initializeMyBookings() {
    try {
        // Initialize navigation and check authentication
        HotelManager.Navigation.updateNavigation();
        await checkAuthentication();
        
        // Load user bookings
        await loadUserBookings();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initial display
        applyFiltersAndSort();
        updateStatistics();
        showMainContent();
        
        console.log('My Bookings page initialized successfully');
    } catch (error) {
        console.error('Error initializing My Bookings page:', error);
        showError('Failed to load bookings. Please try again.');
    }
}

// Check authentication
async function checkAuthentication() {
    if (!HotelManager.Utils.isLoggedIn()) {
        HotelManager.Utils.showToast('Please login to view your bookings', 'warning');
        setTimeout(() => {
            window.location.href = '../auth/login.html';
        }, 1500);
        throw new Error('User not authenticated');
    }
    
    currentUser = HotelManager.Utils.getUser();
    if (!currentUser || !currentUser.id) {
        HotelManager.Utils.showToast('User data not found. Please login again.', 'danger');
        setTimeout(() => {
            HotelManager.Navigation.logout();
        }, 1500);
        throw new Error('User data incomplete');
    }
    
    console.log('User authenticated:', currentUser);
}

// Load user bookings
async function loadUserBookings() {
    try {
        console.log('Loading user bookings...');
        
        const response = await HotelManager.ApiService.get(`/users/get-user-bookings/${currentUser.id}`);
        console.log('Bookings API response:', response);
        
        if (response && response.statusCode === 200 && response.user && response.user.bookings) {
            allBookings = response.user.bookings;
            filteredBookings = [...allBookings];
            console.log(`Loaded ${allBookings.length} user bookings`);
        } else if (response && response.statusCode === 200 && response.user) {
            // User exists but no bookings
            allBookings = [];
            filteredBookings = [];
            console.log('User found but no bookings available');
        } else {
            throw new Error(response?.message || 'Failed to load bookings');
        }
    } catch (error) {
        console.error('Error loading user bookings:', error);
        allBookings = [];
        filteredBookings = [];
        throw error;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchBookings');
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    statusFilter.addEventListener('change', handleStatusFilter);
    
    // Sort selector
    const sortBy = document.getElementById('sortBy');
    sortBy.addEventListener('change', handleSort);
    
    // Quick filter buttons
    const quickFilters = document.querySelectorAll('.quick-filter');
    quickFilters.forEach(button => {
        button.addEventListener('click', handleQuickFilter);
    });
    
    // Clear filters button
    const clearFilters = document.getElementById('clearFilters');
    clearFilters.addEventListener('click', handleClearFilters);
    
    // Modal buttons
    const cancelBookingBtn = document.getElementById('cancelBookingBtn');
    cancelBookingBtn.addEventListener('click', handleCancelBooking);
    
    console.log('Event listeners setup completed');
}

// Handle search
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    console.log('Search term:', searchTerm);
    
    if (searchTerm === '') {
        filteredBookings = [...allBookings];
    } else {
        filteredBookings = allBookings.filter(booking => {
            const confirmationCode = booking.bookingConfirmationCode?.toLowerCase() || '';
            const roomType = booking.room?.roomType?.toLowerCase() || '';
            
            return confirmationCode.includes(searchTerm) || roomType.includes(searchTerm);
        });
    }
    
    applyCurrentFilters();
    displayBookings();
    updateClearFiltersButton();
}

// Handle status filter
function handleStatusFilter(event) {
    const selectedStatus = event.target.value;
    console.log('Status filter:', selectedStatus);
    
    currentFilter = selectedStatus || 'all';
    updateQuickFilterButtons();
    applyFiltersAndSort();
    updateClearFiltersButton();
}

// Handle sort
function handleSort(event) {
    currentSort = event.target.value;
    console.log('Sort by:', currentSort);
    
    applyFiltersAndSort();
}

// Handle quick filter buttons
function handleQuickFilter(event) {
    const filter = event.target.getAttribute('data-filter');
    console.log('Quick filter:', filter);
    
    currentFilter = filter;
    
    // Update status filter dropdown
    const statusFilter = document.getElementById('statusFilter');
    statusFilter.value = filter === 'all' ? '' : filter;
    
    updateQuickFilterButtons();
    applyFiltersAndSort();
    updateClearFiltersButton();
}

// Handle clear filters
function handleClearFilters() {
    // Clear search
    document.getElementById('searchBookings').value = '';
    
    // Reset filters
    currentFilter = 'all';
    document.getElementById('statusFilter').value = '';
    
    // Reset sort
    currentSort = 'checkIn-desc';
    document.getElementById('sortBy').value = currentSort;
    
    // Reset data
    filteredBookings = [...allBookings];
    
    updateQuickFilterButtons();
    applyFiltersAndSort();
    updateClearFiltersButton();
}

// Apply current filters (without affecting sort)
function applyCurrentFilters() {
    if (currentFilter === 'all' || currentFilter === '') {
        return; // No status filtering needed
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    filteredBookings = filteredBookings.filter(booking => {
        const checkIn = new Date(booking.checkInDate);
        const checkOut = new Date(booking.checkOutDate);
        checkIn.setHours(0, 0, 0, 0);
        checkOut.setHours(0, 0, 0, 0);
        
        switch (currentFilter) {
            case 'active':
                return checkIn <= today && checkOut >= today;
            case 'upcoming':
                return checkIn > today;
            case 'completed':
                return checkOut < today;
            case 'cancelled':
                // Assuming we'll add a status field later
                return booking.status === 'cancelled';
            default:
                return true;
        }
    });
}

// Apply filters and sort
function applyFiltersAndSort() {
    // Start with all bookings
    filteredBookings = [...allBookings];
    
    // Apply status filter
    applyCurrentFilters();
    
    // Apply sort
    sortBookings();
    
    // Update display
    displayBookings();
    updateStatistics();
}

// Sort bookings
function sortBookings() {
    const [field, direction] = currentSort.split('-');
    
    filteredBookings.sort((a, b) => {
        let aValue, bValue;
        
        switch (field) {
            case 'checkIn':
                aValue = new Date(a.checkInDate);
                bValue = new Date(b.checkInDate);
                break;
            case 'created':
                aValue = new Date(a.id); // Using ID as proxy for creation time
                bValue = new Date(b.id);
                break;
            default:
                return 0;
        }
        
        if (direction === 'desc') {
            return bValue - aValue;
        } else {
            return aValue - bValue;
        }
    });
}

// Display bookings
function displayBookings() {
    const bookingsList = document.getElementById('bookingsList');
    const resultsCount = document.getElementById('resultsCount');
    const noResults = document.getElementById('noResults');
    
    resultsCount.textContent = filteredBookings.length;
    
    if (filteredBookings.length === 0) {
        bookingsList.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    bookingsList.innerHTML = '';
    filteredBookings.forEach(booking => {
        const bookingCard = createBookingCard(booking);
        bookingsList.appendChild(bookingCard);
    });
}

// Create booking card
function createBookingCard(booking) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'col-md-6 col-lg-4';
    
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let status, statusClass;
    if (checkIn <= today && checkOut >= today) {
        status = 'Active';
        statusClass = 'bg-success';
    } else if (checkIn > today) {
        status = 'Upcoming';
        statusClass = 'bg-info';
    } else {
        status = 'Completed';
        statusClass = 'bg-secondary';
    }
    
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    let imageUrl = 'https://via.placeholder.com/300x200/0d6efd/ffffff?text=Room';
    if (booking.room && booking.room.roomPhotoUrl) {
        imageUrl = `${HotelManager.CONFIG.API_BASE_URL}/uploads${booking.room.roomPhotoUrl.replace('/upload', '')}`;
    }
    
    cardDiv.innerHTML = `
        <div class="card card-custom h-100 shadow-sm">
            <div class="position-relative">
                <img src="${imageUrl}" class="card-img-top" alt="Room Image" style="height: 200px; object-fit: cover;">
                <span class="badge ${statusClass} position-absolute top-0 end-0 m-2">${status}</span>
            </div>
            <div class="card-body">
                <h5 class="card-title">${booking.room?.roomType || 'Room'}</h5>
                <p class="card-text text-muted mb-2">
                    <i class="fas fa-calendar me-2"></i>
                    ${formatDate(booking.checkInDate)} - ${formatDate(booking.checkOutDate)}
                </p>
                <p class="card-text text-muted mb-2">
                    <i class="fas fa-moon me-2"></i>
                    ${nights} night${nights > 1 ? 's' : ''}
                </p>
                <p class="card-text text-muted mb-2">
                    <i class="fas fa-users me-2"></i>
                    ${booking.numOfAdults} adult${booking.numOfAdults > 1 ? 's' : ''}${booking.numOfChildren > 0 ? `, ${booking.numOfChildren} child${booking.numOfChildren > 1 ? 'ren' : ''}` : ''}
                </p>
                <p class="card-text">
                    <small class="text-muted">
                        <i class="fas fa-hashtag me-1"></i>
                        ${booking.bookingConfirmationCode}
                    </small>
                </p>
            </div>
            <div class="card-footer bg-transparent">
                <button class="btn btn-outline-primary btn-sm w-100" onclick="viewBookingDetails('${booking.bookingConfirmationCode}')">
                    <i class="fas fa-eye me-1"></i>View Details
                </button>
            </div>
        </div>
    `;
    
    return cardDiv;
}

// Utility functions
function viewBookingDetails(confirmationCode) {
    const booking = allBookings.find(b => b.bookingConfirmationCode === confirmationCode);
    if (!booking) {
        HotelManager.Utils.showToast('Booking not found', 'danger');
        return;
    }
    
    populateBookingModal(booking);
    const modal = new bootstrap.Modal(document.getElementById('bookingDetailsModal'));
    modal.show();
}

function populateBookingModal(booking) {
    const modalImage = document.getElementById('modalRoomImage');
    if (booking.room && booking.room.roomPhotoUrl) {
        const imageUrl = `${HotelManager.CONFIG.API_BASE_URL}/uploads${booking.room.roomPhotoUrl.replace('/upload', '')}`;
        modalImage.src = imageUrl;
    }
    
    document.getElementById('modalRoomTitle').textContent = `${booking.room?.roomType || 'Room'}`;
    document.getElementById('modalRoomType').textContent = booking.room?.roomType || 'N/A';
    document.getElementById('modalConfirmationCode').textContent = booking.bookingConfirmationCode;
    
    const today = new Date();
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    today.setHours(0, 0, 0, 0);
    
    const statusElement = document.getElementById('modalStatus');
    if (checkIn <= today && checkOut >= today) {
        statusElement.textContent = 'Active';
        statusElement.className = 'badge bg-success';
    } else if (checkIn > today) {
        statusElement.textContent = 'Upcoming';
        statusElement.className = 'badge bg-info';
    } else {
        statusElement.textContent = 'Completed';
        statusElement.className = 'badge bg-secondary';
    }
    
    document.getElementById('modalCheckIn').textContent = formatDate(booking.checkInDate);
    document.getElementById('modalCheckOut').textContent = formatDate(booking.checkOutDate);
    document.getElementById('modalAdults').textContent = booking.numOfAdults;
    document.getElementById('modalChildren').textContent = booking.numOfChildren;
    
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    document.getElementById('modalNights').textContent = `${nights} night${nights > 1 ? 's' : ''}`;
    
    const cancelBtn = document.getElementById('cancelBookingBtn');
    if (checkIn > today) {
        cancelBtn.style.display = 'inline-block';
        cancelBtn.setAttribute('data-booking-id', booking.id);
    } else {
        cancelBtn.style.display = 'none';
    }
}

function handleCancelBooking(event) {
    const bookingId = event.target.getAttribute('data-booking-id');
    if (!bookingId) return;
    
    const booking = allBookings.find(b => b.id == bookingId);
    if (!booking) {
        HotelManager.Utils.showToast('Booking not found', 'danger');
        return;
    }
    
    if (confirm(`Are you sure you want to cancel booking ${booking.bookingConfirmationCode}?`)) {
        cancelBooking(bookingId);
    }
}

async function cancelBooking(bookingId) {
    try {
        console.log('Cancelling booking:', bookingId);
        const response = await HotelManager.ApiService.delete(`/bookings/cancel/${bookingId}`);
        
        if (response && response.statusCode === 200) {
            HotelManager.Utils.showToast('Booking cancelled successfully!', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('bookingDetailsModal'));
            modal.hide();
            
            await loadUserBookings();
            applyFiltersAndSort();
            updateStatistics();
        } else {
            throw new Error(response?.message || 'Failed to cancel booking');
        }
    } catch (error) {
        console.error('Error cancelling booking:', error);
        HotelManager.Utils.showToast('Failed to cancel booking. Please try again.', 'danger');
    }
}

function updateStatistics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let allCount = allBookings.length;
    let activeCount = 0, upcomingCount = 0, completedCount = 0, cancelledCount = 0;
    
    allBookings.forEach(booking => {
        const checkIn = new Date(booking.checkInDate);
        const checkOut = new Date(booking.checkOutDate);
        checkIn.setHours(0, 0, 0, 0);
        checkOut.setHours(0, 0, 0, 0);
        
        if (booking.status === 'cancelled') {
            cancelledCount++;
        } else if (checkIn <= today && checkOut >= today) {
            activeCount++;
        } else if (checkIn > today) {
            upcomingCount++;
        } else if (checkOut < today) {
            completedCount++;
        }
    });
    
    document.getElementById('allCount').textContent = allCount;
    document.getElementById('activeCount').textContent = activeCount;
    document.getElementById('upcomingCount').textContent = upcomingCount;
    document.getElementById('completedCount').textContent = completedCount;
    document.getElementById('cancelledCount').textContent = cancelledCount;
}

function updateQuickFilterButtons() {
    const quickFilters = document.querySelectorAll('.quick-filter');
    quickFilters.forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-filter') === currentFilter) {
            button.classList.add('active');
        }
    });
}

function updateClearFiltersButton() {
    const clearFiltersBtn = document.getElementById('clearFilters');
    const searchValue = document.getElementById('searchBookings').value;
    const statusValue = document.getElementById('statusFilter').value;
    const sortValue = document.getElementById('sortBy').value;
    
    if (searchValue || statusValue || sortValue !== 'checkIn-desc') {
        clearFiltersBtn.style.display = 'inline-block';
    } else {
        clearFiltersBtn.style.display = 'none';
    }
}

function showMainContent() {
    document.getElementById('bookingsLoading').style.display = 'none';
    
    if (allBookings.length === 0) {
        document.getElementById('noBookings').style.display = 'block';
        document.getElementById('bookingsContainer').style.display = 'none';
    } else {
        document.getElementById('noBookings').style.display = 'none';
        document.getElementById('bookingsContainer').style.display = 'block';
    }
}

function showError(message) {
    document.getElementById('bookingsLoading').style.display = 'none';
    document.getElementById('bookingsContainer').style.display = 'none';
    document.getElementById('noBookings').style.display = 'none';
    HotelManager.Utils.showToast(message, 'danger');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions available globally
window.viewBookingDetails = viewBookingDetails;

console.log('My Bookings module initialized');
