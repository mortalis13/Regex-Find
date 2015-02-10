
function findRegex(document,val,findAgain){												//forward search
	var lastNodeReached=false,continueSearch=true,exitSearch=false
	var results,lastNode,lastOffset
	var total=0,current=0

	var rx=createRegex(val)
	if(!rx) return false																//if pattern is incorrent
	
	// if(!lines.length || !findAgain)	
	var lines=gFindBar.lines
	if(!lines.length)																	//don't load the document structure again if the current 'lines' array may be used 
		gFindBar.lines=getLines(document.body)													//but if it's the first call load it
	
	var data=getLastData(document,findAgain)											//get last selection node and offset
	if(data){	
		lastNode=data.lastNode
		lastOffset=data.lastOffset
	}
	
	for(var l in lines){																//all lines
		var text=lines[l].text
		var lastLine=false

		var res=rx.exec(text)
		if(res && res[0]!==""){
			while(res){																	//search all for 'total'
				total++	
				if(continueSearch){
					current++
					var idx=res.index
					var end=idx+res[0].length-1
					var nodes=lines[l].nodes
					
					if(lastNode && !lastNodeReached){									//if the current line contains the last node (within lines[l].nodes)			
						var lastLineOffset=checkLastNode(nodes,lastNode,lastOffset)
						if(lastLineOffset!==false){
							lastLine=true												//this line is last (which has a selection)	
							lastNodeReached=true
						}
					}
					
					if(!lastNode || (lastLine && idx>=lastLineOffset)					//if there wasn't any selection (on the first page load or after reload)	
								 || (!lastLine && lastNodeReached))						// || this line contains the selection and found term is after this selection		
					{																	// || the line is after the lastLine (occures if the lastLine doesn't already have any matches after previously found)
						if(end>=getLeadingSpaces(text)){								//prevent search invisible spaces and tabs (\t) at the beginning of the line
							results=getResults(nodes,idx,end)							//e.g. /./ without it will select but not show the spaces after the current line end reached
							continueSearch=false										//stop the search
							
							if(findAgain){												//break all cycles
								exitSearch=true											//('total' is known and 'current' is summed)
								break													//but if !findAgain then continue searching for the 'total' 	
							}
						}
					}
				}
				res=rx.exec(text)
			}
		}
		
		if(exitSearch){
			total=gFindBar.globalResults.total													//take the 'total' from the saved value
			break
		}
	}
	
	if(continueSearch){																	//if nothing was found after the previous match
		if(!current) return false														//nothing found in the whole document
		gFindBar.regexEndReached=true
		document.getSelection().removeAllRanges()								
		return findRegex(document,val,findAgain)										//find again from the start
	}
	
	gFindBar.globalResults.total=total
	results.uiData={
		total:total,
		current:current
	}
	
	return results
}

function findRegexPrev(document,val){													//backward search
	var lastNodeReached=false,continueSearch=true
	var startNode,startOffset,endNode,endOffset,extremeOffset
	var results,lastNode,lastOffset
	var total=0,current=0
	
	var rx=createRegex(val)
	if(!rx) return false
	
	var data=getLastData(document,false)												//the same as in findRegex()
	if(data){
		lastNode=data.lastNode
		lastOffset=data.lastOffset
	}
	
	var lines=gFindBar.lines
	for(var l=lines.length-1;l>=0 && continueSearch;l--){								//search from the end...
		var text=lines[l].text
		var lastLine=false

		var res=rx.exec(text)
		if(res && res[0]!==""){
			while(res && continueSearch){
				if(continueSearch){
					current++
					
					var nodes=lines[l].nodes
					if(lastNode && !lastNodeReached){
						var lastLineOffset=checkLastNode(nodes,lastNode,lastOffset)
						if(lastLineOffset!==false){
							lastLine=true												//...until the current selection
							lastNodeReached=true
						}
					}
					extremeOffset=lastLineOffset
					
					var result
					if(lastLine)														//check the last term in the line (with the offset limitation)
						result=searchLast(rx,text,extremeOffset)						//if we're on the lastLine => see lastLine in the findRegex()
					else if(!lastNode || (!lastLine && lastNodeReached))				//if we passed the lastLine search just the last term (without limits)
						result=searchLast(rx,text,false)
					
					if(result){
						var idx=result.index
						var end=idx+result.length-1
						
						if(end>=getLeadingSpaces(text)){
							results=getResults(nodes,idx,end)							//get selction bounds
							continueSearch=false										//stop further search (use 'total' from the previous case)
							
							if(lastLine){												
								res=rx.exec(text)										//but finish searching the current line (for the corrent 'current' value)
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
			}
		}
	}
	
	if(continueSearch){																//the same
		if(!current) return false
		gFindBar.regexStartReached=true
		document.getSelection().removeAllRanges()
		return findRegexPrev(document,val)											//search again from the end
	}
	
	total=gFindBar.globalResults.total
	current=total-current+1															//revert the 'current' (it was counted from the end)
	
	results.uiData={
		total:total,
		current:current
	}
	
	return results
}

function findRegexAll(document,val,findAgain){										//search all
	var foundValues=[]
	
	val=normalizePattern(val)
	if(val===false) return false
	
	var lines=gFindBar.lines
	if(!lines.length)													//if the checkbox is checked but the 'lines' is empty
		gFindBar.lines=getLines(document.body)												

	var rx=new RegExp(val,"gim")

	for(var l in lines){
		var text=lines[l].text
		var nodes=lines[l].nodes

		var res=rx.exec(text)
		if(res && res[0]!==""){
			while(res){
				var idx=res.index
				var end=idx+res[0].length-1
				foundValues.push(getResults(nodes,idx,end))							//add new selection bounds
				res=rx.exec(text)
			}
		}
	}
	
	if(!foundValues.length) return false
	
	var results={
		foundValues:foundValues,													//the array containing all the nodes and offsets which will be selected
		uiData:{
			total:foundValues.length
		}
	}
	return results
}
