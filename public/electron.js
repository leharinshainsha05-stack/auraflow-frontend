const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let backendProcess;

// ── Start Python Backend ───────────────────────────────────────
function startBackend() {
  const isDev = process.env.ELECTRON_START_URL;

  const backendPath = isDev
    ? path.join(__dirname, '../../auraflow-backend/dist/auraflow-backend.exe')
    : path.join(process.resourcesPath, 'backend', 'auraflow-backend.exe');

  console.log('Starting backend from:', backendPath);

  backendProcess = spawn(backendPath, [], {
    detached: false,
    stdio: 'ignore'
  });

  backendProcess.on('error', (err) => {
    console.error('Backend failed to start:', err);
  });
}

// ── Wait for Backend to be Ready ──────────────────────────────
function waitForBackend(retries = 20, delay = 500) {
  return new Promise((resolve, reject) => {
    const check = (remaining) => {
      http.get('http://127.0.0.1:8000/', (res) => {
        if (res.statusCode === 200) {
          console.log('Backend is ready!');
          resolve();
        } else {
          retry(remaining);
        }
      }).on('error', () => retry(remaining));
    };

    const retry = (remaining) => {
      if (remaining <= 0) {
        reject(new Error('Backend did not start in time'));
        return;
      }
      setTimeout(() => check(remaining - 1), delay);
    };

    check(retries);
  });
}

// ── Create Window ──────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    title: 'AuraFlow AI',
    show: false
  });

  mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({
      requestHeaders: {
        ...details.requestHeaders,
        'Origin': 'http://localhost:3000'
      }
    });
  });

  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: path.join(__dirname, '../build/index.html'),
    protocol: 'file:',
    slashes: true
  });

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── App Lifecycle ──────────────────────────────────────────────
app.on('ready', async () => {
  startBackend();
  try {
    await waitForBackend();
  } catch (err) {
    console.error('Backend startup failed:', err);
  }
  createWindow();
});

app.on('window-all-closed', () => {
  // Kill backend when app closes
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});