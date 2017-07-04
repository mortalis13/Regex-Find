
const {classes: Cc, interfaces: Ci, utils: Cu}=Components;

var EXPORTED_SYMBOLS = ['util'];

var util = {
  
  dumpRange: function(range){
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
    var gWindow = wm.getMostRecentWindow("navigator:browser");
    
    if(range){
      gWindow.console.log('Range => "' + range.startContainer.textContent + '": ' + range.startOffset + ' :: "' + range.endContainer.textContent + '": ' + range.endOffset);
    }
    else{
      gWindow.console.log('range is null');
    }
  },
  
  log: function(msg){
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
    var gWindow = wm.getMostRecentWindow("navigator:browser");
    
    gWindow.console.log.apply(this, arguments);
  },
  
  // log unique message (to split duplicated messages with different timestamps)
  logu: function(msg){
    this.log(msg, Math.random().toFixed(5));
  },
  
}
