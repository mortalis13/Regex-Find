
const {classes: Cc, interfaces: Ci, utils: Cu}=Components;

Cu.import("chrome://regexfind/content/lib.js");

var EXPORTED_SYMBOLS = ['main'];

var main = {
  
  gFindBar: false,
  
  init: function(gFindBar){
    this.gFindBar = gFindBar;
    lib.init(gFindBar);
  },

  findRegex: function(window,val,findAgain){                       //forward search
    var lastNodeReached=false,continueSearch=true,exitSearch=false
    var results,lastNode,lastOffset
    var total=0,current=0

    var rx=lib.createRegex(val)
    if(!rx) return false                                //if pattern is incorrect
    
    var lines=this.gFindBar.lines
    if(!lines.length){                                 //don't load the document structure again if the current 'lines' array may be used 
      lines=lib.getLines(window.document.body)                          //but if it's the first call load it
      this.gFindBar.lines=lines;
    }
    
    var data=lib.getLastData(window,findAgain)                      //get last selection node and offset
    if(data){ 
      lastNode=data.lastNode
      lastOffset=data.lastOffset
    }
    
    for(var l in lines){                                //all lines
      var text=lines[l].text
      var lastLine=false

      var res=rx.exec(text)
      if(res && res[0]!==""){
        while(res && res[0]!==""){                                  //search all for 'total'
          total++ 
          if(continueSearch){
            current++
            var idx=res.index
            var end=idx+res[0].length-1
            var nodes=lines[l].nodes
            
            if(lastNode && !lastNodeReached){                 //if the current line contains the last node (within lines[l].nodes)      
              var lastLineOffset=lib.checkLastNode(nodes,lastNode,lastOffset)
              if(lastLineOffset!==false){
                lastLine=true                       //this line is last (which has a selection) 
                lastNodeReached=true
              }
            }
            
            if(!lastNode 
               || (lastLine && idx>=lastLineOffset)         //if there wasn't any selection (on the first page load or after reload)  
               || (!lastLine && lastNodeReached))           // || this line contains the selection and found term is after this selection   
            {                                               // || the line is after the lastLine (occurs if the lastLine doesn't already have any matches after previously found)
              if(end>=lib.getLeadingSpaces(text)){                //prevent search invisible spaces and tabs (\t) at the beginning of the line
                results=lib.getResults(nodes,idx,end)             //e.g. /./ without it will select but not show the spaces after the current line end reached
                results.tag=lines[l].tag
                
                continueSearch=false                    //stop the search
                
                if(findAgain){                        //break all cycles
                  exitSearch=true                     //('total' is known and 'current' is summed)
                  break                         //but if !findAgain then continue searching for the 'total'   
                }
              }
            }
          }
          
          res=rx.exec(text)
          if(res && res[0]==="") rx.lastIndex=0
        }
      }
      
      if(exitSearch){
        total=this.gFindBar.globalResults.total                          //take the 'total' from the saved value
        break
      }
    }
    
    if(continueSearch){                                 //if nothing was found after the previous match
      if(!current) return false                           //nothing found in the whole document
      this.gFindBar.regexEndReached=true
      window.getSelection().removeAllRanges()               
      return this.findRegex(window,val,findAgain)                    //find again from the start
    }
    
    this.gFindBar.globalResults.total=total
    results.uiData={
      total:total,
      current:current
    }
    
    return results
  },

  findRegexPrev: function(window,val){                         //backward search
    var lastNodeReached=false,continueSearch=true
    var startNode,startOffset,endNode,endOffset,extremeOffset
    var results,lastNode,lastOffset
    var total=0,current=0
    
    var rx=createRegex(val)
    if(!rx) return false
    
    var data=getLastData(window,false)                        //the same as in findRegex()
    if(data){
      lastNode=data.lastNode
      lastOffset=data.lastOffset
    }
    
    var lines=this.gFindBar.lines
    for(var l=lines.length-1; l>=0 && continueSearch; l--){               //search from the end...
      var text=lines[l].text
      var lastLine=false

      var res=rx.exec(text)
      if(res && res[0]!==""){
        while(res && res[0]!=="" && continueSearch){
          if(continueSearch){
            current++
            
            var nodes=lines[l].nodes
            if(lastNode && !lastNodeReached){
              var lastLineOffset=checkLastNode(nodes,lastNode,lastOffset)
              if(lastLineOffset!==false){
                lastLine=true                             //...until the current selection
                lastNodeReached=true
              }
            }
            extremeOffset=lastLineOffset
            
            var result
            if(lastLine)                                        //check the last term in the line (with the offset limitation)
              result=searchLast(rx,text,extremeOffset)            //if we're on the lastLine => see lastLine in the findRegex()
            else if(!lastNode || (!lastLine && lastNodeReached))        
              result=searchLast(rx,text,false)                      //if we passed the lastLine search just the last term (without limits)
            
            if(result){
              var idx=result.index
              var end=idx+result.length-1
              
              if(end>=getLeadingSpaces(text)){
                results=getResults(nodes,idx,end)             //get selection bounds
                continueSearch=false                    //stop further search (use 'total' from the previous case)
                
                if(lastLine){                       
                  res=rx.exec(text)                   //but finish searching the current line (for the current 'current' value)
                  while(res){
                    if(res.index>=extremeOffset)
                      current++
                    res=rx.exec(text)
                  }
                }
              }
            }
          }
          
          res=rx.exec(text)
          if(res && res[0]==="") rx.lastIndex=0
        }
      }
    }
    
    if(continueSearch){                               //the same
      if(!current) return false
      this.gFindBar.regexStartReached=true
      window.getSelection().removeAllRanges()
      return findRegexPrev(window,val)                      //search again from the end
    }
    
    total=this.gFindBar.globalResults.total
    current=total-current+1                                   //revert the 'current' (it was counted from the end)
    
    results.uiData={
      total:total,
      current:current
    }
    
    return results
  },

  findRegexAll: function(window,val,findAgain){                    //search all
    var foundValues=[]
    
    val=normalizePattern(val)
    if(val===false) return false
    
    var lines=this.gFindBar.lines
    if(!lines.length)                               //if the checkbox is checked but the 'lines' is empty
      this.gFindBar.lines=getLines(window.document.body)                        

    var rx=createRegex(val)

    for(var l in lines){
      var text=lines[l].text
      var nodes=lines[l].nodes

      var res=rx.exec(text)
      if(res && res[0]!==""){
        while(res){
          var idx=res.index
          var end=idx+res[0].length-1
          foundValues.push(getResults(nodes,idx,end))             //add new selection bounds
          res=rx.exec(text)
        }
      }
    }
    
    if(!foundValues.length) return false
    
    var results={
      foundValues:foundValues,                          //the array containing all the nodes and offsets which will be selected
      uiData:{
        total:foundValues.length
      }
    }
    return results
  }

}
