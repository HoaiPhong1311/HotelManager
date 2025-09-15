// Room Detail JavaScript with Real Data Integration

document.addEventListener('DOMContentLoaded', function() {
    console.log('Room detail module loaded');
    initializeRoomDetail();
});

// Global variables
let currentRoom = null;
let roomId = null;

// Initialize room detail page
async function initializeRoomDetail() {
    try {
        // Get room ID from URL
        roomId = getRoomIdFromURL();
        
        if (!roomId) {
            showError('Room ID not provided');
            return;
        }

        console.log('Loading room details for ID:', roomId);
        
        // Load room data
        await loadRoomData();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize navigation
        HotelManager.Navigation.updateNavigation();
        
        console.log('Room detail initialized successfully');
    } catch (error) {
        console.error('Error initializing room detail:', error);
        showError('Failed to load room details');
    }
}

// Get room ID from URL parameters
function getRoomIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Load room data from API
async function loadRoomData() {
    try {
        console.log('Fetching room data for ID:', roomId);
        
        const response = await HotelManager.ApiService.get(`/rooms/room-by-id/${roomId}`);
        console.log('Room data response:', response);
        
        if (response && response.statusCode === 200 && response.room) {
            currentRoom = response.room;
            populateRoomDetails(currentRoom);
            showMainContent();
        } else {
            throw new Error(response?.message || 'Room not found');
        }
    } catch (error) {
        console.error('Error loading room data:', error);
        showError('Room not found or failed to load');
    }
}

// Populate room details in the UI
function populateRoomDetails(room) {
    try {
        console.log('Populating room details:', room);
        
        // Update page title and breadcrumb
        document.title = `${room.roomType} Room - Hotel Manager`;
        document.getElementById('roomBreadcrumb').textContent = `${room.roomType} Room`;
        
        // Update room header
        document.getElementById('roomTypeBadge').textContent = room.roomType;
        document.getElementById('roomTitle').textContent = `${room.roomType} Room`;
        
        // Format and display price
        const formattedPrice = `$${parseFloat(room.roomPrice).toFixed(2)}`;
        document.getElementById('roomPrice').textContent = formattedPrice;
        document.getElementById('bookingPrice').textContent = formattedPrice;
        
        // Update room description
        const description = room.roomDescription || `Experience luxury and comfort in our premium ${room.roomType.toLowerCase()} room. This beautifully appointed accommodation features modern amenities, elegant furnishings, and exceptional service to ensure your stay is memorable.`;
        document.getElementById('roomDescription').textContent = description;
        
        // Update room image
        updateRoomImage(room);
        
        // Set default booking dates
        setDefaultBookingDates();
        
        console.log('Room details populated successfully');
    } catch (error) {
        console.error('Error populating room details:', error);
    }
}

// Update room image
function updateRoomImage(room) {
    const mainImage = document.getElementById('mainRoomImage');
    
    if (room.roomPhotoUrl) {
        const imageUrl = `${HotelManager.CONFIG.API_BASE_URL}/uploads${room.roomPhotoUrl.replace('/upload', '')}`;
        mainImage.src = imageUrl;
        mainImage.alt = `${room.roomType} Room`;
    } else {
        mainImage.src = `https://via.placeholder.com/800x500/0d6efd/ffffff?text=${encodeURIComponent(room.roomType + ' Room')}`;
        mainImage.alt = `${room.roomType} Room`;
    }
}

// Set default booking dates
function setDefaultBookingDates() {
    const today = new Date();
    const checkInInput = document.getElementById('bookingCheckIn');
    const checkOutInput = document.getElementById('bookingCheckOut');
    
    // Check for URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const urlCheckIn = urlParams.get('checkIn');
    const urlCheckOut = urlParams.get('checkOut');
    
    if (urlCheckIn && urlCheckOut) {
        // Use dates from URL parameters
        console.log('Using dates from URL:', urlCheckIn, 'to', urlCheckOut);
        checkInInput.value = urlCheckIn;
        checkOutInput.value = urlCheckOut;
    } else {
        // Use default dates (tomorrow + day after)
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        
        checkInInput.value = tomorrow.toISOString().split('T')[0];
        checkOutInput.value = dayAfterTomorrow.toISOString().split('T')[0];
    }
    
    // Set minimum dates
    checkInInput.min = today.toISOString().split('T')[0];
    
    // Update checkout minimum based on check-in date
    const checkInDate = checkInInput.value;
    if (checkInDate) {
        const selectedDate = new Date(checkInDate);
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        checkOutInput.min = nextDay.toISOString().split('T')[0];
    }
    
    // Calculate initial price
    calculatePrice();
}

// Setup event listeners
function setupEventListeners() {
    // Booking form
    const bookingForm = document.getElementById('bookingForm');
    bookingForm.addEventListener('submit', handleBookingSubmit);
    
    // Date change listeners for price calculation
    document.getElementById('bookingCheckIn').addEventListener('change', handleDateChange);
    document.getElementById('bookingCheckOut').addEventListener('change', handleDateChange);
    document.getElementById('bookingAdults').addEventListener('change', calculatePrice);
    document.getElementById('bookingChildren').addEventListener('change', calculatePrice);
    
    console.log('Event listeners setup completed');
}

// Handle date changes
function handleDateChange() {
    const checkInDate = document.getElementById('bookingCheckIn').value;
    const checkOutDate = document.getElementById('bookingCheckOut').value;
    
    if (checkInDate) {
        const selectedDate = new Date(checkInDate);
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const checkOutInput = document.getElementById('bookingCheckOut');
        checkOutInput.min = nextDay.toISOString().split('T')[0];
        
        // Update checkout date if it's invalid
        if (checkOutDate && new Date(checkOutDate) <= selectedDate) {
            checkOutInput.value = nextDay.toISOString().split('T')[0];
        }
    }
    
    calculatePrice();
}

// Calculate and display price breakdown
function calculatePrice() {
    const checkInDate = document.getElementById('bookingCheckIn').value;
    const checkOutDate = document.getElementById('bookingCheckOut').value;
    const priceBreakdown = document.getElementById('priceBreakdown');
    
    if (!checkInDate || !checkOutDate || !currentRoom) {
        priceBreakdown.style.display = 'none';
        return;
    }
    
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) {
        priceBreakdown.style.display = 'none';
        return;
    }
    
    const roomPrice = parseFloat(currentRoom.roomPrice);
    const subtotal = roomPrice * nights;
    const serviceFee = subtotal * 0.05; // 5% service fee
    const total = subtotal + serviceFee;
    
    // Update price breakdown
    document.getElementById('nightsText').textContent = `${nights} night${nights > 1 ? 's' : ''}`;
    document.getElementById('subtotalPrice').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('serviceFee').textContent = `$${serviceFee.toFixed(2)}`;
    document.getElementById('totalPrice').textContent = `$${total.toFixed(2)}`;
    
    priceBreakdown.style.display = 'block';
}

// Handle booking form submission
async function handleBookingSubmit(event) {
    event.preventDefault();
    
    // Check if user is logged in
    if (!HotelManager.Utils.isLoggedIn()) {
        HotelManager.Utils.showToast('Please login to book a room', 'warning');
        setTimeout(() => {
            window.location.href = '../auth/login.html';
        }, 1500);
        return;
    }
    
    const checkInDate = document.getElementById('bookingCheckIn').value;
    const checkOutDate = document.getElementById('bookingCheckOut').value;
    const adults = document.getElementById('bookingAdults').value;
    const children = document.getElementById('bookingChildren').value;
    
    // Validate form
    if (!checkInDate || !checkOutDate) {
        HotelManager.Utils.showToast('Please select check-in and check-out dates', 'warning');
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
    
    // Show loading state
    const submitBtn = document.getElementById('bookNowBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
    submitBtn.disabled = true;
    
    try {
        // Create booking parameters
        const bookingParams = new URLSearchParams({
            roomId: roomId,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            adults: adults,
            children: children
        });
        
        // Redirect to booking page
        window.location.href = `booking.html?${bookingParams.toString()}`;
        
    } catch (error) {
        console.error('Booking error:', error);
        HotelManager.Utils.showToast('Error processing booking', 'danger');
        
        // Restore button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Image modal functions
function openImageModal(imageSrc) {
    const modal = new bootstrap.Modal(document.getElementById('imageModal'));
    document.getElementById('modalImage').src = imageSrc;
    modal.show();
}

function openImageGallery() {
    if (currentRoom && currentRoom.roomPhotoUrl) {
        openImageModal(document.getElementById('mainRoomImage').src);
    } else {
        HotelManager.Utils.showToast('No images available', 'info');
    }
}

// Show main content
function showMainContent() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

// Show error state
function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    
    if (message) {
        const errorAlert = document.querySelector('#errorState .alert');
        errorAlert.querySelector('p').textContent = message;
    }
}

// Make functions available globally
window.openImageModal = openImageModal;
window.openImageGallery = openImageGallery;

console.log('Room detail module initialized');