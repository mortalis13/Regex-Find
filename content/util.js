
const {classes: Cc, interfaces: Ci, utils: Cu}=Components;

var EXPORTED_SYMBOLS = ['util'];

var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
var gWindow = wm.getMostRecentWindow("navigator:browser");
var console = gWindow.console;

var util = {
  
  dumpRangeObject: function(range){
    if(range){
      try{
        console.log('Range => ', range);
      }
      catch(e){}
    }
    else{
      console.log('range is null');
    }
  },
  
  dumpRange: function(range){
    if(range){
      console.log('Range => "' + range.startContainer.textContent + '": ' + range.startOffset + ' :: "' + range.endContainer.textContent + '": ' + range.endOffset);
    }
    else{
      console.log('range is null');
    }
  },
  
  dumpNodes: function(nodes){
    if(nodes){
      console.log('__Nodes__');
      for(var i=0; i<nodes.length; ++i){
        var node = nodes[i];
        this.log('mDocumentOffset:', node.mDocumentOffset, 'mLength:', node.mLength, 'mNode:', node.mNode, 'mNodeOffset:', node.mNodeOffset);
      }
      console.log('_END_Nodes_');
    }
    else{
      console.log('nodes is null');
    }
  },
  
  log: function(msg){
    // var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
    // var gWindow = wm.getMostRecentWindow("navigator:browser");
    
    console.log.apply(this, arguments);
  },
  
  // log unique message (to split duplicated messages with different timestamps)
  logu: function(msg){
    this.log(msg, Math.random().toFixed(5));
  },
  
  getTag: function(node){
    if(!this.isElement(node)) return null;
    
    var tag=node.tagName
    if(tag) tag=tag.toLowerCase()
    return tag
  },
  
  isElement: function(node){
    if(node.nodeType != Ci.nsIDOMNode.ELEMENT_NODE) return false;
    return true;
  },
  
}
