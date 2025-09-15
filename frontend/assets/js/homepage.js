// Homepage JavaScript with Real Data Integration

document.addEventListener('DOMContentLoaded', function() {
    console.log('Homepage loaded - initializing real data integration...');
    
    // Initialize all homepage functionality
    initializeHomepage();
});

async function initializeHomepage() {
    try {
        console.log('Starting homepage initialization...');
        console.log('API Base URL:', HotelManager.CONFIG.API_BASE_URL);
        
        // Test API connection first
        await testApiConnection();
        
        // Load all data in parallel
        await Promise.all([
            loadRoomTypes(),
            loadFeaturedRooms()
        ]);
        
        // Initialize form handlers
        initializeSearchForm();
        
        // Set default dates
        setDefaultDates();
        
        console.log('Homepage initialization completed successfully');
    } catch (error) {
        console.error('Error initializing homepage:', error);
        HotelManager.Utils.showToast('Error loading page data. Please check if backend is running.', 'danger');
    }
}

// Test API connection
async function testApiConnection() {
    try {
        console.log('Testing API connection...');
        const response = await fetch(`${HotelManager.CONFIG.API_BASE_URL}/rooms/types`);
        console.log('API Test Response Status:', response.status);
        if (!response.ok) {
            throw new Error(`API test failed with status: ${response.status}`);
        }
        console.log('API connection successful');
    } catch (error) {
        console.error('API connection failed:', error);
        throw new Error('Cannot connect to backend API. Please ensure backend is running on port 4040.');
    }
}

// Load room types for search form
async function loadRoomTypes() {
    try {
        console.log('Loading room types...');
        const roomTypes = await HotelManager.ApiService.get('/rooms/types');
        
        const roomTypeSelect = document.getElementById('roomType');
        roomTypeSelect.innerHTML = '<option value="">All Room Types</option>';
        
        if (roomTypes && roomTypes.length > 0) {
            roomTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                roomTypeSelect.appendChild(option);
            });
            console.log(`Loaded ${roomTypes.length} room types`);
        } else {
            roomTypeSelect.innerHTML = '<option value="">No room types available</option>';
        }
    } catch (error) {
        console.error('Error loading room types:', error);
        const roomTypeSelect = document.getElementById('roomType');
        roomTypeSelect.innerHTML = '<option value="">Error loading room types</option>';
    }
}

// Load featured rooms
async function loadFeaturedRooms() {
    try {
        console.log('Loading featured rooms...');
        const response = await HotelManager.ApiService.get('/rooms/all');
        console.log('Featured rooms response:', response);
        
        const roomsGrid = document.getElementById('roomsGrid');
        const roomsLoading = document.getElementById('roomsLoading');
        const noRoomsMessage = document.getElementById('noRoomsMessage');
        
        // Hide loading
        roomsLoading.style.display = 'none';
        
        if (response && response.roomList && response.roomList.length > 0) {
            // Show only first 6 rooms for featured section
            const featuredRooms = response.roomList.slice(0, 6);
            console.log('Featured rooms to display:', featuredRooms);
            
            roomsGrid.innerHTML = '';
            featuredRooms.forEach(room => {
                const roomCard = createRoomCard(room);
                roomsGrid.appendChild(roomCard);
            });
            
            roomsGrid.style.display = 'flex';
            console.log(`Displayed ${featuredRooms.length} featured rooms`);
        } else {
            console.log('No rooms in response:', response);
            noRoomsMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading featured rooms:', error);
        console.error('Error details:', error.message);
        document.getElementById('roomsLoading').style.display = 'none';
        document.getElementById('noRoomsMessage').style.display = 'block';
        HotelManager.Utils.showToast(`Error loading rooms: ${error.message}`, 'danger');
    }
}

// Create room card element
function createRoomCard(room) {
    const col = document.createElement('div');
    col.className = 'col-lg-4 col-md-6';
    
    // Build image URL
    const imageUrl = room.roomPhotoUrl ? 
        `${HotelManager.CONFIG.API_BASE_URL}/uploads${room.roomPhotoUrl.replace('/upload', '')}` : 
        'https://via.placeholder.com/400x250/0d6efd/ffffff?text=Hotel+Room';
    
    // Format price with $ symbol
    const formattedPrice = `$${parseFloat(room.roomPrice).toFixed(2)}`;
    
    // Truncate description
    const shortDescription = room.roomDescription && room.roomDescription.length > 100 ? 
        room.roomDescription.substring(0, 100) + '...' : 
        room.roomDescription || 'Comfortable and luxurious room with modern amenities.';
    
    col.innerHTML = `
        <div class="card card-custom room-card h-100 hover-lift">
            <div class="position-relative">
                <img src="${imageUrl}" 
                     class="card-img-top" 
                     alt="${room.roomType} Room"
                     style="height: 250px; object-fit: cover;"
                     onerror="this.src='https://via.placeholder.com/400x250/0d6efd/ffffff?text=Hotel+Room'">
                <div class="position-absolute top-0 end-0 m-3">
                    <span class="badge bg-primary fs-6">${room.roomType}</span>
                </div>
            </div>
            <div class="card-body d-flex flex-column">
                <h5 class="card-title text-primary">${room.roomType} Room</h5>
                <p class="card-text text-muted flex-grow-1">${shortDescription}</p>
                <div class="d-flex justify-content-between align-items-center mt-auto">
                    <div class="text-primary">
                        <h4 class="mb-0 fw-bold">${formattedPrice}</h4>
                        <small class="text-muted">per night</small>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-outline-primary btn-sm" onclick="viewRoomDetails(${room.id})">
                            <i class="fas fa-eye me-1"></i>View
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="bookRoom(${room.id})">
                            <i class="fas fa-calendar-check me-1"></i>Book
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return col;
}


// Initialize search form
function initializeSearchForm() {
    const searchForm = document.getElementById('roomSearchForm');
    
    searchForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const checkInDate = document.getElementById('checkInDate').value;
        const checkOutDate = document.getElementById('checkOutDate').value;
        const roomType = document.getElementById('roomType').value;
        
        // Validate form
        if (!checkInDate || !checkOutDate) {
            HotelManager.Utils.showToast('Please fill check-in and check-out dates', 'warning');
            return;
        }
        
        // Validate dates
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (checkIn < today) {
            HotelManager.Utils.showToast('Check-in date cannot be in the past', 'warning');
            return;
        }
        
        if (checkOut <= checkIn) {
            HotelManager.Utils.showToast('Check-out date must be after check-in date', 'warning');
            return;
        }
        
        // Show loading
        const submitBtn = searchForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Searching...';
        submitBtn.disabled = true;
        
        try {
            // Search for available rooms
            const searchParams = new URLSearchParams({
                checkInDate: checkInDate,
                checkOutDate: checkOutDate,
                roomType: roomType
            });
            
            // Redirect to rooms page with search parameters
            window.location.href = `user/rooms.html?${searchParams.toString()}`;
            
        } catch (error) {
            console.error('Search error:', error);
            HotelManager.Utils.showToast('Error searching rooms', 'danger');
            
            // Restore button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Set default dates (today and tomorrow)
function setDefaultDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const checkInInput = document.getElementById('checkInDate');
    const checkOutInput = document.getElementById('checkOutDate');
    
    checkInInput.value = today.toISOString().split('T')[0];
    checkOutInput.value = tomorrow.toISOString().split('T')[0];
    
    // Set minimum dates
    checkInInput.min = today.toISOString().split('T')[0];
    checkOutInput.min = tomorrow.toISOString().split('T')[0];
    
    // Update checkout min date when checkin changes
    checkInInput.addEventListener('change', function() {
        const selectedDate = new Date(this.value);
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        checkOutInput.min = nextDay.toISOString().split('T')[0];
        
        // Update checkout date if it's before new minimum
        if (new Date(checkOutInput.value) <= selectedDate) {
            checkOutInput.value = nextDay.toISOString().split('T')[0];
        }
    });
}

// Room action handlers
function viewRoomDetails(roomId) {
    window.location.href = `user/room-detail.html?id=${roomId}`;
}

function bookRoom(roomId) {
    // Check if user is logged in
    if (!HotelManager.Utils.isLoggedIn()) {
        HotelManager.Utils.showToast('Please login to book a room', 'warning');
        setTimeout(() => {
            window.location.href = 'auth/login.html';
        }, 1500);
        return;
    }
    
    // Redirect to room detail page instead of booking page
    // This ensures consistent user flow across all pages
    window.location.href = `user/room-detail.html?id=${roomId}`;
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add scroll effect to navigation
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.classList.add('navbar-scrolled');
    } else {
        navbar.classList.remove('navbar-scrolled');
    }
});

console.log('Homepage JavaScript loaded successfully');
