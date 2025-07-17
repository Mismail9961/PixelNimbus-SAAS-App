require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const ImageKit = require('imagekit');

const prisma = new PrismaClient();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

async function main() {
  const videos = await prisma.video.findMany();

  for (const video of videos) {
    try {
      // Get file details using the incorrect fileId stored as publicId
      const fileDetails = await imagekit.getFileDetails(video.publicId);

      // Update the publicId to the correct filePath
      await prisma.video.update({
        where: { id: video.id },
        data: {
          publicId: fileDetails.filePath,
        },
      });

      console.log(`✅ Fixed publicId for video ${video.id}`);
    } catch (err) {
      console.error(`❌ Failed for video ${video.id}:`, err.message);
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  prisma.$disconnect();
  process.exit(1);
});
