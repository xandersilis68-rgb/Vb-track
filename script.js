import { FilesetResolver, PoseLandmarker, FaceLandmarker, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

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
const showMeshes = document.querySelector('#showMeshes');
const multiTrack = document.querySelector('#multiTrack');
const confSlider = document.querySelector('#confThreshold');
const confLabel = document.querySelector('label[for="confThreshold"]');
const uploadFile = document.querySelector('#uploadFile');
const processUpload = document.querySelector('#processUpload');

let poseLandmarker;
let faceLandmarker;
let handLandmarker;
let rafId = null;
let fps = 0;
let frameCount = 0;
let startTime = performance.now();
let active = false;
let currentModel = 'full';
let lastDrawTime = 0;
const throttleMs = 33;
let sourceType = 'webcam';
let sourceElement = videoElement;
let runningMode = 'VIDEO';
let inputImage = new OffscreenCanvas(1280, 720);
let inputCtx = inputImage.getContext('2d');
canvasElement.width = 1280;
canvasElement.height = 720;

const modelConfigs = {
    full: {
        poseModel: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task',
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    },
    upper: {
        poseModel: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task',
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
    },
    lite: {
        poseModel: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
    }
};

const faceModel = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';
const handModel = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';

async function createLandmarkers() {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
    const numPoses = multiTrack.checked ? 4 : 1;
    const numFaces = multiTrack.checked ? 4 : 1;
    const numHands = multiTrack.checked ? 8 : 2;
    const config = modelConfigs[currentModel];

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: config.poseModel,
            delegate: 'GPU'
        },
        runningMode,
        numPoses,
        minPoseDetectionConfidence: config.minDetectionConfidence,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: config.minTrackingConfidence
    });

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: faceModel,
            delegate: 'GPU'
        },
        runningMode,
        numFaces,
        minFaceDetectionConfidence: config.minDetectionConfidence,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: config.minTrackingConfidence,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
    });

    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: handModel,
            delegate: 'GPU'
        },
        runningMode,
        numHands,
        minHandDetectionConfidence: config.minDetectionConfidence,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: config.minTrackingConfidence
    });
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

function drawMesh(ctx, landmarks, triangles, styleClass) {
    const minConf = parseFloat(confSlider.value);
    ctx.save();
    ctx.globalAlpha = 0.2;
    triangles.forEach(([i1, i2, i3]) => {
        const p1 = landmarks[i1];
        const p2 = landmarks[i2];
        const p3 = landmarks[i3];
        if (p1 && p2 && p3 && p1.visibility > minConf && p2.visibility > minConf && p3.visibility > minConf) {
            ctx.beginPath();
            ctx.moveTo(p1.x * canvasElement.width, p1.y * canvasElement.height);
            ctx.lineTo(p2.x * canvasElement.width, p2.y * canvasElement.height);
            ctx.lineTo(p3.x * canvasElement.width, p3.y * canvasElement.height);
            ctx.closePath();
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(`--${styleClass}-fill`).trim();
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue(`--${styleClass}-stroke`).trim();
            ctx.fill();
            ctx.stroke();
        }
    });
    ctx.restore();
}

function interpolateBetweenPoints(start, end, factor) {
    const midX = start.x + (end.x - start.x) * factor;
    const midY = start.y + (end.y - start.y) * factor;
    const midZ = start.z + (end.z - start.z) * factor;
    return {x: midX, y: midY, z: midZ, visibility: Math.min(start.visibility, end.visibility)};
}

function interpolateLandmarks(landmarks, connections) {
    const interpolated = [];
    const factors = Array.from({length: 19}, (_, i) => (i + 1) * 0.05);
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
    const contourSets = [mpDrawing.FACEMESH_FACE_OVAL, mpDrawing.FACEMESH_LIPS, mpDrawing.FACEMESH_LEFT_EYE, mpDrawing.FACEMESH_RIGHT_EYE, mpDrawing.FACEMESH_LEFT_EYEBROW, mpDrawing.FACEMESH_RIGHT_EYEBROW];
    const factors = Array.from({length: 19}, (_, i) => (i + 1) * 0.05);
    contourSets.forEach(contour => {
        contour.forEach(([idx1, idx2]) => {
            const lm1 = landmarks[idx1];
            const lm2 = landmarks[idx2];
            if (lm1 && lm2) {
                factors.forEach(f => {
                    enhanced.push(interpolateBetweenPoints(lm1, lm2, f));
                });
            }
        });
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
    const factors = Array.from({length: 19}, (_, i) => (i + 1) * 0.05);
    mpDrawing.HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];
        if (start && end) {
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
    });
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
        virtual.push(interpolateBetweenPoints(leftElbow, leftWrist, 0.125));
        virtual.push(interpolateBetweenPoints(leftElbow, leftWrist, 0.375));
        virtual.push(interpolateBetweenPoints(leftElbow, leftWrist, 0.625));
        virtual.push(interpolateBetweenPoints(leftElbow, leftWrist, 0.875));
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
        virtual.push(interpolateBetweenPoints(rightElbow, rightWrist, 0.125));
        virtual.push(interpolateBetweenPoints(rightElbow, rightWrist, 0.375));
        virtual.push(interpolateBetweenPoints(rightElbow, rightWrist, 0.625));
        virtual.push(interpolateBetweenPoints(rightElbow, rightWrist, 0.875));
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
        virtual.push(interpolateBetweenPoints(leftKnee, leftAnkle, 0.125));
        virtual.push(interpolateBetweenPoints(leftKnee, leftAnkle, 0.375));
        virtual.push(interpolateBetweenPoints(leftKnee, leftAnkle, 0.625));
        virtual.push(interpolateBetweenPoints(leftKnee, leftAnkle, 0.875));
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
        virtual.push(interpolateBetweenPoints(rightKnee, rightAnkle, 0.125));
        virtual.push(interpolateBetweenPoints(rightKnee, rightAnkle, 0.375));
        virtual.push(interpolateBetweenPoints(rightKnee, rightAnkle, 0.625));
        virtual.push(interpolateBetweenPoints(rightKnee, rightAnkle, 0.875));
    }
    
    const nose = poseLandmarks[0];
    const midHip = virtual[1];
    if (nose && midHip) {
        virtual.push(interpolateBetweenPoints(nose, midHip, 0.33));
        virtual.push(interpolateBetweenPoints(nose, midHip, 0.66));
        virtual.push(interpolateBetweenPoints(nose, midHip, 0.5));
    }
    
    const leftShoulderToHip = poseLandmarks[11] && poseLandmarks[23];
    if (leftShoulderToHip) {
        virtual.push(interpolateBetweenPoints(poseLandmarks[11], poseLandmarks[23], 0.5));
    }
    const rightShoulderToHip = poseLandmarks[12] && poseLandmarks[24];
    if (rightShoulderToHip) {
        virtual.push(interpolateBetweenPoints(poseLandmarks[12], poseLandmarks[24], 0.5));
    }
    
    return virtual;
}

function generatePoseMesh(landmarks) {
    const triangles = [];
    // Torso: shoulders and hips
    if (landmarks[11] && landmarks[12] && landmarks[23] && landmarks[24]) {
        triangles.push([11, 12, 23]); // Left shoulder, right shoulder, left hip
        triangles.push([12, 23, 24]); // Right shoulder, left hip, right hip
    }
    // Upper arms
    if (landmarks[11] && landmarks[13]) {
        triangles.push([11, 13, interpolateBetweenPoints(landmarks[11], landmarks[13], 0.5)]);
    }
    if (landmarks[12] && landmarks[14]) {
        triangles.push([12, 14, interpolateBetweenPoints(landmarks[12], landmarks[14], 0.5)]);
    }
    // Forearms
    if (landmarks[13] && landmarks[15]) {
        triangles.push([13, 15, interpolateBetweenPoints(landmarks[13], landmarks[15], 0.5)]);
    }
    if (landmarks[14] && landmarks[16]) {
        triangles.push([14, 16, interpolateBetweenPoints(landmarks[14], landmarks[16], 0.5)]);
    }
    // Thighs
    if (landmarks[23] && landmarks[25]) {
        triangles.push([23, 25, interpolateBetweenPoints(landmarks[23], landmarks[25], 0.5)]);
    }
    if (landmarks[24] && landmarks[26]) {
        triangles.push([24, 26, interpolateBetweenPoints(landmarks[24], landmarks[26], 0.5)]);
    }
    // Shins
    if (landmarks[25] && landmarks[27]) {
        triangles.push([25, 27, interpolateBetweenPoints(landmarks[25], landmarks[27], 0.5)]);
    }
    if (landmarks[26] && landmarks[28]) {
        triangles.push([26, 28, interpolateBetweenPoints(landmarks[26], landmarks[28], 0.5)]);
    }
    return triangles;
}

function generateHandMesh(landmarks) {
    const triangles = [];
    // Palm: using wrist and finger bases
    const palmIndices = [0, 5, 9, 13, 17];
    for (let i = 0; i < palmIndices.length - 2; i++) {
        triangles.push([palmIndices[0], palmIndices[i + 1], palmIndices[i + 2]]);
    }
    // Fingers: for each finger, create triangles along joints
    const fingerRanges = [[5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20], [1, 2, 3, 4]];
    fingerRanges.forEach(range => {
        for (let i = 0; i < range.length - 2; i++) {
            triangles.push([range[i], range[i + 1], range[i + 2]]);
        }
    });
    return triangles;
}

async function drawResults(poseResults, faceResults, handResults) {
    if (!active) return;
    const now = performance.now();
    if (now - lastDrawTime < throttleMs) return;
    lastDrawTime = now;

    frameCount++;
    if (now - startTime >= 1000) {
        fps = frameCount;
        fpsElement.textContent = fps;
        frameCount = 0;
        startTime = now;
    }

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    if (sourceType === 'webcam') {
        canvasCtx.save();
        canvasCtx.translate(canvasElement.width, 0);
        canvasCtx.scale(-1, 1);
        canvasCtx.drawImage(sourceElement, 0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.restore();
    } else {
        canvasCtx.drawImage(sourceElement, 0, 0, canvasElement.width, canvasElement.height);
    }

    let totalPoints = 0;

    if (showPose.checked && poseResults.landmarks) {
        poseResults.landmarks.forEach(landmarks => {
            if (showMeshes.checked) {
                const poseMesh = generatePoseMesh(landmarks);
                drawMesh(canvasCtx, landmarks, poseMesh, 'mesh-pose');
            }
            drawConnectors(canvasCtx, landmarks, mpDrawing.POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 4});
            drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 2});
            totalPoints += landmarks.length;
            const interpolatedPose = interpolateLandmarks(landmarks, mpDrawing.POSE_CONNECTIONS);
            drawLandmarks(canvasCtx, interpolatedPose, {color: '#FFFF00', lineWidth: 1});
            totalPoints += interpolatedPose.length;
            const virtuals = generateVirtualLandmarks(landmarks);
            drawLandmarks(canvasCtx, virtuals, {color: '#0000FF', lineWidth: 3});
            totalPoints += virtuals.length;
        });
    }

    if (showFace.checked && faceResults.faceLandmarks) {
        faceResults.faceLandmarks.forEach(landmarks => {
            if (showMeshes.checked) {
                drawMesh(canvasCtx, landmarks, mpDrawing.FACEMESH_TESSELATION, 'mesh-face');
            }
            drawConnectors(canvasCtx, landmarks, mpDrawing.FACEMESH_RIGHT_EYE, {color: '#FF3030'});
            drawConnectors(canvasCtx, landmarks, mpDrawing.FACEMESH_RIGHT_EYEBROW, {color: '#FF3030'});
            drawConnectors(canvasCtx, landmarks, mpDrawing.FACEMESH_LEFT_EYE, {color: '#30FF30'});
            drawConnectors(canvasCtx, landmarks, mpDrawing.FACEMESH_LEFT_EYEBROW, {color: '#30FF30'});
            drawConnectors(canvasCtx, landmarks, mpDrawing.FACEMESH_FACE_OVAL, {color: '#E0E0E0'});
            drawConnectors(canvasCtx, landmarks, mpDrawing.FACEMESH_LIPS, {color: '#E0E0E0'});
            totalPoints += landmarks.length;
            const enhancedFace = enhanceFaceContours(landmarks);
            drawLandmarks(canvasCtx, enhancedFace, {color: '#00FFFF', lineWidth: 1});
            totalPoints += enhancedFace.length;
        });
    }

    if (showHands.checked && handResults.landmarks) {
        handResults.landmarks.forEach((landmarks, i) => {
            const handedness = handResults.handednesses[i][0].categoryName; // 'Left' or 'Right'
            const connectorColor = handedness === 'Left' ? '#CC0000' : '#00CC00';
            const landmarkColor = handedness === 'Left' ? '#00FF00' : '#FF0000';
            const meshClass = handedness === 'Left' ? 'mesh-hand-left' : 'mesh-hand-right';
            if (showMeshes.checked) {
                const handMesh = generateHandMesh(landmarks);
                drawMesh(canvasCtx, landmarks, handMesh, meshClass);
            }
            drawConnectors(canvasCtx, landmarks, mpDrawing.HAND_CONNECTIONS, {color: connectorColor, lineWidth: 5});
            drawLandmarks(canvasCtx, landmarks, {color: landmarkColor, lineWidth: 2});
            totalPoints += landmarks.length;
            const interpolated = interpolateHandJoints(landmarks);
            drawLandmarks(canvasCtx, interpolated, {color: '#FF00FF', lineWidth: 1});
            totalPoints += interpolated.length;
        });
    }

    pointsElement.textContent = totalPoints;
}

async function processFrame() {
    if (!active) return;

    const isFlip = sourceType === 'webcam';
    inputCtx.save();
    if (isFlip) {
        inputCtx.translate(1280, 0);
        inputCtx.scale(-1, 1);
    }
    inputCtx.drawImage(sourceElement, 0, 0, 1280, 720);
    inputCtx.restore();

    const now = performance.now();
    try {
        const poseResults = await poseLandmarker.detectForVideo(inputImage, now);
        const faceResults = await faceLandmarker.detectForVideo(inputImage, now);
        const handResults = await handLandmarker.detectForVideo(inputImage, now);
        await drawResults(poseResults, faceResults, handResults);
    } catch (error) {
        console.error('Error processing frame:', error);
        statusElement.textContent = 'Error processing frame.';
        stopProcessing();
        return;
    }
    rafId = requestAnimationFrame(processFrame);
}

async function startTracking() {
    if (active) return;
    active = true;
    sourceType = 'webcam';
    sourceElement = videoElement;
    videoElement.style.display = 'block';
    imageElement.style.display = 'none';
    runningMode = 'VIDEO';
    statusElement.textContent = 'Tracking started...';

    await createLandmarkers();

    const constraints = { video: { width: 1280, height: 720 } };
    try {
        sourceElement.srcObject = await navigator.mediaDevices.getUserMedia(constraints);
        sourceElement.addEventListener('loadeddata', () => {
            requestAnimationFrame(processFrame);
        });
    } catch (error) {
        console.error('Error accessing webcam:', error);
        statusElement.textContent = 'Error accessing webcam.';
        active = false;
    }
}

async function processUploadedFile() {
    if (!uploadFile.files || uploadFile.files.length === 0) {
        statusElement.textContent = 'No file selected.';
        return;
    }
    stopProcessing();
    const file = uploadFile.files[0];
    const fileType = file.type.split('/')[0];
    statusElement.textContent = `Processing ${fileType}...`;

    if (fileType === 'image') {
        sourceType = 'image';
        sourceElement = imageElement;
        videoElement.style.display = 'none';
        imageElement.style.display = 'block';
        runningMode = 'IMAGE';
        const url = URL.createObjectURL(file);
        imageElement.src = url;
        imageElement.onload = async () => {
            canvasElement.width = imageElement.naturalWidth;
            canvasElement.height = imageElement.naturalHeight;
            inputImage = new OffscreenCanvas(imageElement.naturalWidth, imageElement.naturalHeight);
            inputCtx = inputImage.getContext('2d');
            await createLandmarkers();
            inputCtx.drawImage(sourceElement, 0, 0, imageElement.naturalWidth, imageElement.naturalHeight);
            try {
                const poseResults = await poseLandmarker.detect(inputImage);
                const faceResults = await faceLandmarker.detect(inputImage);
                const handResults = await handLandmarker.detect(inputImage);
                await drawResults(poseResults, faceResults, handResults);
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
        runningMode = 'VIDEO';
        const url = URL.createObjectURL(file);
        videoElement.src = url;
        videoElement.onloadedmetadata = async () => {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            inputImage = new OffscreenCanvas(videoElement.videoWidth, videoElement.videoHeight);
            inputCtx = inputImage.getContext('2d');
            await createLandmarkers();
            videoElement.play();
            requestAnimationFrame(processFrame);
        };
        videoElement.onended = () => {
            stopProcessing();
            URL.revokeObjectURL(url);
        };
    } else {
        statusElement.textContent = 'Unsupported file type. Use JPEG, PNG, MP4, or WebM.';
    }
}

function stopProcessing() {
    active = false;
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    if (sourceElement.srcObject) {
        sourceElement.srcObject.getTracks().forEach(track => track.stop());
        sourceElement.srcObject = null;
    }
    if (sourceType === 'video') {
        sourceElement.pause();
        sourceElement.currentTime = 0;
    }
    videoElement.style.display = 'none';
    imageElement.style.display = 'none';
    statusElement.textContent = 'Processing stopped.';
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
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
multiTrack.addEventListener('change', () => {
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
    if (e.key === 'm') showMeshes.checked = !showMeshes.checked;
});
processUpload.addEventListener('click', processUploadedFile);

statusElement.textContent = 'Ready. Select model and start tracking or upload a file.';