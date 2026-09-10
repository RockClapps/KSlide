var padding = 8;
var dockheight = 32;
var desktopTracker = new Map();

class ScrollingSurface {
  constructor() {
    this.index = 0;
    this.array = new Array();
  }
}

function windowIsTilable(window) {
  if (!window.normalWindow || 
    window.specialWindow || 
    window.fullscreen ) { 
    return false; 
  }
  return true;
}

function placePanelInSlot(slot, window){
  if (slot == 1) {
    window.frameGeometry = { 
      x: 0 + padding, 
      y: dockheight + padding, 
      width: (workspace.activeScreen.geometry.width / 2) - padding,
      height: (workspace.activeScreen.geometry.height) - dockheight - (2 * padding),
    }
    window.keepBelow = true;
  }
  if (slot == 2) {
    window.frameGeometry = { 
      x: (workspace.activeScreen.geometry.width / 2) + padding, 
      y: dockheight + padding, 
      width: (workspace.activeScreen.geometry.width / 2) - padding,
      height: (workspace.activeScreen.geometry.height) - dockheight - (2 * padding),
    }
    window.keepBelow = true;
  }
}

function refocusOnIndex(index){
  var currentDesktop = workspace.currentDesktop;
  if (!desktopTracker.has(currentDesktop) || 
    desktopTracker.get(currentDesktop).array.length == 0) {
    return;
  }
  var windowList = desktopTracker.get(currentDesktop).array;

  if (index == -1) {
    index = desktopTracker.get(currentDesktop).index;
  }

  if (index >= windowList.length) {
    index--;
  }

  for (var i = 0; i < windowList.length; i++) {
    if (i == index){
      windowList[i].minimized = false;
      placePanelInSlot(1, windowList[i]);
    } else if (i == index + 1){
      windowList[i].minimized = false;
      placePanelInSlot(2, windowList[i]);
    } else {
      windowList[i].minimized = true;
    }
  }
  desktopTracker.get(currentDesktop).index = index;
}

function tileWindow(window) {
  var currentDesktop = workspace.currentDesktop;
  if (!desktopTracker.has(currentDesktop)){
    desktopTracker.set(currentDesktop, new ScrollingSurface());
  }

  var windowList = desktopTracker.get(currentDesktop).array;
  windowList.push(window);

  if ( windowList.length <= 2 ) {
    refocusOnIndex(0);
  } else {
    refocusOnIndex(windowList.length - 2);
  }
}

function addWindow(window) {
  if ( windowIsTilable(window) ) {
    tileWindow(window);
  }
}

function removeWindow(window) {
  var currentDesktop = workspace.currentDesktop;
  if (!desktopTracker.has(currentDesktop)){
    return;
  }
  var windowList = desktopTracker.get(currentDesktop).array;
  var index = windowList.indexOf(window);
  if ( index != -1 ) {
    windowList.splice(index, 1);
  }
  console.info(windowList.length);
  refocusOnIndex(-1);
}

workspace.windowAdded.connect(addWindow);
workspace.windowRemoved.connect(removeWindow);
