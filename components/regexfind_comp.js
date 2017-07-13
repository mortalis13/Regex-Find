
const {classes: Cc, interfaces: Ci, utils: Cu}=Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("chrome://regexfind/content/util.js");
Cu.import("chrome://regexfind/content/text-extractor.js");


function Regex_Find() {}

Regex_Find.prototype = {
  
  // classID: Components.ID("{471f4944-1dd2-11b2-87ac-90be0a51d609}"),    // CID for @mozilla.org/embedcomp/rangefind;1
  classID: Components.ID("{d2bf902e-6ed8-46c5-88b5-f2c6943f70be}"),
  contractID: "@mozilla.org/embedcomp/rangefind;1",
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIFind]),
  
  mCaseSensitive: false,
  mFindBackwards: false,
  mEntireWord: false,
  
  gWindow: null,
  gFindBar: null,
  
  mLastIndex: 0,
  mTextExtractor: null,
  
  
  Find: function(pattern, searchRange, startPoint, endPoint) {
    this.getBrowserEnv();
    var regexSearch = this.gFindBar.regexSearch;
    
    if(regexSearch){
      return this.find_regex(pattern, searchRange, startPoint, endPoint);
    }
    else{
      var rangefindComp = Components.classesByID["{471f4944-1dd2-11b2-87ac-90be0a51d609}"];
      var findService = rangefindComp.getService(Ci.nsIFind);
      
      findService.caseSensitive = this.mCaseSensitive;
      findService.findBackwards = this.mFindBackwards;
      findService.entireWord = this.mEntireWord;
      
      var resultRange = findService.Find(pattern, searchRange, startPoint, endPoint);
      return resultRange;
    }
  },
  
  
  find_regex: function(pattern, searchRange, startPoint, endPoint) {
    var flags = "gm";
    if (!this.mCaseSensitive) flags+="i";
    if (this.mEntireWord) pattern = '\\b' + pattern + '\\b';
    
    try{
      var resultRange = searchRange.cloneRange();
      var contentWindow = this.gWindow.gBrowser.contentWindow;
      this.mTextExtractor = this.gFindBar.textExtractor;
      
      if(!this.gFindBar.regexInitialized){
        util.log('Initializing TextExtractor');
        this.mTextExtractor = new TextExtractor();
        this.mTextExtractor.init(contentWindow.document, null);
        this.gFindBar.regexInitialized = true;
        this.gFindBar.textExtractor = this.mTextExtractor;

        util.dumpNodes(this.mTextExtractor.mNodeContent);
      }
      
      var startOffset = startPoint.startOffset;
      if(this.mFindBackwards) startOffset++;
      this.mLastIndex = this.mTextExtractor.findTextOffset(startPoint.startContainer, startOffset);
      
      var rx = new RegExp(pattern, flags);
      rx.lastIndex = this.mLastIndex;
      var currentLastIndex = rx.lastIndex;
      
      var text = this.mTextExtractor.mTextContent;
      var regexResult = rx.exec(text);
      var index = null, length = null;
      
      if (this.mFindBackwards) {
        var prevFound = false;
        var rxEndReached = false;
        
        while(!prevFound){
          if(regexResult){
            index = regexResult.index;
            length = regexResult[0].length;
            this.mLastIndex = rx.lastIndex;
          }
          else{
            rxEndReached = true;
          }
          
          regexResult = rx.exec(text);
          if( rxEndReached && (rx.lastIndex >= currentLastIndex || (rx.lastIndex == 0 && index)) ){
            prevFound = true;
          }
        }
      }
      else{
        if(regexResult){
          index = regexResult.index;
          length = regexResult[0].length;
        }
        
        this.mLastIndex = rx.lastIndex;
      }
      
      // run built-in Find() to prepare some search values for correct selection in textarea/inputs
      this.dummyFindRun(pattern, searchRange, startPoint, endPoint);
      
      resultRange = this.mTextExtractor.getTextRange(index, length);
      return resultRange;
    }
    catch(e) {
      util.log(e);
    }
    
    this.mLastIndex = 0;
    
    util.log('ret null');
    return null;
  },
  
  
  getBrowserEnv: function(){
    if(!this.gWindow || !this.gFindBar){
      var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
      this.gWindow = wm.getMostRecentWindow("navigator:browser");
      this.gFindBar = this.gWindow.gFindBar;
    }
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
  
  
  dummyFindRun: function(pattern, searchRange, startPoint, endPoint){
    var rangefindComp = Components.classesByID["{471f4944-1dd2-11b2-87ac-90be0a51d609}"];
    var findService = rangefindComp.getService(Ci.nsIFind);
    findService.caseSensitive = this.mCaseSensitive;
    findService.findBackwards = this.mFindBackwards;
    findService.entireWord = this.mEntireWord;
    var resultRange = findService.Find(false, searchRange, startPoint, endPoint);
  },
  
}

var components = [Regex_Find];

if ("generateNSGetFactory" in XPCOMUtils)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
  var NSGetModule = XPCOMUtils.generateNSGetModule(components);
