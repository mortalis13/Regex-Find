
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

}
