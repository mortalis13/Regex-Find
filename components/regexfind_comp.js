
const {classes: Cc, interfaces: Ci, utils: Cu}=Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("chrome://regexfind/content/main.js");

function Regex_Find() {}

Regex_Find.prototype = {
  
  // classID: Components.ID("{471f4944-1dd2-11b2-87ac-90be0a51d609}"),    // CID for @mozilla.org/embedcomp/rangefind;1
  classID: Components.ID("{d2bf902e-6ed8-46c5-88b5-f2c6943f70be}"),
  contractID: "@mozilla.org/embedcomp/rangefind;1",
  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIFind]),
  
  mCaseSensitive: false,
  mFindBackwards: false,
  mEntireWord: false,
  
  Find: function(pattern, searchRange, startPoint, endPoint) {
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
    var gWindow = wm.getMostRecentWindow("navigator:browser");
    var gFindBar = gWindow.gFindBar;
    
    var regexSearch = gFindBar.regexSearch;
    
    if(regexSearch){
      var resultRange = searchRange.cloneRange();
      if (startPoint) {
        if (this.mFindBackwards)
          resultRange.setEnd(startPoint.startContainer, startPoint.startOffset);
        else
          resultRange.setStart(startPoint.endContainer, startPoint.endOffset);
      }
      
      main.init(gFindBar);
      
      var contentWindow = gWindow.gBrowser.contentWindow;
      var results = main.findRegex(contentWindow, pattern, false);
      
      resultRange.setStart(results.startNode, results.startOffset);
      resultRange.setEnd(results.endNode, results.endOffset);
    }
    else{
      var rangefindComp = Components.classesByID["{471f4944-1dd2-11b2-87ac-90be0a51d609}"];
      var findService = rangefindComp.getService(Components.interfaces.nsIFind);
      
      var resultRange = findService.Find(pattern, searchRange, startPoint, endPoint);
    }
    
    return resultRange;
  },
  
  get caseSensitive() {
    return this.mCaseSensitive;
  },
  set caseSensitive(value) {
    this.mCaseSensitive = value;
  },
  get findBackwards() {
    return this.mFindBackwards;
  },
  set findBackwards(value) {
    this.mFindBackwards = value;
  },
  get entireWord() {
    return this.mEntireWord;
  },
  set entireWord(value) {
    this.mEntireWord = value;
  },

}

var components = [Regex_Find];

if ("generateNSGetFactory" in XPCOMUtils)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
  var NSGetModule = XPCOMUtils.generateNSGetModule(components);
