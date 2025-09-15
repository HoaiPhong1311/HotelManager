// Hotel Manager - Main JavaScript File

// Configuration
const CONFIG = {
    API_BASE_URL: 'http://localhost:4040',
    TOKEN_KEY: 'hotelManagerToken',
    USER_KEY: 'hotelManagerUser'
};

// Utility Functions
const Utils = {
    // Get token from localStorage
    getToken: () => localStorage.getItem(CONFIG.TOKEN_KEY),
    
    // Set token in localStorage
    setToken: (token) => localStorage.setItem(CONFIG.TOKEN_KEY, token),
    
    // Remove token from localStorage
    removeToken: () => localStorage.removeItem(CONFIG.TOKEN_KEY),
    
    // Get user info from localStorage
    getUser: () => {
        const user = localStorage.getItem(CONFIG.USER_KEY);
        return user ? JSON.parse(user) : null;
    },
    
    // Set user info in localStorage
    setUser: (user) => localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user)),
    
    // Remove user info from localStorage
    removeUser: () => localStorage.removeItem(CONFIG.USER_KEY),
    
    // Check if user is logged in
    isLoggedIn: () => !!Utils.getToken(),
    
    // Check if user is admin
    isAdmin: () => {
        const user = Utils.getUser();
        return user && user.role === 'ADMIN';
    },
    
    // Format date
    formatDate: (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },
    
    // Format currency
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },
    
    // Show loading spinner
    showLoading: (element) => {
        if (element) {
            element.innerHTML = '<div class="spinner-custom mx-auto"></div>';
        }
    },
    
    // Show toast notification
    showToast: (message, type = 'info') => {
        // Create toast element
        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        
        // Add to toast container
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        // Show toast
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        
        // Remove toast after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
};

// API Service
const ApiService = {
    // Base API request method
    request: async (endpoint, options = {}) => {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const token = Utils.getToken();
        
        // Don't set Content-Type for FormData - let browser handle it
        const isFormData = options.data instanceof FormData;
        
        const defaultOptions = {
            headers: {
                ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        // Debug logging for FormData requests
        if (isFormData) {
            console.log('Sending FormData request to:', url);
            console.log('Headers:', finalOptions.headers);
        }
        
        try {
            const response = await axios({
                url,
                ...finalOptions
            });
            
            return response.data;
        } catch (error) {
            console.error('API Error:', error);
            
            // Handle specific error cases
            if (error.response) {
                if (error.response.status === 401) {
                    Utils.removeToken();
                    Utils.removeUser();
                    window.location.href = '/auth/login.html';
                }
                throw new Error(error.response.data.message || 'An error occurred');
            }
            
            throw new Error('Network error occurred');
        }
    },
    
    // GET request
    get: (endpoint) => ApiService.request(endpoint, { method: 'GET' }),
    
    // POST request
    post: (endpoint, data) => ApiService.request(endpoint, { 
        method: 'POST', 
        data 
    }),
    
    // PUT request
    put: (endpoint, data) => ApiService.request(endpoint, { 
        method: 'PUT', 
        data 
    }),
    
    // DELETE request
    delete: (endpoint) => ApiService.request(endpoint, { method: 'DELETE' }),
    
    // POST with FormData (for file uploads)
    postFormData: (endpoint, formData) => {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const token = Utils.getToken();
        
        return axios.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        });
    }
};

// Navigation Management
const Navigation = {
    updateNavigation: () => {
        const isLoggedIn = Utils.isLoggedIn();
        const user = Utils.getUser();
        
        console.log('Navigation update:', { isLoggedIn, user });
        console.log('User name:', user?.name);
        console.log('User role:', user?.role);
        
        // Update navigation based on auth state
        const authNavItems = document.getElementById('authNavItems');
        if (authNavItems) {
            if (isLoggedIn && user) {
                // User is logged in - show user menu
                const displayName = user.name || 'User';
                // Show "Admin" for admin role, show actual name for user role
                const roleDisplayName = user.role === 'ADMIN' ? 'Admin' : displayName;
                
                authNavItems.innerHTML = `
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown">
                            <i class="fas fa-user-circle me-1"></i>${roleDisplayName}
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><h6 class="dropdown-header">${user.role || 'USER'}</h6></li>
                            <li><hr class="dropdown-divider"></li>
                            ${user.role === 'ADMIN' ? `
                                <li><a class="dropdown-item" href="${Navigation.getBasePath()}admin/dashboard.html">
                                    <i class="fas fa-tachometer-alt me-2"></i>Admin Dashboard
                                </a></li>
                                <li><a class="dropdown-item" href="${Navigation.getBasePath()}admin/rooms-management.html">
                                    <i class="fas fa-bed me-2"></i>Manage Rooms
                                </a></li>
                                <li><a class="dropdown-item" href="${Navigation.getBasePath()}admin/bookings-management.html">
                                    <i class="fas fa-calendar me-2"></i>Manage Bookings
                                </a></li>
                                <li><hr class="dropdown-divider"></li>
                            ` : `
                                <li><a class="dropdown-item" href="${Navigation.getBasePath()}user/dashboard.html">
                                    <i class="fas fa-tachometer-alt me-2"></i>Dashboard
                                </a></li>
                                <li><a class="dropdown-item" href="${Navigation.getBasePath()}user/my-bookings.html">
                                    <i class="fas fa-calendar me-2"></i>My Bookings
                                </a></li>
                                <li><hr class="dropdown-divider"></li>
                            `}
                            <li><a class="dropdown-item" href="#" onclick="HotelManager.Navigation.logout()">
                                <i class="fas fa-sign-out-alt me-2"></i>Logout
                            </a></li>
                        </ul>
                    </li>
                `;
            } else {
                // User not logged in - show login/register links
                authNavItems.innerHTML = `
                    <li class="nav-item">
                        <a class="nav-link" href="${Navigation.getBasePath()}auth/login.html">
                            <i class="fas fa-sign-in-alt me-1"></i>Login
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="${Navigation.getBasePath()}auth/register.html">
                            <i class="fas fa-user-plus me-1"></i>Register
                        </a>
                    </li>
                `;
            }
        }
    },
    
    // Get base path based on current location
    getBasePath: () => {
        const path = window.location.pathname;
        if (path.includes('/auth/')) return '../';
        if (path.includes('/user/')) return '../';
        if (path.includes('/admin/')) return '../';
        return '';
    },
    
    logout: () => {
        // Show confirmation
        if (confirm('Are you sure you want to logout?')) {
            Utils.removeToken();
            Utils.removeUser();
            Utils.showToast('Logged out successfully', 'success');
            
            // Redirect based on current location
            const basePath = Navigation.getBasePath();
            window.location.href = `${basePath}index.html`;
        }
    }
};

// Form Validation
const Validation = {
    validateEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    validatePassword: (password) => {
        return password.length >= 6;
    },
    
    validateRequired: (value) => {
        return value && value.trim().length > 0;
    },
    
    validatePhoneNumber: (phone) => {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone);
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Hotel Manager Frontend Initialized');
    Navigation.updateNavigation();
});

// Export for use in other files
window.HotelManager = {
    Utils,
    ApiService,
    Navigation,
    Validation,
    CONFIG
};
