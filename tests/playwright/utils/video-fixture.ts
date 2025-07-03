import { test as base, Browser, Page, TestInfo } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { Logger, Logging } from '@decaf-ts/logging';


/**
 * @description Type definition for video fixtures used in Playwright tests
 * @summary Defines a custom type that extends Playwright's base test with a custom page property
 * @type {Object}
 * @property {any} page - The custom page property, typed as 'any' due to conditional type complexity
 * @memberOf module:playwright-utils
 */
type VideoFixtureType = {
  page: typeof base extends { new(): { page: Page } } ? any : any;
};

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
 * @template VideoFixtureType - Type extending Playwright's base test with custom page property
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
export const testWithVideo = base.extend<VideoFixtureType>({
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
    const videoPath = await page.video()?.path();
    if (videoPath)
      await convertToMp4(videoPath, baseName);

    await context.close().finally(() => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error: any) {
        log.for(this).error(`Error on remove video directory: ${tempDir}. ${error?.message}`);
      }
    });

  }
});


/**
 * @description Converts a WebM video file to MP4 format
 * @summary Uses ffmpeg to convert a WebM video file to MP4 format, applying a slowdown filter
 * and specific encoding options. Creates the output directory if it doesn't exist.
 * @param {string} webmPath - The path to the input WebM video file
 * @param {string} name - The base name for the output MP4 file
 * @return {Promise<string>} A promise that resolves with the path of the converted MP4 file
 * @function convertToMp4
 * @mermaid
 * sequenceDiagram
 *   participant Caller
 *   participant Function as convertToMp4
 *   participant FileSystem as File System
 *   participant FFmpeg
 *   Caller->>Function: Call with webmPath and name
 *   Function->>FileSystem: Create output directory
 *   Function->>FFmpeg: Set ffmpeg path
 *   Function->>FFmpeg: Configure conversion options
 *   FFmpeg->>FileSystem: Save converted MP4 file
 *   FFmpeg-->>Function: Conversion complete
 *   Function-->>Caller: Return MP4 file path
 * @memberOf module:playwright-utils
 */
async function convertToMp4(webmPath: string, name: string): Promise<string> {
  const outputDir = path.join(videosDir, 'mp4');
  fs.mkdirSync(outputDir, { recursive: true });

  ffmpeg.setFfmpegPath(ffmpegPath as string);

  const finalPath = path.join(outputDir, `${name}.mp4`);

  return new Promise((resolve, reject) => {
    ffmpeg(webmPath)
      .videoFilters('setpts=4.0*PTS') // slowing down the video
      .videoCodec('libx264')
      .outputOptions(['-crf', '23', '-preset', 'fast'])
      .on('end', () => resolve(finalPath))
      .on('error', err => reject(`Erro ao converter ${webmPath} para MP4: ${err.message}`))
      .save(finalPath);
  });
}
