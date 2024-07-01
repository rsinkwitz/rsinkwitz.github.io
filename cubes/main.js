"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = require("path");
let mainWindow;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 940,
        height: 1260,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.bundle.js')
        }
    });
    mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
    mainWindow.on('closed', () => mainWindow = null);
}
electron_1.app.on('ready', createWindow);
electron_1.app.on('window-all-closed', () => {
    // if (process.platform !== 'darwin') {
    electron_1.app.quit();
    // }
});
electron_1.app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
electron_1.ipcMain.on('open-dev-tools', () => {
    mainWindow === null || mainWindow === void 0 ? void 0 : mainWindow.webContents.openDevTools();
});
electron_1.ipcMain.on('app-quit', () => {
    electron_1.app.quit();
});
//# sourceMappingURL=main.js.map