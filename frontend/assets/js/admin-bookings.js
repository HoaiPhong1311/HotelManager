// Admin Booking Management JavaScript

let allBookings = [];
let filteredBookings = [];
let currentPage = 1;
let bookingsPerPage = 10;
let currentFilters = {
    search: '',
    status: '',
    startDate: '',
    endDate: '',
    quickFilter: 'all'
};
let selectedBooking = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Booking Management module loaded');
    initializeBookingManagement();
});

async function initializeBookingManagement() {
    try {
        // Check admin authentication
        await checkAdminAuthentication();
        
        // Initialize navigation
        HotelManager.Navigation.updateNavigation();
        
        // Load bookings data
        await loadAllBookings();
        
        // Setup event listeners
        setupEventListeners();
        
        // Apply initial filters
        applyFilters();
        
        // Show bookings section
        showBookingsSection();
        
        console.log('Booking Management initialized successfully');
    } catch (error) {
        console.error('Error initializing booking management:', error);
        showError('Failed to load booking management. Please check your permissions.');
    }
}

// Check admin authentication
async function checkAdminAuthentication() {
    if (!HotelManager.Utils.isLoggedIn()) {
        HotelManager.Utils.showToast('Please login to access admin features', 'warning');
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
    
    console.log('Admin authenticated:', user);
}

// Load all bookings
async function loadAllBookings() {
    try {
        console.log('Loading all bookings...');
        
        const response = await HotelManager.ApiService.get('/bookings/all');
        if (response && response.statusCode === 200 && response.bookingList) {
            allBookings = response.bookingList;
            filteredBookings = [...allBookings];
            
            console.log(`Loaded ${allBookings.length} bookings`);
        } else {
            throw new Error(response?.message || 'Failed to load bookings');
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
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
    
    // Date filters
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    startDate.addEventListener('change', handleDateFilter);
    endDate.addEventListener('change', handleDateFilter);
    
    console.log('Event listeners setup completed');
}

// Handle search
function handleSearch(event) {
    currentFilters.search = event.target.value.toLowerCase().trim();
    currentPage = 1;
    applyFilters();
}

// Handle status filter
function handleStatusFilter(event) {
    currentFilters.status = event.target.value;
    currentPage = 1;
    applyFilters();
}

// Handle date filter
function handleDateFilter() {
    currentFilters.startDate = document.getElementById('startDate').value;
    currentFilters.endDate = document.getElementById('endDate').value;
    currentPage = 1;
    applyFilters();
}

// Set quick filter
function setQuickFilter(filter) {
    currentFilters.quickFilter = filter;
    currentPage = 1;
    
    // Update active button
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-filter') === filter) {
            btn.classList.add('active');
        }
    });
    
    // Set date range based on quick filter
    const today = new Date();
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    switch (filter) {
        case 'today':
            startDateInput.value = today.toISOString().split('T')[0];
            endDateInput.value = today.toISOString().split('T')[0];
            break;
        case 'week':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            startDateInput.value = weekStart.toISOString().split('T')[0];
            endDateInput.value = weekEnd.toISOString().split('T')[0];
            break;
        case 'all':
        default:
            startDateInput.value = '';
            endDateInput.value = '';
            break;
    }
    
    handleDateFilter();
}

// Apply filters
function applyFilters() {
    filteredBookings = allBookings.filter(booking => {
        // Search filter
        if (currentFilters.search) {
            const searchText = currentFilters.search;
            const guestName = booking.user?.name?.toLowerCase() || '';
            const confirmationCode = booking.bookingConfirmationCode?.toLowerCase() || '';
            const roomType = booking.room?.roomType?.toLowerCase() || '';
            
            if (!guestName.includes(searchText) && 
                !confirmationCode.includes(searchText) && 
                !roomType.includes(searchText)) {
                return false;
            }
        }
        
        // Status filter
        if (currentFilters.status) {
            const bookingStatus = getBookingStatus(booking);
            if (bookingStatus.toLowerCase() !== currentFilters.status) {
                return false;
            }
        }
        
        // Date range filter
        if (currentFilters.startDate || currentFilters.endDate) {
            const checkInDate = new Date(booking.checkInDate);
            const checkOutDate = new Date(booking.checkOutDate);
            
            if (currentFilters.startDate) {
                const filterStart = new Date(currentFilters.startDate);
                if (checkInDate < filterStart) return false;
            }
            
            if (currentFilters.endDate) {
                const filterEnd = new Date(currentFilters.endDate);
                if (checkOutDate > filterEnd) return false;
            }
        }
        
        return true;
    });
    
    // Update statistics
    updateStatistics();
    
    // Display bookings
    displayBookings();
    
    // Update pagination
    updatePagination();
}

// Get booking status
function getBookingStatus(booking) {
    const today = new Date();
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    today.setHours(0, 0, 0, 0);
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);
    
    if (booking.status === 'cancelled') return 'cancelled';
    if (checkIn <= today && checkOut >= today) return 'active';
    if (checkIn > today) return 'upcoming';
    return 'completed';
}

// Update statistics
function updateStatistics() {
    let totalCount = filteredBookings.length;
    let activeCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    
    filteredBookings.forEach(booking => {
        const status = getBookingStatus(booking);
        switch (status) {
            case 'active': activeCount++; break;
            case 'upcoming': upcomingCount++; break;
            case 'completed': completedCount++; break;
            case 'cancelled': cancelledCount++; break;
        }
    });
    
    document.getElementById('totalCount').textContent = totalCount;
    document.getElementById('activeCount').textContent = activeCount;
    document.getElementById('upcomingCount').textContent = upcomingCount;
    document.getElementById('completedCount').textContent = completedCount;
    document.getElementById('cancelledCount').textContent = cancelledCount;
}

// Display bookings
function displayBookings() {
    const tableBody = document.getElementById('bookingsTableBody');
    const noResults = document.getElementById('noResults');
    const bookingsSection = document.getElementById('bookingsSection');
    
    if (filteredBookings.length === 0) {
        bookingsSection.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    bookingsSection.style.display = 'block';
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * bookingsPerPage;
    const endIndex = Math.min(startIndex + bookingsPerPage, filteredBookings.length);
    const pageBookings = filteredBookings.slice(startIndex, endIndex);
    
    // Update display counts
    document.getElementById('displayCount').textContent = pageBookings.length;
    document.getElementById('totalDisplayCount').textContent = filteredBookings.length;
    
    // Generate table rows
    tableBody.innerHTML = '';
    pageBookings.forEach(booking => {
        const row = createBookingRow(booking);
        tableBody.appendChild(row);
    });
}

// Create booking table row
function createBookingRow(booking) {
    const row = document.createElement('tr');
    
    const status = getBookingStatus(booking);
    const statusClass = getStatusClass(status);
    
    const guestName = booking.user?.name || 'N/A';
    const roomType = booking.room?.roomType || 'Unknown';
    const checkIn = formatDate(booking.checkInDate);
    const checkOut = formatDate(booking.checkOutDate);
    const totalGuests = `${booking.numOfAdults}A, ${booking.numOfChildren}C`;
    
    row.innerHTML = `
        <td>
            <span class="badge bg-primary">${booking.bookingConfirmationCode}</span>
        </td>
        <td>
            <strong>${guestName}</strong><br>
            <small class="text-muted">${booking.user?.email || ''}</small>
        </td>
        <td>${roomType}</td>
        <td>${checkIn}</td>
        <td>${checkOut}</td>
        <td>${totalGuests}</td>
        <td>
            <span class="badge ${statusClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
        </td>
        <td>
            <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary" onclick="viewBookingDetails('${booking.bookingConfirmationCode}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-outline-danger" onclick="cancelBookingPrompt('${booking.bookingConfirmationCode}')" title="Cancel Booking">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// Get status CSS class
function getStatusClass(status) {
    switch (status) {
        case 'active': return 'bg-success';
        case 'upcoming': return 'bg-info';
        case 'completed': return 'bg-secondary';
        case 'cancelled': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);
    const paginationControls = document.getElementById('paginationControls');
    
    if (totalPages <= 1) {
        paginationControls.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Previous</a>
        </li>
    `;
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `;
    }
    
    // Next button
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>
        </li>
    `;
    
    paginationControls.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    if (page < 1 || page > Math.ceil(filteredBookings.length / bookingsPerPage)) return;
    currentPage = page;
    displayBookings();
    updatePagination();
}

// View booking details
function viewBookingDetails(confirmationCode) {
    const booking = allBookings.find(b => b.bookingConfirmationCode === confirmationCode);
    if (!booking) {
        HotelManager.Utils.showToast('Booking not found', 'danger');
        return;
    }
    
    selectedBooking = booking;
    populateBookingModal(booking);
    
    const modal = new bootstrap.Modal(document.getElementById('bookingDetailsModal'));
    modal.show();
}

// Populate booking details modal
function populateBookingModal(booking) {
    document.getElementById('modalGuestName').textContent = booking.user?.name || 'N/A';
    document.getElementById('modalGuestEmail').textContent = booking.user?.email || 'N/A';
    document.getElementById('modalGuestPhone').textContent = booking.user?.phoneNumber || 'N/A';
    document.getElementById('modalConfirmation').textContent = booking.bookingConfirmationCode;
    document.getElementById('modalRoom').textContent = booking.room?.roomType || 'Unknown';
    document.getElementById('modalCheckIn').textContent = formatDate(booking.checkInDate);
    document.getElementById('modalCheckOut').textContent = formatDate(booking.checkOutDate);
    document.getElementById('modalAdults').textContent = booking.numOfAdults;
    document.getElementById('modalChildren').textContent = booking.numOfChildren;
    
    const status = getBookingStatus(booking);
    const statusElement = document.getElementById('modalStatus');
    statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    statusElement.className = `badge ${getStatusClass(status)}`;
    
    // Show/hide cancel button
    const cancelBtn = document.getElementById('cancelBookingBtn');
    if (status === 'upcoming' || status === 'active') {
        cancelBtn.style.display = 'inline-block';
    } else {
        cancelBtn.style.display = 'none';
    }
}

// Cancel booking prompt
function cancelBookingPrompt(confirmationCode) {
    const booking = allBookings.find(b => b.bookingConfirmationCode === confirmationCode);
    if (!booking) return;
    
    if (confirm(`Are you sure you want to cancel booking ${confirmationCode}?`)) {
        performCancelBooking(booking.id);
    }
}

// Cancel booking
function cancelBooking() {
    if (!selectedBooking) return;
    
    if (confirm(`Are you sure you want to cancel booking ${selectedBooking.bookingConfirmationCode}?`)) {
        performCancelBooking(selectedBooking.id);
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('bookingDetailsModal'));
        modal.hide();
    }
}

// Perform cancel booking API call
async function performCancelBooking(bookingId) {
    try {
        const response = await HotelManager.ApiService.delete(`/bookings/cancel/${bookingId}`);
        
        if (response && response.statusCode === 200) {
            HotelManager.Utils.showToast('Booking cancelled successfully!', 'success');
            
            // Refresh bookings
            await loadAllBookings();
            applyFilters();
        } else {
            throw new Error(response?.message || 'Failed to cancel booking');
        }
    } catch (error) {
        console.error('Error cancelling booking:', error);
        HotelManager.Utils.showToast('Failed to cancel booking. Please try again.', 'danger');
    }
}

// Refresh bookings
async function refreshBookings() {
    try {
        document.getElementById('bookingsLoading').style.display = 'block';
        document.getElementById('bookingsSection').style.display = 'none';
        document.getElementById('noResults').style.display = 'none';
        
        await loadAllBookings();
        applyFilters();
        showBookingsSection();
        
        HotelManager.Utils.showToast('Bookings refreshed successfully!', 'success');
    } catch (error) {
        console.error('Error refreshing bookings:', error);
        HotelManager.Utils.showToast('Failed to refresh bookings', 'danger');
    }
}

// Export bookings
function exportBookings() {
    HotelManager.Utils.showToast('Export functionality coming soon!', 'info');
}

// Clear filters
function clearFilters() {
    document.getElementById('searchBookings').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    
    currentFilters = {
        search: '',
        status: '',
        startDate: '',
        endDate: '',
        quickFilter: 'all'
    };
    
    setQuickFilter('all');
}

// Show bookings section
function showBookingsSection() {
    document.getElementById('bookingsLoading').style.display = 'none';
    
    if (filteredBookings.length === 0) {
        document.getElementById('noResults').style.display = 'block';
        document.getElementById('bookingsSection').style.display = 'none';
    } else {
        document.getElementById('noResults').style.display = 'none';
        document.getElementById('bookingsSection').style.display = 'block';
    }
}

// Show error
function showError(message) {
    document.getElementById('bookingsLoading').style.display = 'none';
    document.getElementById('bookingsSection').style.display = 'none';
    document.getElementById('noResults').style.display = 'none';
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

// Debounce function
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
window.refreshBookings = refreshBookings;
window.exportBookings = exportBookings;
window.setQuickFilter = setQuickFilter;
window.changePage = changePage;
window.viewBookingDetails = viewBookingDetails;
window.cancelBookingPrompt = cancelBookingPrompt;
window.cancelBooking = cancelBooking;
window.clearFilters = clearFilters;

console.log('Admin Booking Management module initialized');
