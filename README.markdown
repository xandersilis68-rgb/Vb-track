# Advanced Body Tracking Web Application

## Overview
This project is a sophisticated web application for real-time body tracking, utilizing MediaPipe Holistic to detect and visualize human body, face, and hand landmarks. It is designed to run on GitHub Pages, providing a responsive and interactive UI overlay to display tracked points with high precision. The application supports multiple model configurations, dynamic landmark rendering, advanced features like interpolation and smoothing for enhanced detection accuracy, and now includes the ability to upload images or videos to overlay tracked landmarks.

## Features
- **Real-Time Tracking**: Tracks body pose, face, and hands using MediaPipe Holistic with customizable model complexity (Full, Upper Body, Lite).
- **Interactive UI Overlay**: Displays tracking status, FPS, detected points count, and toggleable options for pose, face, and hand landmarks.
- **Advanced Visualization**: Includes dynamic coloring based on landmark confidence, 3D projection simulation, and interpolated virtual landmarks for finer tracking.
- **Performance Optimization**: Implements FPS throttling, landmark smoothing, and confidence-based filtering to ensure smooth operation.
- **Responsive Design**: Adapts to various screen sizes while maintaining a 16:9 aspect ratio for the video feed.
- **Media Upload Support**: Allows uploading images (JPEG, PNG) or videos (MP4, WebM) to process and overlay tracked landmarks statically (images) or dynamically (videos).
- **Extensibility**: Modular code structure with functions for interpolation, smoothing, and enhanced contour detection, allowing easy additions.

## Files
- **index.html**: The main HTML file that sets up the video feed, canvas for rendering, UI controls, and file upload input.
- **style.css**: Styles the application with a responsive layout, transparent overlay, and modern UI elements for upload controls.
- **script.js**: Handles the core logic, including MediaPipe initialization, landmark processing, rendering, user interactions, and media upload processing.

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
   - Uses CDN-hosted MediaPipe libraries (`camera_utils`, `control_utils`, `drawing_utils`, `holistic`).
   - No local server or additional installations are required, as all scripts are loaded via CDN.

## Usage
1. **Access the Application**:
   - Open the deployed GitHub Pages URL in a modern browser (Chrome, Firefox, or Edge recommended).
   - Grant camera access when prompted for webcam tracking.
2. **Controls**:
   - **Start/Stop Tracking**: Use the "Start Tracking" and "Stop Tracking" buttons or press `s`/`t` on the keyboard for webcam mode.
   - **Model Selection**: Choose between Full, Upper Body, or Lite modes via the dropdown to adjust performance and accuracy.
   - **Landmark Toggles**: Check/uncheck boxes (or press `f`/`h`/`p`) to show/hide face, hands, or pose landmarks.
   - **Confidence Threshold**: Adjust the minimum confidence slider to filter low-confidence landmarks.
   - **Upload Media**: Use the file input to select an image or video, then click "Process Upload" to overlay landmarks. Images display static landmarks; videos play with dynamic landmark overlays.
3. **Monitoring**:
   - The UI displays real-time FPS and the total number of detected points.
   - Status messages indicate tracking state, processing status, or errors.

## Technical Details
- **MediaPipe Holistic**: Utilizes the `@mediapipe/holistic@0.5` library for multi-part tracking:
  - Pose: 33 landmarks for body skeleton.
  - Face: 468 landmarks with detailed tesselation, eyes, and lips.
  - Hands: 21 landmarks per hand with joint connections.
- **Performance Features**:
  - **FPS Throttling**: Limits rendering to ~30 FPS to prevent browser overload.
  - **Landmark Smoothing**: Uses a moving average filter to reduce jitter in landmark positions.
  - **Interpolation**: Adds virtual landmarks (e.g., mid-torso, mid-hip, hand joint midpoints, spine points) for denser tracking.
  - **Confidence-Based Rendering**: Colors landmarks based on detection confidence (green >0.8, yellow >0.5, red ≤0.5).
- **Media Processing**:
  - **Images**: Processes a single frame to overlay landmarks.
  - **Videos**: Processes frames during playback for dynamic landmark overlays.
- **3D Simulation**: Applies a simple perspective projection to simulate depth in 2D rendering.
- **Error Handling**: Includes try-catch blocks for robust processing and user feedback on failures.
- **Keyboard Shortcuts**: Enhances accessibility with key bindings for common actions.

## Customization
To extend or modify the application:
1. **Add More Virtual Landmarks**:
   - Edit the `generateVirtualLandmarks` function in `script.js` to include additional averaged points.
2. **Enhance Smoothing**:
   - Adjust the `windowSize` in the `LandmarkSmoother` class for smoother or more responsive tracking.
3. **Custom Styling**:
   - Modify `style.css` to change colors, overlay opacity, or UI layout.
4. **New Model Configurations**:
   - Add new entries to the `modelConfigs` object in `script.js` with different MediaPipe parameters.
5. **Additional Visualizations**:
   - Extend the `drawProjectedLandmarks` function to incorporate more complex 3D effects or animations.
6. **Enhanced Upload Features**:
   - Add video playback controls (play/pause/seek) in `index.html` and `script.js`.

## Limitations
- **Browser Compatibility**: Requires WebRTC support and a modern browser for camera access and WebGL rendering.
- **Performance**: The Full model with segmentation enabled may be resource-intensive on low-end devices. Use Lite mode for better performance. Video processing may be slow for high-resolution or long videos.
- **Camera Dependency**: Requires a webcam for live input; uploads provide an alternative.
- **GitHub Pages**: Ensure the repository is public for GitHub Pages hosting, and note that CORS restrictions may affect CDN usage.
- **File Formats**: Supports common image (JPEG, PNG) and video (MP4, WebM) formats; other formats may not work.

## Troubleshooting
- **Camera Not Working**: Ensure camera permissions are granted and no other application is using the camera.
- **Low FPS**: Switch to Lite mode or reduce the confidence threshold to improve performance.
- **Model Loading Errors**: Check browser console for CDN issues and verify internet connectivity.
- **Landmarks Not Displaying**: Ensure the relevant toggle (Face/Hands/Pose) is checked and confidence threshold is not too high.
- **Upload Issues**: Verify the file format is supported (JPEG, PNG, MP4, WebM) and check console for errors.

## Future Enhancements
- **Gesture Recognition**: Add logic to detect specific gestures based on landmark positions.
- **Multi-Person Tracking**: Extend to support multiple people in the frame using MediaPipe's multi-person capabilities.
- **Augmented Reality**: Overlay 3D models or animations on tracked points for AR effects.
- **Data Export**: Allow users to export landmark coordinates for analysis or integration with other tools.
- **Video Playback Controls**: Add play/pause/seek functionality for uploaded videos.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments
- Powered by [MediaPipe Holistic](https://mediapipe.dev/) for advanced machine learning-based tracking.
- Built for deployment on [GitHub Pages](https://pages.github.com/) for easy hosting.
- Inspired by the need for accessible, high-precision body tracking in web applications.

For questions or contributions, open an issue or submit a pull request on the GitHub repository.