
var separatorNodes = ['br','hr'];
var blockNodes = ['p','div','h1','h2','h3','h4','h5','h6','ol','ul','li','form','table','td','tr','th','pre','address','blockquote','dl','fieldset','section','article','aside','footer','header','hgroup','output','tfoot'];
var skipTags = ['script','select','img','style','bdi','bdo','noscript','audio','video','canvas','svg','link','iframe','frame'];
var frameTags = ['iframe','frame'];
var inputTags = ['textarea','input'];

var regexSymbols = ['\\', '/', '\^', '\$', '\*', '\+', '\?', '(', ')', '{', '}', '[', ']'];


// convert the document structure into lines on the screen
// (text lines as they are shown on the screen + nodes which form the lines)
function getLines(node) {
  var lines = [];
  var lidx = -1;
  var inInnerDocument = false;

  addLine();
  
  function sumText(node) {                                                // text lines are added to the array of the same name
    var line = lines[lidx];
    var blockNode = false, separatorNode = false;

    if (node.nodeType == Node.TEXT_NODE) {                                    // text node
      var text = node.nodeValue;
      text = text.replace(/\n/g, " ");                                    // use spaces instead of linefeeds
                                                                          // to search in nodes that occupy more than one line in the html code
      var tmp = text.replace(/\s+/g, "");
      if (!tmp.length) return;                                            // skip empty nodes
      
      line.text += text;
      line.nodes.push({node: node, len: text.length})
      if (inInnerDocument) {
        line.innerDocument = node.ownerDocument;
      }
    }
    else if (isFrame(node)) {
      inInnerDocument = true;
      var frameBody = node.contentDocument.body;
      sumText(frameBody);
      inInnerDocument = false;
    }
    else if (checkNode(node)) {
      if (isHidden(node)) return;                                         // skip hidden

      blockNode = isBlockNode(node);
      separatorNode = isSepartor(node);

      if (separatorNode || blockNode) addLine();                          // add line after a separator (br, hr) and before a block node (div)
      if (separatorNode) return;
      
      if (isEditableElement(node)) {
        line.editableParent = node;
        node = utils.getInputAnonymousNode(node);
      }
      
      for (var childNode of node.childNodes)
        sumText(childNode);                                           // recurse

      if (blockNode) addLine();                                           // add line after a block node (</div>)
    }
  }
  sumText(node);

  function addLine() {
    // remove empty lines (without nodes)
    if (lines[lidx] && !lines[lidx].nodes.length)
      lidx--;
    lines[++lidx] = {text: "", nodes: []};
  }

  return lines;
}


function createRegex(val) {
  val = normalizePattern(val);
  if (val === false) return false;

  var flags = "gm";
  if (!gFindBar.regexCaseSensitive) flags += "i";
  if (gFindBar.regexEntireWord)
    val = "\\b"+val+"\\b";
  
  return new RegExp(val, flags);
}

function normalizePattern(val) {
  for (var rs of regexSymbols)                                            // if a control symbol only
    if (val == rs) return false;

  var rx = new RegExp("\\^", "g");
  var res = rx.exec(val);
  var tmp = val;

  while (res) {
    var idx = res.index;
    if (idx == 0) {
      tmp = val.replace(/\^/, "^\\s*");                                   // process the ^ to add spaces (generally pages contain spaces and tabs before each line)
    }
    else {
      var prevChar = val[idx-1];
      if (prevChar != "\\" && prevChar != "[") return false;
    }
    res = rx.exec(val);
  }
  val = tmp;

  tmp = val;
  var rx = new RegExp("\\$", "g");
  var res = rx.exec(val);
  
  while (res) {
    var idx = res.index;
    if (idx == val.length - 1) {
      var bslashes = val.match(/\\+\$$/);                                 // add spaces in the end (lines in a page may contain spaces there but they are not shown)
      var bslashCount = 0;
      if (bslashes) {
        var s = bslashes[0];
        var s = s.substr(0, s.length - 1);
        bslashCount = s.length;
      }
      
      if (!(bslashCount%2))
        tmp = val.substring(0, val.length - 1) + "\\s*$";                 // if there is an odd number of '\' before the end then the $ symbols is a control symbol
    }                                                                     // else it's a '$' text symbol
    else {
      if (idx == 0) return false;
      else {
        var prevChar = val[idx-1];
        if (prevChar != "\\") return false;
      }
    }
    res = rx.exec(val);
  }
  val = tmp;

  val = val.replace(/ /g, "\\s+");                                        // if there are more than one space between words
  return val;
}


function getResults(line, idx, end) {                                    // get start/end node/offset to return it then and include in the document selection
  var nodes = line.nodes;
  var innerDocument = line.innerDocument;
  var editableParent = line.editableParent;
  
  var len = 0;
  var startFound = false, endFound = false;
  var startNode, startOffset, endNode, endOffset;

  for (var n in nodes) {
    var nlen = nodes[n].len;
    len += nlen;

    if (!startFound && idx < len) {
      startNode = nodes[n].node;
      startOffset = nlen - (len - idx);
      startFound = true;
    }

    if (!endFound && startFound) {
      if (end < len) {
        endNode = nodes[n].node;
        endOffset = nlen - (len - end) + 1;
        endFound = true;
        break;
      }
    }
  }

  var results = {
    startNode: startNode,
    startOffset: startOffset,
    endNode: endNode,
    endOffset: endOffset,
    innerDocument: innerDocument,
    editableParent: editableParent
  };

  return results;
}


function getLastData(document, findAgain) {                                 // get lastNode/Offset of the current selection
  var lastNode, lastOffset;                                               // the selection may be formed after term find
  
  var activeElement = document.activeElement;
  while (activeElement && isFrame(activeElement)){
    document = activeElement.contentDocument;
    activeElement = document.activeElement;
  }
  
  if (isEditableElement(activeElement)) {
    var selectionTemp = activeElement.editor.selection;
    if (selectionTemp.rangeCount) {
      selection = selectionTemp;
    }
  }
  else {
    var selection = document.getSelection();                                // or by selecting text in the document
                                                                            // or by clicking with mouse in the document
    if (!selection.rangeCount) {
      var stopLoop = false;
      for (var i in inputTags) {
        var inputs = document.getElementsByTagName(inputTags[i]);
        
        if (inputs && inputs.length) {
          for (var input of inputs) {
            if (isEditableElement(input) && input.editor) {
              var selectionTemp = input.editor.selection;
              if (selectionTemp.rangeCount) {
                selection = selectionTemp;
                stopLoop = true;
                break;
              }
            }
          }
        }
        
        if (stopLoop) break;
      }
      
      stopLoop = false;
      for (var i in frameTags) {
        var frames = document.getElementsByTagName(frameTags[i]);
        
        if (frames && frames.length) {
          for (var frame of frames) {
            var frameDocument = frame.contentDocument;
            var selectionTemp = frameDocument.getSelection();
            if (selectionTemp.rangeCount) {
              selection = selectionTemp;
              stopLoop = true;
              break;
            }
          }
        }
        
        if (stopLoop) break;
      }
      
      if (!selection.rangeCount) return false;
    }
    
  }
  // if (isEditableElement(activeElement))

  lastNode = selection.focusNode;                                       // search from the end of the selection
  lastOffset = selection.focusOffset;
  if (!findAgain) {                                                     // search from the start of the selection
    lastNode = selection.anchorNode;                                    // used if a term is types letter by letter
    lastOffset = selection.anchorOffset;                                // (a, b, c) for the "abc" string
  }

  return {lastNode: lastNode, lastOffset: lastOffset};
}


function isOnLastLine(nodes, lastNode) {                     // check if the current 'lines' array element contains the 'lastNode'
  if (!lastNode) return false;
  
  for (var i in nodes) {                                                  // searching within the nodes which form the current text
    if (nodes[i].node == lastNode)
      return true;
  }
  
  return false;
}

function getLastNodeLineIndex(lines, lastNode) {
  for (var l in lines) {
    var line = lines[l];
    for (var node of line.nodes) {
      if (node.node == lastNode)
        return l;
    }
  }
  
  return false;
}

function getLastLineOffset(nodes, lastNode, lastOffset) {                     // check if the current 'lines' array element contains the 'lastNode'
  var len = 0, lastLineOffset;                                            // (the node containing the end of a previous selection)

  for (var i in nodes) {                                                  // searching within the nodes which form the current text
    var nlen = nodes[i].len;
    len += nlen;

    if (nodes[i].node == lastNode) {
      lastLineOffset = len - nlen + lastOffset;                           // lastOffset - selection offset in the lastNode
      return lastLineOffset;                                              // lastLineOffset - selection offset of the lastNode in the line text (lines[l].text) (which may consist of multiple nodes)
    }
  }
  
  return false;
}


function setSelection(results, window, highlightAll) {
  var selectionController, selection;

  var startNode = results.startNode;
  var startOffset = results.startOffset;
  var endNode = results.endNode;
  var endOffset = results.endOffset;
  
  if (!highlightAll)
    clearSelection(window);
  
  var document = window.document;
  if (results.innerDocument) {
    document = results.innerDocument;
  }
  
  var editableParent = results.editableParent;
  if (editableParent) {
    var input = editableParent;
    
    // custom selection controller of editable element
    var inputEditor = input.editor;
    if (inputEditor) {
      selection = inputEditor.selection;
      selectionController = inputEditor.selectionController;
    }
  }
  else {
    selection = document.getSelection();
    var docShell = gBrowser.contentWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShell);
    selectionController = docShell.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsISelectionDisplay).QueryInterface(Ci.nsISelectionController);
  }
  
  var range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  selection.addRange(range);

  if (selectionController) {
    // set color
    var selectionType = highlightAll ? selectionController.SELECTION_DISABLED: selectionController.SELECTION_ATTENTION;
    selectionController.setDisplaySelection(selectionType);

    if (!highlightAll) {
      // scroll
      var scrollSelectionType = selectionController.SELECTION_NORMAL;
      var scrollRegion = selectionController.SELECTION_WHOLE_SELECTION;
      var scrollType = selectionController.SCROLL_CENTER_VERTICALLY;
      selectionController.scrollSelectionIntoView(scrollSelectionType, scrollRegion, scrollType);
    }
  }
}


function clearSelection(window, clearUI) {
  var document = window.document;
  
  // clear selection for all inputs
  for (var i in inputTags) {
    var inputs = document.getElementsByTagName(inputTags[i]);
    
    if (inputs && inputs.length) {
      Array.forEach(inputs, function(item) {
        if (isEditableElement(item)) {
          if (item.editor) {
            var selectionController = item.editor.selectionController;
            var selection = selectionController.getSelection(selectionController.SELECTION_NORMAL);
            selection.removeAllRanges();
          }
        }
      });
    }
  }
  
  // unfocus active [input]? element
  var activeElement = document.activeElement;
  activeElement.blur();
  
  window.getSelection().removeAllRanges();
  
  // clear selection for all frames
  for (var frameTag of frameTags) {
    var frames = document.getElementsByTagName(frameTag);
    
    if (frames && frames.length) {
      Array.forEach(frames, function(item) {
        var frameDocument = item.contentDocument;
        frameDocument.getSelection().removeAllRanges();
      });
    }
  }
  
  if (clearUI) {
    gFindBar._findField.removeAttribute("status");
    gFindBar._foundMatches.hidden = true;
    gFindBar._foundMatches.value = "";
    gFindBar._findStatusDesc.textContent = "";
  }
}


function updateUI(status, uiData) {                                       // set found status, matches count, start/end reached,
  switch(status) {                                                        // regex exception information
    case gFindBar.FOUND:
      gFindBar._findField.setAttribute("status", "found");
      if (uiData) {
        var total = uiData.total;
        var current = uiData.current;
        var matches = "";

        if (current) matches = current+" of "+total;
        else matches = total+" in total";

        gFindBar._foundMatches.hidden = false;
        gFindBar._foundMatches.value = matches;
        gFindBar._findStatusDesc.textContent = "";

        // -- text for when start/end of search results is reached
        // if (gFindBar.regexEndReached) gFindBar._findStatusDesc.textContent = "End Reached";
        // else if (gFindBar.regexStartReached) gFindBar._findStatusDesc.textContent = "Start Reached";

        gFindBar.regexEndReached = false;
        gFindBar.regexStartReached = false;
      }
      break;
      
    case gFindBar.NOT_FOUND:
      gFindBar._findField.setAttribute("status", "notfound");
      gFindBar._foundMatches.hidden = false;
      gFindBar._foundMatches.value = "Not found";
      gFindBar._findStatusDesc.textContent = "";
      break;
      
    case gFindBar.EXCEPTION:
      gFindBar._findField.setAttribute("status", "notfound");
      gFindBar._foundMatches.hidden = false;
      gFindBar._foundMatches.value = "Not found";
      gFindBar._findStatusDesc.textContent = "["+uiData.message+"]";      // uiData here is an Error object (got from the catch(e) block)
      break;
  }

  gFindBar._findField.focus();
}


/* **************************************** nodes processing ********************************************* */

// tagName
function getTag(node) {
  var tag = node.tagName;
  if (tag) tag = tag.toLowerCase();
  return tag;
}

function checkNode(node) {
  if (node.nodeType == Node.COMMENT_NODE) return false;                                   // skip comments
  var tag = getTag(node);
  return !skipTags.includes(tag);                                                         // skip <script>, <style>, <img>, <canvas>...
}

function isBlockNode(node) {                                              // <div>, <p>...
  var tag = getTag(node);
  return blockNodes.includes(tag);
}

function isFrame(node) {
  var tag = getTag(node);
  return frameTags.includes(tag);
}

function isSepartor(node) {                                               // <br>, <hr>
  var tag = getTag(node);
  return separatorNodes.includes(tag);
}

function isHidden(node) {
  var style = node.ownerDocument.defaultView.getComputedStyle(node);
  if (style.display == "none" || style.visibility == "hidden" || style.opacity == "0") return true;
  return false;
}

function isPlainInput(node) {
  return node instanceof Ci.nsIDOMNSEditableElement && !node.childNodes.length && node.hasAttribute('value');
}

function isInput(node) {
  return node instanceof Ci.nsIDOMNSEditableElement || node.parentElement instanceof Ci.nsIDOMNSEditableElement;
}

function isEditableElement(element) {
  return element instanceof Ci.nsIDOMNSEditableElement;
}


/* **************************************** add ********************************************* */

// F2 key command
function keyFindPrev() {
  if (gFindBar.regexSearch) {
    if (!gFindBar.lines.length) return;
    gFindBar.regexFindPrevious = true;
    gFindBar._find();
  }
  else {
    gFindBar.onFindAgainCommand(true);
  }
}

function setHighlightAllColor(color) {
  var prefService = Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefService).QueryInterface(Ci.nsIPrefBranch);
  prefService.setCharPref("ui.textSelectBackgroundDisabled", color);
}

function resetHighlightAllColor() {
  setHighlightAllColor("#888");
}

function getLeadingSpacesLength(text) {
  var tmp = text.replace(/^\s+/m, "");                                    // invisible spaces and tabs count not to select them on find
  return text.length - tmp.length;
}
