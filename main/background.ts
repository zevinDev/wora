import path from "path";
import {
  Menu,
  Tray,
  app,
  dialog,
  ipcMain,
  shell,
  BrowserWindow,
} from "electron";
import serve from "electron-serve";
import { createWindow } from "./helpers";
import { protocol } from "electron";
import {
  addSongToPlaylist,
  addToFavourites,
  createPlaylist,
  getAlbumWithSongs,
  getAlbums,
  getLibraryStats,
  getPlaylistWithSongs,
  getPlaylists,
  getRandomLibraryItems,
  getSettings,
  initializeData,
  isSongFavorite,
  removeSongFromPlaylist,
  searchDB,
  updatePlaylist,
  updateSettings,
  updateLastFM,
  getLastFM,
} from "./helpers/db/connectDB";
import { initDatabase } from "./helpers/db/createDB";
import { parseFile } from "music-metadata";
import fs from "fs";
import { Client } from "@xhayper/discord-rpc";
import axios from "axios";
import { lastFM } from "./helpers/db/schema";
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  serve({ directory: "app" });
} else {
  app.setPath("userData", `${app.getPath("userData")}`);
}

let mainWindow: any;
let settings: any;

// @hiaaryan: Initialize Database on Startup
const initializeLibrary = async () => {
  try {
    // Initialize SQLite database
    await initDatabase();

    // Get settings
    settings = await getSettings();

    if (settings) {
      // Initialize the music library
      await initializeData(settings.musicFolder);
    }
  } catch (error) {
    console.error("Error initializing library:", error);
  }
};

(async () => {
  await app.whenReady();
  await initializeLibrary();

  // @hiaaryan: Using Depreciated API [Seeking Not Supported with Net]
  protocol.registerFileProtocol("wora", (request, callback) => {
    callback({ path: decodeURIComponent(request.url.replace("wora://", "")) });
  });

  mainWindow = createWindow("main", {
    width: 1500,
    height: 900,
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 20, y: 20 },
    transparent: true,
    frame: false,
    icon: path.join(__dirname, "resources/icon.icns"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      backgroundThrottling: false,
    },
  });

  ipcMain.on("quitApp", async () => {
    return app.quit();
  });

  ipcMain.on("minimizeWindow", async () => {
    return mainWindow.minimize();
  });

  ipcMain.on("maximizeWindow", async (_, isMaximized: boolean) => {
    if (isMaximized) {
      return mainWindow.maximize(isMaximized);
    } else {
      return mainWindow.unmaximize();
    }
  });

  if (settings) {
    if (isProd) {
      await mainWindow.loadURL("app://./home");
    } else {
      const port = process.argv[2];
      await mainWindow.loadURL(`http://localhost:${port}/home`);
    }
  } else {
    if (isProd) {
      await mainWindow.loadURL("app://./setup");
    } else {
      const port = process.argv[2];
      await mainWindow.loadURL(`http://localhost:${port}/setup`);
    }
  }
})();

// @hiaaryan: Initialize Discord RPC
const client = new Client({
  clientId: "1243707416588320800",
});

ipcMain.on(
  "set-rpc-state",
  async (_, { details, state, seek, duration, cover }) => {
    let startTimestamp, endTimestamp;

    if (duration && seek) {
      const now = Math.ceil(Date.now());
      startTimestamp = now - seek * 1000;
      endTimestamp = now + (duration - seek) * 1000;
    }

    const setActivity = {
      details,
      state,
      largeImageKey: cover,
      instance: false,
      type: 2,
      startTimestamp: startTimestamp,
      endTimestamp: endTimestamp,
      buttons: [
        { label: "Support Project", url: "https://github.com/hiaaryan/wora" },
      ],
    };

    if (!client.isConnected) {
      try {
        await client.login();
      } catch (error) {
        console.error("Error logging into Discord:", error);
      }
    }

    if (client.isConnected) {
      client.user.setActivity(setActivity);
    }
  },
);

// @hiaaryan: Called to Rescan Library
ipcMain.handle("rescanLibrary", async () => {
  await initializeLibrary();
});

// @hiaaryan: Called to Set Music Folder
ipcMain.handle("scanLibrary", async () => {
  const diag = await dialog
    .showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
    })
    .then(async (result) => {
      if (result.canceled) {
        return result;
      }

      await initializeData(result.filePaths[0]);
    })
    .catch((err) => {
      console.log(err);
    });

  return diag;
});

// @hiaaryan: Set Tray for Wora
let tray = null;
app.whenReady().then(() => {
  const trayIconPath = !isProd
    ? path.join(__dirname, `../renderer/public/assets/TrayTemplate.png`)
    : path.join(__dirname, `../app/assets/TrayTemplate.png`);
  tray = new Tray(trayIconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: "About", type: "normal", role: "about" },
    { type: "separator" },
    {
      label: "GitHub",
      type: "normal",
      click: () => {
        shell.openExternal("https://github.com/hiaaryan/wora");
      },
    },
    {
      label: "Discord",
      type: "normal",
      click: () => {
        shell.openExternal("https://discord.gg/CrAbAYMGCe");
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      type: "normal",
      role: "quit",
      accelerator: "Cmd+Q",
    },
  ]);
  tray.setToolTip("Wora");
  tray.setContextMenu(contextMenu);
});

// @hiaaryan: IPC Handlers from Renderer
ipcMain.handle("getAlbums", async (_, page) => {
  return await getAlbums(page);
});

ipcMain.handle("getAllPlaylists", async () => {
  const playlists = await getPlaylists();
  return playlists;
});

ipcMain.handle("getAlbumWithSongs", async (_, id: number) => {
  const albumWithSongs = await getAlbumWithSongs(id);
  return albumWithSongs;
});

ipcMain.handle("getPlaylistWithSongs", async (_, id: number) => {
  const playlistWithSongs = await getPlaylistWithSongs(id);
  return playlistWithSongs;
});

ipcMain.handle("getSongMetadata", async (_, file: string) => {
  const metadata = await parseFile(file, {
    skipPostHeaders: true,
    skipCovers: true,
  });

  const favourite = await isSongFavorite(file);

  return { metadata, favourite };
});

ipcMain.on("addToFavourites", async (_, id: number) => {
  return addToFavourites(id);
});

ipcMain.handle("search", async (_, query: string) => {
  const results = await searchDB(query);
  return results;
});

ipcMain.handle("createPlaylist", async (_, data: any) => {
  const playlist = await createPlaylist(data);
  return playlist;
});

ipcMain.handle("getLibraryStats", async () => {
  const stats = await getLibraryStats();
  return stats;
});

ipcMain.handle("getRandomLibraryItems", async () => {
  const libraryItems = await getRandomLibraryItems();
  return libraryItems;
});

ipcMain.handle("updatePlaylist", async (_, data: any) => {
  const playlist = await updatePlaylist(data);
  return playlist;
});

ipcMain.handle("addSongToPlaylist", async (_, data: any) => {
  const add = await addSongToPlaylist(data.playlistId, data.songId);
  return add;
});

ipcMain.handle("removeSongFromPlaylist", async (_, data: any) => {
  const remove = await removeSongFromPlaylist(data.playlistId, data.songId);
  return remove;
});

ipcMain.handle("getSettings", async () => {
  const settings = await getSettings();
  return settings;
});

ipcMain.handle("updateSettings", async (_, data: any) => {
  const settings = await updateSettings(data);
  mainWindow.webContents.send("confirmSettingsUpdate", settings);
  return settings;
});

ipcMain.handle("uploadProfilePicture", async (_, file) => {
  const uploadsDir = path.join(
    app.getPath("userData"),
    "utilities/uploads/profile",
  );
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileName = `profile_${Date.now()}${path.extname(file.name)}`;
  const filePath = path.join(uploadsDir, fileName);

  fs.writeFileSync(filePath, Buffer.from(file.data));

  return filePath;
});

ipcMain.handle("uploadPlaylistCover", async (_, file) => {
  const uploadsDir = path.join(
    app.getPath("userData"),
    "utilities/uploads/playlists",
  );
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileName = `playlists_${Date.now()}${path.extname(file.name)}`;
  const filePath = path.join(uploadsDir, fileName);

  fs.writeFileSync(filePath, Buffer.from(file.data));

  return filePath;
});

ipcMain.handle("getActionsData", async () => {
  const isNotMac = process.platform !== "darwin";
  const appVersion = app.getVersion();

  return { isNotMac, appVersion };
});

const API_KEY = "1c0def144788460560a7559f9bf810a5";

ipcMain.handle("lastFM-Auth", async () => {
  const authWindow = createAuthWindow();
  const authUrl = buildAuthUrl();

  authWindow.loadURL(authUrl);

  return handleAuthFlow(authWindow);
});

function createAuthWindow(): BrowserWindow {
  return new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
}

function buildAuthUrl(): string {
  return `https://www.last.fm/api/auth/?api_key=${API_KEY}&cb=http://localhost/callback`;
}

function handleAuthFlow(authWindow: BrowserWindow): Promise<string> {
  return new Promise((resolve, reject) => {
    authWindow.webContents.on("will-redirect", async (_, url) => {
      if (url.startsWith("http://localhost/callback")) {
        const token = extractTokenFromUrl(url);

        if (token) {
          try {
            const sessionKey = await getSessionKey(token);
            const lastFMData = await fetchLastFMUserData(sessionKey);

            await updateLastFM({
              key: sessionKey,
              username: lastFMData.user.name,
              profilePicture: lastFMData.user.image[2]["#text"],
            });

            authWindow.close();
            resolve("Authentication successful!");
          } catch (error) {
            handleAuthError(authWindow, error, reject);
          }
        } else {
          handleAuthError(
            authWindow,
            new Error("Missing token in callback URL."),
            reject,
          );
        }
      }
    });

    authWindow.on("closed", () => {
      reject(new Error("Authentication window closed by user."));
    });
  });
}

function extractTokenFromUrl(url: string): string | null {
  const urlParams = new URLSearchParams(url.split("?")[1]);
  return urlParams.get("token");
}

function handleAuthError(
  authWindow: BrowserWindow,
  error: Error,
  reject: (reason?: any) => void,
): void {
  console.error("Error during Last.fm authentication:", error);
  authWindow.close();
  reject(error);
}

async function generateApiSignature(params: any): Promise<string> {
  const response = await axios.post(
    "https://wora-backend.vercel.app/api/generate-sig",
    params,
  );
  return response.data.api_sig;
}

async function getSessionKey(token: string): Promise<string> {
  const response = await lastFMRequest({
    method: "auth.getSession",
    token: token,
  });
  if (response.session?.key) {
    return response.session.key;
  } else {
    throw new Error("Failed to retrieve session key");
  }
}

async function fetchLastFMUserData(sessionKey: string): Promise<any> {
  return lastFMRequest({ method: "user.getInfo", sk: sessionKey });
}

async function lastFMRequest(reqParams: object): Promise<any> {
  const sessionKey = await getLastFM();
  if (
    sessionKey[0]?.key ||
    reqParams["method"] === "user.getInfo" ||
    reqParams["token"]
  ) {
    const params = {
      api_key: API_KEY,
      ...(reqParams["token"]
        ? {}
        : { sk: reqParams["sk"] || sessionKey[0].key }),
      ...reqParams,
    };

    params["api_sig"] = await generateApiSignature(params);
    params["format"] = "json";

    try {
      const response = await axios.post(
        "https://ws.audioscrobbler.com/2.0/",
        null,
        { params },
      );
      return response.data;
    } catch (error: any) {
      await handleLastFMRequestError(error);
    }
  }
}

async function handleLastFMRequestError(error: any): Promise<void> {
  if (error.response?.status === 403) {
    console.warn("Invalid session key detected. Unlinking Last.fm account...");
    await updateLastFM({ key: null, username: null, profilePicture: null });
  } else {
    console.error("Error making Last.fm request:", error);
  }
}

ipcMain.on("lastFMRequest", async (_, reqParams: object) => {
  await lastFMRequest(reqParams);
});

ipcMain.handle("lastFMData", async () => getLastFM());

ipcMain.handle("lastFMUnlink", async () => {
  await updateLastFM({ key: null, username: null, profilePicture: null });
});

app.on("window-all-closed", () => {
  app.quit();
});
