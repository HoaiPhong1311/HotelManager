// Authentication JavaScript with Real Backend Integration

document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth module loaded');
    
    // Check if user is already logged in and redirect if needed
    checkAuthAndRedirect();
    
    // Initialize login form if it exists
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        initializeLoginForm();
    }
    
    // Initialize register form if it exists
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        initializeRegisterForm();
    }
});

// Check authentication and redirect if needed
function checkAuthAndRedirect() {
    if (HotelManager.Utils.isLoggedIn()) {
        const user = HotelManager.Utils.getUser();
        console.log('User already logged in:', user);
        
        // Redirect to homepage for both roles
        window.location.href = '../index.html';
    }
}

// Initialize Login Form
function initializeLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const loginBtn = document.getElementById('loginBtn');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    
    // Toggle password visibility
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }
    
    // Form validation on input
    emailInput.addEventListener('input', validateEmailField);
    passwordInput.addEventListener('input', validatePasswordField);
    
    // Form submission
    loginForm.addEventListener('submit', handleLogin);
}

// Email field validation
function validateEmailField() {
    const emailInput = document.getElementById('email');
    const email = emailInput.value.trim();
    
    if (email === '') {
        setFieldInvalid(emailInput, 'Email is required');
        return false;
    }
    
    if (!HotelManager.Validation.validateEmail(email)) {
        setFieldInvalid(emailInput, 'Please enter a valid email address');
        return false;
    }
    
    setFieldValid(emailInput);
    return true;
}

// Password field validation
function validatePasswordField() {
    const passwordInput = document.getElementById('password');
    const password = passwordInput.value;
    
    if (password === '') {
        setFieldInvalid(passwordInput, 'Password is required');
        return false;
    }
    
    setFieldValid(passwordInput);
    return true;
}

// Set field as invalid
function setFieldInvalid(field, message) {
    field.classList.add('is-invalid');
    field.classList.remove('is-valid');
    
    const feedback = field.parentElement.querySelector('.invalid-feedback') || 
                    field.nextElementSibling;
    if (feedback && feedback.classList.contains('invalid-feedback')) {
        feedback.textContent = message;
    }
}

// Set field as valid
function setFieldValid(field) {
    field.classList.add('is-valid');
    field.classList.remove('is-invalid');
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Validate form
    const isEmailValid = validateEmailField();
    const isPasswordValid = validatePasswordField();
    
    if (!isEmailValid || !isPasswordValid) {
        HotelManager.Utils.showToast('Please fill in all required fields correctly', 'warning');
        return;
    }
    
    // Prepare login data
    const loginData = {
        email: emailInput.value.trim(),
        password: passwordInput.value
    };
    
    // Show loading state
    const originalBtnContent = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Signing In...';
    loginBtn.disabled = true;
    
    try {
        console.log('Attempting login with:', { email: loginData.email });
        
        // Make login API call
        const response = await HotelManager.ApiService.post('/auth/login', loginData);
        console.log('Login response:', response);
        
        if (response.statusCode === 200 && response.token) {
            // Store authentication data
            HotelManager.Utils.setToken(response.token);
            
            // Get user info using the profile API
            try {
                const userInfoResponse = await HotelManager.ApiService.get('/users/get-logged-in-profile-info');
                console.log('User info response:', userInfoResponse);
                
                if (userInfoResponse.statusCode === 200 && userInfoResponse.user) {
                    // Store complete user info
                    const userData = {
                        ...userInfoResponse.user,
                        role: response.role,
                        expirationTime: response.expirationTime
                    };
                    
                    console.log('Complete user data to store:', userData);
                    HotelManager.Utils.setUser(userData);
                    
                    // Show success message with real name
                    HotelManager.Utils.showToast(`Welcome back, ${userData.name || 'User'}!`, 'success');
                } else {
                    // Fallback if user info fetch fails
                    const userData = {
                        role: response.role,
                        expirationTime: response.expirationTime,
                        email: loginData.email
                    };
                    HotelManager.Utils.setUser(userData);
                    HotelManager.Utils.showToast(`Welcome back!`, 'success');
                }
            } catch (userInfoError) {
                console.error('Error fetching user info:', userInfoError);
                // Fallback if user info fetch fails
                const userData = {
                    role: response.role,
                    expirationTime: response.expirationTime,
                    email: loginData.email
                };
                HotelManager.Utils.setUser(userData);
                HotelManager.Utils.showToast(`Welcome back!`, 'success');
            }
            
            console.log('Login successful, redirecting...');
            
            // Redirect based on role - both go to homepage
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1000);
            
        } else {
            throw new Error(response.message || 'Login failed');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Show error message
        const errorMessage = error.message || 'Login failed. Please check your credentials.';
        HotelManager.Utils.showToast(errorMessage, 'danger');
        
        // Reset form state
        loginBtn.innerHTML = originalBtnContent;
        loginBtn.disabled = false;
        
        // Clear password field on error
        passwordInput.value = '';
        passwordInput.classList.remove('is-valid', 'is-invalid');
    }
}

// Initialize Register Form
function initializeRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('regEmail');
    const phoneInput = document.getElementById('phoneNumber');
    const passwordInput = document.getElementById('regPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const toggleRegPasswordBtn = document.getElementById('toggleRegPassword');
    const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
    const agreeTermsCheckbox = document.getElementById('agreeTerms');
    
    // Toggle password visibility
    if (toggleRegPasswordBtn) {
        toggleRegPasswordBtn.addEventListener('click', function() {
            AuthUtils.togglePasswordVisibility('regPassword', 'toggleRegPassword');
        });
    }
    
    if (toggleConfirmPasswordBtn) {
        toggleConfirmPasswordBtn.addEventListener('click', function() {
            AuthUtils.togglePasswordVisibility('confirmPassword', 'toggleConfirmPassword');
        });
    }
    
    // Form validation on input
    fullNameInput.addEventListener('input', validateRegFullNameField);
    emailInput.addEventListener('input', validateRegEmailField);
    phoneInput.addEventListener('input', validateRegPhoneField);
    passwordInput.addEventListener('input', validateRegPasswordField);
    confirmPasswordInput.addEventListener('input', validateRegConfirmPasswordField);
    agreeTermsCheckbox.addEventListener('change', validateRegTermsField);
    
    // Form submission
    registerForm.addEventListener('submit', handleRegister);
}

// Register form validation functions
function validateRegFullNameField() {
    const fullNameInput = document.getElementById('fullName');
    const name = fullNameInput.value.trim();
    
    if (name === '') {
        setFieldInvalid(fullNameInput, 'Full name is required');
        return false;
    }
    
    if (name.length < 2) {
        setFieldInvalid(fullNameInput, 'Name must be at least 2 characters');
        return false;
    }
    
    setFieldValid(fullNameInput);
    return true;
}

function validateRegEmailField() {
    const emailInput = document.getElementById('regEmail');
    const email = emailInput.value.trim();
    
    if (email === '') {
        setFieldInvalid(emailInput, 'Email is required');
        return false;
    }
    
    if (!HotelManager.Validation.validateEmail(email)) {
        setFieldInvalid(emailInput, 'Please enter a valid email address');
        return false;
    }
    
    setFieldValid(emailInput);
    return true;
}

function validateRegPhoneField() {
    const phoneInput = document.getElementById('phoneNumber');
    const phone = phoneInput.value.trim();
    
    if (phone === '') {
        setFieldInvalid(phoneInput, 'Phone number is required');
        return false;
    }
    
    // Simple phone validation - just check if it's not empty
    if (phone.length < 6) {
        setFieldInvalid(phoneInput, 'Please enter a valid phone number');
        return false;
    }
    
    setFieldValid(phoneInput);
    return true;
}

function validateRegPasswordField() {
    const passwordInput = document.getElementById('regPassword');
    const password = passwordInput.value;
    
    if (password === '') {
        setFieldInvalid(passwordInput, 'Password is required');
        return false;
    }
    
    // Simple validation - just check if not empty
    if (password.length < 3) {
        setFieldInvalid(passwordInput, 'Password must be at least 3 characters');
        return false;
    }
    
    setFieldValid(passwordInput);
    
    // Revalidate confirm password if it has value
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput.value) {
        validateRegConfirmPasswordField();
    }
    
    return true;
}

function validateRegConfirmPasswordField() {
    const passwordInput = document.getElementById('regPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (confirmPassword === '') {
        setFieldInvalid(confirmPasswordInput, 'Please confirm your password');
        return false;
    }
    
    if (password !== confirmPassword) {
        setFieldInvalid(confirmPasswordInput, 'Passwords do not match');
        return false;
    }
    
    setFieldValid(confirmPasswordInput);
    return true;
}

function validateRegTermsField() {
    const agreeTermsCheckbox = document.getElementById('agreeTerms');
    
    if (!agreeTermsCheckbox.checked) {
        agreeTermsCheckbox.classList.add('is-invalid');
        return false;
    }
    
    agreeTermsCheckbox.classList.remove('is-invalid');
    agreeTermsCheckbox.classList.add('is-valid');
    return true;
}

// Handle register form submission
async function handleRegister(event) {
    event.preventDefault();
    
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('regEmail');
    const phoneInput = document.getElementById('phoneNumber');
    const passwordInput = document.getElementById('regPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const agreeTermsCheckbox = document.getElementById('agreeTerms');
    const registerBtn = document.getElementById('registerBtn');
    
    // Validate all fields
    const isNameValid = validateRegFullNameField();
    const isEmailValid = validateRegEmailField();
    const isPhoneValid = validateRegPhoneField();
    const isPasswordValid = validateRegPasswordField();
    const isConfirmPasswordValid = validateRegConfirmPasswordField();
    const isTermsValid = validateRegTermsField();
    
    if (!isNameValid || !isEmailValid || !isPhoneValid || !isPasswordValid || !isConfirmPasswordValid || !isTermsValid) {
        HotelManager.Utils.showToast('Please complete all required fields', 'warning');
        return;
    }
    
    // Prepare registration data
    const registerData = {
        name: fullNameInput.value.trim(),
        email: emailInput.value.trim(),
        phoneNumber: phoneInput.value.trim(),
        password: passwordInput.value
    };
    
    // Show loading state
    const originalBtnContent = registerBtn.innerHTML;
    registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating Account...';
    registerBtn.disabled = true;
    
    try {
        console.log('Attempting registration with:', { 
            name: registerData.name, 
            email: registerData.email, 
            phoneNumber: registerData.phoneNumber 
        });
        
        // Make registration API call
        const response = await HotelManager.ApiService.post('/auth/register', registerData);
        console.log('Registration response:', response);
        
        if (response.statusCode === 200 && response.user) {
            // Show success message
            HotelManager.Utils.showToast(`Account created successfully! Welcome, ${response.user.name}!`, 'success');
            
            console.log('Registration successful, auto-logging in...');
            
            // Auto-login after successful registration
            try {
                const loginResponse = await HotelManager.ApiService.post('/auth/login', {
                    email: registerData.email,
                    password: registerData.password
                });
                
                if (loginResponse.statusCode === 200 && loginResponse.token) {
                    // Store authentication data
                    HotelManager.Utils.setToken(loginResponse.token);
                    
                    // Get user info using the profile API
                    try {
                        const userInfoResponse = await HotelManager.ApiService.get('/users/get-logged-in-profile-info');
                        
                        if (userInfoResponse.statusCode === 200 && userInfoResponse.user) {
                            // Store complete user info
                            const userData = {
                                ...userInfoResponse.user,
                                role: loginResponse.role,
                                expirationTime: loginResponse.expirationTime
                            };
                            HotelManager.Utils.setUser(userData);
                        } else {
                            // Fallback 
                            const userData = {
                                role: loginResponse.role,
                                expirationTime: loginResponse.expirationTime,
                                email: registerData.email,
                                name: registerData.name
                            };
                            HotelManager.Utils.setUser(userData);
                        }
                    } catch (userInfoError) {
                        // Fallback with register data
                        const userData = {
                            role: loginResponse.role,
                            expirationTime: loginResponse.expirationTime,
                            email: registerData.email,
                            name: registerData.name
                        };
                        HotelManager.Utils.setUser(userData);
                    }
                    
                    // Redirect to homepage for both roles
                    setTimeout(() => {
                        window.location.href = '../index.html';
                    }, 1500);
                } else {
                    // Registration success but auto-login failed - redirect to login
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1500);
                }
            } catch (loginError) {
                console.error('Auto-login error:', loginError);
                HotelManager.Utils.showToast('Account created! Please login with your credentials.', 'info');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            }
            
        } else {
            throw new Error(response.message || 'Registration failed');
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        
        // Show error message
        let errorMessage = 'Registration failed. Please try again.';
        if (error.message.includes('already registered')) {
            errorMessage = 'This email is already registered. Please use a different email or login.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        HotelManager.Utils.showToast(errorMessage, 'danger');
        
        // Reset form state
        registerBtn.innerHTML = originalBtnContent;
        registerBtn.disabled = false;
    }
}

// Utility functions for form handling
const AuthUtils = {
    // Clear all form validations
    clearFormValidation: (formId) => {
        const form = document.getElementById(formId);
        const inputs = form.querySelectorAll('.form-control');
        inputs.forEach(input => {
            input.classList.remove('is-valid', 'is-invalid');
        });
    },
    
    // Reset form to initial state
    resetForm: (formId) => {
        const form = document.getElementById(formId);
        form.reset();
        AuthUtils.clearFormValidation(formId);
    },
    
    // Show/hide password
    togglePasswordVisibility: (inputId, buttonId) => {
        const input = document.getElementById(inputId);
        const button = document.getElementById(buttonId);
        
        if (input.type === 'password') {
            input.type = 'text';
            button.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            input.type = 'password';
            button.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }
};

// Export for global access
window.AuthUtils = AuthUtils;

console.log('Auth module initialized successfully');
