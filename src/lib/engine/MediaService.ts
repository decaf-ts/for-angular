import { getWindow } from '../helpers/index';

export class MediaService {
  private static _window?: Window;

  private constructor() {}

  protected static get window() {
    if (!MediaService._window) MediaService._window = getWindow();
    return MediaService._window;
  }

  static isDarkMode() {
    const colorSchemePreference = this.window.matchMedia(
      '(prefers-color-scheme: dark)'
    );
    return colorSchemePreference.matches;
  }
}
