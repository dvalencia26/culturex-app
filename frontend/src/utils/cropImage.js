/**
 * Crop an image to the specified pixel area and return a JPEG Blob.
 * Gets the image from a URL (object or data URL), so it works with react-easy-crop's output.
 * PixelCrop is the area in the original image's pixel coordinates, which allows for high-quality cropping regardless of zoom level.
 * Returns a Promise that resolves to a Blob of the cropped image.
 */
export async function getCroppedImageBlob(imageSrc, pixelCrop, outputSize = 480) {
  const response = await fetch(imageSrc);
  const blob = await response.blob();
  const imageBitmap = await createImageBitmap(blob);

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    imageBitmap,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  imageBitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('Failed to generate cropped image'));
      },
      'image/jpeg',
      0.9,
    );
  });
}
