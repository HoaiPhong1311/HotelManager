// Admin Room Management JavaScript

let allRooms = [];
let filteredRooms = [];
let currentView = 'grid';
let editingRoom = null;
let selectedRoomForDelete = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Room Management module loaded');
    initializeRoomManagement();
});

async function initializeRoomManagement() {
    try {
        // Check admin authentication
        await checkAdminAuthentication();
        
        // Initialize navigation
        HotelManager.Navigation.updateNavigation();
        
        // Load rooms data
        await loadAllRooms();
        
        // Load room types for filter
        await loadRoomTypes();
        
        // Setup event listeners
        setupEventListeners();
        
        // Apply initial filters
        applyFilters();
        
        // Show rooms section
        showRoomsSection();
        
        console.log('Room Management initialized successfully');
    } catch (error) {
        console.error('Error initializing room management:', error);
        showError('Failed to load room management. Please check your permissions.');
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

// Load all rooms
async function loadAllRooms() {
    try {
        console.log('Loading all rooms...');
        
        const response = await HotelManager.ApiService.get('/rooms/all');
        if (response && response.roomList) {
            allRooms = response.roomList;
            filteredRooms = [...allRooms];
            
            console.log(`Loaded ${allRooms.length} rooms`);
        } else {
            throw new Error(response?.message || 'Failed to load rooms');
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
        allRooms = [];
        filteredRooms = [];
        throw error;
    }
}

// Load room types for filter
async function loadRoomTypes() {
    try {
        const roomTypes = await HotelManager.ApiService.get('/rooms/types');
        const roomTypeFilter = document.getElementById('roomTypeFilter');
        
        // Clear existing options except the first one
        roomTypeFilter.innerHTML = '<option value="">All Room Types</option>';
        
        if (roomTypes && roomTypes.length > 0) {
            roomTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                roomTypeFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading room types:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchRooms');
    searchInput.addEventListener('input', debounce(applyFilters, 300));
    
    // Filter controls
    document.getElementById('roomTypeFilter').addEventListener('change', applyFilters);
    document.getElementById('minPrice').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('maxPrice').addEventListener('input', debounce(applyFilters, 300));
    
    // View mode toggle
    document.querySelectorAll('input[name="viewMode"]').forEach(radio => {
        radio.addEventListener('change', handleViewModeChange);
    });
    
    // Room form
    const roomForm = document.getElementById('roomForm');
    roomForm.addEventListener('submit', handleRoomSubmit);
    
    // Image upload preview
    const roomImage = document.getElementById('roomImage');
    roomImage.addEventListener('change', handleImagePreview);
    
    // Delete confirmation
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    confirmDeleteBtn.addEventListener('click', confirmDeleteRoom);
    
    console.log('Event listeners setup completed');
}

// Apply filters
function applyFilters() {
    const searchTerm = document.getElementById('searchRooms').value.toLowerCase().trim();
    const roomTypeFilter = document.getElementById('roomTypeFilter').value;
    const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice').value) || Infinity;
    
    filteredRooms = allRooms.filter(room => {
        // Search filter
        if (searchTerm) {
            const roomType = room.roomType?.toLowerCase() || '';
            const description = room.roomDescription?.toLowerCase() || '';
            
            if (!roomType.includes(searchTerm) && !description.includes(searchTerm)) {
                return false;
            }
        }
        
        // Room type filter
        if (roomTypeFilter && room.roomType !== roomTypeFilter) {
            return false;
        }
        
        // Price range filter
        const price = parseFloat(room.roomPrice) || 0;
        if (price < minPrice || price > maxPrice) {
            return false;
        }
        
        return true;
    });
    
    // Update statistics
    updateStatistics();
    
    // Display rooms
    displayRooms();
}

// Update statistics
function updateStatistics() {
    document.getElementById('totalRoomsCount').textContent = filteredRooms.length;
    // For now, we'll assume all rooms are available (real implementation would check bookings)
    document.getElementById('availableRoomsCount').textContent = filteredRooms.length;
    document.getElementById('occupiedRoomsCount').textContent = '0';
}

// Handle view mode change
function handleViewModeChange(event) {
    currentView = event.target.value;
    displayRooms();
}

// Display rooms
function displayRooms() {
    const container = document.getElementById('roomsContainer');
    const noRooms = document.getElementById('noRooms');
    const roomsSection = document.getElementById('roomsSection');
    
    if (filteredRooms.length === 0) {
        roomsSection.style.display = 'none';
        noRooms.style.display = 'block';
        return;
    }
    
    noRooms.style.display = 'none';
    roomsSection.style.display = 'block';
    
    container.innerHTML = '';
    
    if (currentView === 'grid') {
        container.className = 'row g-4';
        filteredRooms.forEach(room => {
            const roomCard = createRoomCard(room);
            container.appendChild(roomCard);
        });
    } else {
        container.className = 'row g-2';
        filteredRooms.forEach(room => {
            const roomListItem = createRoomListItem(room);
            container.appendChild(roomListItem);
        });
    }
}

// Create room card (grid view)
function createRoomCard(room) {
    const col = document.createElement('div');
    col.className = 'col-lg-4 col-md-6';
    
    const imageUrl = room.roomPhotoUrl ? 
        `${HotelManager.CONFIG.API_BASE_URL}/uploads${room.roomPhotoUrl.replace('/upload', '')}` : 
        'https://via.placeholder.com/400x250/0d6efd/ffffff?text=No+Image';
    
    const formattedPrice = `$${parseFloat(room.roomPrice).toFixed(2)}`;
    const shortDescription = room.roomDescription && room.roomDescription.length > 100 ? 
        room.roomDescription.substring(0, 100) + '...' : 
        room.roomDescription || 'No description available.';
    
    col.innerHTML = `
        <div class="card card-custom h-100 shadow-sm hover-lift">
            <div class="position-relative">
                <img src="${imageUrl}" 
                     class="card-img-top" 
                     alt="${room.roomType} Room"
                     style="height: 200px; object-fit: cover;"
                     onerror="this.src='https://via.placeholder.com/400x250/0d6efd/ffffff?text=No+Image'">
                <div class="position-absolute top-0 end-0 m-2">
                    <span class="badge bg-primary">${room.roomType}</span>
                </div>
                <div class="position-absolute bottom-0 start-0 m-2">
                    <span class="badge bg-success">${formattedPrice}/night</span>
                </div>
            </div>
            <div class="card-body d-flex flex-column">
                <h5 class="card-title text-primary">${room.roomType} Room</h5>
                <p class="card-text text-muted flex-grow-1">${shortDescription}</p>
                <div class="d-flex gap-2 mt-auto">
                    <button class="btn btn-outline-primary btn-sm flex-fill" onclick="editRoom(${room.id})">
                        <i class="fas fa-edit me-1"></i>Edit
                    </button>
                    <button class="btn btn-outline-danger btn-sm flex-fill" onclick="deleteRoomPrompt(${room.id})">
                        <i class="fas fa-trash me-1"></i>Delete
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

// Create room list item (list view)
function createRoomListItem(room) {
    const col = document.createElement('div');
    col.className = 'col-12';
    
    const imageUrl = room.roomPhotoUrl ? 
        `${HotelManager.CONFIG.API_BASE_URL}/uploads${room.roomPhotoUrl.replace('/upload', '')}` : 
        'https://via.placeholder.com/150x100/0d6efd/ffffff?text=No+Image';
    
    const formattedPrice = `$${parseFloat(room.roomPrice).toFixed(2)}`;
    
    col.innerHTML = `
        <div class="card card-custom shadow-sm hover-lift">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-2">
                        <img src="${imageUrl}" 
                             class="img-fluid rounded" 
                             alt="${room.roomType} Room"
                             style="height: 80px; width: 100%; object-fit: cover;"
                             onerror="this.src='https://via.placeholder.com/150x100/0d6efd/ffffff?text=No+Image'">
                    </div>
                    <div class="col-md-6">
                        <h5 class="mb-1 text-primary">${room.roomType} Room</h5>
                        <p class="mb-0 text-muted">${room.roomDescription || 'No description available.'}</p>
                    </div>
                    <div class="col-md-2 text-center">
                        <h4 class="text-success mb-0">${formattedPrice}</h4>
                        <small class="text-muted">per night</small>
                    </div>
                    <div class="col-md-2">
                        <div class="btn-group w-100">
                            <button class="btn btn-outline-primary btn-sm" onclick="editRoom(${room.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteRoomPrompt(${room.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

// Add new room
function addNewRoom() {
    editingRoom = null;
    document.getElementById('roomModalTitle').innerHTML = '<i class="fas fa-plus me-2"></i>Add New Room';
    document.getElementById('roomForm').reset();
    document.getElementById('imagePreviewContainer').style.display = 'none';
    
    const modal = new bootstrap.Modal(document.getElementById('roomModal'));
    modal.show();
}

// Edit room
function editRoom(roomId) {
    const room = allRooms.find(r => r.id === roomId);
    if (!room) {
        HotelManager.Utils.showToast('Room not found', 'danger');
        return;
    }
    
    editingRoom = room;
    document.getElementById('roomModalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Edit Room';
    
    // Populate form
    document.getElementById('roomType').value = room.roomType || '';
    document.getElementById('roomPrice').value = room.roomPrice || '';
    document.getElementById('roomDescription').value = room.roomDescription || '';
    
    // Show image preview if room has image
    if (room.roomPhotoUrl) {
        const imageUrl = `${HotelManager.CONFIG.API_BASE_URL}/uploads${room.roomPhotoUrl.replace('/upload', '')}`;
        document.getElementById('imagePreview').src = imageUrl;
        document.getElementById('imagePreviewContainer').style.display = 'block';
    } else {
        document.getElementById('imagePreviewContainer').style.display = 'none';
    }
    
    const modal = new bootstrap.Modal(document.getElementById('roomModal'));
    modal.show();
}

// Handle image preview
function handleImagePreview(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imagePreview').src = e.target.result;
            document.getElementById('imagePreviewContainer').style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        document.getElementById('imagePreviewContainer').style.display = 'none';
    }
}

// Handle room form submission
async function handleRoomSubmit(event) {
    event.preventDefault();
    
    const saveBtn = document.getElementById('saveRoomBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
    saveBtn.disabled = true;
    
    try {
        // Validate required fields
        const roomType = document.getElementById('roomType').value.trim();
        const roomPrice = document.getElementById('roomPrice').value.trim();
        const roomDescription = document.getElementById('roomDescription').value.trim();
        const imageFile = document.getElementById('roomImage').files[0];
        
        // For new rooms, all fields including photo are required
        if (!editingRoom) {
            if (!roomType) {
                HotelManager.Utils.showToast('Room type is required', 'warning');
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
                return;
            }
            if (!roomPrice || parseFloat(roomPrice) <= 0) {
                HotelManager.Utils.showToast('Valid room price is required', 'warning');
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
                return;
            }
            if (!roomDescription) {
                HotelManager.Utils.showToast('Room description is required', 'warning');
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
                return;
            }
            if (!imageFile) {
                HotelManager.Utils.showToast('Room photo is required', 'warning');
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
                return;
            }
        }
        
        const formData = new FormData();
        formData.append('roomType', roomType);
        formData.append('roomPrice', roomPrice);
        formData.append('roomDescription', roomDescription);
        
        if (imageFile) {
            formData.append('photo', imageFile);
        }
        
        // Debug: Log what we're sending
        console.log('Form data being sent:');
        console.log('roomType:', roomType);
        console.log('roomPrice:', roomPrice);
        console.log('roomDescription:', roomDescription);
        console.log('photo file:', imageFile);
        console.log('editingRoom:', editingRoom);
        
        let response;
        if (editingRoom) {
            // Update existing room
            response = await HotelManager.ApiService.put(`/rooms/update/${editingRoom.id}`, formData);
        } else {
            // Add new room
            response = await HotelManager.ApiService.post('/rooms/add', formData);
        }
        
        if (response && response.statusCode === 200) {
            HotelManager.Utils.showToast(
                editingRoom ? 'Room updated successfully!' : 'Room added successfully!', 
                'success'
            );
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('roomModal'));
            modal.hide();
            
            // Refresh rooms
            await loadAllRooms();
            await loadRoomTypes();
            applyFilters();
        } else {
            throw new Error(response?.message || 'Failed to save room');
        }
        
    } catch (error) {
        console.error('Error saving room:', error);
        HotelManager.Utils.showToast('Failed to save room. Please try again.', 'danger');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Delete room prompt
function deleteRoomPrompt(roomId) {
    const room = allRooms.find(r => r.id === roomId);
    if (!room) {
        HotelManager.Utils.showToast('Room not found', 'danger');
        return;
    }
    
    selectedRoomForDelete = room;
    
    // Populate delete modal
    document.getElementById('deleteRoomType').textContent = room.roomType;
    document.getElementById('deleteRoomPrice').textContent = parseFloat(room.roomPrice).toFixed(2);
    
    const modal = new bootstrap.Modal(document.getElementById('deleteRoomModal'));
    modal.show();
}

// Confirm delete room
async function confirmDeleteRoom() {
    if (!selectedRoomForDelete) return;
    
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Deleting...';
    confirmBtn.disabled = true;
    
    try {
        const response = await HotelManager.ApiService.delete(`/rooms/delete/${selectedRoomForDelete.id}`);
        
        if (response && response.statusCode === 200) {
            HotelManager.Utils.showToast('Room deleted successfully!', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteRoomModal'));
            modal.hide();
            
            // Refresh rooms
            await loadAllRooms();
            await loadRoomTypes();
            applyFilters();
        } else {
            throw new Error(response?.message || 'Failed to delete room');
        }
    } catch (error) {
        console.error('Error deleting room:', error);
        HotelManager.Utils.showToast('Failed to delete room. Please try again.', 'danger');
    } finally {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

// Refresh rooms
async function refreshRooms() {
    try {
        document.getElementById('roomsLoading').style.display = 'block';
        document.getElementById('roomsSection').style.display = 'none';
        document.getElementById('noRooms').style.display = 'none';
        
        await loadAllRooms();
        await loadRoomTypes();
        applyFilters();
        showRoomsSection();
        
        HotelManager.Utils.showToast('Rooms refreshed successfully!', 'success');
    } catch (error) {
        console.error('Error refreshing rooms:', error);
        HotelManager.Utils.showToast('Failed to refresh rooms', 'danger');
    }
}

// Show rooms section
function showRoomsSection() {
    document.getElementById('roomsLoading').style.display = 'none';
    
    if (filteredRooms.length === 0) {
        document.getElementById('noRooms').style.display = 'block';
        document.getElementById('roomsSection').style.display = 'none';
    } else {
        document.getElementById('noRooms').style.display = 'none';
        document.getElementById('roomsSection').style.display = 'block';
    }
}

// Show error
function showError(message) {
    document.getElementById('roomsLoading').style.display = 'none';
    document.getElementById('roomsSection').style.display = 'none';
    document.getElementById('noRooms').style.display = 'none';
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
window.addNewRoom = addNewRoom;
window.editRoom = editRoom;
window.deleteRoomPrompt = deleteRoomPrompt;
window.refreshRooms = refreshRooms;

console.log('Admin Room Management module initialized');