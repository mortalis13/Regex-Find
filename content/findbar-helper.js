
function _find_port(aValue){
  if(this.regexSearch){
    // when regex is on clicking rapidly F3 sometimes results in NOT_FOUND due to search wait timeout
    // see findbarNative._find() -> setTimeout at the end (we reset values before that timeout, lest we wait 1 second to search)
    
    this._findFailedString = null;
    this._findResetTimeout = -1;
  }
  
  findbarNative._find.call(this, aValue);
}


// ---------------------------- regex_methods ----------------------------

function _setRegexFind_port(aRegex){
  this.innerDocuments = [];
  this.regexSearch = aRegex;
  
  //search with the default engine
  this.onFindAgainCommand(false);
  this._findField.focus();
}
