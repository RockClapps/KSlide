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

function generateScrollingSurfaces() {
  for ( var i = 0; i < workspace.screens.length; i++ ) {
    for ( var j = 0; j < workspace.desktops.length; j++ ) {
      if (!desktopTracker.has(workspace.screens[i])) {
        desktopTracker.set(workspace.screens[i], new Map());
      }
      if (!desktopTracker.get(workspace.screens[i]).has(workspace.desktops[j])) {
        desktopTracker.get(workspace.screens[i]).set(workspace.desktops[j], new ScrollingSurface());
      }
    }
  }
}

function getCurrentScrollingSurface() {

  var currentOutput = workspace.activeScreen;
  var currentDesktop = workspace.currentDesktop;

  if ( !desktopTracker.has(currentOutput) ) {
    desktopTracker.set(currentOutput, new Map()); 
    //console.info("NEW OUTPUT");
  }

  if ( !desktopTracker.get(currentOutput).get(currentDesktop) ) {
    desktopTracker.get(currentOutput).set(currentDesktop, new ScrollingSurface()); 
    //console.info("NEW Desktop");
  }

  return desktopTracker.get(currentOutput).get(currentDesktop);
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
  var scrollingSurface = getCurrentScrollingSurface();

  if (scrollingSurface.array.length == 0) {
    return;
  }
  var windowList = scrollingSurface.array;

  if (index == -1) {
    index = scrollingSurface.index;
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
  scrollingSurface.index = index;
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

    var winOutput = window.output;
    //console.info("WINOUTPUT" + winOutput);
    for ( var i = 0; i < workspace.desktops.length; i++ ) {
      unTileWindow(desktopTracker.get(winOutput).get(workspace.desktops[i]), window);
    }

    if ( !windowIsTilable(window) ) { return; }

    for ( var i = 0; i < window.desktops.length; i++ ) {
      tileWindow(desktopTracker.get(winOutput).get(window.desktops[i]), window);
    }
  });

  window.outputChanged.connect(() => {
    var window = workspace.activeWindow;
    //console.info(window);
    var unTiledIndex = unTiled.indexOf(window);
    if ( unTiledIndex != -1 ) { return; }

    var winOutput = window.output;
    //console.info("WIN OUTPUT " + winOutput);
    for ( var i = 0; i < workspace.screens.length; i++ ) {
      for ( var j = 0; j < workspace.desktops.length; j++ ) {
        console.info("UnTile i " + i + " j " + j);
        unTileWindow(desktopTracker.get(workspace.screens[i]).get(workspace.desktops[j]), window);
      }
    }

    if ( !windowIsTilable(window) ) { return; }

    var winOutput = window.output;
    for ( var i = 0; i < window.desktops.length; i++ ) {
      console.info("Tile i " + i);
      tileWindow(desktopTracker.get(winOutput).get(window.desktops[i]), window);
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
      unTileWindow(getCurrentScrollingSurface(), window);
    } else if ( unTiled.indexOf(window) == -1 ) {
      addWindow(window);
    }
  });
}

function tileWindow(scrollingSurface, window) {
  //console.info(odPair);
  var windowList = scrollingSurface.array;
  var index = scrollingSurface.index;
  var focusedIndex = scrollingSurface.focusedIndex;
  //console.info(focusedIndex);

  if ( windowList.indexOf(window) != -1 ) {
    return;
  }
  windowList.splice(focusedIndex + 1, 0, window);
  addHooks(window);

  if ( scrollingSurface != getCurrentScrollingSurface() ) {
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
  scrollingSurface.focusedIndex = focusedIndex + 1;

}

function addWindow(window) {
  if ( windowIsTilable(window) ) {
    unTiled.splice(window, 1);
    tileWindow(getCurrentScrollingSurface(), window);
  }
}

function unTileWindow(scrollingSurface, window) {
  var windowList = scrollingSurface.array;
  var index = windowList.indexOf(window);
  if ( index != -1 ) {
    window.keepBelow = false;
    windowList.splice(index, 1);
    if ( scrollingSurface == getCurrentScrollingSurface() ) {
      if ( index == scrollingSurface.index ) {
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
    var winOutput = window.output;
    //console.info("WINOUTPUT" + winOutput);
    unTileWindow(desktopTracker.get(winOutput).get(window.desktops[i]), window);
  }
}

function focusSlideLeft() { 
  var scrollingSurface = getCurrentScrollingSurface();

  if ( scrollingSurface.array.length == 0 ){
    return;
  }

  var windowList = scrollingSurface.array;
  var index = scrollingSurface.index;

  var currentWindowIndex = windowList.indexOf(workspace.activeWindow);
  if ( currentWindowIndex == -1) { return; }

  if ( currentWindowIndex - 1 < index ) {
    refocusOnIndex( index - 1 );
  }
  workspace.activeWindow = windowList[ currentWindowIndex - 1 ];
}

function focusSlideRight() { 
  var scrollingSurface = getCurrentScrollingSurface();

  if ( scrollingSurface.array.length == 0 ){
    return;
  }

  var windowList = scrollingSurface.array;
  var index = scrollingSurface.index;

  var currentWindowIndex = windowList.indexOf(workspace.activeWindow);
  if ( currentWindowIndex == -1) { return; }
  if ( currentWindowIndex == windowList.length - 1) { return; }

  if ( currentWindowIndex + 1 >= index + 2) {
    refocusOnIndex( index + 1 );
  }
  workspace.activeWindow = windowList[ currentWindowIndex + 1 ];
}

function getIndexOfFocusedWindow() {
  var scrollingSurface = getCurrentScrollingSurface();

  if ( scrollingSurface.array.length == 0 ){
    return -1;
  }

  var windowList = scrollingSurface.array;
  return windowList.indexOf(workspace.activeWindow);
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
  var scrollingSurface = getCurrentScrollingSurface();

  if ( scrollingSurface.array.length == 0 ){
    return;
  }

  var windowList = scrollingSurface.array;
  var windowIndex = windowList.indexOf(workspace.activeWindow);
  var focusIndex = scrollingSurface.focusIndex;

  if ( windowIndex == -1 || windowIndex == 0 ) {
    return;
  }
  windowList[windowIndex] = windowList[windowIndex - 1];
  windowList[windowIndex - 1] = workspace.activeWindow;

  refocusOnIndex(windowIndex - 1);
}

function swapRight() {
  var scrollingSurface = getCurrentScrollingSurface();

  if ( scrollingSurface.array.length == 0 ){
    return;
  }

  var windowList = scrollingSurface.array;
  var index = scrollingSurface.index;
  var windowIndex = windowList.indexOf(workspace.activeWindow);
  var focusIndex = scrollingSurface.focusIndex;

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
  var scrollingSurface = getCurrentScrollingSurface();

  if ( scrollingSurface.array.length == 0 ){
    return;
  }

  var windowIndex = scrollingSurface.array.indexOf(window);
  var index = scrollingSurface.index;
  if ( windowIndex != -1 ) {
    scrollingSurface.focusedIndex = windowIndex;
    if ( windowIndex < index ) {
      refocusOnIndex(windowIndex);
    } else if ( windowIndex >= index + 2 ) {
      refocusOnIndex(windowIndex - 1);
    } else {
      refocusOnIndex(-1);
    }
  }
});
workspace.currentDesktopChanged.connect(() => {
  refocusOnIndex(-1);
});

workspace.screensChanged(generateScrollingSurfaces);
workspace.desktopsChanged(generateScrollingSurfaces);

generateScrollingSurfaces();

registerShortcut("KSlideFocusLeft", "Kslide: Slide focus to the left", "", focusSlideLeft);
registerShortcut("KSlideFocusSight", "Kslide: Slide focus to the right", "", focusSlideRight);
registerShortcut("KSlideToggle", "Kslide: Toggle window tiling", "", toggleWindowTiling);
registerShortcut("KSlideRefocus", "Kslide: refocus tiled windows", "", () => {refocusOnIndex(-1);});
registerShortcut("KSlideSwapLeft", "Kslide: Swap window to the left", "", swapLeft);
registerShortcut("KSlideSwapRight", "Kslide: Swap window to the right", "", swapRight);

