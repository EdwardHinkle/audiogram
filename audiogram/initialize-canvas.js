var path = require("path"),
    Canvas = require("canvas"),
    getRenderer = require("../renderer/");

// Settings
var serverSettings = require("../lib/settings/");

function initializeCanvas(theme, cb) {

  // Fonts pre-registered in bin/worker
  var renderer = getRenderer(theme);

  // Load foreground image
  if (theme.customForegroundPath || theme.foregroundImage) {
    var fg = new Canvas.Image;
    if (!theme.customForegroundPath) {
      fg.src = path.join(__dirname, "..", "settings", "backgrounds", theme.foregroundImage);
    } else {
      fg.src = path.join(serverSettings.storagePath, theme.customForegroundPath);
    }
    renderer.foregroundImage(fg);
  }

  // Load background image
  var bg = new Canvas.Image;
  if (!theme.customBackgroundPath && theme.backgroundImage) {
    bg.src = path.join(__dirname, "..", "settings", "backgrounds", theme.backgroundImage);
  } else {
    bg.src = path.join(serverSettings.storagePath, theme.customBackgroundPath);
  }
  renderer.backgroundImage(bg);

  return cb(null, renderer);


}

module.exports = initializeCanvas;
