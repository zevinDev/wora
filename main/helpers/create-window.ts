import {
  screen,
  BrowserWindow,
  BrowserWindowConstructorOptions,
  Rectangle,
  ipcMain,
  nativeImage,
} from "electron";
import Store from "electron-store";
import path from "path";
import { app } from "electron";

// Helper function to create media control icons using Node.js Buffer
const createMediaIcon = (
  type: "prev" | "play" | "pause" | "next",
): Electron.NativeImage => {
  // Create a simple binary representation of icons
  // Each icon is a 16x16 monochrome bitmap with white content on transparent background
  const width = 16;
  const height = 16;
  const bytesPerPixel = 4; // RGBA
  const stride = width * bytesPerPixel;
  const bufferSize = width * height * bytesPerPixel;

  const buffer = Buffer.alloc(bufferSize, 0);

  // White color (RGBA: 255, 255, 255, 255)
  const color = { r: 255, g: 255, b: 255, a: 255 };

  // Helper function to set a pixel
  const setPixel = (x: number, y: number) => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const offset = y * stride + x * bytesPerPixel;
      buffer[offset] = color.r;
      buffer[offset + 1] = color.g;
      buffer[offset + 2] = color.b;
      buffer[offset + 3] = color.a;
    }
  };

  // Helper function to draw a filled rectangle
  const fillRect = (x1: number, y1: number, x2: number, y2: number) => {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        setPixel(x, y);
      }
    }
  };

  // Helper function to draw a triangle
  const fillTriangle = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
  ) => {
    // Simple triangle filling algorithm
    const minX = Math.min(x1, x2, x3);
    const maxX = Math.max(x1, x2, x3);
    const minY = Math.min(y1, y2, y3);
    const maxY = Math.max(y1, y2, y3);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        // Check if point (x,y) is inside triangle using barycentric coordinates
        const d1 = (x - x2) * (y1 - y2) - (x1 - x2) * (y - y2);
        const d2 = (x - x3) * (y2 - y3) - (x2 - x3) * (y - y3);
        const d3 = (x - x1) * (y3 - y1) - (x3 - x1) * (y - y1);

        const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
        const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

        if (!(hasNeg && hasPos)) {
          setPixel(x, y);
        }
      }
    }
  };

  // Draw the icon based on type
  switch (type) {
    case "prev":
      // Previous icon - two triangles pointing left
      fillTriangle(10, 4, 10, 12, 5, 8); // First triangle
      fillTriangle(5, 4, 5, 12, 0, 8); // Second triangle
      break;

    case "play":
      // Play icon - triangle pointing right
      fillTriangle(5, 4, 5, 12, 12, 8);
      break;

    case "pause":
      // Pause icon - two rectangles
      fillRect(4, 4, 6, 12);
      fillRect(9, 4, 11, 12);
      break;

    case "next":
      // Next icon - two triangles pointing right
      fillTriangle(5, 4, 5, 12, 10, 8); // First triangle
      fillTriangle(10, 4, 10, 12, 15, 8); // Second triangle
      break;
  }

  // Create a native image from the buffer
  return nativeImage.createFromBuffer(buffer, {
    width: width,
    height: height,
    scaleFactor: 1.0,
  });
};

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
    // Update window title based on playback status
    if (isPlaying && songName && artistName) {
      win.setTitle(`${songName} - ${artistName}`);
    } else {
      win.setTitle("Wora");
    }

    if (process.platform !== "win32") return;

    win.setThumbarButtons([
      {
        tooltip: "Previous",
        icon: createMediaIcon("prev"),
        click: () => {
          win.webContents.send("media-control", "previous");
        },
      },
      {
        tooltip: isPlaying ? "Pause" : "Play",
        icon: createMediaIcon(isPlaying ? "pause" : "play"),
        click: () => {
          win.webContents.send("media-control", "play-pause");
        },
      },
      {
        tooltip: "Next",
        icon: createMediaIcon("next"),
        click: () => {
          win.webContents.send("media-control", "next");
        },
      },
    ]);
  };

  updateWindow(false, null, null);

  ipcMain.on("update-window", (event, [isPlaying, artistName, songName]) => {
    updateWindow(isPlaying, artistName, songName);
  });

  win.on("close", saveState);

  return win;
};
