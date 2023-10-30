import Clock from "./deps/clock.js";
import View from "./view.js";

let took = "";
const view = new View();
const clock = new Clock();
const worker = new Worker("./src/worker/worker.js", {
  type: "module",
});

worker.onmessage = ({ data }) => {
  if (data.status !== "done") return;
  clock.stop();
  view.updateElapsedTime(`Process took ${took.replace("ago", "")}`);
};

worker.onerror = (error) => {
  console.error("error on worker", error);
};

view.configureOnFileChange((file) => {
  const canvas = view.getCanvas();

  worker.postMessage(
    {
      file,
      canvas,
    },
    [canvas]
  );

  clock.start((time) => {
    took = time;
    view.updateElapsedTime(`Process started ${time}`);
  });
});

async function fakeFetch() {
  const filePath = "../../samples/sample01.mp4";
  const response = await fetch(filePath);
  const file = new File([await response.blob()], filePath, {
    type: "video/mp4",
    lastModified: Date.now(),
  });
  const event = new Event("change");
  Reflect.defineProperty(event, "target", {
    value: { files: [file] },
  });

  document.getElementById("fileUpload").dispatchEvent(event);
}

fakeFetch();
