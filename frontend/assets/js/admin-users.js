// Admin User Management JavaScript

let allUsers = [];
let filteredUsers = [];
let currentView = 'cards';
let selectedUser = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin User Management module loaded');
    initializeUserManagement();
});

async function initializeUserManagement() {
    try {
        // Check admin authentication
        await checkAdminAuthentication();
        
        // Initialize navigation
        HotelManager.Navigation.updateNavigation();
        
        // Load users data
        await loadAllUsers();
        
        // Setup event listeners
        setupEventListeners();
        
        // Apply initial filters
        applyFilters();
        
        // Show users section
        showUsersSection();
        
        console.log('User Management initialized successfully');
    } catch (error) {
        console.error('Error initializing user management:', error);
        showError('Failed to load user management. Please check your permissions.');
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

// Load all users
async function loadAllUsers() {
    try {
        console.log('Loading all users...');
        
        const response = await HotelManager.ApiService.get('/users/all');
        console.log('Users API response:', response);
        
        if (response && response.userList) {
            allUsers = response.userList;
            filteredUsers = [...allUsers];
            
            console.log(`Loaded ${allUsers.length} users`);
        } else {
            console.warn('No users found or unexpected response format:', response);
            allUsers = [];
            filteredUsers = [];
        }
    } catch (error) {
        console.error('Error loading users:', error);
        allUsers = [];
        filteredUsers = [];
        throw error;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchUsers');
    searchInput.addEventListener('input', debounce(applyFilters, 300));
    
    // Role filter
    document.getElementById('roleFilter').addEventListener('change', applyFilters);
    
    // View mode toggle
    document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
        radio.addEventListener('change', handleViewModeChange);
    });
    
    // Change role confirmation
    const confirmChangeRoleBtn = document.getElementById('confirmChangeRoleBtn');
    confirmChangeRoleBtn.addEventListener('click', confirmChangeRole);
    
    console.log('Event listeners setup completed');
}

// Apply filters
function applyFilters() {
    const searchTerm = document.getElementById('searchUsers').value.toLowerCase().trim();
    const roleFilter = document.getElementById('roleFilter').value;
    
    filteredUsers = allUsers.filter(user => {
        // Search filter
        if (searchTerm) {
            const name = user.name?.toLowerCase() || '';
            const email = user.email?.toLowerCase() || '';
            
            if (!name.includes(searchTerm) && !email.includes(searchTerm)) {
                return false;
            }
        }
        
        // Role filter
        if (roleFilter && user.role !== roleFilter) {
            return false;
        }
        
        return true;
    });
    
    // Update statistics
    updateStatistics();
    
    // Display users
    displayUsers();
}

// Update statistics
function updateStatistics() {
    const totalUsers = filteredUsers.length;
    const regularUsers = filteredUsers.filter(user => user.role === 'USER').length;
    const adminUsers = filteredUsers.filter(user => user.role === 'ADMIN').length;
    
    document.getElementById('totalUsersCount').textContent = totalUsers;
    document.getElementById('regularUsersCount').textContent = regularUsers;
    document.getElementById('adminUsersCount').textContent = adminUsers;
}

// Handle view mode change
function handleViewModeChange(event) {
    currentView = event.target.value;
    displayUsers();
}

// Display users
function displayUsers() {
    const cardsContainer = document.getElementById('usersCardsContainer');
    const tableContainer = document.getElementById('usersTableContainer');
    const noUsers = document.getElementById('noUsers');
    const usersSection = document.getElementById('usersSection');
    
    if (filteredUsers.length === 0) {
        usersSection.style.display = 'none';
        noUsers.style.display = 'block';
        return;
    }
    
    noUsers.style.display = 'none';
    usersSection.style.display = 'block';
    
    if (currentView === 'cards') {
        cardsContainer.style.display = 'flex';
        tableContainer.style.display = 'none';
        cardsContainer.innerHTML = '';
        
        filteredUsers.forEach(user => {
            const userCard = createUserCard(user);
            cardsContainer.appendChild(userCard);
        });
    } else {
        cardsContainer.style.display = 'none';
        tableContainer.style.display = 'block';
        
        const tableBody = document.getElementById('usersTableBody');
        tableBody.innerHTML = '';
        
        filteredUsers.forEach((user, index) => {
            const userRow = createUserTableRow(user, index + 1);
            tableBody.appendChild(userRow);
        });
    }
}

// Create user card (cards view)
function createUserCard(user) {
    const col = document.createElement('div');
    col.className = 'col-lg-4 col-md-6';
    
    const roleClass = user.role === 'ADMIN' ? 'bg-warning text-dark' : 'bg-primary';
    const bookingCount = user.bookings ? user.bookings.length : 0;
    
    col.innerHTML = `
        <div class="card card-custom h-100 shadow-sm hover-lift">
            <div class="card-body text-center">
                <div class="user-avatar mb-3">
                    <i class="fas fa-user-circle text-primary" style="font-size: 4rem;"></i>
                </div>
                <h5 class="card-title text-primary">${user.name || 'N/A'}</h5>
                <p class="card-text text-muted mb-2">${user.email || 'N/A'}</p>
                <p class="card-text text-muted mb-3">
                    <i class="fas fa-phone me-1"></i>${user.phoneNumber || 'N/A'}
                </p>
                
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span class="badge ${roleClass}">${user.role}</span>
                    <span class="badge bg-info">${bookingCount} Bookings</span>
                </div>
                
                <div class="d-grid gap-2">
                    <button class="btn btn-outline-primary btn-sm" onclick="viewUserDetails(${user.id})">
                        <i class="fas fa-eye me-1"></i>View Details
                    </button>
                    <button class="btn btn-outline-warning btn-sm" onclick="promptChangeRole(${user.id})">
                        <i class="fas fa-user-cog me-1"></i>Change Role
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

// Create user table row (table view)
function createUserTableRow(user, index) {
    const tr = document.createElement('tr');
    
    const roleClass = user.role === 'ADMIN' ? 'bg-warning text-dark' : 'bg-primary';
    const bookingCount = user.bookings ? user.bookings.length : 0;
    
    tr.innerHTML = `
        <td>${index}</td>
        <td>
            <div class="d-flex align-items-center">
                <i class="fas fa-user-circle text-primary me-2" style="font-size: 1.5rem;"></i>
                <div>
                    <div class="fw-bold">${user.name || 'N/A'}</div>
                    <small class="text-muted">ID: ${user.id}</small>
                </div>
            </div>
        </td>
        <td>${user.email || 'N/A'}</td>
        <td>${user.phoneNumber || 'N/A'}</td>
        <td><span class="badge ${roleClass}">${user.role}</span></td>
        <td><span class="badge bg-info">${bookingCount}</span></td>
        <td>
            <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary" onclick="viewUserDetails(${user.id})" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-outline-warning" onclick="promptChangeRole(${user.id})" title="Change Role">
                    <i class="fas fa-user-cog"></i>
                </button>
            </div>
        </td>
    `;
    
    return tr;
}

// View user details
function viewUserDetails(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        HotelManager.Utils.showToast('User not found', 'danger');
        return;
    }
    
    selectedUser = user;
    
    // Populate modal
    document.getElementById('modalUserName').textContent = user.name || 'N/A';
    document.getElementById('modalUserFullName').textContent = user.name || 'N/A';
    document.getElementById('modalUserEmail').textContent = user.email || 'N/A';
    document.getElementById('modalUserPhone').textContent = user.phoneNumber || 'N/A';
    document.getElementById('modalUserId').textContent = user.id;
    
    // Set role badge
    const roleElement = document.getElementById('modalUserRole');
    roleElement.textContent = user.role;
    roleElement.className = user.role === 'ADMIN' ? 'badge bg-warning text-dark mb-3' : 'badge bg-primary mb-3';
    
    // Set booking count
    const bookingCount = user.bookings ? user.bookings.length : 0;
    document.getElementById('modalUserBookingCount').textContent = bookingCount;
    
    // Update change role button
    const changeRoleBtn = document.getElementById('changeRoleBtn');
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    changeRoleBtn.innerHTML = `<i class="fas fa-user-cog me-1"></i>Make ${newRole}`;
    
    const modal = new bootstrap.Modal(document.getElementById('userDetailsModal'));
    modal.show();
}

// Prompt change role
function promptChangeRole(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        HotelManager.Utils.showToast('User not found', 'danger');
        return;
    }
    
    selectedUser = user;
    
    const currentRole = user.role;
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    
    // Populate change role modal
    document.getElementById('changeRoleUserName').textContent = user.name || 'N/A';
    
    const currentRoleElement = document.getElementById('changeRoleCurrentRole');
    currentRoleElement.textContent = currentRole;
    currentRoleElement.className = currentRole === 'ADMIN' ? 'badge bg-warning text-dark' : 'badge bg-primary';
    
    const newRoleElement = document.getElementById('changeRoleNewRole');
    newRoleElement.textContent = newRole;
    newRoleElement.className = newRole === 'ADMIN' ? 'badge bg-warning text-dark' : 'badge bg-success';
    
    const modal = new bootstrap.Modal(document.getElementById('changeRoleModal'));
    modal.show();
}

// Change user role (called from modal)
function changeUserRole() {
    if (!selectedUser) return;
    promptChangeRole(selectedUser.id);
}

// Confirm change role
async function confirmChangeRole() {
    if (!selectedUser) return;
    
    const confirmBtn = document.getElementById('confirmChangeRoleBtn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Changing...';
    confirmBtn.disabled = true;
    
    try {
        // Note: This endpoint might not exist in backend yet
        // We'll need to check what's available
        const newRole = selectedUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
        
        // Try to call the backend API (this might need to be implemented)
        const response = await HotelManager.ApiService.put(`/users/update-role/${selectedUser.id}`, {
            role: newRole
        });
        
        if (response && response.statusCode === 200) {
            HotelManager.Utils.showToast('User role updated successfully!', 'success');
            
            // Close modals
            const changeRoleModal = bootstrap.Modal.getInstance(document.getElementById('changeRoleModal'));
            changeRoleModal.hide();
            
            const detailsModal = bootstrap.Modal.getInstance(document.getElementById('userDetailsModal'));
            if (detailsModal) detailsModal.hide();
            
            // Refresh users
            await loadAllUsers();
            applyFilters();
        } else {
            throw new Error(response?.message || 'Failed to update user role');
        }
    } catch (error) {
        console.error('Error updating user role:', error);
        HotelManager.Utils.showToast('Failed to update user role. This feature may not be implemented yet.', 'warning');
    } finally {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

// Refresh users
async function refreshUsers() {
    try {
        document.getElementById('usersLoading').style.display = 'block';
        document.getElementById('usersSection').style.display = 'none';
        document.getElementById('noUsers').style.display = 'none';
        
        await loadAllUsers();
        applyFilters();
        showUsersSection();
        
        HotelManager.Utils.showToast('Users refreshed successfully!', 'success');
    } catch (error) {
        console.error('Error refreshing users:', error);
        HotelManager.Utils.showToast('Failed to refresh users', 'danger');
    }
}

// Show users section
function showUsersSection() {
    document.getElementById('usersLoading').style.display = 'none';
    
    if (filteredUsers.length === 0) {
        document.getElementById('noUsers').style.display = 'block';
        document.getElementById('usersSection').style.display = 'none';
    } else {
        document.getElementById('noUsers').style.display = 'none';
        document.getElementById('usersSection').style.display = 'block';
    }
}

// Show error
function showError(message) {
    document.getElementById('usersLoading').style.display = 'none';
    document.getElementById('usersSection').style.display = 'none';
    document.getElementById('noUsers').style.display = 'none';
    HotelManager.Utils.showToast(message, 'danger');
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
window.viewUserDetails = viewUserDetails;
window.promptChangeRole = promptChangeRole;
window.changeUserRole = changeUserRole;
window.refreshUsers = refreshUsers;

console.log('Admin User Management module initialized');
