// import { consola } from "consola";

// consola.success("Reliverse Desktop successfully started");
// console.log("Reliverse Desktop successfully started");

import { app, BrowserWindow } from "electron";

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
  });

  win.loadFile("index.html");
};

app.whenReady().then(() => {
  createWindow();
});
