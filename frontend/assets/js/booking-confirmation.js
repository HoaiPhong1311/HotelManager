// Booking Confirmation JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('Booking confirmation module loaded');
    initializeConfirmation();
});

// Global variables
let confirmationParams = {};
let currentRoom = null;

// Initialize confirmation page
async function initializeConfirmation() {
    try {
        // Parse confirmation parameters from URL
        parseConfirmationParameters();
        
        if (!confirmationParams.bookingId) {
            showError('Invalid confirmation. Booking ID is required.');
            return;
        }

        console.log('Confirmation parameters:', confirmationParams);
        
        // Load room data if roomId is available
        if (confirmationParams.roomId) {
            await loadRoomData();
        }
        
        // Populate confirmation details
        populateConfirmationDetails();
        
        // Initialize navigation
        HotelManager.Navigation.updateNavigation();
        
        console.log('Booking confirmation initialized successfully');
    } catch (error) {
        console.error('Error initializing booking confirmation:', error);
        // Still show confirmation with available data
        populateConfirmationDetails();
    }
}

// Parse confirmation parameters from URL
function parseConfirmationParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    confirmationParams = {
        bookingId: urlParams.get('bookingId'),
        roomId: urlParams.get('roomId'),
        checkIn: urlParams.get('checkIn'),
        checkOut: urlParams.get('checkOut'),
        adults: parseInt(urlParams.get('adults')) || 2,
        children: parseInt(urlParams.get('children')) || 0
    };
}

// Load room data
async function loadRoomData() {
    try {
        console.log('Loading room data for ID:', confirmationParams.roomId);
        
        const response = await HotelManager.ApiService.get(`/rooms/room-by-id/${confirmationParams.roomId}`);
        
        if (response && response.statusCode === 200 && response.room) {
            currentRoom = response.room;
            console.log('Room data loaded:', currentRoom);
        } else {
            console.warn('Could not load room data');
        }
    } catch (error) {
        console.error('Error loading room data:', error);
        // Continue without room data
    }
}

// Populate confirmation details
function populateConfirmationDetails() {
    try {
        // Set confirmation code
        document.getElementById('confirmationCode').textContent = confirmationParams.bookingId;
        
        // Set booking date (current date)
        const bookingDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('bookingDate').textContent = bookingDate;
        
        // Populate room information
        if (currentRoom) {
            populateRoomInformation();
        } else {
            // Fallback room information
            document.getElementById('roomTitle').textContent = 'Hotel Room';
            document.getElementById('roomType').textContent = 'Standard';
            document.getElementById('roomDescription').textContent = 'Comfortable accommodation';
            document.getElementById('roomImage').src = 'https://via.placeholder.com/100x80/0d6efd/ffffff?text=Room';
        }
        
        // Populate stay information
        populateStayInformation();
        
        // Populate guest information (if available in localStorage)
        populateGuestInformation();
        
        console.log('Confirmation details populated');
    } catch (error) {
        console.error('Error populating confirmation details:', error);
    }
}

// Populate room information
function populateRoomInformation() {
    if (!currentRoom) return;
    
    try {
        document.getElementById('roomTitle').textContent = `${currentRoom.roomType} Room`;
        document.getElementById('roomType').textContent = currentRoom.roomType;
        
        const description = currentRoom.roomDescription || `Comfortable ${currentRoom.roomType.toLowerCase()} room with modern amenities`;
        document.getElementById('roomDescription').textContent = description.length > 100 ? 
            description.substring(0, 100) + '...' : description;
        
        // Set room image
        const roomImage = document.getElementById('roomImage');
        if (currentRoom.roomPhotoUrl) {
            const imageUrl = `${HotelManager.CONFIG.API_BASE_URL}/uploads${currentRoom.roomPhotoUrl.replace('/upload', '')}`;
            roomImage.src = imageUrl;
        } else {
            roomImage.src = `https://via.placeholder.com/100x80/0d6efd/ffffff?text=${encodeURIComponent(currentRoom.roomType)}`;
        }
        roomImage.alt = `${currentRoom.roomType} Room`;
        
        console.log('Room information populated');
    } catch (error) {
        console.error('Error populating room information:', error);
    }
}

// Populate stay information
function populateStayInformation() {
    try {
        // Format and display dates
        if (confirmationParams.checkIn) {
            const checkInFormatted = formatDate(confirmationParams.checkIn);
            document.getElementById('checkInDate').textContent = checkInFormatted;
        }
        
        if (confirmationParams.checkOut) {
            const checkOutFormatted = formatDate(confirmationParams.checkOut);
            document.getElementById('checkOutDate').textContent = checkOutFormatted;
        }
        
        // Display guest counts
        document.getElementById('numAdults').textContent = confirmationParams.adults;
        document.getElementById('numChildren').textContent = confirmationParams.children;
        
        console.log('Stay information populated');
    } catch (error) {
        console.error('Error populating stay information:', error);
    }
}

// Populate guest information
function populateGuestInformation() {
    try {
        // Try to get guest info from user data or last booking form
        const user = HotelManager.Utils.getUser();
        
        if (user) {
            document.getElementById('guestName').textContent = user.name || 'Guest';
            document.getElementById('guestEmail').textContent = user.email || 'N/A';
            document.getElementById('guestPhone').textContent = user.phoneNumber || 'N/A';
        } else {
            // Fallback guest information
            document.getElementById('guestName').textContent = 'Guest';
            document.getElementById('guestEmail').textContent = 'N/A';
            document.getElementById('guestPhone').textContent = 'N/A';
        }
        
        // Hide special requests section if empty
        // (In a real implementation, this would come from the booking API response)
        
        console.log('Guest information populated');
    } catch (error) {
        console.error('Error populating guest information:', error);
    }
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}

// Print confirmation
function printConfirmation() {
    window.print();
}

// Show error (fallback)
function showError(message) {
    document.body.innerHTML = `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6 text-center">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                        <h4>Error</h4>
                        <p>${message}</p>
                        <a href="../index.html" class="btn btn-primary">Back to Home</a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Make functions available globally
window.printConfirmation = printConfirmation;

console.log('Booking confirmation module initialized');
