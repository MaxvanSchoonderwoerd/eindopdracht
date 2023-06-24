let model;
let videoWidth, videoHeight;
let handhandCtx, videoCanvas;
const VIDEO_WIDTH = 720;
const VIDEO_HEIGHT = 405;
const knnClassifier = ml5.KNNClassifier();

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

let fingerLookupIndices = {
  thumb: [0, 1, 2, 3, 4],
  indexFinger: [0, 5, 6, 7, 8],
  middleFinger: [0, 9, 10, 11, 12],
  ringFinger: [0, 13, 14, 15, 16],
  pinky: [0, 17, 18, 19, 20],
};

let detectedPose = false;
let resultsArray = [];

const btnTrainUp = document.getElementById("btnTrainUp");
const btnTrainDown = document.getElementById("btnTrainDown");
const btnTrainLeft = document.getElementById("btnTrainLeft");
const btnTrainRight = document.getElementById("btnTrainRight");
const btnClassify = document.getElementById("btnClassify");

btnTrainUp.addEventListener("click", () => {
  learn("Up");
  console.log("learn up");
});
btnTrainDown.addEventListener("click", () => {
  learn("Down");
  console.log("learn down");
});
btnTrainLeft.addEventListener("click", () => {
  learn("Left");
  console.log("learn left");
});
btnTrainRight.addEventListener("click", () => {
  learn("Right");
  console.log("learn right");
});
btnClassify.addEventListener("click", () => {
  classify();
  console.log("start classify");
});
btnSave.addEventListener("click", () => {
  knnClassifier.save();
});

function learn(label) {
  knnClassifier.addExample(resultsArray, label);
}

function classify() {
  setInterval(() => {
    console.log(detectedPose);
    if (detectedPose) {
      knnClassifier.classify(resultsArray, (err, result) => {
        checkDir(result.label);
      });
    }
  });
}

function checkDir(dir) {
  switch (true) {
    case dir == "Up":
      console.log("up");
      turnUp();
      break;
    case dir == "Down":
      console.log("Down");
      turnDown();
      break;
    case dir == "Left":
      console.log("Left");
      turnLeft();
      break;
    case dir == "Right":
      console.log("Right");
      turnRight();
      break;
    default:
      console.log("no pose");
      break;
  }
}

async function main() {
  model = await handpose.load();
  const video = await setupCamera();
  video.play();
  startLandmarkDetection(video);
  knnClassifier.load("../model/myKNN.json", () => console.log("model loaded"));
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
  const predictions = await model.estimateHands(video); // ,true voor flip
  if (predictions.length > 0) {
    const result = predictions[0].landmarks;
    resultsArray = result.flat();
    drawHand(handCtx, predictions[0].landmarks, predictions[0].annotations);
    detectedPose = true;
  } else {
    detectedPose = false;
  }
  requestAnimationFrame(predictLandmarks);
}

//
// teken hand en vingers met de x,y coordinaten. de z waarde tekenen we niet.
//
function drawHand(handCtx, keypoints, annotations) {
  // toon alle x,y,z punten van de hele hand in het log venster
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
