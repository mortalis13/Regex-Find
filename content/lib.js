
var separatorNodes=["br","hr"]
var blockNodes=["p","div","h1","h2","h3","h4","h5","h6",
        "ol","ul","li","pre","address","blockquote","dl","fieldset","form","table","td","tr","th",
        "article","aside","footer","header","hgroup","output","section","tfoot"]
var skipTags=["script","button","bdi","bdo","input","textarea","select",
         "img","noscript","audio","video","canvas","svg","iframe","frame","link","style"]
    
var regexSymbols=["\\","/","\^","\$","\*","\+","\?","(",")","{","}","[","]"]
    
function getLines(node){
  var lines=gFindBar.lines                                //text lines as they are shown on the screen + nodes which form the lines 
  var lidx=-1                                       //convert the document structure into lines
  lines.length=0                                      //similar to their representation
  addLine()                                       //on the screen
  
  function sumText(node){                                 //text lines are added to the array of the same name
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
    }
    else if(checkNode(node)){
      var tag=getTag(node)
      if(isHidden(node)) return                           //skip hidden
      
      blockNode=isBlockNode(node)
      separatorNode=isSepartor(node)
      
      if(separatorNode || blockNode) addLine()                    //add line after a separator (br,hr) and before a block node (div)
      if(separatorNode) return
      for(var i=0;i<node.childNodes.length;i++)
        sumText(node.childNodes[i])                         //recurse
      if(blockNode) addLine()                             //add line after a block node (</div>)  
    }
  }
  sumText(node)
  
  function addLine(){
    if(lines[lidx] && !lines[lidx].nodes.length) lidx--                 //remove empty lines (without nodes)
    lines[++lidx]={text:"",nodes:[]}
  }
  
  return lines
}

function createRegex(val){
  val=normalizePattern(val)                                     
  if(val===false) return false
  
  var flags="gm"
  if(!gFindBar.regexCaseSensitive) flags+="i"
  if(gFindBar.regexEntireWord)
    val="\\b"+val+"\\b";
  return new RegExp(val,flags)
}

function normalizePattern(val){
  for(var rs of regexSymbols)                                   //if a control symbol only
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
}

function getResults(nodes,idx,end){                             //get start/end node/offset to return it then and include in the document selection
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
}

function getLastData(window,findAgain){                   //get lastNode/Offset of the current selection
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
}

function checkLastNode(nodes,lastNode,lastOffset){                      //check if the current 'lines' array element contains the 'lastNode'    
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
}

function searchLast(rx,text,extremeOffset){                       //for the findRegexPrev(), searches the last occurrence in a line
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
}

function setSelection(results,window,highlightAll){
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
  
  var docShell=gBrowser.contentWindow.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell);
  var controller=docShell.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsISelectionDisplay).QueryInterface(Ci.nsISelectionController)
        
  var selectionType=highlightAll?controller.SELECTION_DISABLED:controller.SELECTION_ATTENTION     //choose color
  controller.setDisplaySelection(selectionType)                           //set color
  
  var scrollSelectionType=controller.SELECTION_NORMAL
  var scrollRegion=controller.SELECTION_WHOLE_SELECTION
  var scrollType=controller.SCROLL_CENTER_VERTICALLY
  
  if(!highlightAll) 
    controller.scrollSelectionIntoView(scrollSelectionType,scrollRegion,scrollType)         //scroll
}

function clearSelection(window){
  var selection=window.getSelection()
  selection.removeAllRanges()
  gFindBar._findField.removeAttribute("status")
  gFindBar._foundMatches.hidden=true
  gFindBar._foundMatches.value=""
  gFindBar._findStatusDesc.textContent=""
}

function updateUI(status,uiData){                       //set found status, matches count, start/end reached,
  switch(status){                               //regex exception information
    case gFindBar.FOUND:
      gFindBar._findField.setAttribute("status", "found")
      if(uiData){
        var total=uiData.total
        var current=uiData.current
        var matches=""
        
        if(current) matches=current+" of "+total
        else matches=total+" in total"
        
        gFindBar._foundMatches.hidden=false
        gFindBar._foundMatches.value=matches
        
        gFindBar._findStatusDesc.textContent=""
        
        // if(gFindBar.regexEndReached)
        //   gFindBar._findStatusDesc.textContent="End Reached"
        // else if(gFindBar.regexStartReached)
        //   gFindBar._findStatusDesc.textContent="Start Reached"
          
        gFindBar.regexEndReached=false
        gFindBar.regexStartReached=false
      }
      break
    case gFindBar.NOT_FOUND:
      gFindBar._findField.setAttribute("status", "notfound")
      gFindBar._foundMatches.hidden=false
      gFindBar._foundMatches.value="Not found"
      gFindBar._findStatusDesc.textContent=""
      break
    case gFindBar.EXCEPTION:
      gFindBar._findField.setAttribute("status", "notfound")
      gFindBar._foundMatches.hidden=false
      gFindBar._foundMatches.value="Not found"
      gFindBar._findStatusDesc.textContent="["+uiData.message+"]"             //uiData here is an Error object (got from the catch(e) block)
      break   
  }
}

/* **************************************** nodes processing ********************************************* */

function getTag(node){                              //tagName
  var tag=node.tagName
  if(tag) tag=tag.toLowerCase()
  return tag
}

function checkNode(node){                         
  if(node.nodeType==8) return false                     //skip comments
  var tag=getTag(node)
  if(tag){                                  //skip <script>,<style>,<img>,<canvas>...
    for(var t of skipTags)
      if(tag==t) return false
  }
  return true
}

function isBlockNode(node){                           //<div>,<p>...
  var tag=getTag(node)
  if(tag){
    for(var t of blockNodes)
      if(tag==t) return true
  }
  return false
}

function isSepartor(node){                            //<br>,<hr>
  var tag=getTag(node)
  if(tag){
    for(var t of separatorNodes)
      if(tag==t) return true
  }
  return false
}

function isHidden(node){
  var style=node.ownerDocument.defaultView.getComputedStyle(node)
  if(style.display=="none") return true
  if(style.visibility=="hidden") return true
  if(style.opacity=="0") return true
  return false
}

/* **************************************** supplementary ********************************************* */

function toggleFindbar() {
  if (gFindBar.hidden || !gFindBar._findField.getAttribute("focused")) {
    gFindBar.onFindCommand();
    gFindBar.open();
   }
  else{
    gFindBar.close();
  }
}

function keyFindPrev(){                           //F2 key command
  if(gFindBar.regexSearch){
    if(!gFindBar.lines.length) return
    gFindBar.regexFindPrevious=true
    gFindBar._find()
  }
  else{
    gFindBar.onFindAgainCommand(true)
  }
}

function setHighlightAllColor(color){
  var prefService = Cc['@mozilla.org/preferences-service;1'].
        getService(Ci.nsIPrefService).QueryInterface(Ci.nsIPrefBranch)
  prefService.setCharPref("ui.textSelectBackgroundDisabled",color)
}

function resetHighlightAllColor(){
  setHighlightAllColor("#888")
}

function getLeadingSpaces(text){
  var tmp=text.replace(/^\s+/m,"")                                  //invisible spaces and tabs count not to select them on find
  return text.length-tmp.length
}
