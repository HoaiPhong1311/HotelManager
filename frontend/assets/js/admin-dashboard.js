// Admin Dashboard JavaScript

let dashboardData = {
    totalRooms: 0,
    totalBookings: 0,
    totalUsers: 0,
    totalRevenue: 0,
    recentBookings: []
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Dashboard module loaded');
    initializeAdminDashboard();
});

async function initializeAdminDashboard() {
    try {
        // Check admin authentication
        await checkAdminAuthentication();
        
        // Initialize navigation
        HotelManager.Navigation.updateNavigation();
        
        // Load dashboard data
        await loadDashboardData();
        
        // Show dashboard content
        showDashboardContent();
        
        console.log('Admin Dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing admin dashboard:', error);
        showError('Failed to load admin dashboard. Please check your permissions.');
    }
}

// Check admin authentication
async function checkAdminAuthentication() {
    if (!HotelManager.Utils.isLoggedIn()) {
        HotelManager.Utils.showToast('Please login to access admin dashboard', 'warning');
        setTimeout(() => {
            window.location.href = '../auth/login.html';
        }, 1500);
        throw new Error('User not authenticated');
    }
    
    const user = HotelManager.Utils.getUser();
    if (!user || user.role !== 'ADMIN') {
        HotelManager.Utils.showToast('Access denied. Admin privileges required.', 'danger');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1500);
        throw new Error('Insufficient permissions');
    }
    
    // Update admin name
    document.getElementById('adminName').textContent = user.name || 'Admin';
    
    console.log('Admin authenticated:', user);
}

// Load dashboard data
async function loadDashboardData() {
    try {
        console.log('Loading dashboard data...');
        
        // Load data in parallel
        await Promise.all([
            loadRoomsData(),
            loadBookingsData(),
            loadUsersData(),
            loadRecentBookings()
        ]);
        
        // Update dashboard displays
        updateStatistics();
        displayRecentBookings();
        
        console.log('Dashboard data loaded successfully');
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        throw error;
    }
}

// Load rooms data
async function loadRoomsData() {
    try {
        const response = await HotelManager.ApiService.get('/rooms/all');
        if (response && response.roomList) {
            dashboardData.totalRooms = response.roomList.length;
            console.log(`Loaded ${dashboardData.totalRooms} rooms`);
        }
    } catch (error) {
        console.error('Error loading rooms data:', error);
        dashboardData.totalRooms = 0;
    }
}

// Load bookings data
async function loadBookingsData() {
    try {
        const response = await HotelManager.ApiService.get('/bookings/all');
        if (response && response.bookingList) {
            dashboardData.totalBookings = response.bookingList.length;
            
            // Calculate revenue (simplified)
            dashboardData.totalRevenue = response.bookingList.reduce((total, booking) => {
                if (booking.room && booking.room.roomPrice) {
                    const checkIn = new Date(booking.checkInDate);
                    const checkOut = new Date(booking.checkOutDate);
                    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
                    return total + (parseFloat(booking.room.roomPrice) * nights);
                }
                return total;
            }, 0);
            
            console.log(`Loaded ${dashboardData.totalBookings} bookings, Revenue: $${dashboardData.totalRevenue}`);
        }
    } catch (error) {
        console.error('Error loading bookings data:', error);
        dashboardData.totalBookings = 0;
        dashboardData.totalRevenue = 0;
    }
}

// Load users data
async function loadUsersData() {
    try {
        const response = await HotelManager.ApiService.get('/users/all');
        if (response && response.userList) {
            dashboardData.totalUsers = response.userList.length;
            console.log(`Loaded ${dashboardData.totalUsers} users`);
        }
    } catch (error) {
        console.error('Error loading users data:', error);
        dashboardData.totalUsers = 0;
    }
}

// Load recent bookings
async function loadRecentBookings() {
    try {
        const response = await HotelManager.ApiService.get('/bookings/all');
        if (response && response.bookingList) {
            // Sort by booking date (using ID as proxy) and take last 5
            dashboardData.recentBookings = response.bookingList
                .sort((a, b) => b.id - a.id)
                .slice(0, 5);
            console.log(`Loaded ${dashboardData.recentBookings.length} recent bookings`);
        }
    } catch (error) {
        console.error('Error loading recent bookings:', error);
        dashboardData.recentBookings = [];
    }
}

// Update statistics display
function updateStatistics() {
    document.getElementById('totalRooms').textContent = dashboardData.totalRooms;
    document.getElementById('totalBookings').textContent = dashboardData.totalBookings;
    document.getElementById('totalUsers').textContent = dashboardData.totalUsers;
    document.getElementById('totalRevenue').textContent = `$${dashboardData.totalRevenue.toFixed(2)}`;
}

// Display recent bookings
function displayRecentBookings() {
    const container = document.getElementById('recentBookingsContainer');
    const loading = document.getElementById('recentBookingsLoading');
    const noBookings = document.getElementById('noRecentBookings');
    
    loading.style.display = 'none';
    
    if (dashboardData.recentBookings.length === 0) {
        noBookings.style.display = 'block';
        return;
    }
    
    container.innerHTML = '';
    dashboardData.recentBookings.forEach(booking => {
        const bookingItem = createRecentBookingItem(booking);
        container.appendChild(bookingItem);
    });
    
    container.style.display = 'block';
}

// Create recent booking item
function createRecentBookingItem(booking) {
    const item = document.createElement('div');
    item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
    
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Determine status
    let status = 'Upcoming';
    let statusClass = 'bg-info';
    
    if (checkIn <= today && checkOut >= today) {
        status = 'Active';
        statusClass = 'bg-success';
    } else if (checkOut < today) {
        status = 'Completed';
        statusClass = 'bg-secondary';
    }
    
    // Extract room and guest information properly
    const roomName = booking.room?.roomType || 'Unknown Room';
    const guestName = booking.user?.name || booking.guestName || 'N/A';
    const confirmationCode = booking.bookingConfirmationCode || 'N/A';
    
    item.innerHTML = `
        <div>
            <h6 class="mb-1">${roomName}</h6>
            <p class="mb-1">
                <strong>Guest:</strong> ${guestName} | 
                <strong>Code:</strong> ${confirmationCode}
            </p>
            <small class="text-muted">
                ${formatDate(booking.checkInDate)} - ${formatDate(booking.checkOutDate)}
            </small>
        </div>
        <span class="badge ${statusClass} rounded-pill">${status}</span>
    `;
    
    return item;
}


// Refresh dashboard
async function refreshDashboard() {
    try {
        document.getElementById('dashboardLoading').style.display = 'block';
        document.getElementById('dashboardContent').style.display = 'none';
        
        await loadDashboardData();
        showDashboardContent();
        
        HotelManager.Utils.showToast('Dashboard refreshed successfully!', 'success');
    } catch (error) {
        console.error('Error refreshing dashboard:', error);
        HotelManager.Utils.showToast('Failed to refresh dashboard', 'danger');
    }
}

// Export data (placeholder)
function exportData() {
    HotelManager.Utils.showToast('Export functionality coming soon!', 'info');
}

// Show dashboard content
function showDashboardContent() {
    document.getElementById('dashboardLoading').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'block';
}

// Show error
function showError(message) {
    document.getElementById('dashboardLoading').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'none';
    HotelManager.Utils.showToast(message, 'danger');
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// Make functions available globally
window.refreshDashboard = refreshDashboard;
window.exportData = exportData;

console.log('Admin Dashboard module initialized');
