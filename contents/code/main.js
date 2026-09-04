// var keepAboveMaximized = new Array();
// 
// function manageKeepAbove(client, h, v) {
//   client.keepAbove = false;
//   if (h && v) {
//     // maximized
//     if (client.keepAbove) {
//       keepAboveMaximized[keepAboveMaximized.length] = client;
//       client.keepAbove = false;
//     }
//   } else {
//     // no longer maximized
//     var found = keepAboveMaximized.indexOf(client);
//     if (found != -1) {
//       client.keepAbove = true;
//       keepAboveMaximized.splice(found, 1);
//     }
//   }
// }

var padding = 8;
var dockheight = 32;
var desktopTracker = new Map();

function tileWindow(window) {
  var currentDesktop = workspace.currentDesktop;
  if (desktopTracker.get(currentDesktop).length == 1) {
    window.frameGeometry = { 
      x: 0 + padding, 
      y: dockheight + padding, 
      width: (workspace.activeScreen.geometry.width / 2) - padding,
      height: (workspace.activeScreen.geometry.height) - dockheight - (2 * padding),
    }
    window.keepBelow = true;
  }
  if (desktopTracker.get(currentDesktop).length == 2) {
    window.frameGeometry = { 
      x: (workspace.activeScreen.geometry.width / 2) + padding, 
      y: dockheight + padding, 
      width: (workspace.activeScreen.geometry.width / 2) - padding,
      height: (workspace.activeScreen.geometry.height) - dockheight - (2 * padding),
    }
    window.keepBelow = true;
  }

  adjustFocus(window);
}

function unTileWindow(window) {
  adjustFocus(window);
}

function adjustFocus(window) {
}

function addWindow(window) {
  if (!window.normalWindow || window.fullscreen) { return; }

  var currentDesktop = workspace.currentDesktop;
  if (!desktopTracker.has(currentDesktop)) {
    desktopTracker.set(currentDesktop, new Array());
  }
  var winList = desktopTracker.get(currentDesktop);
  winList.push(window);

  tileWindow(window);
}

function removeWindow(window) {
  if (!window.normalWindow || window.fullscreen) { return; }

  var currentDesktop = workspace.currentDesktop;
  var winList = desktopTracker.get(currentDesktop);

  var winIndex = winList.indexOf(window);
  winList.splice(winIndex, 1);

  unTileWindow(window);
}

workspace.windowAdded.connect(addWindow);
workspace.windowRemoved.connect(removeWindow);
