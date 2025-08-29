const videoElement = document.querySelector('.input_video');
const imageElement = document.querySelector('.input_image');
const canvasElement = document.querySelector('.output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const statusElement = document.querySelector('.status');
const fpsElement = document.querySelector('#fps');
const pointsElement = document.querySelector('#points');
const startBtn = document.querySelector('#startBtn');
const stopBtn = document.querySelector('#stopBtn');
const modelSelect = document.querySelector('#modelSelect');
const showFace = document.querySelector('#showFace');
const showHands = document.querySelector('#showHands');
const showPose = document.querySelector('#showPose');
const confSlider = document.querySelector('#confThreshold');
const confLabel = document.querySelector('label[for="confThreshold"]');
const uploadFile = document.querySelector('#uploadFile');
const processUpload = document.querySelector('#processUpload');

let holistic = null;
let camera = null;
let rafId = null;
let fps = 0;
let frameCount = 0;
let startTime = performance.now();
let active = false;
let currentModel = 'full';
let lastDrawTime = 0;
const throttleMs = 33;
let sourceType = 'webcam'; // 'webcam', 'image', 'video'
let sourceElement = videoElement;

const modelConfigs = {
    full: {
        modelComplexity: 2,
        smoothLandmarks: true,
        enableSegmentation: true,
        smoothSegmentation: true,
        refineFaceLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    },
    upper: {
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        refineFaceLandmarks: true,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
    },
    lite: {
        modelComplexity: 0,
        smoothLandmarks: false,
        enableSegmentation: false,
        smoothSegmentation: false,
        refineFaceLandmarks: false,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
    }
};

class LandmarkSmoother {
    constructor(windowSize = 5) {
        this.windowSize = windowSize;
        this.history = [];
    }

    smooth(landmarks) {
        this.history.push(landmarks);
        if (this.history.length > this.windowSize) this.history.shift();
        if (this.history.length < this.windowSize) return landmarks;

        const smoothed = landmarks.map((_, idx) => {
            let sumX = 0, sumY = 0, sumZ = 0, sumVis = 0, count = 0;
            this.history.forEach(frame => {
                if (frame[idx]) {
                    sumX += frame[idx].x;
                    sumY += frame[idx].y;
                    sumZ += frame[idx].z;
                    sumVis += frame[idx].visibility;
                    count++;
                }
            });
            return count > 0 ? {
                x: sumX / count,
                y: sumY / count,
                z: sumZ / count,
                visibility: sumVis / count
            } : null;
        }).filter(lm => lm !== null);
        return smoothed;
    }
}

const poseSmoother = new LandmarkSmoother();
const faceSmoother = new LandmarkSmoother(3);
const handSmoother = new LandmarkSmoother();

function initHolistic(config) {
    holistic = new Holistic({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5/${file}`;
    }});
    holistic.setOptions(config);
    holistic.onResults(throttledOnResults);
    return holistic;
}

function filterByConfidence(landmarks, minConf) {
    return landmarks.filter(lm => lm.visibility > minConf);
}

function getColorByConfidence(visibility) {
    if (visibility > 0.8) return '#00FF00';
    if (visibility > 0.5) return '#FFFF00';
    return '#FF0000';
}

function drawLandmarks(ctx, landmarks, style) {
    const minConf = parseFloat(confSlider.value);
    const filtered = filterByConfidence(landmarks, minConf);
    filtered.forEach(lm => {
        ctx.beginPath();
        ctx.arc(lm.x * canvasElement.width, lm.y * canvasElement.height, style.lineWidth, 0, 2 * Math.PI);
        ctx.fillStyle = getColorByConfidence(lm.visibility);
        ctx.fill();
    });
}

function drawConnectors(ctx, landmarks, connections, style) {
    const minConf = parseFloat(confSlider.value);
    connections.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        if (start && end && start.visibility > minConf && end.visibility > minConf) {
            ctx.beginPath();
            ctx.moveTo(start.x * canvasElement.width, start.y * canvasElement.height);
            ctx.lineTo(end.x * canvasElement.width, end.y * canvasElement.height);
            ctx.strokeStyle = style.color;
            ctx.lineWidth = style.lineWidth * Math.min(start.visibility, end.visibility);
            ctx.stroke();
        }
    });
}

function interpolateBetweenPoints(start, end, factor) {
    const midX = start.x + (end.x - start.x) * factor;
    const midY = start.y + (end.y - start.y) * factor;
    const midZ = start.z + (end.z - start.z) * factor;
    return {x: midX, y: midY, z: midZ, visibility: Math.min(start.visibility, end.visibility)};
}

function interpolateLandmarks(landmarks, connections, factors = [0.2, 0.4, 0.6, 0.8]) {
    const interpolated = [];
    connections.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        if (start && end) {
            factors.forEach(f => {
                interpolated.push(interpolateBetweenPoints(start, end, f));
            });
        }
    });
    return interpolated;
}

function enhanceFaceContours(landmarks) {
    const enhanced = [];
    const contourSets = [FACEMESH_FACE_OVAL, FACEMESH_LIPS, FACEMESH_LEFT_EYE, FACEMESH_RIGHT_EYE, FACEMESH_LEFT_EYEBROW, FACEMESH_RIGHT_EYEBROW];
    contourSets.forEach(contour => {
        for (let i = 0; i < contour.length; i++) {
            const idx1 = contour[i][0];
            const idx2 = contour[i][1];
            const lm1 = landmarks[idx1];
            const lm2 = landmarks[idx2];
            if (lm1 && lm2) {
                const factors = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
                factors.forEach(f => {
                    enhanced.push(interpolateBetweenPoints(lm1, lm2, f));
                });
            }
        }
    });
    const noseBridge = landmarks[1];
    const chin = landmarks[152];
    if (noseBridge && chin) {
        enhanced.push(interpolateBetweenPoints(noseBridge, chin, 0.5));
    }
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    if (leftCheek && rightCheek) {
        enhanced.push(interpolateBetweenPoints(leftCheek, rightCheek, 0.5));
    }
    return enhanced;
}

function interpolateHandJoints(landmarks) {
    const interpolated = [];
    HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        if (start && end) {
            const factors = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
            factors.forEach(f => {
                interpolated.push(interpolateBetweenPoints(start, end, f));
            });
        }
    });
    const fingerBases = [0, 5, 9, 13, 17];
    for (let i = 0; i < fingerBases.length - 1; i++) {
        const start = landmarks[fingerBases[i]];
        const end = landmarks[fingerBases[i + 1]];
        if (start && end) {
            interpolated.push(interpolateBetweenPoints(start, end, 0.5));
        }
    }
    return interpolated;
}

function generateVirtualLandmarks(poseLandmarks) {
    if (!poseLandmarks) return [];
    const virtual = [];
    
    const shoulders = [poseLandmarks[11], poseLandmarks[12]];
    if (shoulders[0] && shoulders[1]) {
        virtual.push(interpolateBetweenPoints(shoulders[0], shoulders[1], 0.5));
    }
    const hips = [poseLandmarks[23], poseLandmarks[24]];
    if (hips[0] && hips[1]) {
        virtual.push(interpolateBetweenPoints(hips[0], hips[1], 0.5));
    }
    
    if (virtual.length === 2) {
        virtual.push(interpolateBetweenPoints(virtual[0], virtual[1], 0.5));
    }
    
    const leftShoulder = poseLandmarks[11];
    const leftElbow = poseLandmarks[13];
    const leftWrist = poseLandmarks[15];
    if (leftShoulder && leftElbow) {
        virtual.push(interpolateBetweenPoints(leftShoulder, leftElbow, 0.5));
    }
    if (leftElbow && leftWrist) {
        virtual.push(interpolateBetweenPoints(leftElbow, leftWrist, 0.5));
        virtual.push(interpolateBetweenPoints(leftElbow, leftWrist, 0.25));
        virtual.push(interpolateBetweenPoints(leftElbow, leftWrist, 0.75));
    }
    const rightShoulder = poseLandmarks[12];
    const rightElbow = poseLandmarks[14];
    const rightWrist = poseLandmarks[16];
    if (rightShoulder && rightElbow) {
        virtual.push(interpolateBetweenPoints(rightShoulder, rightElbow, 0.5));
    }
    if (rightElbow && rightWrist) {
        virtual.push(interpolateBetweenPoints(rightElbow, rightWrist, 0.5));
        virtual.push(interpolateBetweenPoints(rightElbow, rightWrist, 0.25));
        virtual.push(interpolateBetweenPoints(rightElbow, rightWrist, 0.75));
    }
    
    const leftHip = poseLandmarks[23];
    const leftKnee = poseLandmarks[25];
    const leftAnkle = poseLandmarks[27];
    if (leftHip && leftKnee) {
        virtual.push(interpolateBetweenPoints(leftHip, leftKnee, 0.5));
    }
    if (leftKnee && leftAnkle) {
        virtual.push(interpolateBetweenPoints(leftKnee, leftAnkle, 0.5));
        virtual.push(interpolateBetweenPoints(leftKnee, leftAnkle, 0.25));
        virtual.push(interpolateBetweenPoints(leftKnee, leftAnkle, 0.75));
    }
    const rightHip = poseLandmarks[24];
    const rightKnee = poseLandmarks[26];
    const rightAnkle = poseLandmarks[28];
    if (rightHip && rightKnee) {
        virtual.push(interpolateBetweenPoints(rightHip, rightKnee, 0.5));
    }
    if (rightKnee && rightAnkle) {
        virtual.push(interpolateBetweenPoints(rightKnee, rightAnkle, 0.5));
        virtual.push(interpolateBetweenPoints(rightKnee, rightAnkle, 0.25));
        virtual.push(interpolateBetweenPoints(rightKnee, rightAnkle, 0.75));
    }
    
    const nose = poseLandmarks[0];
    const midHip = virtual[1];
    if (nose && midHip) {
        virtual.push(interpolateBetweenPoints(nose, midHip, 0.33));
        virtual.push(interpolateBetweenPoints(nose, midHip, 0.66));
    }
    
    const leftShoulderToHip = [poseLandmarks[11], poseLandmarks[23]];
    if (leftShoulderToHip[0] && leftShoulderToHip[1]) {
        virtual.push(interpolateBetweenPoints(leftShoulderToHip[0], leftShoulderToHip[1], 0.5));
    }
    const rightShoulderToHip = [poseLandmarks[12], poseLandmarks[24]];
    if (rightShoulderToHip[0] && rightShoulderToHip[1]) {
        virtual.push(interpolateBetweenPoints(rightShoulderToHip[0], rightShoulderToHip[1], 0.5));
    }
    
    return virtual;
}

function projectTo3D(landmark) {
    const scale = 1 / (1 + landmark.z * 0.5);
    return {
        x: landmark.x * scale,
        y: landmark.y * scale,
        z: landmark.z
    };
}

function drawProjectedLandmarks(ctx, landmarks, style) {
    const minConf = parseFloat(confSlider.value);
    const filtered = filterByConfidence(landmarks, minConf);
    filtered.forEach(lm => {
        const proj = projectTo3D(lm);
        ctx.beginPath();
        ctx.arc(proj.x * canvasElement.width, proj.y * canvasElement.height, style.lineWidth * (1 - proj.z), 0, 2 * Math.PI);
        ctx.fillStyle = getColorByConfidence(lm.visibility);
        ctx.fill();
    });
}

function onResults(results) {
    if (!active) return;

    const currentTime = performance.now();
    frameCount++;
    if (currentTime - startTime >= 1000) {
        fps = frameCount;
        fpsElement.textContent = fps;
        frameCount = 0;
        startTime = currentTime;
    }

    if (results.poseLandmarks && (sourceType !== 'image' || modelConfigs[currentModel].smoothLandmarks)) {
        results.poseLandmarks = poseSmoother.smooth(results.poseLandmarks);
    }
    if (results.faceLandmarks && (sourceType !== 'image' || modelConfigs[currentModel].smoothLandmarks)) {
        results.faceLandmarks = faceSmoother.smooth(results.faceLandmarks);
    }
    if (results.leftHandLandmarks && (sourceType !== 'image' || modelConfigs[currentModel].smoothLandmarks)) {
        results.leftHandLandmarks = handSmoother.smooth(results.leftHandLandmarks);
    }
    if (results.rightHandLandmarks && (sourceType !== 'image' || modelConfigs[currentModel].smoothLandmarks)) {
        results.rightHandLandmarks = handSmoother.smooth(results.rightHandLandmarks);
    }

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(sourceElement, 0, 0, canvasElement.width, canvasElement.height);

    if (results.segmentationMask && modelConfigs[currentModel].enableSegmentation) {
        canvasCtx.globalCompositeOperation = 'source-over';
        canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.globalCompositeOperation = 'source-atop';
        canvasCtx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.globalCompositeOperation = 'source-over';
    }

    let totalPoints = 0;

    if (showPose.checked && results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 2});
        totalPoints += results.poseLandmarks.length;
        const interpolatedPose = interpolateLandmarks(results.poseLandmarks, POSE_CONNECTIONS);
        drawLandmarks(canvasCtx, interpolatedPose, {color: '#FFFF00', lineWidth: 1});
        totalPoints += interpolatedPose.length;
        const virtuals = generateVirtualLandmarks(results.poseLandmarks);
        drawLandmarks(canvasCtx, virtuals, {color: '#0000FF', lineWidth: 3});
        totalPoints += virtuals.length;
    }

    if (showFace.checked && results.faceLandmarks) {
        drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_TESSELATION, {color: '#C0C0C070', lineWidth: 1});
        drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_RIGHT_EYE, {color: '#FF3030'});
        drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_RIGHT_EYEBROW, {color: '#FF3030'});
        drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_LEFT_EYE, {color: '#30FF30'});
        drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_LEFT_EYEBROW, {color: '#30FF30'});
        drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_FACE_OVAL, {color: '#E0E0E0'});
        drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_LIPS, {color: '#E0E0E0'});
        totalPoints += results.faceLandmarks.length;
        const enhancedFace = enhanceFaceContours(results.faceLandmarks);
        drawLandmarks(canvasCtx, enhancedFace, {color: '#00FFFF', lineWidth: 1});
        totalPoints += enhancedFace.length;
    }

    if (showHands.checked && results.leftHandLandmarks) {
        drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {color: '#CC0000', lineWidth: 5});
        drawLandmarks(canvasCtx, results.leftHandLandmarks, {color: '#00FF00', lineWidth: 2});
        totalPoints += results.leftHandLandmarks.length;
        const interpolatedLeft = interpolateHandJoints(results.leftHandLandmarks);
        drawLandmarks(canvasCtx, interpolatedLeft, {color: '#FF00FF', lineWidth: 1});
        totalPoints += interpolatedLeft.length;
    }

    if (showHands.checked && results.rightHandLandmarks) {
        drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {color: '#00CC00', lineWidth: 5});
        drawLandmarks(canvasCtx, results.rightHandLandmarks, {color: '#FF0000', lineWidth: 2});
        totalPoints += results.rightHandLandmarks.length;
        const interpolatedRight = interpolateHandJoints(results.rightHandLandmarks);
        drawLandmarks(canvasCtx, interpolatedRight, {color: '#FF00FF', lineWidth: 1});
        totalPoints += interpolatedRight.length;
    }

    pointsElement.textContent = totalPoints;
    canvasCtx.restore();
}

function throttledOnResults(results) {
    const now = performance.now();
    if (now - lastDrawTime > throttleMs) {
        try {
            onResults(results);
        } catch (error) {
            console.error('Error in results processing:', error);
            statusElement.textContent = 'Error occurred. Restart tracking.';
            stopProcessing();
        }
        lastDrawTime = now;
    }
}

async function startTracking() {
    if (active) return;
    active = true;
    sourceType = 'webcam';
    sourceElement = videoElement;
    videoElement.style.display = 'block';
    imageElement.style.display = 'none';
    statusElement.textContent = 'Tracking started...';

    const config = modelConfigs[currentModel];
    holistic = initHolistic(config);

    camera = new Camera(videoElement, {
        onFrame: async () => {
            if (active && sourceType === 'webcam') {
                await holistic.send({image: videoElement});
            }
        },
        width: 1280,
        height: 720
    });
    await camera.start();
}

function stopProcessing() {
    active = false;
    if (camera) {
        camera.stop();
        camera = null;
    }
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    if (sourceElement instanceof HTMLVideoElement && sourceType === 'video') {
        sourceElement.pause();
        sourceElement.currentTime = 0;
    }
    statusElement.textContent = 'Processing stopped.';
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
}

async function processUploadedFile() {
    if (!uploadFile.files || uploadFile.files.length === 0) {
        statusElement.textContent = 'No file selected.';
        return;
    }
    stopProcessing();
    const file = uploadFile.files[0];
    const fileType = file.type.split('/')[0];
    const config = modelConfigs[currentModel];
    holistic = initHolistic(config);
    statusElement.textContent = `Processing ${fileType}...`;

    if (fileType === 'image') {
        sourceType = 'image';
        sourceElement = imageElement;
        videoElement.style.display = 'none';
        imageElement.style.display = 'block';
        const url = URL.createObjectURL(file);
        imageElement.src = url;
        imageElement.onload = async () => {
            canvasElement.width = imageElement.naturalWidth;
            canvasElement.height = imageElement.naturalHeight;
            try {
                await holistic.send({image: imageElement});
            } catch (error) {
                console.error('Error processing image:', error);
                statusElement.textContent = 'Error processing image.';
            }
            URL.revokeObjectURL(url);
        };
    } else if (fileType === 'video') {
        sourceType = 'video';
        sourceElement = videoElement;
        videoElement.style.display = 'block';
        imageElement.style.display = 'none';
        const url = URL.createObjectURL(file);
        videoElement.src = url;
        videoElement.onloadedmetadata = () => {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            videoElement.play();
            async function processVideoFrame() {
                if (active && sourceType === 'video' && !videoElement.paused && !videoElement.ended) {
                    try {
                        await holistic.send({image: videoElement});
                    } catch (error) {
                        console.error('Error processing video frame:', error);
                        statusElement.textContent = 'Error processing video.';
                        stopProcessing();
                        return;
                    }
                    rafId = requestAnimationFrame(processVideoFrame);
                }
            }
            active = true;
            rafId = requestAnimationFrame(processVideoFrame);
            videoElement.onended = () => {
                stopProcessing();
                URL.revokeObjectURL(url);
            };
        };
    } else {
        statusElement.textContent = 'Unsupported file type. Use JPEG, PNG, MP4, or WebM.';
    }
}

startBtn.addEventListener('click', startTracking);
stopBtn.addEventListener('click', stopProcessing);
modelSelect.addEventListener('change', (e) => {
    currentModel = e.target.value;
    if (active) {
        stopProcessing();
        if (sourceType === 'webcam') {
            startTracking();
        } else {
            processUploadedFile();
        }
    }
});
confSlider.addEventListener('input', (e) => {
    confLabel.textContent = `Min Confidence: ${e.target.value}`;
});
document.addEventListener('keydown', (e) => {
    if (e.key === 's') startTracking();
    if (e.key === 't') stopProcessing();
    if (e.key === 'f') showFace.checked = !showFace.checked;
    if (e.key === 'h') showHands.checked = !showHands.checked;
    if (e.key === 'p') showPose.checked = !showPose.checked;
});
processUpload.addEventListener('click', processUploadedFile);

statusElement.textContent = 'Ready. Select model and start tracking or upload a file.';
canvasElement.width = 1280;
canvasElement.height = 720;