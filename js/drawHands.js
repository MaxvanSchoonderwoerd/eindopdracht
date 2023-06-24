let model;
let videoWidth, videoHeight;
let handhandCtx, videoCanvas;
const VIDEO_WIDTH = 720;
const VIDEO_HEIGHT = 405;

//
// start de applicatie
//
async function main() {
  model = await handpose.load();
  const video = await setupCamera();
  video.play();
  startLandmarkDetection(video);
}

//
// start de webcam
//
async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Webcam not available");
  }

  const video = document.getElementById("video");
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: VIDEO_WIDTH,
      height: VIDEO_HEIGHT,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

//
// predict de vinger posities in de video stream
//
async function startLandmarkDetection(video) {
  videoWidth = video.videoWidth;
  videoHeight = video.videoHeight;

  videoCanvas = document.getElementById("output");

  videoCanvas.width = videoWidth;
  videoCanvas.height = videoHeight;

  handCtx = videoCanvas.getContext("2d");

  video.width = videoWidth;
  video.height = videoHeight;

  handCtx.clearRect(0, 0, videoWidth, videoHeight);
  handCtx.strokeStyle = "red";
  handCtx.fillStyle = "red";

  handCtx.translate(videoCanvas.width, 0);
  handCtx.scale(-1, 1); // video omdraaien omdat webcam in spiegelbeeld is

  predictLandmarks();
}

//
// predict de locatie van de vingers met het model
//
async function predictLandmarks() {
  handCtx.drawImage(video, 0, 0, videoWidth, videoHeight, 0, 0, videoCanvas.width, videoCanvas.height);
  // prediction!
  const predictions = await model.estimateHands(video); // ,true voor flip
  if (predictions.length > 0) {
    drawHand(handCtx, predictions[0].landmarks, predictions[0].annotations);
    checkHandPosition(predictions[0].landmarks[0][0], predictions[0].landmarks[0][1]);
  }
  // 60 keer per seconde is veel, gebruik setTimeout om minder vaak te predicten
  requestAnimationFrame(predictLandmarks);
  // setTimeout(()=>predictLandmarks(), 1000)
}

function checkHandPosition(x, y) {
  const screenWidth = videoWidth; // Assuming the video width represents the screen width
  const screenHeight = videoHeight; // Assuming the video height represents the screen height

  const screenCenterX = screenWidth / 2;
  const screenCenterY = screenHeight / 2;

  const positionThresholdX = 250; // Adjust this threshold as needed
  const positionThresholdY = 100;

  switch (true) {
    case x < screenCenterX - positionThresholdX:
      console.log("right");
      turnRight();
      break;
    case x > screenCenterX + positionThresholdX:
      console.log("left");
      turnLeft();
      break;
    default:
      // Hand position is within the threshold near the horizontal center
      console.log("x center");
      break;
  }

  switch (true) {
    case y < screenCenterY - positionThresholdY:
      console.log("Up");
      turnUp();
      break;
    case y > screenCenterY + positionThresholdY:
      console.log("Down");
      turnDown();
      break;
    default:
      // Hand position is within the threshold near the vertical center
      console.log("y center");
      break;
  }
}

//
// teken hand en vingers met de x,y coordinaten. de z waarde tekenen we niet.
//
function drawHand(handCtx, keypoints, annotations) {
  // toon alle x,y,z punten van de hele hand in het log venster

  console.log(keypoints[0][0]);
  // punten op alle kootjes kan je rechtstreeks uit keypoints halen
  for (let i = 0; i < keypoints.length; i++) {
    const y = keypoints[i][0];
    const x = keypoints[i][1];
    drawPoint(handCtx, x - 2, y - 2, 3);
  }

  // palmbase als laatste punt toevoegen aan elke vinger
  let palmBase = annotations.palmBase[0];
  for (let key in annotations) {
    const finger = annotations[key];
    finger.unshift(palmBase);
    drawPath(handCtx, finger, false);
  }
}

//
// teken een punt
//
function drawPoint(handCtx, y, x, r) {
  handCtx.beginPath();
  handCtx.arc(x, y, r, 0, 2 * Math.PI);
  handCtx.fill();
}
//
// teken een lijn
//
function drawPath(handCtx, points, closePath) {
  const region = new Path2D();
  region.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    region.lineTo(point[0], point[1]);
  }

  if (closePath) {
    region.closePath();
  }
  handCtx.stroke(region);
}

//
// start
//
main();
