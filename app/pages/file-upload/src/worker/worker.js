import CanvasRenderer from "./canvasRenderer.js";
import MP4Demuxer from "./mp4Demuxer.js";
import VideoProcessor from "./videoProcessor.js";

const qvgaConstraints = {
  width: 320,
  height: 240,
};

const vgaConstraints = {
  width: 640,
  height: 480,
};

const hdConstraints = {
  width: 1280,
  height: 720,
};

const encoderConfig = {
  // webM
  hardwareAcceleration: "prefer-software",
  code: "vp09.00.10.08",
  bitrate: 10e6, // 10Mbps
  pt: 4,
  // MP4
  // hardwareAcceleration: "prefer-hardware",
  // code: "avc1.42002A",
  // bitrate: 10e6,
  // pt: 1,
  // avc: { format: 'annexb' },
};

const mp4Demuxer = new MP4Demuxer();
const videoProcessor = new VideoProcessor({ mp4Demuxer });

const getEncoderConfig = (type) => {
  switch (type) {
    case "QVGA":
      return {
        ...encoderConfig,
        ...qvgaConstraints,
      };
    case "VGA":
      return {
        ...encoderConfig,
        ...vgaConstraints,
      };
    case "HD":
      return {
        ...encoderConfig,
        ...hdConstraints,
      };
    default:
      return {
        ...encoderConfig,
        ...qvgaConstraints,
      };
  }
};

onmessage = async ({ data }) => {
  const renderFrame = CanvasRenderer.getRenderer(data.canvas);

  await videoProcessor.start({
    file: data.file,
    renderFrame,
    encoderConfig: getEncoderConfig(data.type),
    sendMessage: (message) => {
      self.postMessage(message);
    },
  });

  self.postMessage({
    status: "done",
  });
};
