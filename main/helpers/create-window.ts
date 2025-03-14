import { screen, BrowserWindow, BrowserWindowConstructorOptions, Rectangle, nativeImage, ipcMain } from "electron";
import Store from "electron-store";
import path from 'path';

export const createWindow = (
  windowName: string,
  options: BrowserWindowConstructorOptions,
): BrowserWindow => {
  const key = "window-state";
  const name = `window-state-${windowName}`;
  const store = new Store<Rectangle>({ name });
  const defaultSize = {
    width: options.width,
    height: options.height,
  };
  let state = {};

  const restore = () => store.get(key, defaultSize);

  const getCurrentPosition = () => {
    const position = win.getPosition();
    const size = win.getSize();
    return {
      x: position[0],
      y: position[1],
      width: size[0],
      height: size[1],
    };
  };

  const windowWithinBounds = (windowState, bounds) => {
    return (
      windowState.x >= bounds.x &&
      windowState.y >= bounds.y &&
      windowState.x + windowState.width <= bounds.x + bounds.width &&
      windowState.y + windowState.height <= bounds.y + bounds.height
    );
  };

  const resetToDefaults = () => {
    const bounds = screen.getPrimaryDisplay().bounds;
    return Object.assign({}, defaultSize, {
      x: (bounds.width - defaultSize.width) / 2,
      y: (bounds.height - defaultSize.height) / 2,
    });
  };

  const ensureVisibleOnSomeDisplay = (windowState) => {
    const visible = screen.getAllDisplays().some((display) => {
      return windowWithinBounds(windowState, display.bounds);
    });
    if (!visible) {
      // Window is partially or fully not visible now.
      // Reset it to safe defaults.
      return resetToDefaults();
    }
    return windowState;
  };

  const saveState = () => {
    if (!win.isMinimized() && !win.isMaximized()) {
      Object.assign(state, getCurrentPosition());
    }
    store.set(key, state);
  };

  state = ensureVisibleOnSomeDisplay(restore());

  const win = new BrowserWindow({
    ...state,
    ...options,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      ...options.webPreferences,
    },
  });

  const updateWindow = (isPlaying, artistName, songName) => {
    if (artistName && songName) {
      win.setTitle(`${artistName} - ${songName}`);
    } else {
      win.setTitle('Wora');
    }

    win.setThumbarButtons([
      {
        tooltip: 'Previous',
        icon: nativeImage.createFromPath('resources/start.png'),
        click: () => {
          win.webContents.send('media-control', 'previous');
        }
      },
      {
        tooltip: isPlaying ? 'Pause' : 'Play',
        icon: nativeImage.createFromPath(isPlaying ? 'resources/pause.png' : 'resources/play.png'),
        click: () => {
          win.webContents.send('media-control', 'play-pause');
        }
      },
      {
        tooltip: 'Next',
        icon: nativeImage.createFromPath('resources/end.png'),
        click: () => {
          win.webContents.send('media-control', 'next');
        }
      }
    ]);
  };

  updateWindow(false, null, null);

  ipcMain.on('update-window', (event, [isPlaying, artistName, songName]) => {
    updateWindow(isPlaying, artistName, songName);
  });


  win.on("close", saveState);

  return win;
};
