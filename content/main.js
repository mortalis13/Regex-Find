
// forward search
function findRegex(window, val, findAgain, findPrevious) {
  var lastSelectionReached = false, afterLastResultOnLine = false, lastLineReached = false, wrapBackSearch = false, continueSearch = true, exitSearch = false;
  var results, lastNode, lastOffset, lastLineOffset, prevResults;
  var total = 0, current = 0;

  var rx = createRegex(val);
  if (!rx) return false;                                                  // if pattern is incorrect

  var lines = gFindBar.lines;
  if (!lines.length) {                                                    // don't load the document structure again if the current 'lines' array may be used
    lines = getLines(window.document.body);                               // but if it's the first call load it
    gFindBar.lines = lines;
  }

  for (var l in lines) {                                                  // all lines
    var line = lines[l];
    var text = line.text;
    var nodes = line.nodes;
    var innerDocument = line.innerDocument;
    
    var document = window.document;
    if (innerDocument) document = innerDocument;
    
    var data = getLastData(document, findAgain);                              // get last selection node and offset
    if (data) {
      lastNode = data.lastNode;
      lastOffset = data.lastOffset;
    }
    
    var res = rx.exec(text);
    while (res && res[0] !== "") {                                      // search all for 'total'
      total++;

      if (continueSearch) {
        current++;
        var idx = res.index;
        var end = idx + res[0].length-1;
        
        // search for the last found selection (line)
        // if the current line contains the last node (within line.nodes)
        var onLastLine = isOnLastLine(nodes, lastNode);
        if (onLastLine) {
          lastLineOffset = getLastLineOffset(nodes, lastNode, lastOffset);      // offset for current selection
          afterLastResultOnLine = (idx >= lastLineOffset);                            // start of found result is after selection on the selection line (for forward search)
          lastSelectionReached = (end+1 >= lastLineOffset);                     // current found result is the same as the previous one or after it on the same line (for backward search)
          lastLineReached = true;                                               // the same as lastSelectionReached but for the whole line instead of selection position
        }
        
        var lastNodeLineIndex = getLastNodeLineIndex(lines, lastNode);
        var afterSelectionLineItem = (lastNodeLineIndex !== false && l > lastNodeLineIndex);            // is current line index (lines[l]) after line index of the node of the previous result
        
        var beforeSelectionOffLine = (!onLastLine && !lastLineReached && !afterSelectionLineItem);        // is current found result before/after current selection line
        var afterSelectionOffLine = (!onLastLine && (lastLineReached || afterSelectionLineItem));
        
        // search backwards/fowards
        if (findPrevious) {
          var beforeSelectionOnLine = (onLastLine && !lastSelectionReached);                              // is current found result before/after current selection on the selection line
          var afterSelectionOnLine = (onLastLine && lastSelectionReached);
          
          // save previous result for backward search
          // or get the saved result (else) and stop the search if reached current selection (current result selectionor a custom user selection/cursor position)
          if (beforeSelectionOffLine || afterSelectionOffLine && !prevResults || wrapBackSearch || beforeSelectionOnLine) {
            if(afterSelectionOffLine && !prevResults) wrapBackSearch = true;
            
            prevResults = getResults(nodes, idx, end);
            prevResults.innerDocument = innerDocument;                             // current document element of found node (may be an iframe's document)
          }
          else if (prevResults && (afterSelectionOnLine || afterSelectionOffLine)) {
            results = prevResults;
            current--;
            continueSearch = false;
            exitSearch = findAgain;
          }
        }
        else {
          // if there wasn't any selection (on the first page load or after reload)
          // || this line contains the selection and found term is after this selection
          // || the line is after the Last Line (occurs if the Last Line doesn't already have matches)
          // || current line index (lines[l]) is after the index of previous result (occurs when current selection/cursor is on a line without matches)
          var readyToGetResults = !lastNode || afterLastResultOnLine || afterSelectionOffLine || afterSelectionLineItem;
          
          // prevent search invisible spaces and tabs (\t) at the beginning of the line
          var endInVisibleArea = (end >= getLeadingSpacesLength(text));
          
          // get search results and stop
          if (readyToGetResults && endInVisibleArea) {
            results = getResults(nodes, idx, end);                        // e.g. /./ without it will select but not show the spaces after the current line end reached
            results.innerDocument = innerDocument;
            
            // stop the search
            // break all cycles ('total' is known and 'current' is summed) but if !findAgain then continue searching for the 'total'
            continueSearch = false;
            exitSearch = findAgain;
          }
        }
        // !findPrevious
      }
      // continueSearch

      res = rx.exec(text);
      if (res && res[0] === "") {
        utils.log('end of _while_, res && res[0] === "" (check if it\'s needed)');
        rx.lastIndex = 0;
      }
    }

    if (exitSearch) {
      total = gFindBar.globalResults.total;                               // take the 'total' from the saved value
      break;
    }
  }

  if (continueSearch) {                                                   // if nothing was found after the previous match
    if (findPrevious && prevResults) {
      results = prevResults;
    }
    else {
      if (!current) return false;                                           // nothing found in the whole document
      gFindBar.regexEndReached = true;
      clearSelection(window);
      return findRegex(window, val, findAgain, findPrevious);                             // find again from the start
    }
  }

  gFindBar.globalResults.total = total;
  results.uiData = {
    current: current,
    total: total
  };

  return results;
}


// search all
function findRegexAll(window, val, findAgain) {
  var foundValues = [];

  val = normalizePattern(val);
  if (val === false) return false;

  var lines = gFindBar.lines;
  if (!lines.length)                                                      // if the checkbox is checked but the 'lines' is empty
    gFindBar.lines = getLines(window.document.body);

  var rx = createRegex(val);

  for (var l in lines) {
    var line = lines[l];
    var text = line.text;
    var nodes = line.nodes;

    var res = rx.exec(text);
    if (res && res[0] !== "") {
      while (res) {
        var idx = res.index;
        var end = idx+res[0].length-1;
        foundValues.push(getResults(nodes, idx, end));                    // add new selection bounds
        res = rx.exec(text);
      }
    }
  }

  if (!foundValues.length) return false;

  var results = {
    foundValues: foundValues,                                             // the array containing all the nodes and offsets which will be selected
    uiData: {
      total: foundValues.length
    }
  };
  
  return results;
}
