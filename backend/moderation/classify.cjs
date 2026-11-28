const fs = require("node:fs");
const tf = require("@tensorflow/tfjs");
const nsfwjs = require("nsfwjs");

// Keep stdout reserved for the result consumed by Flask.
console.info = console.error;

async function classify() {
  const pixels = fs.readFileSync(0);
  const size = 224;
  if (pixels.length !== size * size * 3) throw new Error("Invalid RGB input");
  await tf.setBackend("cpu");
  const model = await nsfwjs.load("MobileNetV2");
  const image = tf.tensor3d(new Uint8Array(pixels), [size, size, 3], "int32");
  try {
    process.stdout.write(JSON.stringify(await model.classify(image, 5)));
  } finally {
    image.dispose();
  }
}

classify().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
