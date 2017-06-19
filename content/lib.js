
const {classes: Cc, interfaces: Ci, utils: Cu}=Components;

var EXPORTED_SYMBOLS = ['lib'];

var lib = {
  
  gFindBar: false,
  
  separatorNodes: ["br","hr"],
  blockNodes: ["p","div","h1","h2","h3","h4","h5","h6", "ol","ul","li","pre","address","blockquote","dl","fieldset","form","table","td","tr","th","article","aside","footer","header","hgroup","output","section","tfoot"],
  // skipTags: ["script","button","bdi","bdo","input","textarea","select","img","noscript","audio","video","canvas","svg","iframe","frame","link","style"],
  skipTags: ["script","button","bdi","bdo","input","select","img","noscript","audio","video","canvas","svg","iframe","frame","link","style"],

  inputTags: ["textarea"],

  regexSymbols: ["\\","/","\^","\$","\*","\+","\?","(",")","{","}","[","]"],
  
  
  init: function(gFindBar){
    this.gFindBar = gFindBar;
  },

  getLines: function(node){
    //text lines as they are shown on the screen + nodes which form the lines 
    //similar to their representation
    //convert the document structure into lines
    //on the screen
    
    var self = this;
    
    var lines = []
    var lidx=-1                                     
    
    addLine()                                       
    
    function sumText(node, tag){                                 //text lines are added to the array of the same name
      var type=node.nodeType
      var blockNode=false,separatorNode=false
      
      if(type==3){                                    //text node
        var text=node.nodeValue
        text=text.replace(/\n/g," ")                          //use spaces instead of linefeeds
                                                //to search in nodes that occupy more than one line in the html code
        var tmp=text.replace(/\s+/g,"")
        if(!tmp.length) return                              //skip empty nodes
        
        lines[lidx].text+=text
        lines[lidx].nodes.push({node:node,len:text.length})
        lines[lidx].tag=tag
      }
      else if(self.checkNode(node)){
        var tag=self.getTag(node)
        if(self.isHidden(node)) return                           //skip hidden
        
        blockNode=self.isBlockNode(node)
        separatorNode=self.isSepartor(node)
        
        if(separatorNode || blockNode) addLine()                    //add line after a separator (br,hr) and before a block node (div)
        if(separatorNode) return
        
        for(var i=0;i<node.childNodes.length;i++)
          sumText(node.childNodes[i], tag)                         //recurse
        
        if(blockNode) addLine()                             //add line after a block node (</div>)  
      }
    }
    sumText(node)
    
    function addLine(){
      //remove empty lines (without nodes)
      if(lines[lidx] && !lines[lidx].nodes.length) 
        lidx--                 
      lines[++lidx]={text:"",nodes:[]}
    }
    
    return lines
  },


  createRegex: function(val){
    val=this.normalizePattern(val)                                     
    if(val===false) return false
    
    var flags="gm"
    if(!this.gFindBar.regexCaseSensitive) flags+="i"
    if(this.gFindBar.regexEntireWord)
      val="\\b"+val+"\\b";
    return new RegExp(val,flags)
  },

  normalizePattern: function(val){
    for(var rs of this.regexSymbols)                                   //if a control symbol only
      if(val==rs) return false
      
    var rx=new RegExp("\\^","g")                                  
    var res=rx.exec(val)
    var tmp=val
    while(res){
      var idx=res.index
      if(idx==0)
        tmp=val.replace(/\^/,"^\\s*")                             //process the ^ to add spaces (generally pages contain spaces and tabs before each line)    
      else{
        var prevChar=val[idx-1]
        if(prevChar!="\\" && prevChar!="[") return false
      }
      res=rx.exec(val)
    }
    val=tmp
    
    tmp=val
    var rx=new RegExp("\\$","g")
    var res=rx.exec(val)
    while(res){
      var idx=res.index
      if(idx==val.length-1){
        var bslashes=val.match(/\\+\$$/)                          //add spaces in the end (lines in a page may contain spaces there but they are not shown)
        var bslashCount=0
        if(bslashes){
          var s=bslashes[0]
          var s=s.substr(0,s.length-1)
          bslashCount=s.length
        }
        if(!(bslashCount%2))
          tmp=val.substring(0,val.length-1)+"\\s*$"                   //if there is an odd number of '\' before the end then the $ symbols is a control symbol
      }                                           //else it's a '$' text symbol
      else{
        if(idx==0) return false
        else{
          var prevChar=val[idx-1]
          if(prevChar!="\\") return false
        }
      }
      res=rx.exec(val)
    }
    val=tmp
    
    val=val.replace(/ /g,"\\s+")                              //if there are more than one space between words
    return val
  },

  getResults: function(nodes,idx,end){                             //get start/end node/offset to return it then and include in the document selection
    var len=0
    var startFound=false,endFound=false
    var startNode,startOffset,endNode,endOffset
    
    for(var n in nodes){
      var nlen=nodes[n].len
      len+=nlen
      
      if(!startFound && idx<len){
        startNode=nodes[n].node
        startOffset=nlen-(len-idx)
        startFound=true
      }
      
      if(!endFound && startFound){
        if(end<len){
          endNode=nodes[n].node
          endOffset=nlen-(len-end)+1
          endFound=true
          break
        }
      }
    }
    
    var results={
      startNode:startNode,
      startOffset:startOffset,
      endNode:endNode,
      endOffset:endOffset
    }
    
    return results
  },

  getLastData: function(window,findAgain){                   //get lastNode/Offset of the current selection
    var lastNode,lastOffset                           //the selection may be formed after term find
    var selection=window.getSelection()                   //or by selecting text in the document
                                          //or by clicking with mouse in the document
    if(!selection.rangeCount) return false
    
    lastNode=selection.focusNode                        //search from the end of the selection  
    lastOffset=selection.focusOffset
    if(!findAgain){                               //search from the start of the selection
      lastNode=selection.anchorNode                     //used if a term is types letter by letter
      lastOffset=selection.anchorOffset                   //(a,b,c) for the "abc" string
    }
    
    return {lastNode:lastNode,lastOffset:lastOffset}
  },

  checkLastNode: function(nodes,lastNode,lastOffset){                      //check if the current 'lines' array element contains the 'lastNode'    
    var len=0,lastLineOffset                                //(the node containing the end of a previous selection)
    
    for(var i in nodes){                                  //searching within the nodes which form the current text
      var nlen=nodes[i].len
      len+=nlen
      
      if(nodes[i].node==lastNode){  
        lastLineOffset=len-nlen+lastOffset                        //lastOffset - selection offset in the lastNode
        return lastLineOffset                             //lastLineOffset - selection offset of the lastNode in the text searching in (lines[l].text)
      }
    }
    return false
  },

  searchLast: function(rx,text,extremeOffset){                       //for the findRegexPrev(), searches the last occurrence in a line
    var rx=new RegExp(rx)
    var index=-1, length=0, extremeReached=false

    var found=rx.exec(text)
      
    if(extremeOffset!==false){                              //if there is elimination by the current document selection
      if(found && found.index>=extremeOffset) extremeReached=true           //then search last term but before this limitation
      while(found && found[0].length && !extremeReached){
        index=found.index
        length=found[0].length
        found=rx.exec(text)
        if(found && found.index>=extremeOffset) extremeReached=true
      }
    }
    else{                                       //no limits (just search the last)
      while(found && found[0].length){
        index=found.index
        length=found[0].length
        found=rx.exec(text)
      }
    }
    if(index==-1) return false
    return {index:index,length:length}
  },

  setSelection: function(results,window,highlightAll){
    var activeElement=window.document.activeElement
    
    if(activeElement instanceof Ci.nsIDOMNSEditableElement){
      var inputEditor = activeElement.editor
      var selectionController = inputEditor.selectionController
      var selection=selectionController.getSelection(selectionController.SELECTION_NORMAL)
      selection.removeAllRanges()
    }
    
    if(results.tag && this.inputTags.indexOf(results.tag) != -1){
      var input = results.startNode.parentElement
      input.focus()
      input.selectionStart=results.startOffset
      input.selectionEnd=results.endOffset
      
      this.gFindBar._findField.focus()
      
      // custom selection controller of editable element
      if(input instanceof Ci.nsIDOMNSEditableElement){
        var inputEditor = input.editor
        var selectionController = inputEditor.selectionController
      }
    }
    else{
      var startNode=results.startNode
      var startOffset=results.startOffset
      var endNode=results.endNode
      var endOffset=results.endOffset
      
      var selection=window.getSelection()
      var range=window.document.createRange()
      range.setStart(startNode, startOffset)
      range.setEnd(endNode,endOffset)
      if(!highlightAll) selection.removeAllRanges()
      selection.addRange(range)
      
      var docShell=gBrowser.contentWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell)
      var selectionController=docShell.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsISelectionDisplay).QueryInterface(Ci.nsISelectionController)
    }
    
    if(selectionController){
      //set color
      var selectionType=highlightAll ? selectionController.SELECTION_DISABLED: selectionController.SELECTION_ATTENTION
      selectionController.setDisplaySelection(selectionType)
      
      //scroll
      var scrollSelectionType=selectionController.SELECTION_NORMAL
      var scrollRegion=selectionController.SELECTION_WHOLE_SELECTION
      var scrollType=selectionController.SCROLL_CENTER_VERTICALLY
      
      if(!highlightAll)
        selectionController.scrollSelectionIntoView(scrollSelectionType,scrollRegion,scrollType)
    }
  },

  clearSelection: function(window){
    var selection=window.getSelection()
    selection.removeAllRanges()
    this.gFindBar._findField.removeAttribute("status")
    this.gFindBar._foundMatches.hidden=true
    this.gFindBar._foundMatches.value=""
    this.gFindBar._findStatusDesc.textContent=""
  },

  updateUI: function(status,uiData){                       //set found status, matches count, start/end reached,
    switch(status){                               //regex exception information
      case this.gFindBar.FOUND:
        this.gFindBar._findField.setAttribute("status", "found")
        if(uiData){
          var total=uiData.total
          var current=uiData.current
          var matches=""
          
          if(current) matches=current+" of "+total
          else matches=total+" in total"
          
          this.gFindBar._foundMatches.hidden=false
          this.gFindBar._foundMatches.value=matches
          
          this.gFindBar._findStatusDesc.textContent=""
          
          // -- text for when start/end of search results is reached
          // if(this.gFindBar.regexEndReached) this.gFindBar._findStatusDesc.textContent="End Reached"
          // else if(this.gFindBar.regexStartReached) this.gFindBar._findStatusDesc.textContent="Start Reached"
            
          this.gFindBar.regexEndReached=false
          this.gFindBar.regexStartReached=false
        }
        break
      case this.gFindBar.NOT_FOUND:
        this.gFindBar._findField.setAttribute("status", "notfound")
        this.gFindBar._foundMatches.hidden=false
        this.gFindBar._foundMatches.value="Not found"
        this.gFindBar._findStatusDesc.textContent=""
        break
      case this.gFindBar.EXCEPTION:
        this.gFindBar._findField.setAttribute("status", "notfound")
        this.gFindBar._foundMatches.hidden=false
        this.gFindBar._foundMatches.value="Not found"
        this.gFindBar._findStatusDesc.textContent="["+uiData.message+"]"             //uiData here is an Error object (got from the catch(e) block)
        break   
    }
    
    this.gFindBar._findField.focus()
  },

  /* **************************************** nodes processing ********************************************* */

  getTag: function(node){                              //tagName
    var tag=node.tagName
    if(tag) tag=tag.toLowerCase()
    return tag
  },

  checkNode: function(node){                         
    if(node.nodeType==8) return false                     //skip comments
    var tag=this.getTag(node)
    if(tag){                                  //skip <script>,<style>,<img>,<canvas>...
      for(var t of this.skipTags)
        if(tag==t) return false
    }
    return true
  },

  isBlockNode: function(node){                           //<div>,<p>...
    var tag=this.getTag(node)
    if(tag){
      for(var t of this.blockNodes)
        if(tag==t) return true
    }
    return false
  },

  isSepartor: function(node){                            //<br>,<hr>
    var tag=this.getTag(node)
    if(tag){
      for(var t of this.separatorNodes)
        if(tag==t) return true
    }
    return false
  },

  isHidden: function(node){
    var style=node.ownerDocument.defaultView.getComputedStyle(node)
    if(style.display=="none") return true
    if(style.visibility=="hidden") return true
    if(style.opacity=="0") return true
    return false
  },

  /* **************************************** supplementary ********************************************* */

  toggleFindbar: function() {
    if (this.gFindBar.hidden || !this.gFindBar._findField.getAttribute("focused")) {
      this.gFindBar.onFindCommand();
      this.gFindBar.open();
     }
    else{
      this.gFindBar.close();
    }
  },

  keyFindPrev: function(){                           //F2 key command
    if(this.gFindBar.regexSearch){
      if(!this.gFindBar.lines.length) return
      this.gFindBar.regexFindPrevious=true
      this.gFindBar._find()
    }
    else{
      this.gFindBar.onFindAgainCommand(true)
    }
  },

  setHighlightAllColor: function(color){
    var prefService = Cc['@mozilla.org/preferences-service;1'].
          getService(Ci.nsIPrefService).QueryInterface(Ci.nsIPrefBranch)
    prefService.setCharPref("ui.textSelectBackgroundDisabled",color)
  },

  resetHighlightAllColor: function(){
    setHighlightAllColor("#888")
  },

  getLeadingSpaces: function(text){
    var tmp=text.replace(/^\s+/m,"")                                  //invisible spaces and tabs count not to select them on find
    return text.length-tmp.length
  },

}
