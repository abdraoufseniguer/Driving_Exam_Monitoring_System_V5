const video = document.getElementById('video');
const notifications = document.getElementById('notifications');
let labeledFaceDescriptors = []; // Ensure this is not empty initially
let faceMatcher; // Declare the faceMatcher variable
let nextId = 1;
let persons = new Map();

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function loadModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
}

async function detectFaces() {
    const options = new faceapi.TinyFaceDetectorOptions();
    setInterval(async() => {
        const detections = await faceapi.detectAllFaces(video, options).withFaceLandmarks().withFaceDescriptors();
        if (!faceMatcher && detections.length > 0) {
            // Initialize faceMatcher once we have at least one descriptor
            faceMatcher = new faceapi.FaceMatcher(detections.map(d => new faceapi.LabeledFaceDescriptors(
                'initial', [d.descriptor]
            )), 0.6);
        }
        if (faceMatcher) {
            const results = detections.map(d => {
                const bestMatch = faceMatcher.findBestMatch(d.descriptor);
                return {
                    detection: d.detection,
                    label: bestMatch.label,
                    distance: bestMatch.distance
                };
            });

            updateFaceDescriptors(results);
        }
    }, 100);
}

function updateFaceDescriptors(results) {
    const currentDescriptors = new Map();
    results.forEach(result => {
        if (result.distance < 0.6) {
            currentDescriptors.set(result.label, result.detection);
        }
    });

    currentDescriptors.forEach((detection, label) => {
        if (!persons.has(label)) {
            const id = nextId++;
            persons.set(label, id);
            notify('New Person Entered', id, detection.box);
        }
    });

    persons.forEach((id, label) => {
        if (!currentDescriptors.has(label)) {
            notify('Person Left', id);
            persons.delete(label);
        }
    });
}

function notify(action, id, box) {
    const notification = document.createElement('div');
    notification.className = 'notification';

    const timestamp = new Date().toLocaleTimeString();
    const img = document.createElement('img');

    if (box) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = box.width;
        canvas.height = box.height;
        context.drawImage(video, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
        img.src = canvas.toDataURL('image/jpeg');
    }

    notification.innerHTML = `
        <div>
            <strong>${action}</strong><br>
            ID: ${id}<br>
            Time: ${timestamp}
        </div>
    `;
    if (img.src) notification.appendChild(img);

    notifications.appendChild(notification);
    notifications.scrollTop = notifications.scrollHeight;
}

async function main() {
    await setupCamera();
    await loadModels();
    detectFaces();
}

main();