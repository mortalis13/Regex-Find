
const {classes: Cc, interfaces: Ci, utils: Cu}=Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
// Cu.import("chrome://regexfind/content/main.js");
Cu.import("chrome://regexfind/content/lib.js");
Cu.import("chrome://regexfind/content/util.js");
Cu.import("chrome://regexfind/content/text-extractor.js");

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
    
    var console = gWindow.console;
    
    util.logu('__Find()');
    
    var regexSearch = gFindBar.regexSearch;
    
    if(regexSearch){
      resultRange = searchRange.cloneRange();
      if (startPoint) {
        if (this.mFindBackwards)
          resultRange.setEnd(startPoint.startContainer, startPoint.startOffset);
        else
          resultRange.setStart(startPoint.endContainer, startPoint.endOffset);
      }
      
      var contentWindow = gWindow.gBrowser.contentWindow;
      
      textExtractor.init(contentWindow.document, resultRange);
      var text = textExtractor.mTextContent;
      
      var flags = "m";
      if (!this.mCaseSensitive) flags+="i";
      if (this.mFindBackwards) flags+="g";
      
      try{
        var rx = new RegExp(pattern, flags);
        // rx.ignoreCase = !this.mCaseSensitive;
        var regexResult = rx.exec(text);
        
        if(regexResult){
          var index = regexResult.index;
          var length = regexResult[0].length;
          
          if (this.mFindBackwards) {
            regexResult = rx.exec(text);
            while (regexResult) {
              index = regexResult.index;
              length = regexResult[0].length;
              regexResult = rx.exec(text);
            }
          }
          
          resultRange = textExtractor.getTextRange(index, length);
          util.logu('regex resultRange');
          return resultRange;
        }
      }
      catch(e) {
        // console.log('Error:', e);
        util.log('Error:', e);
        
        // gFindBar._findFailedString = null;
        // gFindBar._findResetTimeout = -1;
      }
      
      // this.oldFind();
    }
    else{
      var rangefindComp = Components.classesByID["{471f4944-1dd2-11b2-87ac-90be0a51d609}"];
      var findService = rangefindComp.getService(Components.interfaces.nsIFind);
      
      findService.caseSensitive = this.mCaseSensitive;
      findService.findBackwards = this.mFindBackwards;
      findService.entireWord = this.mEntireWord;
      
      var resultRange = findService.Find(pattern, searchRange, startPoint, endPoint);
      // console.log('default resultRange', Math.random());
      return resultRange;
      // util.dumpRange(resultRange);
    }
    
    // console.log('return null', Math.random());
    return null;
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
  
  
  oldFind: function(){
    // --- 'lines' methos ---
    // main.init(gFindBar);
    
    // var contentWindow = gWindow.gBrowser.contentWindow;
    // var results = main.findRegex(contentWindow, pattern, false);
    
    // resultRange.setStart(results.startNode, results.startOffset);
    // resultRange.setEnd(results.endNode, results.endOffset);
  },

}

var components = [Regex_Find];

if ("generateNSGetFactory" in XPCOMUtils)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
  var NSGetModule = XPCOMUtils.generateNSGetModule(components);
