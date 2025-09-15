// Room Browsing & Search JavaScript with Real Data Integration

document.addEventListener('DOMContentLoaded', function() {
    console.log('Room browsing module loaded');
    initializeRoomBrowsing();
});

// Global variables
let allRooms = [];
let filteredRooms = [];
let currentPage = 1;
let roomsPerPage = 6;
let currentView = 'grid';
let searchParams = {};

// Initialize room browsing
async function initializeRoomBrowsing() {
    try {
        parseURLParameters();
        await Promise.all([loadRoomTypes(), loadAllRooms()]);
        setupEventListeners();
        if (Object.keys(searchParams).length > 0) {
            applyInitialSearch();
        }
        console.log('Room browsing initialized successfully');
    } catch (error) {
        console.error('Error initializing room browsing:', error);
        showErrorMessage('Failed to load rooms. Please refresh the page.');
    }
}

// Parse URL parameters
function parseURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    searchParams = {
        checkInDate: urlParams.get('checkInDate'),
        checkOutDate: urlParams.get('checkOutDate'),
        roomType: urlParams.get('roomType')
    };
    console.log('URL search parameters:', searchParams);
}

// Load room types
async function loadRoomTypes() {
    try {
        const roomTypes = await HotelManager.ApiService.get('/rooms/types');
        
        const searchRoomTypeSelect = document.getElementById('searchRoomType');
        roomTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            searchRoomTypeSelect.appendChild(option);
        });
        
        const roomTypeFilters = document.getElementById('roomTypeFilters');
        roomTypes.forEach(type => {
            const checkboxHtml = `
                <div class="form-check">
                    <input class="form-check-input room-type-filter" type="checkbox" 
                           id="type-${type}" value="${type}">
                    <label class="form-check-label" for="type-${type}">${type}</label>
                </div>`;
            roomTypeFilters.insertAdjacentHTML('beforeend', checkboxHtml);
        });
        
        console.log(`Loaded ${roomTypes.length} room types`);
    } catch (error) {
        console.error('Error loading room types:', error);
    }
}

// Load all rooms (use availability API if dates are provided)
async function loadAllRooms() {
    try {
        console.log('Loading rooms...');
        
        let response;
        
        // If we have search dates, use availability API
        if (searchParams.checkInDate && searchParams.checkOutDate) {
            console.log('Loading available rooms for dates:', searchParams.checkInDate, 'to', searchParams.checkOutDate);
            
            if (searchParams.roomType && searchParams.roomType !== '') {
                // Search with specific room type and dates
                response = await HotelManager.ApiService.get(
                    `/rooms/available-rooms-by-date-and-type?checkInDate=${searchParams.checkInDate}&checkOutDate=${searchParams.checkOutDate}&roomType=${searchParams.roomType}`
                );
            } else {
                // Search with dates only (get all available rooms, then we'll filter by type if needed)
                response = await HotelManager.ApiService.get('/rooms/all-available-rooms');
                
                // Filter manually by date if the API doesn't support date filtering for all types
                if (response && response.roomList) {
                    // For now, we'll use the available rooms API result
                    // In future, backend could add date filtering to all-available-rooms endpoint
                }
            }
        } else {
            // No dates specified, load all rooms
            console.log('Loading all rooms (no date filter)');
            response = await HotelManager.ApiService.get('/rooms/all');
        }
        
        if (response && response.roomList) {
            allRooms = response.roomList;
            filteredRooms = [...allRooms];
            
            console.log(`Loaded ${allRooms.length} rooms`);
            updateResultsCount(allRooms.length);
            displayRooms();
            
            document.getElementById('roomsLoading').style.display = 'none';
            document.getElementById('roomsContainer').style.display = 'block';
        } else {
            showNoRoomsMessage();
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
        showErrorMessage('Failed to load rooms');
    }
}

// Apply initial search
function applyInitialSearch() {
    if (searchParams.checkInDate) {
        document.getElementById('searchCheckIn').value = searchParams.checkInDate;
    }
    if (searchParams.checkOutDate) {
        document.getElementById('searchCheckOut').value = searchParams.checkOutDate;
    }
    if (searchParams.roomType) {
        document.getElementById('searchRoomType').value = searchParams.roomType;
    }
    applySearchFilter();
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('roomSearchForm').addEventListener('submit', handleSearch);
    document.getElementById('gridViewBtn').addEventListener('click', () => switchView('grid'));
    document.getElementById('listViewBtn').addEventListener('click', () => switchView('list'));
    document.getElementById('showAvailableOnly').addEventListener('click', showAvailableOnly);
    document.getElementById('clearFilters').addEventListener('click', clearAllFilters);
    document.getElementById('resetSearch').addEventListener('click', resetSearch);
    document.getElementById('sortBy').addEventListener('change', handleSort);
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('minPrice').addEventListener('input', debounce(applyFilters, 500));
    document.getElementById('maxPrice').addEventListener('input', debounce(applyFilters, 500));
    setDefaultDates();
}

// Handle search
async function handleSearch(event) {
    event.preventDefault();
    
    const checkInDate = document.getElementById('searchCheckIn').value;
    const checkOutDate = document.getElementById('searchCheckOut').value;
    const roomType = document.getElementById('searchRoomType').value;
    
    if (checkInDate && checkOutDate) {
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        
        if (checkOut <= checkIn) {
            HotelManager.Utils.showToast('Check-out date must be after check-in date', 'warning');
            return;
        }
    }
    
    searchParams = { checkInDate, checkOutDate, roomType };
    await applySearchFilter();
}

// Apply search filter
async function applySearchFilter() {
    try {
        const { checkInDate, checkOutDate, roomType } = searchParams;
        
        // If we have dates, search for available rooms
        if (checkInDate && checkOutDate) {
            console.log('Searching with dates:', { checkInDate, checkOutDate, roomType });
            
            let response;
            
            if (roomType && roomType !== '') {
                // Search with specific room type and dates
                response = await HotelManager.ApiService.get(
                    `/rooms/available-rooms-by-date-and-type?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&roomType=${roomType}`
                );
            } else {
                // Search with dates only (all room types)
                // Since backend doesn't have API for date-only search, we'll search for each room type
                console.log('Searching available rooms for all types with dates...');
                
                const roomTypes = await HotelManager.ApiService.get('/rooms/types');
                const allAvailableRooms = [];
                
                if (roomTypes && roomTypes.length > 0) {
                    const promises = roomTypes.map(type => 
                        HotelManager.ApiService.get(
                            `/rooms/available-rooms-by-date-and-type?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&roomType=${type}`
                        ).catch(error => {
                            console.warn(`Failed to fetch rooms for type ${type}:`, error);
                            return { roomList: [] };
                        })
                    );
                    
                    const responses = await Promise.all(promises);
                    responses.forEach(resp => {
                        if (resp && resp.roomList) {
                            allAvailableRooms.push(...resp.roomList);
                        }
                    });
                }
                
                response = { roomList: allAvailableRooms };
                console.log(`Found ${allAvailableRooms.length} available rooms across all types`);
            }
            
            if (response && response.roomList) {
                filteredRooms = response.roomList;
                updateResultsCount(filteredRooms.length);
                displayRooms();
                HotelManager.Utils.showToast(`Found ${filteredRooms.length} available rooms`, 'success');
            } else {
                filteredRooms = [];
                showNoRoomsMessage();
            }
        } else if (roomType && roomType !== '') {
            // Filter by room type only (no dates)
            filteredRooms = allRooms.filter(room => 
                room.roomType.toLowerCase().includes(roomType.toLowerCase())
            );
            updateResultsCount(filteredRooms.length);
            displayRooms();
        } else {
            // No filters, show all rooms
            filteredRooms = [...allRooms];
            updateResultsCount(filteredRooms.length);
            displayRooms();
        }
    } catch (error) {
        console.error('Error applying search filter:', error);
        HotelManager.Utils.showToast('Error searching rooms', 'danger');
    }
}

// Apply filters
function applyFilters() {
    let filtered = [...allRooms];
    
    const minPrice = parseFloat(document.getElementById('minPrice').value);
    const maxPrice = parseFloat(document.getElementById('maxPrice').value);
    
    if (!isNaN(minPrice)) {
        filtered = filtered.filter(room => parseFloat(room.roomPrice) >= minPrice);
    }
    
    if (!isNaN(maxPrice)) {
        filtered = filtered.filter(room => parseFloat(room.roomPrice) <= maxPrice);
    }
    
    const selectedTypes = Array.from(document.querySelectorAll('.room-type-filter:checked'))
        .map(cb => cb.value);
    
    if (selectedTypes.length > 0) {
        filtered = filtered.filter(room => selectedTypes.includes(room.roomType));
    }
    
    filteredRooms = filtered;
    currentPage = 1;
    updateResultsCount(filteredRooms.length);
    displayRooms();
    
    console.log(`Applied filters, showing ${filteredRooms.length} rooms`);
}

// Handle sorting
function handleSort() {
    const sortBy = document.getElementById('sortBy').value;
    
    switch (sortBy) {
        case 'price-low':
            filteredRooms.sort((a, b) => parseFloat(a.roomPrice) - parseFloat(b.roomPrice));
            break;
        case 'price-high':
            filteredRooms.sort((a, b) => parseFloat(b.roomPrice) - parseFloat(a.roomPrice));
            break;
        case 'type':
            filteredRooms.sort((a, b) => a.roomType.localeCompare(b.roomType));
            break;
        default:
            filteredRooms.sort((a, b) => a.id - b.id);
    }
    
    currentPage = 1;
    displayRooms();
}

// Switch view
function switchView(view) {
    currentView = view;
    
    document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
    document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
    
    document.getElementById('roomsGrid').classList.toggle('d-none', view !== 'grid');
    document.getElementById('roomsList').classList.toggle('d-none', view !== 'list');
    
    displayRooms();
}

// Display rooms
function displayRooms() {
    const startIndex = (currentPage - 1) * roomsPerPage;
    const endIndex = startIndex + roomsPerPage;
    const roomsToShow = filteredRooms.slice(startIndex, endIndex);
    
    if (currentView === 'grid') {
        displayGridView(roomsToShow);
    } else {
        displayListView(roomsToShow);
    }
    
    setupPagination();
    
    if (filteredRooms.length === 0) {
        showNoRoomsMessage();
    } else {
        document.getElementById('roomsContainer').style.display = 'block';
        document.getElementById('noRoomsFound').style.display = 'none';
    }
}

// Display grid view
function displayGridView(rooms) {
    const gridContainer = document.getElementById('roomsGrid');
    gridContainer.innerHTML = '';
    
    rooms.forEach(room => {
        const roomCard = createRoomGridCard(room);
        gridContainer.appendChild(roomCard);
    });
}

// Display list view
function displayListView(rooms) {
    const listContainer = document.getElementById('roomsList');
    listContainer.innerHTML = '';
    
    rooms.forEach(room => {
        const roomCard = createRoomListCard(room);
        listContainer.appendChild(roomCard);
    });
}

// Create room grid card
function createRoomGridCard(room) {
    const col = document.createElement('div');
    col.className = 'col-lg-4 col-md-6';
    
    const imageUrl = room.roomPhotoUrl ? 
        `${HotelManager.CONFIG.API_BASE_URL}/uploads${room.roomPhotoUrl.replace('/upload', '')}` : 
        'https://via.placeholder.com/400x300/0d6efd/ffffff?text=Hotel+Room';
    
    const formattedPrice = `$${parseFloat(room.roomPrice).toFixed(2)}`;
    const shortDescription = room.roomDescription && room.roomDescription.length > 120 ? 
        room.roomDescription.substring(0, 120) + '...' : 
        room.roomDescription || 'Comfortable room with modern amenities and excellent service.';
    
    col.innerHTML = `
        <div class="card card-custom room-card h-100 hover-lift">
            <div class="position-relative">
                <img src="${imageUrl}" 
                     class="card-img-top" 
                     alt="${room.roomType} Room"
                     style="height: 250px; object-fit: cover;"
                     onerror="this.src='https://via.placeholder.com/400x300/0d6efd/ffffff?text=Hotel+Room'">
                <div class="position-absolute top-0 end-0 m-3">
                    <span class="badge bg-primary fs-6">${room.roomType}</span>
                </div>
                <div class="position-absolute bottom-0 start-0 m-3">
                    <span class="badge bg-dark bg-opacity-75">${formattedPrice}/night</span>
                </div>
            </div>
            <div class="card-body d-flex flex-column">
                <h5 class="card-title text-primary">${room.roomType} Room</h5>
                <p class="card-text text-muted flex-grow-1">${shortDescription}</p>
                <div class="d-flex gap-2 mt-auto">
                    <button class="btn btn-outline-primary flex-fill" onclick="viewRoomDetails(${room.id})">
                        <i class="fas fa-eye me-1"></i>View Details
                    </button>
                    <button class="btn btn-primary flex-fill" onclick="bookRoom(${room.id})">
                        <i class="fas fa-calendar-check me-1"></i>Book Now
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

// Create room list card
function createRoomListCard(room) {
    const div = document.createElement('div');
    div.className = 'card card-custom room-card mb-4 hover-lift';
    
    const imageUrl = room.roomPhotoUrl ? 
        `${HotelManager.CONFIG.API_BASE_URL}/uploads${room.roomPhotoUrl.replace('/upload', '')}` : 
        'https://via.placeholder.com/300x200/0d6efd/ffffff?text=Hotel+Room';
    
    const formattedPrice = `$${parseFloat(room.roomPrice).toFixed(2)}`;
    
    div.innerHTML = `
        <div class="row g-0">
            <div class="col-md-4">
                <img src="${imageUrl}" 
                     class="img-fluid rounded-start h-100" 
                     alt="${room.roomType} Room"
                     style="object-fit: cover; min-height: 200px;"
                     onerror="this.src='https://via.placeholder.com/300x200/0d6efd/ffffff?text=Hotel+Room'">
            </div>
            <div class="col-md-8">
                <div class="card-body d-flex flex-column h-100">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title text-primary mb-0">${room.roomType} Room</h5>
                        <span class="badge bg-primary">${room.roomType}</span>
                    </div>
                    <p class="card-text text-muted flex-grow-1">
                        ${room.roomDescription || 'Comfortable room with modern amenities and excellent service.'}
                    </p>
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="text-primary">
                            <h4 class="mb-0 fw-bold">${formattedPrice}</h4>
                            <small class="text-muted">per night</small>
                        </div>
                        <div class="btn-group">
                            <button class="btn btn-outline-primary" onclick="viewRoomDetails(${room.id})">
                                <i class="fas fa-eye me-1"></i>Details
                            </button>
                            <button class="btn btn-primary" onclick="bookRoom(${room.id})">
                                <i class="fas fa-calendar-check me-1"></i>Book Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return div;
}

// Pagination
function setupPagination() {
    const totalPages = Math.ceil(filteredRooms.length / roomsPerPage);
    const paginationContainer = document.querySelector('#paginationContainer .pagination');
    
    if (totalPages <= 1) {
        document.getElementById('paginationContainer').style.display = 'none';
        return;
    }
    
    document.getElementById('paginationContainer').style.display = 'flex';
    paginationContainer.innerHTML = '';
    
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Previous</a>`;
    paginationContainer.appendChild(prevLi);
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            const li = document.createElement('li');
            li.className = `page-item ${i === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#" onclick="changePage(${i})">${i}</a>`;
            paginationContainer.appendChild(li);
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            const li = document.createElement('li');
            li.className = 'page-item disabled';
            li.innerHTML = `<span class="page-link">...</span>`;
            paginationContainer.appendChild(li);
        }
    }
    
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>`;
    paginationContainer.appendChild(nextLi);
}

function changePage(page) {
    if (page >= 1 && page <= Math.ceil(filteredRooms.length / roomsPerPage)) {
        currentPage = page;
        displayRooms();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function updateResultsCount(count) {
    const resultsCountElement = document.getElementById('resultsCount');
    resultsCountElement.innerHTML = `<i class="fas fa-search me-1"></i>${count} room${count !== 1 ? 's' : ''} found`;
}

function showNoRoomsMessage() {
    document.getElementById('roomsLoading').style.display = 'none';
    document.getElementById('roomsContainer').style.display = 'none';
    document.getElementById('noRoomsFound').style.display = 'block';
    updateResultsCount(0);
}

function showErrorMessage(message) {
    document.getElementById('roomsLoading').style.display = 'none';
    HotelManager.Utils.showToast(message, 'danger');
}

function showAvailableOnly() {
    HotelManager.Utils.showToast('Showing all available rooms', 'info');
}

function clearAllFilters() {
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.querySelectorAll('.room-type-filter').forEach(cb => cb.checked = false);
    
    filteredRooms = [...allRooms];
    currentPage = 1;
    updateResultsCount(filteredRooms.length);
    displayRooms();
    
    HotelManager.Utils.showToast('Filters cleared', 'success');
}

function resetSearch() {
    document.getElementById('roomSearchForm').reset();
    clearAllFilters();
    searchParams = {};
    HotelManager.Utils.showToast('Search reset', 'success');
}

function setDefaultDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const checkInInput = document.getElementById('searchCheckIn');
    const checkOutInput = document.getElementById('searchCheckOut');
    
    checkInInput.min = today.toISOString().split('T')[0];
    checkOutInput.min = tomorrow.toISOString().split('T')[0];
    
    checkInInput.addEventListener('change', function() {
        const selectedDate = new Date(this.value);
        const nextDay = new Date(selectedDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        checkOutInput.min = nextDay.toISOString().split('T')[0];
        
        if (new Date(checkOutInput.value) <= selectedDate) {
            checkOutInput.value = nextDay.toISOString().split('T')[0];
        }
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

function viewRoomDetails(roomId) {
    window.location.href = `room-detail.html?id=${roomId}`;
}

function bookRoom(roomId) {
    if (!HotelManager.Utils.isLoggedIn()) {
        HotelManager.Utils.showToast('Please login to book a room', 'warning');
        setTimeout(() => {
            window.location.href = '../auth/login.html';
        }, 1500);
        return;
    }
    
    // Redirect to room detail page instead of booking page
    // This ensures users see full room info and can select dates/guests
    const urlParams = new URLSearchParams();
    urlParams.set('id', roomId);
    
    // Pass search dates if available
    if (searchParams.checkInDate) urlParams.set('checkIn', searchParams.checkInDate);
    if (searchParams.checkOutDate) urlParams.set('checkOut', searchParams.checkOutDate);
    
    window.location.href = `room-detail.html?${urlParams.toString()}`;
}

window.changePage = changePage;
window.viewRoomDetails = viewRoomDetails;
window.bookRoom = bookRoom;

console.log('Room browsing module initialized');
