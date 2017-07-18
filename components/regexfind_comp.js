
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
  
  // saved lastIndex for RegExp object
  mLastIndex: 0,
  // TextExtractor object which contains all nodes for current document (main or iframe) and full extracted text
  mTextExtractor: null,
  
  // previous found result length, used to get correct start offset for the next search
  mPrevResultLength: 1,
  
  // flag telling if searching backwards we reach the position before the first found occurrence (corresponds to null range)
  mTopWrapReached: false,
  
  
  // The main Find() method is overriden from the nsIFind XPCOM interface.
  // this method is called from the outside by the Firefox system.
  // the number of calls and parameters depend on number of inner documents in the current HTML document (main document, iframes)
  //   and on total results count 
  //   (so when there's 10 results found for some search pattern then in a HTML non-iframe document this method will be called 1+10+1 times,
  //   the first time to return the range that should be selected as currently found text,
  //   10 times to calculate total count, and 1 more time to return null meaning the end of search (in this case))
  //   [[ this is a supposed behaviour based on logic and extensive debugging, as I didn't find any documentation on this except comment in source C++ code ]]
  
  // Override
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
    if (!this.mCaseSensitive) flags += "i";
    if (this.mEntireWord) pattern = '\\b' + pattern + '\\b';
    
    try{
      var resultRange = searchRange.cloneRange();
      
      if (startPoint) {
        if (this.mFindBackwards)
          resultRange.setEnd(startPoint.startContainer, startPoint.startOffset);
        else
          resultRange.setStart(startPoint.endContainer, startPoint.endOffset);
      }
      
      // get content document depending on container that is sent by the inner search system (maybe main HTML document or inner iframe-like document)
      var searchDocument = resultRange.startContainer.ownerDocument;
      var documentInitialized = false;
      
      // get correct saved document lest we reinitialize the same content which is already cached
      var innerDocuments = this.gFindBar.innerDocuments;
      for(var i in innerDocuments){
        var innerDocument = innerDocuments[i];
        if(innerDocument.document == searchDocument){
          this.mTextExtractor = innerDocument.textExtractor;
          documentInitialized = true;
          break;
        }
      }
      
      // if document is not cached yet then parse its nodes to save for later use and save this info in the current findbar instance (which is unique for each window/tab)
      if(!documentInitialized){
        // util.log('Initializing TextExtractor: ' + searchDocument.URL);
        var innerDocument = {};
        var textExtractor = new TextExtractor();
        textExtractor.init(searchDocument, null);
        
        innerDocument.document = searchDocument;
        innerDocument.textExtractor = textExtractor;
        this.mTextExtractor = innerDocument.textExtractor;
        
        this.gFindBar.innerDocuments.push(innerDocument);
      }
      
      var text = this.mTextExtractor.mTextContent;
      
      // get the index/cursor position from which to start to search next result (this allows to search from the clicked position)
      var startOffset = startPoint.startOffset;
      if(this.mFindBackwards) startOffset += this.mPrevResultLength;
      this.mLastIndex = this.mTextExtractor.findTextOffset(startPoint.startContainer, startOffset);
      
      var rx = new RegExp(pattern, flags);
      rx.lastIndex = this.mLastIndex;
      
      // lastIndex before the next search, is used for correct backwards searching
      var currentLastIndex = rx.lastIndex;
      
      // main search
      var regexResult = rx.exec(text);
      
      var index = null;
      var length = null;
      var backwardsSingleResult = false;
      
      // backwards search
      if (this.mFindBackwards) {
        var prevFound = false;
        var regexEndReached = false;
        
        // on each iteration get the previous result
        // if we reach the currently found result then that previous one will be returned
        // this loop goes till the end of the text (RegExp cannot search backwards) and find the current-1 occurrence
        while(!prevFound){
          if(regexResult){
            index = regexResult.index;
            length = regexResult[0].length;
            this.mLastIndex = rx.lastIndex;
          }
          else{
            regexEndReached = true;
          }
          
          regexResult = rx.exec(text);
          
          // if RegExp end was reached once (regexResult == null) and its lastIndex equals that of the currently selected result
          // (it may also be more than currentLastIndex if user changes current selection with mouse)
          // or if lastIndex is 0 (result is null) but we have index (and length) saved previously
          // (this situation occurs when current selection if after the last item and we search backwards)
          if( regexEndReached && (rx.lastIndex >= currentLastIndex || rx.lastIndex == 0 && index) ){
            // this is when we search backwards a single found result
            // (in the first [if] of this loop regexResult is null so we'll have null range if we don't assign index of the single result)
            if(regexResult && !index){
              backwardsSingleResult = true;
              
              index = regexResult.index;
              length = regexResult[0].length;
              this.mLastIndex = rx.lastIndex;
            }
            
            prevFound = true;
          }
        }
      }
      else{
        // forward search
        if(regexResult){
          index = regexResult.index;
          length = regexResult[0].length;
        }
        
        this.mLastIndex = rx.lastIndex;
      }
      
      // run built-in Find() to prepare some (unknown yet) search values for correct selection in textarea/inputs
      this.dummyFindRun(pattern, searchRange, startPoint, endPoint);
      
      // save current length to set correct startOffset for the next search (min 1)
      if(length) this.mPrevResultLength = length;
      
      // the range we return to the searching firefox system (correct selection and results number depends on the content of this range)
      resultRange = this.mTextExtractor.getTextRange(index, length);
      
      // checking if the top was reached (if the search goes from the first to last occurrence)
      // used to show correct message with the search result count
      if(this.mFindBackwards && (index > currentLastIndex || backwardsSingleResult)){
        if(!this.mTopWrapReached){
          // util.log('Returning null resultRange for findBackwards!');
          
          resultRange = null;
          this.mTopWrapReached = true;
        }
        else{
          this.mTopWrapReached = false;
        }
      }
      
      return resultRange;
    }
    catch(e) {
      // util.error(e);
    }
    
    // reaches here if there's an exception
    // generally exceptions should occur when the RegExp expression is incorrect
    // (this also happens when user types special regex characters with \)
    
    // util.log('ret null');
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
  
  
  dummyFindRun: function(pattern, searchRange, startPoint, endPoint){
    var rangefindComp = Components.classesByID["{471f4944-1dd2-11b2-87ac-90be0a51d609}"];
    var findService = rangefindComp.getService(Ci.nsIFind);
    findService.caseSensitive = this.mCaseSensitive;
    findService.findBackwards = this.mFindBackwards;
    findService.entireWord = this.mEntireWord;
    var resultRange = findService.Find(false, searchRange, startPoint, endPoint);
    // var resultRange = findService.Find(pattern, searchRange, startPoint, endPoint);
  },
  
}

var components = [Regex_Find];

if ("generateNSGetFactory" in XPCOMUtils)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
  var NSGetModule = XPCOMUtils.generateNSGetModule(components);
