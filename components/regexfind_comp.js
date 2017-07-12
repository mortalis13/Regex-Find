
const {classes: Cc, interfaces: Ci, utils: Cu}=Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("chrome://regexfind/content/util.js");
Cu.import("chrome://regexfind/content/text-extractor.js");


var inputTags=["textarea"];

var inIDOMUtils = Cc["@mozilla.org/inspector/dom-utils;1"].getService(Ci.inIDOMUtils);


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
      var rx = new RegExp(pattern, flags);
      rx.lastIndex = this.mLastIndex;
      var currentLastIndex = rx.lastIndex;
    
      var resultRange = searchRange.cloneRange();
      var contentWindow = this.gWindow.gBrowser.contentWindow;
      
      if(!this.gFindBar.regexInitialized || !this.mTextExtractor){
        this.mTextExtractor = new TextExtractor();
        this.mTextExtractor.init(contentWindow.document, null);
        this.gFindBar.regexInitialized = true;
      }
      
      var text = this.mTextExtractor.mTextContent;
      var regexResult = rx.exec(text);
      var index = null, length = null;
      
      if (this.mFindBackwards) {
        var prevFound = false;
        while(!prevFound){
          if(regexResult){
            index = regexResult.index;
            length = regexResult[0].length;
            this.mLastIndex = rx.lastIndex;
          }
          
          regexResult = rx.exec(text);
          if(rx.lastIndex == currentLastIndex){
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
      
      resultRange = this.mTextExtractor.getTextRange(index, length);
      if(resultRange){
        var startContainer = resultRange.startContainer;
        var endContainer = resultRange.endContainer;
        var startOffset = resultRange.startOffset;
        var endOffset = resultRange.endOffset;
        
        startContainer = this.normalizeContainer(startContainer);
        endContainer = this.normalizeContainer(endContainer);
        
        resultRange.setStart(startContainer, startOffset);
        resultRange.setEnd(endContainer, endOffset);
      }
      
      return resultRange;
    }
    catch(e) {
      // util.log(e);
    }
    
    this.mLastIndex = 0;
    
    util.log('ret null');
    return null;
  },
  
  
  find_regex_global: function(pattern, searchRange, startPoint, endPoint) {
    var flags = "gm";
    if (!this.mCaseSensitive) flags+="i";
    if (this.mEntireWord) pattern = '\\b' + pattern + '\\b';
    
    try{
      var rx = new RegExp(pattern, flags);
      rx.lastIndex = this.mLastIndex;
      var currentLastIndex = rx.lastIndex;
    
      var resultRange = searchRange.cloneRange();
      if (startPoint) {
        if (this.mFindBackwards)
          resultRange.setEnd(startPoint.startContainer, startPoint.startOffset);
        else
          resultRange.setStart(startPoint.endContainer, startPoint.endOffset);
      }
      
      var contentWindow = this.gWindow.gBrowser.contentWindow;
      this.mTextExtractor = this.gFindBar.textExtractor;
      
      if(!this.gFindBar.regexInitialized){
        this.mTextExtractor = new TextExtractor();
        this.mTextExtractor.init(contentWindow.document, null);
        this.gFindBar.regexInitialized = true;
        this.gFindBar.textExtractor = this.mTextExtractor;
      }
      
      var text = this.mTextExtractor.mTextContent;
      var regexResult = rx.exec(text);
      var index = null, length = null;
      
      if (this.mFindBackwards) {
        var prevFound = false;
        while(!prevFound){
          if(regexResult){
            index = regexResult.index;
            length = regexResult[0].length;
            this.mLastIndex = rx.lastIndex;
          }
          
          regexResult = rx.exec(text);
          if(rx.lastIndex == currentLastIndex){
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
      
      resultRange = this.mTextExtractor.getTextRange(index, length);
      return resultRange;
    }
    catch(e) {}
    
    this.mLastIndex = 0;
    
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
  
  
  // ----------------- utils -----------------
  
  normalizeContainer: function(node){
    var resultNode = node;
    var parent = node.parentElement;
    
    if(inputTags.indexOf(util.getTag(parent)) != -1){
      var anonymousChildren = inIDOMUtils.getChildrenForNode(parent, true);
      for(var i in anonymousChildren){
        var ch = anonymousChildren[i];
        if(util.isElement(ch) && ch.classList.contains('anonymous-div')){
          resultNode = ch.childNodes[0];
          break;
        }
      }
    }
    
    return resultNode;
  },
  
}

var components = [Regex_Find];

if ("generateNSGetFactory" in XPCOMUtils)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
  var NSGetModule = XPCOMUtils.generateNSGetModule(components);
