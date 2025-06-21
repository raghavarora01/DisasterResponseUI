# Disaster Response Platform Frontend

A minimal frontend UI for the Disaster Response Coordination Platform built with plain JavaScript, HTML, and CSS.

## Features

- **Disaster Management**: Create and update disasters with title, location, description, and tags
- **Report Submission**: Submit reports with content and image URLs
- **Geocoding**: Convert location descriptions to coordinates
- **Real-time Updates**: WebSocket integration for live updates
- **Social Media Integration**: Display social media reports
- **Resource Management**: View available resources near disaster locations
- **Official Updates**: Display official disaster updates
- **Mock Authentication**: Switch between different user roles

## API Endpoints Tested

- `POST /disasters` - Create new disasters
- `PUT /disasters/:id` - Update existing disasters
- `GET /disasters?tag=flood` - Get disasters filtered by tag
- `POST /disasters/:id/verify-image` - Submit reports with image verification
- `GET /disasters/:id/social-media` - Get social media reports
- `GET /disasters/:id/resources` - Get resources with location parameters
- `GET /disasters/:id/official-updates` - Get official updates
- `POST /geocode` - Convert location descriptions to coordinates

## WebSocket Events

- `disaster_updated` - Real-time disaster updates
- `social_media_updated` - Real-time social media updates
- `resources_updated` - Real-time resource updates

## Prerequisites

- Node.js (version 14 or higher)
- Backend server running on port 9897

## Installation & Running

1. **Navigate to the client directory:**
   ```bash
   cd client
   ```
2. **Access the application:**
   Open your browser and go to `(https://disaster-response-ui-raghavarora01s-projects.vercel.app/)`

## User Authentication

The frontend includes mock authentication with two user roles:

- **netrunnerX** (Contributor) - Can submit reports and view data
- **reliefAdmin** (Admin) - Full access to all features

The selected user is sent as an `X-User-ID` header with all API requests.

## File Structure

```
client/
├── index.html          # Main HTML file
├── style.css           # CSS styling with dark theme
├── script.js           # JavaScript functionality
├── package.json        # Project configuration
└── README.md          # This file
```

## Features Overview

### Disaster Management Section
- Form to create new disasters with title, location, description, and tags
- Button to update existing disaster (ID: 1)
- Real-time updates when disasters are modified

### Report Submission Section
- Form to submit reports with content and image URL
- Integration with image verification API

### Geocoding Section
- Text area for location description input
- Button to get coordinates from location description
- Display of latitude, longitude, and location name

### Data Display Sections
- **Disasters List**: Shows disasters filtered by 'flood' tag
- **Social Media Reports**: Displays reports for disaster ID 1
- **Resources**: Shows resources near specified coordinates
- **Official Updates**: Displays official updates for disaster ID 1

### Real-time Features
- WebSocket status indicator in top-right corner
- Automatic refresh of sections when real-time events are received
- Notification system for real-time updates

## Styling

The application uses a dark theme with:
- Modern, clean design
- Responsive layout using CSS Grid and Flexbox
- Green accent color (#4CAF50) for highlights
- Proper loading, error, and success states
- Mobile-responsive design

## Browser Compatibility

The frontend is compatible with modern browsers that support:
- ES6+ JavaScript features
- Fetch API
- CSS Grid and Flexbox
- WebSocket connections

## Troubleshooting

1. **WebSocket Connection Issues**: Ensure the backend server is running and supports Socket.IO
2. **API Call Failures**: Check that the backend is running on port 9897
3. **CORS Issues**: The frontend server includes CORS headers, but ensure backend also allows cross-origin requests


## Development

To modify the frontend:
- Edit `index.html` for structure changes
- Modify `style.css` for styling updates
- Update `script.js` for functionality changes
