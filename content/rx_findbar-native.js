
var findbarNative = {

  _find: function(aValue){
    if (!this._dispatchFindEvent(""))
      return;

    let val = aValue || this._findField.value;

    // We have to carry around an explicit version of this,
    // because finder.searchString doesn't update on failed
    // searches.
    this.browser._lastSearchString = val;

    // Only search on input if we don't have a last-failed string,
    // or if the current search string doesn't start with it.
    if (!this._findFailedString ||
        !val.startsWith(this._findFailedString))
    {
      // Getting here means the user commanded a find op. Make sure any
      // initial prefilling is ignored if it hasn't happened yet.
      if (this._startFindDeferred) {
        this._startFindDeferred.resolve();
        this._startFindDeferred = null;
      }

      this._enableFindButtons(val);
      if (this.getElement("highlight").checked)
        this._setHighlightTimeout();

      this._updateCaseSensitivity(val);

      this.browser.finder.fastFind(val, this._findMode == this.FIND_LINKS,
                                   this._findMode != this.FIND_NORMAL);
    }

    if (this._findMode != this.FIND_NORMAL)
      this._setFindCloseTimeout();

    if (this._findResetTimeout != -1)
      clearTimeout(this._findResetTimeout);

    // allow a search to happen on input again after a second has
    // expired since the previous input, to allow for dynamic
    // content and/or page loading
    this._findResetTimeout = setTimeout(() => {
      this._findFailedString = null;
      this._findResetTimeout = -1;
    }, 1000);
  },


  onFindAgainCommand: function(aFindPrevious){
    let findString = this._browser.finder.searchString || this._findField.value;
    if (!findString)
      return this.startFind();

    // We dispatch the findAgain event here instead of in _findAgain since
    // if there is a find event handler that prevents the default then
    // finder.searchString will never get updated which in turn means
    // there would never be findAgain events because of the logic below.
    if (!this._dispatchFindEvent("again", aFindPrevious))
      return undefined;

    // user explicitly requested another search, so do it even if we think it'll fail
    this._findFailedString = null;

    // Ensure the stored SearchString is in sync with what we want to find
    if (this._findField.value != this._browser.finder.searchString)
      this._find(this._findField.value);
    else
      this._findAgain(aFindPrevious);

    return undefined;
  },


  toggleHighlight: function(aHighlight, aFromPrefObserver){
    if (!this._dispatchFindEvent("highlightallchange"))
      return;

    let word = this._findField.value;
    // Bug 429723. Don't attempt to highlight ""
    if (aHighlight && !word)
      return;

    this.browser._lastSearchHighlight = aHighlight;
    this.browser.finder.highlight(aHighlight, word);

    // Update the matches count
    this._updateMatchesCount(this.nsITypeAheadFind.FIND_FOUND);
  },


  _setCaseSensitivity: function(aCaseSensitivity){
    this._typeAheadCaseSensitive = aCaseSensitivity;
    this._updateCaseSensitivity();
    this._findFailedString = null;
    this._find();
    if (this.getElement("highlight").checked)
      this._setHighlightTimeout();

    this._dispatchFindEvent("casesensitivitychange");
  },

}
