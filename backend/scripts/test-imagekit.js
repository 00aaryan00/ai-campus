require("dotenv").config();
const imagekit = require("../src/config/imagekit");

async function testUpload() {
  try {
    console.log("Keys:");
    console.log("Public:", process.env.IMAGEKIT_PUBLIC_KEY);
    console.log("Private:", process.env.IMAGEKIT_PRIVATE_KEY);
    console.log("Endpoint:", process.env.IMAGEKIT_URL_ENDPOINT);

    const base64Img = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    
    const response = await imagekit.upload({
      file: base64Img,
      fileName: "test-image.png",
      folder: "/test",
    });
    console.log("Upload Success:", response.url);
  } catch (error) {
    console.error("Upload Error:", error);
  }
}

testUpload();
