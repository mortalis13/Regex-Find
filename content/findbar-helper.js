
function _find_port(aValue){
  if(this.regexSearch){
    this._findFailedString = null;
    this._findResetTimeout = -1;
  }
  
  findbarNative._find.call(this, aValue);
}


function onFindAgainCommand_port(aFindPrevious){
  // if(this.regexSearch){
  //   this.regexFindPrevious=aFindPrevious
  //   this._find(this._findField.value)                 //redirect to the _find()
  // }
  // else{
  //   return findbarNative.onFindAgainCommand.call(this, aFindPrevious);
  // }
  
  var console=this.browser.contentWindow.console;
  console.log('onFindAgainCommand_port', Math.random().toFixed(5));
  
  return findbarNative.onFindAgainCommand.call(this, aFindPrevious);
}


function toggleHighlight_port(aHighlight, aFromPrefObserver){
  this.regexHighlight=aHighlight
  if(this.regexSearch){
    var window=this.browser.contentWindow
    clearSelection(window)

    var val=this._findField.value

    if(aHighlight && val){
      var findAgain=false
      if(val==this.prevRegexValue){
        findAgain=true
      }

      var results=findRegexAll(window,val,findAgain)
      if(results){
        setHighlightAllColor("#EA60B5")             //uses the 'disabled' text color and changes it via preferences service
        var foundValues=results.foundValues           //in the about:config (couldn't find a way to change it in another way)
        for(var r in foundValues){               //add each result to the selection
          setSelection(foundValues[r],window,true)
        }

        updateUI(this.FOUND,results.uiData)
      }
      else{
        clearSelection(window)
        updateUI(this.NOT_FOUND,false)
      }
    }
    else{
      resetHighlightAllColor()                  //default gray 'disabled' text color
      this._find(this._findField.value)
    }
  }
  else{                                                                   //default highlight
    findbarNative.toggleHighlight.call(this, aHighlight, aFromPrefObserver);
  }
}


function _setCaseSensitivity_port(aCaseSensitivity){
  this.regexCaseSensitive=aCaseSensitivity
  if(this.regexSearch){
    this.prevRegexValue=null                    //prevents the jumping to the next match => findAgain==false
    this._findField.focus()
    this._find(this._findField.value)
  }
  else{
    findbarNative._setCaseSensitivity.call(this, aCaseSensitivity);
  }
}


function toggleEntireWord_port(aEntireWord, aFromPrefObserver){
  if(this.regexSearch){
    this.regexEntireWord=aEntireWord
    this.prevRegexValue=null                    //prevents the jumping to the next match => findAgain==false
    this._findField.focus()
    this._find(this._findField.value)
  }
  else{
    findbarNative.toggleEntireWord.call(this, aEntireWord, aFromPrefObserver);
  }
}


// ---------------------------- regex_methods ----------------------------

function _setRegexFind_port(aRegex){
  this.regexInitialized = false;
  
  this.lines=[]
  this.globalResults={total:0}

  this.regexSearch=aRegex
  if(!aRegex){                                                           // reset the regex searching
    // clearSelection(this.browser.contentWindow)
    this.prevRegexValue=""
  }

  this.onFindAgainCommand(false)                    //search with the default engine
  this._findField.focus();
}
