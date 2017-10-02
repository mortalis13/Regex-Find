
var utils = {
  
  log: function(msg){
    if (!console) return;
    console.log.apply(console, arguments);
  },

  warn: function(msg){
    if (!console) return;
    console.warn.apply(console, arguments);
  },

  error: function(msg){
    if (!console) return;
    console.error.apply(console, arguments);
  },

  // log unique message (to split duplicated messages with different timestamps)
  logu: function(msg){
    this.log(msg, Math.random().toFixed(5));
  },
  
  
  isTextNode: function(node){
    return node.nodeType == Ci.nsIDOMNode.TEXT_NODE;
  },

  isElement: function(node){
    return node.nodeType == Ci.nsIDOMNode.ELEMENT_NODE;
  },


  getInputAnonymousNode: function(node){
    var result = node;
    
    var inIDOMUtils = Cc["@mozilla.org/inspector/dom-utils;1"].getService(Ci.inIDOMUtils);
    var anonymousChildren = inIDOMUtils.getChildrenForNode(node, true);
    
    for (var i in anonymousChildren) {
      var ch = anonymousChildren[i];
      if (this.isElement(ch) && ch.classList.contains('anonymous-div')) {
        result = ch;
        break;
      }
    }
    
    return result;
  },

}
