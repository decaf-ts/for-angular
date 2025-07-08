import { test, Browser, Page, TestInfo } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import ffmpegPath from 'ffmpeg-static';
import { Logger, Logging } from '@decaf-ts/logging';
import { spawn } from 'child_process';

/**
 * @description Constant defining the directory for storing video files
 * @summary Specifies the path where video files (both WebM and MP4) will be stored
 * @type {string}
 * @constant
 * @memberOf module:playwright-utils
 */
export const videosDir: string = 'tests/playwright/videos';

/**
 * @description Logger instance for the Angular module
 * @summary Creates a logger instance specific to the "for-angular" module using the Logging utility
 * @type {Logger}
 * @constant
 * @memberOf module:playwright-utils
 */
const log: Logger = Logging.for("for-angular");

/**
 * @description Custom test fixture for recording and converting video of Playwright tests
 * @summary Extends Playwright's base test with video recording capabilities. It creates a new browser context
 * that records video, runs the test, converts the video to MP4 format, and cleans up temporary files.
 * @param {Object} options - The options object containing browser and use function
 * @param {Browser} options.browser - The Playwright browser instance
 * @param {Function} use - The function to use the created page
 * @param {TestInfo} testInfo - Information about the current test
 * @return {Promise<void>}
 * @function testWithVideo
 * @mermaid
 * sequenceDiagram
 *   participant Test as Test Runner
 *   participant Context as Browser Context
 *   participant Page as Page
 *   participant Video as Video Recorder
 *   participant Converter as MP4 Converter
 *   participant Cleanup as Cleanup Process
 *   Test->>Context: Create new context with video recording
 *   Context->>Page: Create new page
 *   Test->>Page: Run test
 *   Page->>Video: Record video
 *   Test->>Page: Close page
 *   Test->>Video: Get video path
 *   Test->>Converter: Convert video to MP4
 *   Test->>Context: Close context
 *   Test->>Cleanup: Remove temporary files
 * @memberOf module:playwright-utils
 */
export const testWithVideo = test.extend<{page: Page}>({
  page: async (
    { browser }: { browser: Browser },
    use: any,
    testInfo: TestInfo
  ): Promise<void> => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = `${testInfo.title}-${timestamp}`.replace(/ /g, '_');
    const tempDir = path.resolve(videosDir, 'webm');
    const context = await browser.newContext({ recordVideo: { dir: tempDir } });
    const page = await context.newPage();
    await use(page);
    await page.close();
    await context.close();

    try {
      const videoPath = await page.video()?.path();
      if (videoPath) {
        await convertToMp4(videoPath, baseName);
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error: any) {
      log.for('testWithVideo').error(`Error on remove video directory: ${tempDir}. ${error?.message}`);
    }
  }
});


/**
 * @description Converts a WebM video file to MP4 format
 * @summary Takes a WebM video file, converts it to MP4 format using FFmpeg, and saves it in the output directory.
 * The function also applies a slowdown effect to the video.
 * @param {string} webmPath - The path to the input WebM video file
 * @param {string} name - The base name for the output MP4 file (without extension)
 * @returns {Promise<string>} A promise that resolves with the path of the converted MP4 file
 * @mermaid
 * sequenceDiagram
 *   participant C as Caller
 *   participant F as convertToMp4
 *   participant FS as FileSystem
 *   participant FF as FFmpeg
 *
 *   C->>F: Call convertToMp4(webmPath, name)
 *   F->>FS: Create output directory
 *   F->>F: Set up FFmpeg arguments
 *   F->>FF: Spawn FFmpeg process
 *   FF-->>F: Stream conversion progress
 *   alt Conversion successful
 *     FF->>F: Close with code 0
 *     F->>C: Resolve with MP4 path
 *   else Conversion failed
 *     FF->>F: Close with non-zero code
 *     F->>C: Reject with error
 *   end
 * @memberOf module:playwright-utils
 */
async function convertToMp4(webmPath: string, name: string): Promise<string> {
  const outputDir = path.join(videosDir, 'mp4');
  fs.mkdirSync(outputDir, { recursive: true });

  const finalPath = path.join(outputDir, `${name}.mp4`);

  return new Promise((resolve, reject) => {
    const args = [
      '-loglevel', 'error',
      '-i', webmPath,
      '-vf', 'setpts=4.0*PTS',
      '-c:v', 'libx264',
      '-crf', '23',
      '-preset', 'fast', // <-- faltava isso
      finalPath
    ];
    const ffmpeg = spawn(ffmpegPath as string, args);
    ffmpeg.stderr.on('data', data => log.for('convertToMp4').error(`FFmpeg log: ${data}`));
    ffmpeg.on('close', code => {
      if (code === 0)
        return resolve(finalPath);
      return reject(`Erro on convert ${webmPath} to MP4. Exit code: ${code}`);
    });
    ffmpeg.on('error', err => reject(`Failed to start FFmpeg.: ${err.message}`));
  });
}
