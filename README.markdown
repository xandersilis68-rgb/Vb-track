# Advanced Body Tracking Web Application

## Overview
This project is a sophisticated web application for real-time body tracking, utilizing the latest MediaPipe Tasks API to detect and visualize human body, face, and hand landmarks for multiple people. It is designed to run on GitHub Pages, providing a responsive and interactive UI overlay to display tracked points and meshes with high precision. The application supports multiple model configurations, dynamic landmark and mesh rendering, and advanced features like interpolation for enhanced detection accuracy. It also supports uploading images or videos to overlay tracked landmarks and meshes, with optimized performance and multi-person tracking capability.

## Features
- **Real-Time Tracking**: Tracks body pose, face, and hands using MediaPipe Tasks with customizable model complexity (Full, Upper Body, Lite).
- **Multi-Person Tracking**: Optional support for tracking up to 4 people simultaneously.
- **Mesh Visualization**: Renders triangular meshes for pose, face, and hands, enhancing visualization of body parts with toggleable display.
- **Interactive UI Overlay**: Displays tracking status, FPS, detected points count, and toggleable options for pose, face, hand landmarks, and meshes, as well as multi-person mode.
- **Advanced Visualization**: Includes dynamic coloring based on landmark confidence, interpolated virtual landmarks for denser tracking, and mesh rendering for surface visualization.
- **Performance Optimization**: Uses GPU delegate, lighter models for speed, FPS throttling, and confidence-based filtering. Removed smoothing and segmentation for faster processing.
- **Responsive Design**: Adapts to various screen sizes while maintaining a 16:9 aspect ratio for the video feed.
- **Media Upload Support**: Allows uploading images (JPEG, PNG) or videos (MP4, WebM) to process and overlay tracked landmarks and meshes statically (images) or dynamically (videos).
- **Extensibility**: Modular code structure with functions for interpolation, mesh generation, and enhanced contour detection, allowing easy additions.

## Files
- **index.html**: The main HTML file that sets up the video feed, canvas for rendering, UI controls, file upload input, and mesh toggle.
- **style.css**: Styles the application with a responsive layout, transparent overlay, modern UI elements for upload controls, and mesh rendering styles.
- **script.js**: Handles the core logic, including MediaPipe initialization, landmark and mesh processing, rendering, user interactions, and media upload processing.

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
   - Uses CDN-hosted MediaPipe libraries (`drawing_utils`, `tasks-vision`).
   - No local server or additional installations are required, as all scripts are loaded via CDN.

## Usage
1. **Access the Application**:
   - Open the deployed GitHub Pages URL in a modern browser (Chrome, Firefox, or Edge recommended).
   - Grant camera access when prompted for webcam tracking.
2. **Controls**:
   - **Start/Stop Tracking**: Use the "Start Tracking" and "Stop Tracking" buttons or press `s`/`t` on the keyboard for webcam mode.
   - **Model Selection**: Choose between Full, Upper Body, or Lite modes via the dropdown to adjust performance and accuracy.
   - **Landmark Toggles**: Check/uncheck boxes (or press `f`/`h`/`p`) to show/hide face, hands, or pose landmarks.
   - **Mesh Toggle**: Check/uncheck the "Show Meshes" box (or press `m`) to show/hide triangular meshes for body parts.
   - **Multi Person**: Check to enable tracking for up to 4 people (may reduce performance).
   - **Confidence Threshold**: Adjust the minimum confidence slider to filter low-confidence landmarks.
   - **Upload Media**: Use the file input to select an image or video, then click "Process Upload" to overlay landmarks and meshes. Images display static landmarks/meshes; videos play with dynamic overlays.
3. **Monitoring**:
   - The UI displays real-time FPS and the total number of detected points.
   - Status messages indicate tracking state, processing status, or errors.

## Technical Details
- **MediaPipe Tasks**: Utilizes the `@mediapipe/tasks-vision` for separate pose, face, and hand landmark detection:
  - Pose: Up to 33 landmarks per person for body skeleton, with triangular meshes for torso, arms, and legs.
  - Face: Up to 468 landmarks per person with detailed eyes, eyebrows, lips, and oval, with full face mesh.
  - Hands: Up to 21 landmarks per hand with joint connections and palm/finger meshes.
- **Performance Features**:
  - **FPS Throttling**: Limits rendering to ~30 FPS to prevent browser overload.
  - **Interpolation**: Adds more virtual landmarks (e.g., mid-torso, mid-hip, hand joint midpoints) for denser tracking with increased interpolation factors (19 points per segment).
  - **Confidence-Based Rendering**: Colors landmarks based on detection confidence (green >0.8, yellow >0.5, red ≤0.5).
  - **GPU Acceleration**: Uses GPU delegate for faster processing.
  - Removed landmark smoothing and segmentation to improve speed.
- **Mesh Rendering**: Generates triangular meshes for pose (torso, arms, legs), face (full face), and hands (palm, fingers) using connectivity data, with semi-transparent fills for visibility.
- **Media Processing**:
  - **Images**: Processes a single frame to overlay landmarks and meshes.
  - **Videos**: Processes frames during playback for dynamic landmark and mesh overlays.
- **3D Simulation**: Applies a simple perspective projection to simulate depth in 2D rendering (defined but not used in default rendering).
- **Error Handling**: Includes try-catch blocks for robust processing and user feedback on failures.
- **Keyboard Shortcuts**: Enhances accessibility with key bindings for common actions, including mesh toggle (`m`).

## Customization
To extend or modify the application:
1. **Add More Virtual Landmarks or Meshes**:
   - Edit the `generateVirtualLandmarks` or `generate*Mesh` functions in `script.js` to include additional points or triangles.
2. **Custom Styling**:
   - Modify `style.css` to change colors, overlay opacity, mesh fill styles, or UI layout.
3. **New Model Configurations**:
   - Add new entries to the `modelConfigs` object in `script.js` with different MediaPipe parameters.
4. **Additional Visualizations**:
   - Extend the `drawProjectedLandmarks` function to incorporate more complex 3D effects or animations.
5. **Enhanced Upload Features**:
   - Add video playback controls (play/pause/seek) in `index.html` and `script.js`.

## Limitations
- **Browser Compatibility**: Requires WebRTC support and a modern browser for camera access and WebGL rendering.
- **Performance**: Multi-person tracking, meshes, or heavy models may be resource-intensive on low-end devices. Use Lite mode and disable multi for better performance. Video processing may be slow for high-resolution or long videos.
- **Camera Dependency**: Requires a webcam for live input; uploads provide an alternative.
- **GitHub Pages**: Ensure the repository is public for GitHub Pages hosting, and note that CORS restrictions may affect CDN usage.
- **File Formats**: Supports common image (JPEG, PNG) and video (MP4, WebM) formats; other formats may not work.
- **Association**: Hands and faces are not associated with specific poses in multi-person mode; all detected are drawn independently.

## Troubleshooting
- **Camera Not Working**: Ensure camera permissions are granted and no other application is using the camera.
- **Low FPS**: Switch to Lite mode, disable multi-person or meshes, or reduce the confidence threshold to improve performance.
- **Model Loading Errors**: Check browser console for CDN issues and verify internet connectivity.
- **Landmarks/Meshes Not Displaying**: Ensure the relevant toggles (Face/Hands/Pose/Meshes) are checked and confidence threshold is not too high.
- **Upload Issues**: Verify the file format is supported (JPEG, PNG, MP4, WebM) and check console for errors.

## Future Enhancements
- **Gesture Recognition**: Add logic to detect specific gestures based on landmark positions.
- **Augmented Reality**: Overlay 3D models or animations on tracked points for AR effects.
- **Data Export**: Allow users to export landmark coordinates for analysis or integration with other tools.
- **Video Playback Controls**: Add play/pause/seek functionality for uploaded videos.
- **Landmark Smoothing**: Re-add smoothing with per-person tracking for multi-mode.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments
- Powered by [MediaPipe Tasks](https://developers.google.com/mediapipe/solutions/vision) for advanced machine learning-based tracking.
- Built for deployment on [GitHub Pages](https://pages.github.com/) for easy hosting.
- Inspired by the need for accessible, high-precision body tracking in web applications.

For questions or contributions, open an issue or submit a pull request on the GitHub repository.