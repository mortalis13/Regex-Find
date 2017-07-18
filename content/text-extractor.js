
var EXPORTED_SYMBOLS = ['TextExtractor'];

const {classes: Cc, interfaces: Ci, utils: Cu}=Components;

Cu.import("chrome://regexfind/content/util.js");


function fbNodeInfo() {}
fbNodeInfo.prototype = {
  mDocumentOffset: null,
  mNodeOffset: null,
  mLength: null,
  mNode: null
}

function TextExtractor() {}
TextExtractor.prototype = {
  
  mTextContent: '',
  mDocument: null,
  mNodeContent: [],
  
  
  init: function(document, range) {
    if (!document) throw Components.results.NS_ERROR_INVALID_ARG;
      
    this.mDocument = null;
    this.mTextContent = '';
    this.mNodeContent = [];
    
    var currentNode;
    var endNode;
    var startOffset = 0;
    var endOffset = 0;
    
    // gets currentNode and endNode to determine limits of search
    // used in the next [while] loop
    if (!range) {
      if (document instanceof Ci.nsIDOMHTMLDocument)
        endNode = document.body;
      else
        endNode = document.documentElement;
      
      if (!endNode) {
        this.mDocument = document;
        return;
      }
      
      currentNode = endNode.firstChild;
      if (!currentNode) {
        this.mDocument = document;
        return NS_OK;
      }
    }
    else {
      var type;
      var children;

      endNode = range.endContainer;
      endOffset = range.endOffset;
      type = endNode.nodeType;

      if (util.isElement(endNode)) {
        children = endNode.childNodes;
        endNode = children[endOffset-1];
      }

      currentNode = range.startContainer;
      startOffset = range.startOffset;
      type = currentNode.nodeType;
      
      if (util.isElement(currentNode) && startOffset > 0) {
        children = currentNode.childNodes;
        var length = children.length;
        
        if (startOffset < length)
          currentNode = children[startOffset];
        else if (length > 0)
          currentNode = this.walkPastTree(currentNode, endNode);
        
        startOffset = 0;
      }
    }

    // go through all elements/nodes, merge text contents into one string, save all nodes with start text offsets
    while (currentNode) {
      var nodeType = currentNode.nodeType;
      
      // text nodes inside elements
      var nextNode;
      if (util.isTextNode(currentNode) || util.isCDataNode(currentNode)) {
        if (currentNode != endNode)
          this.addTextNode(currentNode, startOffset);
        else
          this.addTextNode(currentNode, startOffset, endOffset);
        
        nextNode = this.walkPastTree(currentNode, endNode);
        currentNode = nextNode;
        startOffset = 0;
        
        continue;
      }
      startOffset = 0;
      
      // element nodes
      if(util.isInvisible(currentNode, document)){
        nextNode = this.walkPastTree(currentNode, endNode);
        currentNode = nextNode;
        continue;
      }
      
      // search for anonymous nodes for input elements (textarea, input)
      // then get their text nodes (these should be returned in the resultRange inside Find() 
      //   method to handle their selection inside editable elements properly)
      if (util.isElement(currentNode)) {
        if(util.isInput(currentNode)){
          var anonymousChildren = util.inIDOMUtils.getChildrenForNode(currentNode, true);
          
          for(var i in anonymousChildren){
            var ch = anonymousChildren[i];
            if(util.isElement(ch) && ch.classList.contains('anonymous-div')){
              currentNode = ch;
              break;
            }
          }
        }
      }
      
      nextNode = this.walkIntoTree(currentNode, endNode);
      currentNode = nextNode;
    }
    
    this.mDocument = document;
  },
  
  
  // add text content of the node
  // and save its data to the array of nodes
  addTextNode: function(node, offset, length) {
    var text;
    if (length)
      text = node.nodeValue.substring(offset, length);
    else
      text = node.nodeValue.substring(offset);

    nodeInfo = new fbNodeInfo();
    nodeInfo.mLength = text.length;

    if (nodeInfo.mLength > 0) {
      
      nodeInfo.mDocumentOffset = this.mTextContent.length;
      nodeInfo.mNodeOffset = offset;
      nodeInfo.mNode = node;
      
      this.mTextContent += text;
      
      this.mNodeContent.push(nodeInfo);
    }
  },


  // recursive methods to get next nodes in the tree
  walkPastTree: function(current, limit) {
    var next;

    do {
      if (current == limit) // Cannot move past our limit
        break;

      next = current.nextSibling;
      if (!next) { // No siblings. Move out a step and try again.
        current = current.parentNode;
        next = null;
      }

    } while ((!next) && (current)); // Until we find a node or run out of nodes.
    
    return next;
  },
  
  walkIntoTree: function(current, limit) {
    var next;

    next = current.firstChild; // Attempt to recurse in
    if (!next)
      next = this.walkPastTree(current, limit);
    
    return next;
  },
  
  
  // get node index from mNodeContent array
  seekOffsetPosition: function(offset, start, end, seekEnd) {
    if (start+1 >= end)
      return start;
    
    var rangeDiff = this.mNodeContent[end].mDocumentOffset - this.mNodeContent[start].mDocumentOffset;
    var toStartDiff = offset - this.mNodeContent[start].mDocumentOffset;
    var mid = Math.floor( start + ( toStartDiff / (rangeDiff * 1.0 / (end - start)) ) );
    
    var midOffset = this.mNodeContent[mid].mDocumentOffset;
    if (midOffset > offset)
      return this.seekOffsetPosition(offset, start, mid, seekEnd);
    
    if (midOffset == offset && start+1 >= mid && seekEnd)
      return start;
    
    var midEndOffset = this.mNodeContent[mid].mDocumentOffset + this.mNodeContent[mid].mLength;
    if (midEndOffset <= offset)
      return this.seekOffsetPosition(offset, mid + 1, end, seekEnd);
    
    return mid;
  },

  getOffsetPosition: function(offset, start, seekEnd) {
    var end = this.mNodeContent.length - 1;
    if (offset >= this.mNodeContent[end].mDocumentOffset)
      return end;
    
    return this.seekOffsetPosition(offset, start, end, seekEnd);
  },
  
  
  // get range by found text offset and length inside the merged global text (mTextContent)
  getTextRange: function(offset, length) {
    if(offset === null || !length) return null;
    
    if (!this.mDocument) throw Components.results.NS_ERROR_NOT_INITIALIZED;
    
    var range = this.mDocument.createRange();

    var pos1 = this.getOffsetPosition(offset, 0, false);
    var n1 = this.mNodeContent[pos1].mNode;
    var off1 = offset - this.mNodeContent[pos1].mDocumentOffset + this.mNodeContent[pos1].mNodeOffset;
    
    var pos2 = this.getOffsetPosition(offset + length, pos1, true);
    var n2 = this.mNodeContent[pos2].mNode;
    var off2 = (offset + length) - this.mNodeContent[pos2].mDocumentOffset + this.mNodeContent[pos2].mNodeOffset;
    
    range.setStart(n1, off1);
    range.setEnd(n2, off2);
    
    return range;
  },
  
  
  // get text offset in mTextContent by the document container (node) and offset inside it
  // reverse to the getTextRange() method
  findTextOffset: function(startContainer, startOffset) {
    if(startContainer){
      for(var i in this.mNodeContent){
        var nodeInfo = this.mNodeContent[i];
        
        if(nodeInfo.mNode == startContainer){
          var textOffset = nodeInfo.mDocumentOffset + startOffset;
          return textOffset;
        }
      }
    }
    
    return 0;
  },
  
}
