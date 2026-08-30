const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function getSettingsFilePath() {
  return path.join(app.getPath('userData'), 'vocabmaster_settings.json');
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 850,
    minHeight: 600,
    title: 'VocabMaster',
    backgroundColor: '#080d19',
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL(devUrl).catch(() => {
      // Retry loading if Vite is still starting
      setTimeout(() => mainWindow.loadURL(devUrl), 1000);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle Window Controls
  ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    mainWindow.close();
  });

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow.isMaximized();
  });

  // Handle Settings Disk Persistence
  ipcMain.handle('get-settings-disk', () => {
    try {
      const file = getSettingsFilePath();
      if (fs.existsSync(file)) {
        const data = fs.readFileSync(file, 'utf-8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.error('Error reading settings from disk:', err);
    }
    return null;
  });

  ipcMain.on('save-settings-disk', (_event, settings) => {
    try {
      const file = getSettingsFilePath();
      fs.writeFileSync(file, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing settings to disk:', err);
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
