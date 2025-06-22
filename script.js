
const API_BASE_URL = 'https://disasterresponseapi.onrender.com';

// WebSocket connection
let socket = null;

// Current user and selected disaster for authentication and context
let currentUser = 'netrunnerX';
let selectedDisasterId = null;

// Debounce utility to limit notification frequency
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle utility to limit API call frequency
const throttle = (func, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Utility to generate a unique report ID
function generateReportId() {
  return 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
  initializeWebSocket();
  setupEventListeners();
  loadInitialData();
  createWebSocketStatusIndicator();
});

// Initialize WebSocket connection
let isInitializing = false;
function initializeWebSocket() {
  if (isInitializing || socket) return; // Prevent multiple initializations
  isInitializing = true;
  try {
    if (socket) {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('disaster_updated');
      socket.off('social_media_updated');
      socket.off('resources_updated');
      socket.disconnect();
    }

    socket = io('https://disasterresponseapi.onrender.com');

    socket.on('connect', () => {
      console.log('WebSocket connected');
      updateWebSocketStatus(true);
      isInitializing = false;
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      updateWebSocketStatus(false);
      isInitializing = false;
    });

    const showDisasterUpdated = debounce((data) => {
      if (data.disasterId === selectedDisasterId) {
        console.log('Disaster updated:', data);
        showNotification(`Disaster ID ${data.disasterId} updated`, 'success');
        loadDisasters();
      }
    }, 2000);

    const showSocialMediaUpdated = debounce((data) => {
      if (data.disasterId === selectedDisasterId) {
        console.log('Social media updated:', data);
        showNotification(`Social media updated for ID: ${data.disasterId}`, 'success');
        loadSocialMedia();
      }
    }, 2000);

    const showResourcesUpdated = debounce((data) => {
      if (data.disasterId === selectedDisasterId) {
        console.log('Resources updated:', data);
        showNotification(`Resources updated for ID: ${data.disasterId}`, 'success');
        loadResources();
      }
    }, 2000);

    socket.on('disaster_updated', showDisasterUpdated);
    socket.on('social_media_updated', showSocialMediaUpdated);
    socket.on('resources_updated', showResourcesUpdated);
  } catch (error) {
    console.error('WebSocket init failed:', error);
    updateWebSocketStatus(false);
    isInitializing = false;
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
    statusDiv.className = `websocket-status ${connected ? 'websocket-connected' : 'websocket-disconnected'}`;
    statusDiv.textContent = `WebSocket: ${connected ? 'Connected' : 'Disconnected'}`;
  }
}

// Setup event listeners for forms and buttons
function setupEventListeners() {
  const disasterSelect = document.getElementById('disasterSelect');
  if (disasterSelect) {
    disasterSelect.addEventListener('change', function (e) {
      selectedDisasterId = e.target.value;
      const selectedOption = e.target.options[e.target.selectedIndex];
      const lat = selectedOption.getAttribute('data-lat') || '0';
      const lon = selectedOption.getAttribute('data-lon') || '0';

      document.getElementById('socialMediaDisasterId').textContent = selectedDisasterId || 'N/A';
      document.getElementById('dynamicDisasterId').textContent = selectedDisasterId || 'N/A';
      document.getElementById('dynamicLat').textContent = lat;
      document.getElementById('dynamicLon').textContent = lon;

      loadSocialMedia();
      loadResources();
    });
  }

  document.getElementById('userSelect')?.addEventListener('change', function (e) {
    currentUser = e.target.value;
  });

  document.getElementById('disasterForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    createDisaster();
  });

  document.getElementById('updateDisasterBtn')?.addEventListener('click', function () {
    updateDisaster();
  });

  document.getElementById('reportForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    submitReport();
  });

  document.getElementById('geocodeForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    performGeocoding();
  });

  document.getElementById('tagFilterForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    loadDisasters();
  });

  document.getElementById('refreshDisastersBtn')?.addEventListener('click', loadDisasters);
  document.getElementById('refreshSocialMediaBtn')?.addEventListener('click', loadSocialMedia);
  document.getElementById('refreshResourcesBtn')?.addEventListener('click', loadResources);
}

// Load initial data
async function loadInitialData() {
  await loadDisasters();
  await populateDisasterSelect();
  await populateTagSelect();
  selectedDisasterId = document.getElementById('disasterSelect')?.value || null;
  const selectedOption = document.getElementById('disasterSelect')?.options[document.getElementById('disasterSelect').selectedIndex];
  const lat = selectedOption?.getAttribute('data-lat') || '0';
  const lon = selectedOption?.getAttribute('data-lon') || '0';
  document.getElementById('socialMediaDisasterId').textContent = selectedDisasterId || 'N/A';
  document.getElementById('dynamicDisasterId').textContent = selectedDisasterId || 'N/A';
  document.getElementById('dynamicLat').textContent = lat;
  document.getElementById('dynamicLon').textContent = lon;
  loadSocialMedia();
  loadResources();
}

// Populate disaster selection dropdown
async function populateDisasterSelect() {
  try {
    const disasters = await apiCall('/api/disasters');
    const disasterSelect = document.getElementById('disasterSelect');
    if (disasterSelect) {
      disasterSelect.innerHTML =
        '<option value="">Select a Disaster</option>' +
        disasters
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) // Sort by created_at descending
          .map(
            (disaster) =>
              `<option value="${disaster.id}" data-lat="${disaster.latitude || '0'}" data-lon="${disaster.longitude || '0'}">${disaster.title || 'Untitled'} (ID: ${disaster.id})</option>`
          )
          .join('');
    }
  } catch (error) {
    showError('disastersList', 'Failed to load disasters for selection');
    console.error('populateDisasterSelect error:', error);
  }
}

// Populate tag selection dropdown
async function populateTagSelect() {
  try {
    const disasters = await apiCall('/api/disasters');
    const tags = [...new Set(disasters.flatMap((disaster) => disaster.tags || []))].sort();
    const tagSelect = document.getElementById('tagSelect');
    if (tagSelect) {
      tagSelect.innerHTML =
        '<option value="">All Tags</option>' + tags.map((tag) => `<option value="${tag}">${tag}</option>`).join('');
    }
  } catch (error) {
    showError('disastersList', 'Failed to load tags for filtering');
    console.error('populateTagSelect error:', error);
  }
}

// Generic API call function with authentication
async function apiCall(endpoint, options = {}) {
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': currentUser,
    },
    credentials: 'include',
  };

  let normalizedEndpoint =
    endpoint.startsWith('/api/') ? endpoint : endpoint.startsWith('/') ? `/api${endpoint}` : `/api/${endpoint}`;

  const url = new URL(normalizedEndpoint, API_BASE_URL).toString();

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    finalOptions.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, finalOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP error! status: ${response.status}`, { cause: errorData });
    }

    if (response.status === 204) return null;

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Create a new disaster
async function createDisaster() {
  const formData = {
    title: document.getElementById('disasterTitle').value?.trim(),
    location: document.getElementById('disasterLocation').value?.trim(),
    description: document.getElementById('disasterDescription').value?.trim(),
    tags: document.getElementById('disasterTags').value?.split(',').map((tag) => tag.trim()).filter((tag) => tag),
  };

  if (!formData.title || !formData.location) {
    showError('disastersList', 'Title and location are required.');
    return;
  }

  try {
    showLoading('disastersList', 'Creating disaster...');
    const result = await apiCall('/api/disasters', {
      method: 'POST',
      body: JSON.stringify(formData),
    });

    showSuccess('disastersList', `Disaster created successfully! ID: ${result.disaster.id}`);
    document.getElementById('disasterForm').reset();
    if (result && result.disaster && result.disaster.id) {
      selectedDisasterId = result.disaster.id;
      document.getElementById('disasterId').value = result.disaster.id;
      document.getElementById('dynamicDisasterId').textContent = result.disaster.id;
      document.getElementById('socialMediaDisasterId').textContent = result.disaster.id;
      document.getElementById('disasterSelect').value = result.disaster.id;
      const lat = result.disaster.latitude !== undefined ? result.disaster.latitude : '0';
      const lon = result.disaster.longitude !== undefined ? result.disaster.longitude : '0';
      document.getElementById('dynamicLat').textContent = lat;
      document.getElementById('dynamicLon').textContent = lon;
      await loadResources();
      loadSocialMedia();
    }
    await loadDisasters();
    await populateDisasterSelect();
    await populateTagSelect();
  } catch (error) {
    showError('disastersList', 'Failed to create disaster');
    console.error('createDisaster error:', error);
  }
}

// Update an existing disaster
async function updateDisaster() {
  const disasterId = selectedDisasterId || document.getElementById('disasterId').value;
  if (!disasterId) {
    showError('disastersList', 'Please select a disaster to update.');
    return;
  }

  const formData = {
    title: document.getElementById('disasterTitle').value?.trim(),
    location: document.getElementById('disasterLocation').value?.trim(),
    description: document.getElementById('disasterDescription').value?.trim(),
    tags: document.getElementById('disasterTags').value?.split(',').map((tag) => tag.trim()).filter((tag) => tag),
  };

  try {
    showLoading('disastersList', 'Updating disaster...');
    const result = await apiCall(`/api/disasters/${disasterId}`, {
      method: 'PUT',
      body: JSON.stringify(formData),
    });

    showSuccess('disastersList', `Disaster ID ${disasterId} updated successfully!`);
    await loadDisasters();
    await populateDisasterSelect();
    await populateTagSelect();
  } catch (error) {
    showError('disastersList', 'Failed to update disaster');
    console.error('updateDisaster error:', error);
  }
}

// Submit a report
async function submitReport() {
  if (!selectedDisasterId) {
    showError('socialMediaList', 'Please select a disaster before submitting a report.');
    return { success: false, error: 'No disaster selected' };
  }

  const imageUrl = document.getElementById('reportImageUrl').value?.trim();
  const content = document.getElementById('reportContent').value?.trim();
  const submitButton = document.getElementById('reportForm').querySelector('button[type="submit"]');

  if (!content) {
    showError('socialMediaList', 'Report content is required.');
    return { success: false, error: 'Missing report content' };
  }
  if (imageUrl && !isValidUrl(imageUrl)) {
    showError('socialMediaList', 'Invalid image URL format.');
    return { success: false, error: 'Invalid image URL' };
  }

  const formData = {
    image_url: imageUrl || null,
    report_id: generateReportId(),
    content: content,
  };

  try {
    submitButton.disabled = true;
    showLoading('socialMediaList', 'Submitting report...');
    const result = await apiCall(`/api/disasters/${selectedDisasterId}/verify-image`, {
      method: 'POST',
      body: JSON.stringify(formData),
    });

    showSuccess('socialMediaList', `Report submitted for ID: ${selectedDisasterId}!`);
    if (confirm('Report submitted. Clear the form?')) {
      document.getElementById('reportForm').reset();
    }
    await loadSocialMedia();

    return {
      success: true,
      reportId: result?.id || formData.report_id,
      disasterId: selectedDisasterId,
    };
  } catch (error) {
    showError('socialMediaList', `Failed to submit report for ID: ${selectedDisasterId}`);
    console.error('submitReport error:', error);
    return { success: false, error: 'Submission failed', disasterId: selectedDisasterId };
  } finally {
    submitButton.disabled = false;
  }
}

// Utility to validate URL
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Perform geocoding
async function performGeocoding() {
  const description = document.getElementById('geocodeDescription').value?.trim();

  if (!description) {
    showError('geocodeResult', 'Description is required for geocoding.');
    return;
  }

  try {
    showLoading('geocodeResult', 'Getting coordinates...');
    const result = await apiCall('/geocode', {
      method: 'POST',
      body: JSON.stringify({ description }),
    });

    if (result && result.coordinates) {
      if (result.coordinates.lng !== undefined) {
        result.coordinates.lon = result.coordinates.lng;
        delete result.coordinates.lng;
      } else if (result.coordinates.longitud !== undefined) {
        result.coordinates.lon = result.coordinates.longitud;
        delete result.coordinates.longitud;
      }
      if (result.coordinates.lat === undefined) {
        result.coordinates.lat = null;
      }
    } else {
      result.coordinates = { lat: null, lon: null };
    }

    if (result && result.location_name) {
      result.location = result.location_name;
      delete result.location_name;
    } else if (!result.location) {
      result.location = null;
    }

    displayGeocodeResult(result);
    if (result && result.coordinates && result.coordinates.lat !== null && result.coordinates.lon !== null) {
      document.getElementById('dynamicLat').textContent = result.coordinates.lat;
      document.getElementById('dynamicLon').textContent = result.coordinates.lon;
      await loadResources();
    } else {
      document.getElementById('dynamicLat').textContent = 'N/A';
      document.getElementById('dynamicLon').textContent = 'N/A';
    }
  } catch (error) {
    showError('geocodeResult', 'Geocoding failed');
    console.error('performGeocoding error:', error);
    document.getElementById('dynamicLat').textContent = 'N/A';
    document.getElementById('dynamicLon').textContent = 'N/A';
  }
}

// Display geocoding result
function displayGeocodeResult(data) {
  const resultDiv = document.getElementById('geocodeResult');

  if (data && data.coordinates && (data.coordinates.lat !== null || data.coordinates.lon !== null)) {
    resultDiv.innerHTML = `
      <div class="data-item">
        <h3>Geocoding Result</h3>
        <p><strong>Latitude:</strong> ${data.coordinates.lat !== null ? data.coordinates.lat : 'N/A'}</p>
        <p><strong>Longitude:</strong> ${data.coordinates.lon !== null ? data.coordinates.lon : 'N/A'}</p>
        <p><strong>Location:</strong> ${data.location || 'N/A'}</p>
      </div>
    `;
  } else {
    resultDiv.innerHTML = '<div class="error">No coordinates found</div>';
  }
}

// Load disasters list
let lastDisasterCall = 0;
const MIN_CALL_INTERVAL = 2000; // 2 seconds minimum between calls
async function loadDisasters() {
  if (!selectedDisasterId) {
    document.getElementById('disastersList').innerHTML = '<div class="data-item">Select a disaster</div>';
    console.log('No selectedDisasterId');
    return;
  }
  const now = Date.now();
  if (now - lastDisasterCall < MIN_CALL_INTERVAL) {
    console.log('Throttling disaster call');
    return;
  }
  lastDisasterCall = now;
  const selectedTag = document.getElementById('tagSelect')?.value || '';
  try {
    showLoading('disastersList', 'Loading disasters...');
    const endpoint = selectedTag ? `/api/disasters?tag=${encodeURIComponent(selectedTag)}` : '/api/disasters';
    const disasters = await apiCall(endpoint);
    displayDisasters(disasters);
  } catch (error) {
    showError('disastersList', 'Failed to load disasters');
    console.error('loadDisasters error:', error);
  }
}

// Display disasters
function displayDisasters(disasters) {
  const container = document.getElementById('disastersList');

  if (!disasters || !Array.isArray(disasters) || disasters.length === 0) {
    container.innerHTML = '<div class="data-item">No disasters found</div>';
    return;
  }

  const displayDisasters = document.getElementById('tagSelect')?.value ? disasters : disasters;

  const disastersHtml = displayDisasters
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) // Sort by created_at descending
    .map((disaster) => `
      <div class="data-item">
        <h3>${disaster.title || 'Untitled'}</h3>
        <p><strong>Location:</strong> ${disaster.location || 'N/A'}</p>
        <p><strong>Description:</strong> ${disaster.description || 'N/A'}</p>
        <p><strong>ID:</strong> ${disaster.id || 'N/A'}</p>
        ${
          disaster.tags && disaster.tags.length > 0
            ? `
              <div class="tags">
                ${disaster.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}
              </div>
            `
            : ''
        }
      </div>
    `)
    .join('');

  container.innerHTML = disastersHtml;
}

// Load social media reports
let lastSocialMediaCall = 0;
async function loadSocialMedia() {
  if (!selectedDisasterId) {
    document.getElementById('socialMediaList').innerHTML = '<div class="data-item">Select a disaster</div>';
    console.log('No selectedDisasterId');
    return;
  }
  const now = Date.now();
  if (now - lastSocialMediaCall < MIN_CALL_INTERVAL) {
    console.log('Throttling social media call');
    return;
  }
  lastSocialMediaCall = now;
  try {
    showLoading('socialMediaList', 'Loading social media...');
    const response = await apiCall(`/api/disasters/${selectedDisasterId}/social`);
    const reports = response && response.reports && Array.isArray(response.reports) ? response.reports : [];
    if (!Array.isArray(reports)) {
      document.getElementById('socialMediaList').innerHTML = '<div class="data-item">No reports</div>';
      return;
    }
    displaySocialMedia(reports);
  } catch (error) {
    showError('socialMediaList', 'Failed to load social media');
    console.error('loadSocialMedia error:', error);
  }
}

// Display social media reports
function displaySocialMedia(reports) {
  const container = document.getElementById('socialMediaList');

  if (!Array.isArray(reports) || reports.length === 0) {
    container.innerHTML = '<div class="data-item">No social media reports</div>';
    return;
  }

  const reportsHtml = reports
    .map((report) => `
      <div class="data-item">
        <h3>Social Media Report</h3>
        <p><strong>Content:</strong> ${report.text || 'N/A'}</p>
        <p><strong>Image URL:</strong> ${report.image_url || 'N/A'}</p>
        <p><strong>Author:</strong> ${report.author || 'N/A'}</p>
        <p><strong>Timestamp:</strong> ${report.timestamp || 'N/A'}</p>
        <p><strong>URI:</strong> <a href="${report.uri || '#'}">${report.uri || 'N/A'}</a></p>
        <p><strong>CID:</strong> ${report.cid || 'N/A'}</p>
      </div>
    `)
    .join('');

  container.innerHTML = reportsHtml;
}

// Load resources
let lastResourceCall = 0;
async function loadResources() {
  if (!selectedDisasterId) {
    document.getElementById('resourcesList').innerHTML = '<div class="data-item">Select a disaster</div>';
    console.log('No selectedDisasterId');
    return;
  }
  const now = Date.now();
  if (now - lastResourceCall < MIN_CALL_INTERVAL) {
    console.log('Throttling resource call');
    return;
  }
  lastResourceCall = now;
  const lat = document.getElementById('dynamicLat').textContent || '0';
  const lon = document.getElementById('dynamicLon').textContent || '0';
  try {
    showLoading('resourcesList', 'Loading resources...');
    console.log(`Loading for ID: ${selectedDisasterId}, lat: ${lat}, lon: ${lon}`); // Debug log
    const resources = await apiCall(`/api/disasters/${selectedDisasterId}/resources?lat=${lat}&lon=${lon}`);
    console.log('Resources response:', resources); // Debug log
    displayResources(resources);
  } catch (error) {
    showError('resourcesList', 'Failed to load resources');
    console.error('loadResources error:', error); // Capture the exact error
  }
}

// Display resources
function displayResources(resources) {
  console.log('Displaying resources:', resources);
  const container = document.getElementById('resourcesList');

  if (!resources || !resources.resources || !Array.isArray(resources.resources) || resources.resources.length === 0) {
    container.innerHTML = '<div class="data-item">No resources</div>';
    return;
  }

  const resourcesHtml = resources.resources
    .map((resource) => `
      <div class="data-item">
        <h3>${resource.name || 'Resource'}</h3>
        <p><strong>Type:</strong> ${resource.type || 'N/A'}</p>
        <p><strong>Location:</strong> ${resource.location_name || resource.location || 'N/A'}</p>
        <p><strong>Availability:</strong> ${resource.availability || 'N/A'}</p>
        <p><strong>Contact:</strong> ${resource.contact || 'N/A'}</p>
        <p><strong>Distance:</strong> ${resource.distance || 'N/A'} meters</p>
        <p><strong>Created At:</strong> ${resource.created_at || 'N/A'}</p>
      </div>
    `)
    .join('');

  container.innerHTML = resourcesHtml;
}

// Load official updates
let lastUpdatesCall = 0;
async function loadOfficialUpdates() {
  // Placeholder - Implement as needed
}

// Display official updates
function displayOfficialUpdates(updates) {
  const container = document.getElementById('updatesList');

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    container.innerHTML = '<div class="data-item">No updates</div>';
    return;
  }

  const updatesHtml = updates
    .map((update) => `
      <div class="data-item">
        <h3>${update.title || 'Official Update'}</h3>
        <p><strong>Content:</strong> ${update.content || 'N/A'}</p>
        <p><strong>Author:</strong> ${update.author || 'N/A'}</p>
        <p><strong>Timestamp:</strong> ${update.timestamp || 'N/A'}</p>
      </div>
    `)
    .join('');

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
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.setAttribute('role', 'alert');
  notification.setAttribute('aria-live', 'assertive');
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
