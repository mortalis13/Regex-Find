
var utils = {
  
  log: function(msg){
    if (!console) return;
    console.log.apply(console, arguments);
  },

  warn: function(msg){
    if (!console) return;
    console.warn.apply(console, arguments);
  },

  error: function(msg){
    if (!console) return;
    console.error.apply(console, arguments);
  },

  // log unique message (to split duplicated messages with different timestamps)
  logu: function(msg){
    this.log(msg, Math.random().toFixed(5));
  },

}
