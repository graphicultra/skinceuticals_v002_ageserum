import { bootstrapCameraKit, createMediaStreamSource } from "@snap/camera-kit";


let recordToggleButton, videoContainer, downloadButton, shareButton, closeBtn, liveRenderTarget, mediaRecorderOptions, mediaRecorder, downloadUrl;
let recording_ui;
let isRecording = false;
let pressStartTime = 0;
let holdTimeoutId = null;
let recordingStarted = false;
let mediaType = 'video'; // 'photo' or 'video'
const HOLD_THRESHOLD = 300; // milliseconds
const MAX_RECORD_MS = 10000; // max recording duration for progress ring
let progressAnimationId = null;
let mediaStream = null;

function showError(message) {
  console.error(message);
  let el = document.getElementById('error_message');
  if (!el) {
    el = document.createElement('div');
    el.id = 'error_message';
    el.style.position = 'fixed';
    el.style.left = '0';
    el.style.top = '0';
    el.style.right = '0';
    el.style.background = 'rgba(124, 115, 115, 0.9)';
    el.style.color = 'white';
    el.style.padding = '12px';
    el.style.zIndex = '9999';
    el.style.fontFamily = 'sans-serif';
    document.body.appendChild(el);
  }
  el.textContent = message;
}

function updateProgressRing() {
  if (!isRecording) return;
  
  const elapsed = Date.now() - pressStartTime - HOLD_THRESHOLD;
  const progress = Math.min(elapsed / MAX_RECORD_MS, 1);
  
  recordToggleButton.style.setProperty('--progress', progress);
  
  if (progress < 1) {
    progressAnimationId = requestAnimationFrame(updateProgressRing);
  }
}

function startProgressRing() {
  progressAnimationId = requestAnimationFrame(updateProgressRing);
}

function stopProgressRing() {
  if (progressAnimationId) {
    cancelAnimationFrame(progressAnimationId);
    progressAnimationId = null;
  }
  recordToggleButton.style.setProperty('--progress', 0);
}

async function main() {
  try {

    init();

    const apiToken = "eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzY3NzMwMjc2LCJzdWIiOiJiNjI5YmRkNC02YjE3LTQ4NTYtOWExMi03ODg4ZTZmYzdlNmV-UFJPRFVDVElPTn40YjQxNGM3NC04NTQyLTQ0MDctYmE3NC04ZTM2ZjliYTMyYzgifQ.v_bIAQNYiPi1PKPD3PG9U15-7PSm-Ja66kMGPaHvM1I";
    const cameraKit = await bootstrapCameraKit({ apiToken });

    liveRenderTarget = document.getElementById("canvas");
    const session = await cameraKit.createSession({ liveRenderTarget: liveRenderTarget });
    liveRenderTarget.replaceWith(session.output.live);

    session.output.live.style.transform = "scaleX(-1)";
    session.output.live.style.transformOrigin = "center";

    session.events.addEventListener('error', (event) => {
      if (event.detail.error.name === 'LensExecutionError') {
        console.log('The current Lens encountered an error and was removed.', event.detail.error);
      }
    });

    //it will use the back camera. If you want to use the front camera (selfie mode), just change the facingMode to 'user' and the cameraType to 'front'

    mediaStream = await navigator.mediaDevices.getUserMedia({ video: {facingMode:'user'}, audio: true });
    const source = createMediaStreamSource(mediaStream, { cameraType: 'front' });
    
    await session.setSource(source);

    const lens = await cameraKit.lensRepository.loadLens('8674c478-95c7-440d-81d9-5b870a3fcbbe','0ab3279f-d6d1-4f85-b379-8f0e1a6a7173');
    await session.applyLens(lens);

    session.source.setRenderSize(
  Math.round(window.innerWidth * dpr),
  Math.round(window.innerHeight * dpr)
);
    await session.play();
    console.log("Lens rendering has started!");

    recording_ui.classList.add('show')
  } catch (err) {
    showError(err.message || String(err));
  }
}

async function init() {

  videoContainer = document.getElementById("preview")
  recordToggleButton = document.getElementById("record_toggle")
  downloadButton = document.getElementById("download")
  shareButton = document.getElementById("share_btn")
  closeBtn = document.getElementById("close_btn")
  recording_ui = document.querySelector("#recording_ui")
  

  mediaRecorderOptions = { audio: true, video: true, videoBitsPerSecond: 2500000 };

  const capturePhoto = () => {
    try {
      // Create a canvas to capture the frame
      const canvas = document.createElement('canvas');
      canvas.width = liveRenderTarget.videoWidth || window.innerWidth;
      canvas.height = liveRenderTarget.videoHeight || window.innerHeight;
      
      const ctx = canvas.getContext('2d');
      // Mirror the image like the live feed
      ctx.scale(-1, 1);
      ctx.drawImage(liveRenderTarget, -canvas.width, 0);
      
      canvas.toBlob((blob) => {
        globalThis.blob = blob;
        downloadUrl = window.URL.createObjectURL(blob);
        downloadButton.disabled = false;
        mediaType = 'photo';

        if (document.querySelector('#preview img')) {
          document.querySelector('#preview img').remove();
        }
        if (document.querySelector('#preview video')) {
          document.querySelector('#preview video').remove();
        }

        const img = document.createElement("img");
        img.setAttribute('crossorigin', 'anonymous');
        img.src = URL.createObjectURL(blob);
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        videoContainer.appendChild(img);
        videoContainer.classList.add('show');
      }, 'image/jpeg', 0.9);
    } catch (err) {
      console.error('Photo capture failed:', err);
    }
  };

  const startRecording = () => {
    if (isRecording) return
    pressStartTime = Date.now();
    isRecording = true
    recordToggleButton.classList.add('held')
    downloadButton.disabled = true
    recordingStarted = false;

    // Delay starting the actual recording until we know it's a hold
    holdTimeoutId = setTimeout(() => {
      recordingStarted = true;
      startProgressRing();
      
      // Create an offscreen canvas to capture flipped video
      const recordingCanvas = document.createElement('canvas');
      recordingCanvas.width = window.innerWidth;
      recordingCanvas.height = window.innerHeight;
      const ctx = recordingCanvas.getContext('2d');
      
      let recordingAnimationId = null;
      
      const captureFrame = () => {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(liveRenderTarget, -recordingCanvas.width, 0);
        ctx.restore();
        recordingAnimationId = requestAnimationFrame(captureFrame);
      };
      
      // Draw first frame before starting recorder
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(liveRenderTarget, -recordingCanvas.width, 0);
      ctx.restore();
      
      recordingAnimationId = requestAnimationFrame(captureFrame);
      
      const canvasStream = recordingCanvas.captureStream(30);
      
      // Combine canvas video stream with audio from mediaStream
      const combinedStream = new MediaStream();
      canvasStream.getVideoTracks().forEach(track => {
        combinedStream.addTrack(track);
      });
      mediaStream.getAudioTracks().forEach(track => {
        combinedStream.addTrack(track);
      });

      mediaRecorder = new MediaRecorder(combinedStream, mediaRecorderOptions)
      

      var chunks = [];
      mediaRecorder.ondataavailable = function(e) {
        chunks.push(e.data);
      };

      mediaRecorder.start();

      
      mediaRecorder.addEventListener("dataavailable", event => {
        if (!event.data.size) {
          console.warn("No recorded data available")
          return
        }

        const blob = new Blob([event.data])

        globalThis.blob = blob;

        downloadUrl = window.URL.createObjectURL(blob, {type: 'video/mp4'})
        downloadButton.disabled = false
        mediaType = 'video';

        if (document.querySelector('#preview video')) {
          document.querySelector('#preview video').remove();
        }
        if (document.querySelector('#preview img')) {
          document.querySelector('#preview img').remove();
        }

        const video = document.createElement("video");
        video.setAttribute('autoplay','')
        video.setAttribute('muted','')
        video.setAttribute('loop','')
        video.setAttribute('playsinline','')
        video.setAttribute('crossorigin','anonymous')
        const videoSource = document.createElement('source');
        videoSource.type = 'video/mp4';
        videoSource.src = URL.createObjectURL(blob);
        video.append(videoSource);
        video.play();
        videoContainer.appendChild(video);

        videoContainer.classList.add('show');
      })
      
      mediaRecorder.addEventListener("stop", () => {
        if (recordingAnimationId) {
          cancelAnimationFrame(recordingAnimationId);
        }
      })
    }, HOLD_THRESHOLD);
  }

  const stopRecording = () => {
    if (!isRecording) return
    isRecording = false
    recordToggleButton.classList.remove('held')
    stopProgressRing();
    
    const pressDuration = Date.now() - pressStartTime;
    
    if (pressDuration < HOLD_THRESHOLD) {
      // Quick tap - clear the timeout so recording never starts
      clearTimeout(holdTimeoutId);
      capturePhoto();
    } else if (recordingStarted && mediaRecorder) {
      // Held long enough and recording started - stop video recording
      mediaRecorder.stop();
    }
  }

  recordToggleButton.addEventListener("mousedown", startRecording)
  recordToggleButton.addEventListener("mouseup", stopRecording)
  recordToggleButton.addEventListener("mouseleave", stopRecording)
  recordToggleButton.addEventListener("touchstart", startRecording)
  recordToggleButton.addEventListener("touchend", stopRecording)




    downloadButton.addEventListener("click", () => {

      const link = document.createElement("a")

      link.setAttribute("style", "display: none")
      link.href = downloadUrl
      link.download = mediaType === 'photo' ? "webar_photo.png" : "webar_rec.mp4"
      link.click()
      link.remove()
    })

    shareButton.addEventListener("click", async () =>  {
      if (navigator.share) {

        let filesArray = []; 
        let shareData = null;
        const mimeType = mediaType === 'photo' ? 'image/png' : 'video/mp4';
        const fileName = mediaType === 'photo' ? 'webar_photo.png' : 'webar_rec.mp4';
        const file = new File([globalThis.blob], fileName, {type: mimeType});

        filesArray = [file];
        shareData = { files: filesArray };

        if (navigator.canShare && navigator.canShare(shareData)) {
          // Adding title afterwards as navigator.canShare just takes files as input
          shareData.title = 'Lens Studio CameraKit'
          shareData.url = 'https://www.skinceuticals.com/'
          navigator.share(shareData)
          .then(() => console.log('Share was successful.'))
          .catch((error) => console.log('Sharing failed', error)); // Can see if aborted here! - "Abort due to cancellation of share."
      } else {
          console.log("Your system doesn't support sharing files");
      }

    }
        
    })

    closeBtn.addEventListener("click", () => {
      videoContainer.classList.remove('show');
    });
  
}


document.addEventListener("DOMContentLoaded", main);