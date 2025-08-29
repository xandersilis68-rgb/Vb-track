# Advanced Body Tracking Web Application

## Overview
This project is a sophisticated web application for real-time body tracking, utilizing the MediaPipe Tasks API (version 0.10.8) to detect and visualize human body, face, and hand landmarks for multiple people. It is designed to run on GitHub Pages, providing a responsive and interactive UI overlay to display tracked points and meshes with high precision. The application supports multiple model configurations, dynamic landmark and mesh rendering, media uploads, and improved model loading reliability with detailed error handling.

## Features
- **Real-Time Tracking**: Tracks body pose, face, and hands with customizable model complexity (Full, Upper Body, Lite).
- **Multi-Person Tracking**: Supports tracking up to 4 people simultaneously.
- **Mesh Visualization**: Renders triangular meshes for pose, face, and hands, with toggleable display.
- **Interactive UI Overlay**: Displays tracking status, FPS, detected points count, and toggleable options for landmarks, meshes, and multi-person mode. Includes detailed error messages for model loading issues.
- **Advanced Visualization**: Dynamic coloring based on landmark confidence, interpolated virtual landmarks, and mesh rendering.
- **Performance Optimization**: Uses GPU delegate, lighter models, FPS throttling, and confidence-based filtering. Removed smoothing and segmentation for speed.
- **Responsive Design**: Maintains a 16:9 aspect ratio for the video feed across screen sizes.
- **Media Upload Support**: Processes images (JPEG, PNG) or videos (MP4, WebM) to overlay landmarks and meshes.
- **Robust Model Loading**: Includes timeout detection, fallback model paths, and detailed error reporting to prevent "stuck" loading states.
- **Button Reliability**: Enhanced event listeners with logging and state management for consistent button functionality.

## Files
- **index.html**: Sets up the video feed, canvas, UI controls, file upload input, and mesh toggle.
- **style.css**: Styles the application with responsive layout, transparent overlay, and mesh rendering styles.
- **script.js**: Handles MediaPipe initialization, landmark and mesh processing, rendering, user interactions, media uploads, and robust model loading.

## Setup and Deployment
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/your-repo.git
   ```
2. **Host on GitHub Pages**:
   - Push the repository to GitHub.
   - Enable GitHub Pages in the repository settings, selecting the `main` branch and `/ (root)` folder.
   - Access the site at `https://your-username.github.io/your-repo`.
3. **Dependencies**:
   - Uses CDN-hosted MediaPipe libraries (`drawing_utils`, `tasks-vision@0.10.8`).
   - Optional: Host model files locally in the repository (e.g., `/models/`) as a fallback if CDN fails.
   - No local server required for GitHub Pages deployment.

## Usage
1. **Access the Application**:
   - Open the deployed GitHub Pages URL in a modern browser (Chrome, Firefox, or Edge recommended).
   - Grant camera access when prompted for webcam tracking.
2. **Controls**:
   - **Start Tracking**: Click "Start Tracking" or press `s` to begin webcam-based tracking.
   - **Stop Tracking**: Click "Stop Tracking" or press `t` to halt processing.
   - **Model Selection**: Choose Full, Upper Body, or Lite modes via the dropdown.
   - **Landmark Toggles**: Check/uncheck boxes (or press `f`/`h`/`p`) to show/hide face, hands, or pose landmarks.
   - **Mesh Toggle**: Check/uncheck "Show Meshes" (or press `m`) to show/hide meshes.
   - **Multi Person**: Check to enable tracking for up to 4 people.
   - **Confidence Threshold**: Adjust the slider to filter low-confidence landmarks.
   - **Upload Media**: Select an image or video, then click "Process Upload" to overlay landmarks and meshes.
3. **Monitoring**:
   - Displays real-time FPS and detected points count.
   - Status messages indicate tracking state or errors (e.g., "Failed to load models: Network error").

## Technical Details
- **MediaPipe Tasks**: Uses `@mediapipe/tasks-vision@0.10.8` for:
  - Pose: Up to 33 landmarks per person with torso, arm, and leg meshes.
  - Face: Up to 468 landmarks per person with full face mesh.
  - Hands: Up to 21 landmarks per hand with palm/finger meshes.
- **Performance Features**:
  - FPS throttling (~30 FPS) to prevent browser overload.
  - Interpolation for denser tracking (19 points per segment).
  - Confidence-based rendering (green >0.8, yellow >0.5, red ≤0.5).
  - GPU acceleration for faster processing.
- **Mesh Rendering**: Triangular meshes for pose, face, and hands with semi-transparent fills.
- **Media Processing**: Supports static (images) and dynamic (videos) landmark/mesh overlays.
- **Model Loading**: Timeout mechanism (30 seconds) and fallback paths for robust initialization.
- **Error Handling**: Detailed UI and console feedback for model loading, camera, and file processing errors.
- **Keyboard Shortcuts**: Includes `s`, `t`, `f`, `h`, `p`, `m` for accessibility.

## Customization
1. **Add Landmarks/Meshes**: Modify `generateVirtualLandmarks` or `generate*Mesh` in `script.js`.
2. **Custom Styling**: Update `style.css` for colors, opacity, or layout.
3. **New Models**: Add entries to `modelConfigs` in `script.js`.
4. **Enhanced Visuals**: Extend `drawProjectedLandmarks` for 3D effects.
5. **Upload Features**: Add video playback controls in `index.html` and `script.js`.

## Limitations
- **Browser Compatibility**: Requires WebRTC and WebGL support.
- **Performance**: Multi-person tracking or meshes may be resource-intensive on low-end devices.
- **Camera Dependency**: Webcam required for live input; uploads as alternative.
- **GitHub Pages**: Public repository required; CORS may affect CDN.
- **File Formats**: Supports JPEG, PNG, MP4, WebM only.
- **Association**: Hands and faces not linked to poses in multi-person mode.

## Troubleshooting
- **Stuck on "Loading models..."**:
   - Open browser console (F12 -> Console) to check for errors (e.g., "Failed to fetch model").
   - Verify internet connectivity for CDN access.
   - Test in Chrome or Firefox; Safari may have WebAssembly issues.
   - Check Network tab for failed requests to MediaPipe scripts or models.
   - If using local models, ensure they are in the `/models/` directory and paths are correct.
   - If issue persists, note console errors and status messages for further diagnosis.
- **Buttons Not Working**: Ensure no console errors block script execution; recheck event listeners.
- **Camera Issues**: Grant camera permissions; check status for "Error accessing webcam."
- **Low FPS**: Use Lite mode, disable multi-person or meshes, or lower confidence threshold.
- **Upload Issues**: Verify file formats (JPEG, PNG, MP4, WebM).

## Future Enhancements
- **Gesture Recognition**: Detect gestures using landmark positions.
- **Augmented Reality**: Overlay 3D models on tracked points.
- **Data Export**: Export landmark coordinates for analysis.
- **Video Controls**: Add play/pause/seek for uploaded videos.
- **Smoothing**: Re-add smoothing for multi-person mode.

## License
MIT License. See [LICENSE](LICENSE) for details.

## Acknowledgments
- Powered by [MediaPipe Tasks](https://developers.google.com/mediapipe/solutions/vision).
- Built for [GitHub Pages](https://pages.github.com/).
- Inspired by the need for accessible body tracking.

For issues or contributions, open an issue or pull request on GitHub.