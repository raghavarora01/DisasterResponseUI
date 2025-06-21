// Disaster Response Platform Frontend JavaScript
// Backend API base URL
const API_BASE_URL = 'https://disasterresponseapi.onrender.com';

// WebSocket connection
let socket = null;

// Current user for authentication
let currentUser = 'netrunnerX';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeWebSocket();
    setupEventListeners();
    loadInitialData();
    createWebSocketStatusIndicator();
});

// Initialize WebSocket connection
function initializeWebSocket() {
    try {
        socket = io(API_BASE_URL);
        
        socket.on('connect', () => {
            console.log('WebSocket connected');
            updateWebSocketStatus(true);
        });
        
        socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
            updateWebSocketStatus(false);
        });
        
        socket.on('disaster_updated', (data) => {
            console.log('Disaster updated:', data);
            showNotification('Disaster updated in real-time', 'success');
            loadDisasters();
        });
        
        socket.on('social_media_updated', (data) => {
            console.log('Social media updated:', data);
            showNotification('Social media reports updated', 'success');
            loadSocialMedia();
        });
        
        socket.on('resources_updated', (data) => {
            console.log('Resources updated:', data);
            showNotification('Resources updated in real-time', 'success');
            loadResources();
        });
        
    } catch (error) {
        console.error('WebSocket connection failed:', error);
        updateWebSocketStatus(false);
    }
}

// Create WebSocket status indicator
function createWebSocketStatusIndicator() {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'websocketStatus';
    statusDiv.className = 'websocket-status websocket-disconnected';
    statusDiv.textContent = 'WebSocket: Disconnected';
    document.body.appendChild(statusDiv);
}

// Update WebSocket status indicator
function updateWebSocketStatus(connected) {
    const statusDiv = document.getElementById('websocketStatus');
    if (statusDiv) {
        if (connected) {
            statusDiv.className = 'websocket-status websocket-connected';
            statusDiv.textContent = 'WebSocket: Connected';
        } else {
            statusDiv.className = 'websocket-status websocket-disconnected';
            statusDiv.textContent = 'WebSocket: Disconnected';
        }
    }
}

// Setup event listeners for forms and buttons
function setupEventListeners() {
    document.getElementById('userSelect').addEventListener('change', function(e) {
        currentUser = e.target.value;
        console.log('User changed to:', currentUser);
    });
    
    document.getElementById('disasterForm').addEventListener('submit', function(e) {
        e.preventDefault();
        createDisaster();
    });
    
    document.getElementById('updateDisasterBtn').addEventListener('click', function() {
        updateDisaster();
    });
    
    document.getElementById('reportForm').addEventListener('submit', function(e) {
        e.preventDefault();
        submitReport();
    });
    
    document.getElementById('geocodeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        performGeocoding();
    });
    
    document.getElementById('refreshDisastersBtn').addEventListener('click', loadDisasters);
    document.getElementById('refreshSocialMediaBtn').addEventListener('click', loadSocialMedia);
    document.getElementById('refreshResourcesBtn').addEventListener('click', loadResources);
}

// Load initial data with dynamic values
function loadInitialData() {
    loadDisasters();
    const initialDisasterId = document.getElementById('socialMediaDisasterId').textContent;
    const initialLat = document.getElementById('dynamicLat').textContent;
    const initialLon = document.getElementById('dynamicLon').textContent;
    console.log('Initial Load - Disaster ID:', initialDisasterId, 'Lat:', initialLat, 'Lon:', initialLon);
    loadSocialMedia();
    loadResources();
}

// Generic API call function with authentication
async function apiCall(endpoint, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-User-ID': currentUser
        },
        credentials: 'include'
    };
    
    let normalizedEndpoint = endpoint.startsWith('/api/') ? endpoint : 
                          endpoint.startsWith('/') ? `/api${endpoint}` : 
                          `/api/${endpoint}`;
    
    const url = new URL(normalizedEndpoint, API_BASE_URL).toString();
    
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        finalOptions.body = JSON.stringify(options.body);
    }
    
    console.log('API Call:', finalOptions.method || 'GET', url, finalOptions.body || '');
    
    try {
        const response = await fetch(url, finalOptions);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error Response:', errorData);
            throw new Error(`HTTP error! status: ${response.status}`, { cause: errorData });
        }
        
        if (response.status === 204) return null;
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error, 'URL:', url);
        throw error;
    }
}

// Create a new disaster
async function createDisaster() {
    const formData = {
        title: document.getElementById('disasterTitle').value,
        location: document.getElementById('disasterLocation').value,
        description: document.getElementById('disasterDescription').value,
        tags: document.getElementById('disasterTags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
    };
    
    try {
        showLoading('disastersList', 'Creating disaster...');
        const result = await apiCall('/api/disasters', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        showSuccess('disastersList', 'Disaster created successfully!');
        document.getElementById('disasterForm').reset();
        if (result && result.id) {
            document.getElementById('disasterId').value = result.id;
            document.getElementById('dynamicDisasterId').textContent = result.id;
            document.getElementById('socialMediaDisasterId').textContent = result.id;
            loadSocialMedia(); // Refresh social media with new ID
            loadResources();  // Refresh resources with new ID
        }
        loadDisasters();
    } catch (error) {
        showError('disastersList', 'Failed to create disaster: ' + error.message);
    }
}

// Update an existing disaster
async function updateDisaster() {
    const disasterId = document.getElementById('disasterId').value || document.getElementById('socialMediaDisasterId').textContent;
    const formData = {
        title: document.getElementById('disasterTitle').value,
        location: document.getElementById('disasterLocation').value,
        description: document.getElementById('disasterDescription').value,
        tags: document.getElementById('disasterTags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
    };
    
    try {
        showLoading('disastersList', 'Updating disaster...');
        const result = await apiCall(`/api/disasters/${disasterId}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
        
        showSuccess('disastersList', 'Disaster updated successfully!');
        loadDisasters();
    } catch (error) {
        showError('disastersList', 'Failed to update disaster: ' + error.message);
    }
}

// Submit a report
async function submitReport() {
    const disasterId = document.getElementById('socialMediaDisasterId').textContent;
    const formData = {
        image_url: document.getElementById('reportImageUrl').value,
        report_id: "1",
        content: document.getElementById('reportContent').value
    };
    
    try {
        showLoading('socialMediaList', 'Submitting report...');
        const result = await apiCall(`/api/disasters/${disasterId}/verify-image`, {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        showSuccess('socialMediaList', 'Report submitted successfully!');
        document.getElementById('reportForm').reset();
        loadSocialMedia();
    } catch (error) {
        showError('socialMediaList', 'Failed to submit report: ' + error.message);
    }
}

// Perform geocoding
async function performGeocoding() {
    const description = document.getElementById('geocodeDescription').value;
    
    try {
        showLoading('geocodeResult', 'Getting coordinates...');
        const result = await apiCall('/geocode', {
            method: 'POST',
            body: JSON.stringify({ description })
        });
        
        displayGeocodeResult(result);
        if (result && result.coordinates) {
            document.getElementById('dynamicLat').textContent = result.coordinates.lat;
            document.getElementById('dynamicLon').textContent = result.coordinates.lon;
            loadResources(); // Refresh resources with new coordinates
        }
    } catch (error) {
        showError('geocodeResult', 'Geocoding failed: ' + error.message);
    }
}

// Display geocoding result
function displayGeocodeResult(data) {
    const resultDiv = document.getElementById('geocodeResult');
    
    if (data && data.coordinates) {
        resultDiv.innerHTML = `
            <div class="data-item">
                <h3>Geocoding Result</h3>
                <p><strong>Latitude:</strong> ${data.coordinates.lat}</p>
                <p><strong>Longitude:</strong> ${data.coordinates.lon}</p>
                <p><strong>Location:</strong> ${data.location || 'N/A'}</p>
            </div>
        `;
    } else {
        resultDiv.innerHTML = '<div class="error">No coordinates found</div>';
    }
}

// Load disasters list
async function loadDisasters() {
    const filterTag = document.getElementById('filterTag').value.trim() || 'flood';
    try {
        showLoading('disastersList', 'Loading disasters...');
        const disasters = await apiCall(`/api/disasters?tag=${encodeURIComponent(filterTag)}`);
        displayDisasters(disasters);
    } catch (error) {
        showError('disastersList', 'Failed to load disasters: ' + error.message);
    }
}

// Display disasters
function displayDisasters(disasters) {
    const container = document.getElementById('disastersList');
    
    if (!disasters || disasters.length === 0) {
        container.innerHTML = '<div class="data-item">No disasters found</div>';
        return;
    }
    
    const disastersHtml = disasters.map(disaster => `
        <div class="data-item">
            <h3>${disaster.title || 'Untitled'}</h3>
            <p><strong>Location:</strong> ${disaster.location || 'N/A'}</p>
            <p><strong>Description:</strong> ${disaster.description || 'N/A'}</p>
            <p><strong>ID:</strong> ${disaster.id || 'N/A'}</p>
            ${disaster.tags && disaster.tags.length > 0 ? `
                <div class="tags">
                    ${disaster.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `).join('');
    
    container.innerHTML = disastersHtml;
}

// Load social media reports
async function loadSocialMedia() {
    const disasterId = document.getElementById('socialMediaDisasterId').textContent;
    try {
        showLoading('socialMediaList', 'Loading social media reports...');
        const reports = await apiCall(`/api/disasters/${disasterId}/social`);
        displaySocialMedia(reports);
    } catch (error) {
        showError('socialMediaList', 'Failed to load social media: ' + error.message);
    }
}

// Display social media reports
function displaySocialMedia(reports) {
    const container = document.getElementById('socialMediaList');
    
    if (!reports || reports.length === 0) {
        container.innerHTML = '<div class="data-item">No social media reports found</div>';
        return;
    }
    
    const reportsHtml = reports.map(report => `
        <div class="data-item">
            <h3>Social Media Report</h3>
            <p><strong>Content:</strong> ${report.content || 'N/A'}</p>
            <p><strong>Image URL:</strong> ${report.imageUrl || 'N/A'}</p>
            <p><strong>Timestamp:</strong> ${report.timestamp || 'N/A'}</p>
        </div>
    `).join('');
    
    container.innerHTML = reportsHtml;
}

// Load resources
async function loadResources() {
    const disasterId = document.getElementById('dynamicDisasterId').textContent;
    const lat = document.getElementById('dynamicLat').textContent;
    const lon = document.getElementById('dynamicLon').textContent;
    try {
        showLoading('resourcesList', 'Loading resources...');
        const resources = await apiCall(`/api/disasters/${disasterId}/resource?lat=${lat}&lon=${lon}`);
        displayResources(resources);
    } catch (error) {
        showError('resourcesList', 'Failed to load resources: ' + error.message);
    }
}

// Display resources
function displayResources(resources) {
    const container = document.getElementById('resourcesList');
    
    if (!resources || resources.length === 0) {
        container.innerHTML = '<div class="data-item">No resources found</div>';
        return;
    }
    
    const resourcesHtml = resources.map(resource => `
        <div class="data-item">
            <h3>${resource.name || 'Resource'}</h3>
            <p><strong>Type:</strong> ${resource.type || 'N/A'}</p>
            <p><strong>Location:</strong> ${resource.location || 'N/A'}</p>
            <p><strong>Availability:</strong> ${resource.availability || 'N/A'}</p>
            <p><strong>Contact:</strong> ${resource.contact || 'N/A'}</p>
        </div>
    `).join('');
    
    container.innerHTML = resourcesHtml;
}

// Load official updates
async function loadOfficialUpdates() {
    try {
        showLoading('updatesList', 'Loading official updates...');
        const updates = await apiCall('/api/disasters/1/updates');
        displayOfficialUpdates(updates);
    } catch (error) {
        showError('updatesList', 'Failed to load official updates: ' + error.message);
    }
}

// Display official updates
function displayOfficialUpdates(updates) {
    const container = document.getElementById('updatesList');
    
    if (!updates || updates.length === 0) {
        container.innerHTML = '<div class="data-item">No official updates found</div>';
        return;
    }
    
    const updatesHtml = updates.map(update => `
        <div class="data-item">
            <h3>${update.title || 'Official Update'}</h3>
            <p><strong>Content:</strong> ${update.content || 'N/A'}</p>
            <p><strong>Author:</strong> ${update.author || 'N/A'}</p>
            <p><strong>Timestamp:</strong> ${update.timestamp || 'N/A'}</p>
        </div>
    `).join('');
    
    container.innerHTML = updatesHtml;
}

// Utility functions for UI feedback
function showLoading(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="loading">${message}</div>`;
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="error">${message}</div>`;
}

function showSuccess(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `<div class="success">${message}</div>`;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        font-weight: 600;
        z-index: 1001;
        background-color: ${type === 'success' ? '#4CAF50' : '#2196F3'};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

const notificationStyles = `
.notification {
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from {
        transform: translateX(-50%) translateY(-100%);
        opacity: 0;
    }
    to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);