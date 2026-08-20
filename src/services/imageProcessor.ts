/**
 * imageProcessor
 *
 * Processes an image (resize, compress, convert) and returns the URI of the
 * processed result.  The heavy lifting (Puppeteer + sharp + pdf-poppler) runs
 * in a cloud function because it is too heavy for the device.
 */

/** Process an image at `uri` and return the processed image URI. */
export async function processImage(uri: string): Promise<string> {
  // TODO(phase 3): upload to cloud function and return processed URI.
  void uri;
  return uri;
}
