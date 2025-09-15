// Booking JavaScript with Real API Integration

document.addEventListener('DOMContentLoaded', function() {
    console.log('Booking module loaded');
    initializeBooking();
});

// Global variables
let currentRoom = null;
let bookingParams = {};
let currentUser = null;

// Initialize booking page
async function initializeBooking() {
    try {
        // Check if user is logged in
        if (!HotelManager.Utils.isLoggedIn()) {
            HotelManager.Utils.showToast('Please login to book a room', 'warning');
            setTimeout(() => {
                window.location.href = '../auth/login.html';
            }, 1500);
            return;
        }

        // Get booking parameters from URL
        parseBookingParameters();
        
        if (!bookingParams.roomId) {
            showError('Invalid booking request. Room ID is required.');
            return;
        }

        console.log('Booking parameters:', bookingParams);
        
        // Load user and room data
        await Promise.all([loadUserData(), loadRoomData()]);
        
        // Populate booking form and summary
        populateBookingSummary();
        populateUserData();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize navigation
        HotelManager.Navigation.updateNavigation();
        
        // Show main content
        showMainContent();
        
        console.log('Booking page initialized successfully');
    } catch (error) {
        console.error('Error initializing booking:', error);
        showError('Failed to load booking information');
    }
}

// Parse booking parameters from URL
function parseBookingParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    bookingParams = {
        roomId: urlParams.get('roomId'),
        checkIn: urlParams.get('checkIn'),
        checkOut: urlParams.get('checkOut'),
        adults: parseInt(urlParams.get('adults')) || 2,
        children: parseInt(urlParams.get('children')) || 0
    };
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
        // Continue without pre-filling user data
    }
}

// Load room data
async function loadRoomData() {
    try {
        console.log('Loading room data for ID:', bookingParams.roomId);
        
        const response = await HotelManager.ApiService.get(`/rooms/room-by-id/${bookingParams.roomId}`);
        
        if (response && response.statusCode === 200 && response.room) {
            currentRoom = response.room;
            console.log('Room data loaded:', currentRoom);
        } else {
            throw new Error('Room not found');
        }
    } catch (error) {
        console.error('Error loading room data:', error);
        throw error;
    }
}

// Populate booking summary
function populateBookingSummary() {
    if (!currentRoom || !bookingParams.checkIn || !bookingParams.checkOut) {
        return;
    }

    try {
        // Update breadcrumb
        const roomBreadcrumb = document.getElementById('roomBreadcrumb');
        roomBreadcrumb.textContent = `${currentRoom.roomType} Room`;
        roomBreadcrumb.href = `room-detail.html?id=${currentRoom.id}`;

        // Update room image and title
        const summaryImage = document.getElementById('summaryRoomImage');
        const summaryTitle = document.getElementById('summaryRoomTitle');
        const summaryType = document.getElementById('summaryRoomType');

        if (currentRoom.roomPhotoUrl) {
            const imageUrl = `${HotelManager.CONFIG.API_BASE_URL}/uploads${currentRoom.roomPhotoUrl.replace('/upload', '')}`;
            summaryImage.src = imageUrl;
        } else {
            summaryImage.src = `https://via.placeholder.com/80x60/0d6efd/ffffff?text=${encodeURIComponent(currentRoom.roomType)}`;
        }

        summaryTitle.textContent = `${currentRoom.roomType} Room`;
        summaryType.textContent = currentRoom.roomType;

        // Update booking details
        document.getElementById('summaryCheckIn').textContent = formatDate(bookingParams.checkIn);
        document.getElementById('summaryCheckOut').textContent = formatDate(bookingParams.checkOut);
        document.getElementById('summaryAdults').textContent = bookingParams.adults;
        document.getElementById('summaryChildren').textContent = bookingParams.children;

        // Calculate and display price
        calculatePrice();

        console.log('Booking summary populated');
    } catch (error) {
        console.error('Error populating booking summary:', error);
    }
}

// Populate user data in form
function populateUserData() {
    if (!currentUser) return;

    try {
        document.getElementById('guestName').value = currentUser.name || '';
        document.getElementById('guestEmail').value = currentUser.email || '';
        document.getElementById('guestPhone').value = currentUser.phoneNumber || '';

        console.log('User data populated in form');
    } catch (error) {
        console.error('Error populating user data:', error);
    }
}

// Calculate and display price breakdown
function calculatePrice() {
    if (!currentRoom || !bookingParams.checkIn || !bookingParams.checkOut) {
        return;
    }

    try {
        const checkIn = new Date(bookingParams.checkIn);
        const checkOut = new Date(bookingParams.checkOut);
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

        if (nights <= 0) return;

        const roomPrice = parseFloat(currentRoom.roomPrice);
        const subtotal = roomPrice * nights;
        const serviceFee = subtotal * 0.05; // 5% service fee
        const taxes = subtotal * 0.10; // 10% taxes
        const total = subtotal + serviceFee + taxes;

        // Update price breakdown
        document.getElementById('summaryNights').textContent = `${nights} night${nights > 1 ? 's' : ''}`;
        document.getElementById('summarySubtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('summaryServiceFee').textContent = `$${serviceFee.toFixed(2)}`;
        document.getElementById('summaryTaxes').textContent = `$${taxes.toFixed(2)}`;
        document.getElementById('summaryTotal').textContent = `$${total.toFixed(2)}`;

        console.log('Price calculated:', { nights, subtotal, serviceFee, taxes, total });
    } catch (error) {
        console.error('Error calculating price:', error);
    }
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

// Setup event listeners
function setupEventListeners() {
    // Booking form submission
    const bookingForm = document.getElementById('bookingForm');
    bookingForm.addEventListener('submit', handleBookingSubmit);


    console.log('Event listeners setup completed');
}


// Show main content
function showMainContent() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

// Handle booking form submission
async function handleBookingSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    const form = event.target;
    
    // Bootstrap validation
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }


    // Show loading state
    const submitBtn = document.getElementById('submitBookingBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing Booking...';
    submitBtn.disabled = true;

    try {
        // Create booking
        const bookingData = createBookingData();
        console.log('Submitting booking:', bookingData);

        const response = await HotelManager.ApiService.post(
            `/bookings/book-room/${bookingParams.roomId}/${currentUser.id}`,
            bookingData
        );

        console.log('Booking response:', response);

        if (response && response.statusCode === 200) {
            // Success - redirect to confirmation page
            const confirmationParams = new URLSearchParams({
                bookingId: response.bookingConfirmationCode || 'DEMO-' + Date.now(),
                roomId: bookingParams.roomId,
                checkIn: bookingParams.checkIn,
                checkOut: bookingParams.checkOut
            });

            HotelManager.Utils.showToast('Booking confirmed successfully!', 'success');
            
            setTimeout(() => {
                window.location.href = `booking-confirmation.html?${confirmationParams.toString()}`;
            }, 1500);

        } else {
            throw new Error(response?.message || 'Booking failed');
        }

    } catch (error) {
        console.error('Booking error:', error);
        HotelManager.Utils.showToast(
            error.message || 'Booking failed. Please try again.',
            'danger'
        );

        // Restore button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}


// Create booking data for API
function createBookingData() {
    const checkIn = new Date(bookingParams.checkIn);
    const checkOut = new Date(bookingParams.checkOut);

    return {
        checkInDate: checkIn.toISOString().split('T')[0],
        checkOutDate: checkOut.toISOString().split('T')[0],
        numOfAdults: bookingParams.adults,
        numOfChildren: bookingParams.children,
        guestName: document.getElementById('guestName').value,
        guestEmail: document.getElementById('guestEmail').value,
        guestPhoneNumber: document.getElementById('guestPhone').value,
        specialRequests: document.getElementById('specialRequests').value || ''
    };
}

// Show error state
function showError(message) {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('errorMessage').textContent = message;
}

console.log('Booking module initialized');