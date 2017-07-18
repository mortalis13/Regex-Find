
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
    // In entire-word mode we always attemp a find; since sequential matching
    // is not guaranteed, the first character typed may not be a word (no
    // match), but the with the second character it may well be a word,
    // thus a match.
    if (!this._findFailedString ||
        !val.startsWith(this._findFailedString) ||
        this._entireWord) {
      // Getting here means the user commanded a find op. Make sure any
      // initial prefilling is ignored if it hasn't happened yet.
      if (this._startFindDeferred) {
        this._startFindDeferred.resolve();
        this._startFindDeferred = null;
      }

      this._updateCaseSensitivity(val);
      this._setEntireWord();

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

}
