require('dotenv').config();
const ImageKit = require("imagekit");

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

imagekit.listFiles({}, function (error, result) {
  if (error) {
    console.error("❌ AUTH ERROR:", error.message);
  } else {
    console.log("✅ AUTH SUCCESS:", result);
  }
});
