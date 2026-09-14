var padding = 8;
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
    !window.fullScreen &&
    (window.layer == 2 || window.layer == 1) ) { 
    return true; 
  }
  return false;
}

function placePanelInSlot(slot, window){
  var placementArea = workspace.clientArea(0, window);
  //console.info("PlacementArea: position " + placementArea.x + "x" + placementArea.y + " size " + placementArea.width + "x" + placementArea.height )
  window.keepBelow = true;
  window.fullScreen = false;
  window.setMaximize(false, false);
  if (slot == 1) {
    window.frameGeometry = { 
      x: placementArea.x + padding, 
      y: placementArea.y + padding, 
      width: (placementArea.width / 2) - padding - ( padding / 2 ),
      height: (placementArea.height) - (2 * padding),
    }
  }
  if (slot == 2) {
    window.frameGeometry = { 
      x: (placementArea.width / 2) + ( padding / 2 ), 
      y: placementArea.y + padding, 
      width: (placementArea.width / 2) - padding - ( padding / 2 ),
      height: (placementArea.height) - (2 * padding),
    }
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
    refocusOnIndex(-1)
  });

  window.desktopsChanged.connect(() => {
    var window = workspace.activeWindow;
    //console.info(window);
    var unTiledIndex = unTiled.indexOf(window);
    if ( unTiledIndex != -1 ) { return; }

    for ( var i = 0; i < workspace.desktops.length; i++ ) {
      unTileWindow(workspace.desktops[i], window);
    }

    if ( !windowIsTilable(window) ) { return; }

    for ( var i = 0; i < window.desktops.length; i++ ) {
      tileWindow(window.desktops[i], window);
    }
  });

  //window.maximizedAboutToChange.connect((mode) => {
  //  var window = workspace.activeWindow;
  //  console.info(mode);
  //  if ( mode == 3 ) {
  //    unTileWindow(workspace.currentDesktop, window);
  //  }
  //});

  //window.maximizedAboutToChange.connect((mode) => {
  //  var window = workspace.activeWindow;
  //  console.info(mode);
  //  if ( mode == 3 ) {
  //    unTileWindow(workspace.currentDesktop, window);
  //  } else if ( unTiled.indexOf(window) == -1 ) {
  //    addWindow(window);
  //  }
  //});

  window.fullScreenChanged.connect(() => {
    var window = workspace.activeWindow;
    //console.info(window.fullScreen);
    if ( window.fullScreen == true ) {
      unTileWindow(workspace.currentDesktop, window);
    } else if ( unTiled.indexOf(window) == -1 ) {
      addWindow(window);
    }
  });
}

function tileWindow(desktop, window) {
  //console.info(desktop);
  if (!desktopTracker.has(desktop)){
    desktopTracker.set(desktop, new ScrollingSurface());
  }

  var windowList = desktopTracker.get(desktop).array;
  var index = desktopTracker.get(desktop).index;
  var focusedIndex = desktopTracker.get(desktop).focusedIndex;
  //console.info(focusedIndex);

  if ( windowList.indexOf(window) != -1 ) {
    return;
  }
  windowList.splice(focusedIndex + 1, 0, window);
  addHooks(window);

  if ( desktop != workspace.currentDesktop ) {
    return;
  }

  if ( windowList.length <= 2 ) {
    refocusOnIndex(0);
  } else {
    if ( (focusedIndex + 1) - index >= 2 ) {
      refocusOnIndex(index + 1);
    } else {
      refocusOnIndex(index);
    }
  }
  desktopTracker.get(desktop).focusedIndex = focusedIndex + 1;

}

function addWindow(window) {
  if ( windowIsTilable(window) ) {
    unTiled.splice(window, 1);
    tileWindow(workspace.currentDesktop, window);
  }
}

function unTileWindow(desktop, window) {
  if (!desktopTracker.has(desktop)) {
    return;
  }
  var windowList = desktopTracker.get(desktop).array;
  var index = windowList.indexOf(window);
  if ( index != -1 ) {
    window.keepBelow = false;
    windowList.splice(index, 1);
    if ( desktop == workspace.currentDesktop ) {
      if ( index == desktopTracker.get(desktop).index ) {
        refocusOnIndex(index - 1);
      } else {
        refocusOnIndex(-1);
      } 
    }
  }
}

function removeWindow(window) {
  unTiled.push(window);
  for ( var i = 0; i < window.desktops.length; i++ ) {
    unTileWindow(window.desktops[i], window);
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
  if ( currentWindowIndex == windowList.length - 1) { return; }

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
workspace.windowRemoved.connect((window) => {
  removeWindow(window);
  unTiled.splice(window, 1);
});
workspace.windowActivated.connect((window) => {
  var currentDesktop = workspace.currentDesktop;
  if (!desktopTracker.has(currentDesktop)){
    return;
  }
  var windowIndex = desktopTracker.get(currentDesktop).array.indexOf(window);
  var index = desktopTracker.get(currentDesktop).index;
  if ( windowIndex != -1 ) {
    desktopTracker.get(currentDesktop).focusedIndex = windowIndex;
    if ( windowIndex < index ) {
      refocusOnIndex(windowIndex);
    } else if ( windowIndex >= index + 2 ) {
      refocusOnIndex(windowIndex - 1);
    }
  }
});
workspace.currentDesktopChanged.connect(() => {
  refocusOnIndex(-1);
});

registerShortcut("KSlideFocusLeft", "Kslide: Slide focus to the left", "", focusSlideLeft);
registerShortcut("KSlideFocusSight", "Kslide: Slide focus to the right", "", focusSlideRight);
registerShortcut("KSlideToggle", "Kslide: Toggle window tiling", "", toggleWindowTiling);
registerShortcut("KSlideRefocus", "Kslide: refocus tiled windows", "", () => {refocusOnIndex(-1);});
registerShortcut("KSlideSwapLeft", "Kslide: Swap window to the left", "", swapLeft);
registerShortcut("KSlideSwapRight", "Kslide: Swap window to the right", "", swapRight);

