
// const {classes: Cc, interfaces: Ci, utils: Cu}=Components;
Cu.import("resource://gre/modules/Services.jsm");

var prefs = {'key_findRegexPrevState': 'extensions.regexfind.key_findRegexPrevState'};
var prefObserver={
  observe: function(aSubject, aTopic, aData){
    updateKeysetPref();
  }
};

function updateKeysetPref(){
  var key_findRegexPrevState = pref(prefs["key_findRegexPrevState"]);
  //console.log("key_findRegexPrevState: " + key_findRegexPrevState);
  
  if(key_findRegexPrevState == "on"){
    addKeyset();
  }
  else if(key_findRegexPrevState == "off"){
    removeKeyset();
  }
}

function addKeyset(){
  var keyset = document.createElement("keyset");
  if(keyset){
    keyset.setAttribute("id", "regexfindKeyset");
    var key = document.createElement("key");
    
    if(key){
      key.setAttribute("id", "key_findRegexPrev");
      key.setAttribute("keycode", "VK_F2");
      key.setAttribute("oncommand", "keyFindPrev()");
      keyset.appendChild(key);
    }
    document.documentElement.appendChild(keyset);
  }
}

function removeKeyset(){
  var keyset = document.getElementById("regexfindKeyset");
  if(keyset){
    keyset.parentNode.removeChild(keyset);
  }
}

function pref(name,value){                            //get/set prefs
  if(value===undefined){
    switch(Services.prefs.getPrefType(name)){
      case 0:return null
      case 32:return Services.prefs.getCharPref(name)
      case 64:return Services.prefs.getIntPref(name)
      case 128:return Services.prefs.getBoolPref(name)
    }
  }
  if(value==="") Services.prefs.clearUserPref(name)
  else{
    switch(typeof value){
      case "boolean":Services.prefs.setBoolPref(name,value);return
      case "number":Services.prefs.setIntPref(name,value);return
      default:Services.prefs.setCharPref(name,value)
    }
  }
}

function optionsInit(){
  updateKeysetPref();
  Services.prefs.addObserver(prefs["key_findRegexPrevState"],prefObserver,false);
}

optionsInit();
