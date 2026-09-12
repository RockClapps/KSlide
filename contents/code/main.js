var padding = 8;
var dockheight = 32;
var desktopTracker = new Map();
var unTiled = new Array();

class ScrollingSurface {
  constructor() {
    this.index = 0;
    this.focusedIndex = 0;
    this.array = new Array();
  }
}

function windowIsTilable(window) {
  //console.info(window.layer);
  if (window.normalWindow && 
    !window.specialWindow && 
    !window.fullscreen &&
    (window.layer == 2 || window.layer == 1) ) { 
    return true; 
  }
  return false;
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
    index = windowList.length - 1;
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
  if ( index == windowList.length - 1) {
    workspace.activeWindow = windowList[index];
  }
}

function addHooks(window) {
  var currentDesktop = workspace.currentDesktop;

  window.interactiveMoveResizeFinished.connect(() => {
    refocusOnIndex(desktopTracker.get(currentDesktop).index)
  });
  window.desktopsChanged.connect(() => {
    removeWindow(workspace.activeWindow);
  })
}

function tileWindow(window) {
  var currentDesktop = workspace.currentDesktop;
  //console.info(currentDesktop);
  if (!desktopTracker.has(currentDesktop)){
    desktopTracker.set(currentDesktop, new ScrollingSurface());
  }

  var windowList = desktopTracker.get(currentDesktop).array;
  var index = desktopTracker.get(currentDesktop).index;
  var focusedIndex = desktopTracker.get(currentDesktop).focusedIndex;
  console.info(focusedIndex);

  windowList.splice(focusedIndex + 1, 0, window);

  if ( windowList.length <= 2 ) {
    refocusOnIndex(0);
  } else {
    if ( (focusedIndex + 1) - index >= 2 ) {
      refocusOnIndex(index + 1);
    } else {
      refocusOnIndex(index);
    }
  }
  desktopTracker.get(currentDesktop).focusedIndex = focusedIndex + 1;

  addHooks(window);
}

function addWindow(window) {
  if ( windowIsTilable(window) ) {
    unTiled.splice(window, 1);
    tileWindow(window);
  }
}

function removeWindow(window) {
  var currentDesktop = workspace.currentDesktop;
  //console.info(currentDesktop);
  if (!desktopTracker.has(currentDesktop)){
    return;
  }
  var windowList = desktopTracker.get(currentDesktop).array;
  var index = windowList.indexOf(window);
  if ( index != -1 ) {
    window.keepBelow = false;
    windowList.splice(index, 1);
    refocusOnIndex(-1);
    unTiled.push(window);
  }
}

function focusSlideLeft() { 
  var currentDesktop = workspace.currentDesktop;
  if (!desktopTracker.has(currentDesktop)){
    return;
  }

  var windowList = desktopTracker.get(currentDesktop).array;
  var index = desktopTracker.get(currentDesktop).index;

  var currentWindow = workspace.activeWindow;
  var currentWindowIndex = windowList.indexOf(currentWindow);
  if ( currentWindowIndex == -1) { return; }

  if ( currentWindowIndex - 1 < index ) {
    refocusOnIndex( index - 1 );
  }
  workspace.activeWindow = windowList[ currentWindowIndex - 1 ];
}

function focusSlideRight() { 
  var currentDesktop = workspace.currentDesktop;
  if (!desktopTracker.has(currentDesktop)){
    return;
  }

  var windowList = desktopTracker.get(currentDesktop).array;
  var index = desktopTracker.get(currentDesktop).index;

  var currentWindow = workspace.activeWindow;
  var currentWindowIndex = windowList.indexOf(currentWindow);
  if ( currentWindowIndex == -1) { return; }

  if ( currentWindowIndex + 1 >= index + 2) {
    refocusOnIndex( index + 1 );
  }
  workspace.activeWindow = windowList[ currentWindowIndex + 1 ];
}

function getIndexOfFocusedWindow() {
  var currentDesktop = workspace.currentDesktop;
  if (!desktopTracker.has(currentDesktop)){
    return -1;
  }

  var windowList = desktopTracker.get(currentDesktop).array;
  var currentWindow = workspace.activeWindow;
  return windowList.indexOf(currentWindow);
}

function toggleWindowTiling() {
  var currentWindow = workspace.activeWindow;
  var index = getIndexOfFocusedWindow();
  if ( index == -1 ) {
    addWindow(currentWindow);
  } else {
    removeWindow(currentWindow);
  }
}

function swapLeft() {
  var currentDesktop = workspace.currentDesktop;
  if (!desktopTracker.has(currentDesktop)){
    return;
  }

  var windowList = desktopTracker.get(currentDesktop).array;
  var windowIndex = windowList.indexOf(workspace.activeWindow);
  var focusIndex = desktopTracker.get(currentDesktop).focusIndex;

  if ( windowIndex == -1 || windowIndex == 0 ) {
    return;
  }
  windowList[windowIndex] = windowList[windowIndex - 1];
  windowList[windowIndex - 1] = workspace.activeWindow;

  refocusOnIndex(windowIndex - 1);
}

function swapRight() {
  var currentDesktop = workspace.currentDesktop;
  if (!desktopTracker.has(currentDesktop)){
    return;
  }

  var windowList = desktopTracker.get(currentDesktop).array;
  var index = desktopTracker.get(currentDesktop).index;
  var windowIndex = windowList.indexOf(workspace.activeWindow);
  var focusIndex = desktopTracker.get(currentDesktop).focusIndex;

  if ( windowIndex == -1 || windowIndex == windowList.length - 1 ) {
    return;
  }
  windowList[windowIndex] = windowList[windowIndex + 1];
  windowList[windowIndex + 1] = workspace.activeWindow;

  if ( focusIndex + 1 > index + 1 ) {
    refocusOnIndex(index + 1);
  } else {
    refocusOnIndex(windowIndex);
  }
}

workspace.windowAdded.connect(addWindow);
workspace.windowRemoved.connect(removeWindow);
workspace.windowActivated.connect((window) => {
  var currentDesktop = workspace.currentDesktop;
  if (!desktopTracker.has(currentDesktop)){
    return;
  }
  var index = desktopTracker.get(currentDesktop).array.indexOf(window);
  if ( index != -1 ) {
    desktopTracker.get(currentDesktop).focusedIndex = index;
  }
});

registerShortcut("KSlideFocusLeft", "Kslide: Slide focus to the left", "", focusSlideLeft)
registerShortcut("KSlideFocusSight", "Kslide: Slide focus to the right", "", focusSlideRight)
registerShortcut("KSlideToggle", "Kslide: Toggle window tiling", "", toggleWindowTiling)
registerShortcut("KSlideRefocus", "Kslide: refocus tiled windows", "", () => {refocusOnIndex(-1);})
registerShortcut("KSlideSwapLeft", "Kslide: Swap window to the left", "", swapLeft)
registerShortcut("KSlideSwapRight", "Kslide: Swap window to the right", "", swapRight)

